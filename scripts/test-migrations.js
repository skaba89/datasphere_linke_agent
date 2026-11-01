// ============================================================
// Test: Apply all Prisma migrations to an in-memory PostgreSQL
//
// Uses pg-mem to validate SQL syntax of all migration files.
// Catches errors like CURRENT_TIMESTAMP() (should be CURRENT_TIMESTAMP),
// syntax errors, missing semicolons, etc.
//
// Usage: node scripts/test-migrations.js
// ============================================================

const { newDb } = require('pg-mem')
const fs = require('fs')
const path = require('path')

const MIGRATIONS_DIR = path.join(__dirname, '..', 'prisma', 'migrations')

function main() {
  // List migration directories sorted by name (timestamps)
  const entries = fs.readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort()

  console.log(`Found ${entries.length} migrations to test:`)
  entries.forEach(m => console.log(`  - ${m}`))
  console.log('')

  // pg-mem: create a new in-memory database
  const db = newDb()
  // Get the pg Pool adapter
  const pg = db.adapters.createPg()
  const pool = new pg.Pool()

  let success = 0
  let failed = 0
  const errors = []

  async function run() {
    for (const migrationName of entries) {
      const migrationPath = path.join(MIGRATIONS_DIR, migrationName, 'migration.sql')
      if (!fs.existsSync(migrationPath)) {
        console.log(`⚠️  ${migrationName}: no migration.sql file, skipping`)
        continue
      }

      const sql = fs.readFileSync(migrationPath, 'utf-8')

      try {
        // Execute the entire migration SQL as one multi-statement query
        const client = await pool.connect()
        try {
          await client.query('BEGIN')
          await client.query(sql)
          await client.query('COMMIT')
          console.log(`✅ ${migrationName}: OK`)
          success++
        } catch (err) {
          await client.query('ROLLBACK').catch(() => {})
          throw err
        } finally {
          client.release()
        }
      } catch (err) {
        console.log(`❌ ${migrationName}: FAILED`)
        console.log(`   Error: ${err.message}`)
        errors.push({ migration: migrationName, error: err.message })
        failed++
        // Continue with next migration? No — if a migration fails,
        // subsequent ones may depend on it. Stop here.
        break
      }
    }

    console.log('')
    console.log('=== Results ===')
    console.log(`✅ Successful: ${success}`)
    console.log(`❌ Failed: ${failed}`)

    if (failed > 0) {
      console.log('')
      console.log('Failed migrations details:')
      for (const e of errors) {
        console.log(`  - ${e.migration}: ${e.error}`)
      }
      process.exit(1)
    } else {
      console.log('')
      console.log('🎉 All migrations applied successfully!')
      process.exit(0)
    }
  }

  run().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
}

main()
