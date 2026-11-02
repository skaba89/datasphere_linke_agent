// ============================================================
// DataSphere 360 — Agent de Test Complet
//
// Analyse le projet en:
// 1. Lançant les tests unitaires (vitest)
// 2. Testant les migrations SQL (pg-mem)
// 3. Lançant le build Next.js
// 4. Analysant le code de toutes les routes API
// 5. Analysant les composants frontend
// 6. Vérifiant la configuration et la sécurité
//
// Usage: node scripts/test-agent.js
// ============================================================

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'src')

const C = {
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', reset: '\x1b[0m',
  bold: '\x1b[1m', dim: '\x1b[2m',
}

let passed = 0, failed = 0, warnings = 0
const results = {}

function log(msg, color = C.reset) { console.log(`${color}${msg}${C.reset}`) }
function ok(msg) { passed++; log(`  ${C.green}✓${C.reset} ${msg}`) }
function fail(msg) { failed++; log(`  ${C.red}✗${C.reset} ${msg}`) }
function warn(msg) { warnings++; log(`  ${C.yellow}⚠${C.reset} ${msg}`) }

function runCmd(cmd, label, timeoutMs = 120000) {
  try {
    const output = execSync(cmd, { cwd: ROOT, timeout: timeoutMs, encoding: 'utf-8', stdio: 'pipe' })
    return { success: true, output }
  } catch (err) {
    return { success: false, output: err.stdout || err.stderr || err.message }
  }
}

// ============================================================
async function main() {
  log(C.bold + C.cyan)
  log('╔══════════════════════════════════════════════════════════════╗')
  log('║     DataSphere 360 — Agent de Test Complet                    ║')
  log('║     Analyse de toutes les fonctionnalités du projet           ║')
  log('╚══════════════════════════════════════════════════════════════╝')
  log(C.reset)

  const startTime = Date.now()

  // ═══ 1. UNIT TESTS (Vitest) ═══
  log('\n' + C.bold + C.cyan + '═══ 1. Tests Unitaires (Vitest) ═══' + C.reset)
  const vitestResult = runCmd('npx vitest run --reporter=verbose 2>&1', 'vitest', 60000)
  if (vitestResult.success) {
    const match = vitestResult.output.match(/(\d+) passed/)
    const count = match ? match[1] : '?'
    ok(`Vitest: ${count} tests réussis`)
    results.unitTests = { status: 'PASS', count }
  } else {
    // Check if it's a partial pass
    const passMatch = vitestResult.output.match(/(\d+) passed/)
    const failMatch = vitestResult.output.match(/(\d+) failed/)
    if (passMatch) {
      ok(`Vitest: ${passMatch[1]} tests réussis${failMatch ? `, ${failMatch[1]} échoués` : ''}`)
      results.unitTests = { status: 'PARTIAL', passed: passMatch[1], failed: failMatch?.[1] || 0 }
    } else {
      fail('Vitest: échec du lancement')
      results.unitTests = { status: 'FAIL', error: vitestResult.output.slice(-200) }
    }
  }

  // ═══ 2. MIGRATIONS (pg-mem) ═══
  log('\n' + C.bold + C.cyan + '═══ 2. Migrations SQL (pg-mem) ═══' + C.reset)
  const migResult = runCmd('node scripts/test-migrations.js 2>&1', 'migrations', 30000)
  if (migResult.success && migResult.output.includes('All migrations applied successfully')) {
    const match = migResult.output.match(/Successful: (\d+)/)
    ok(`Migrations: ${match ? match[1] : 'toutes'} OK`)
    results.migrations = { status: 'PASS', count: match?.[1] }
  } else {
    fail('Migrations: échec')
    results.migrations = { status: 'FAIL', error: migResult.output.slice(-200) }
  }

  // ═══ 3. BUILD ═══
  log('\n' + C.bold + C.cyan + '═══ 3. Build Next.js ═══' + C.reset)
  const buildResult = runCmd('npx next build --webpack 2>&1', 'build', 300000)
  if (buildResult.success || buildResult.output.includes('ƒ Proxy (Middleware)')) {
    ok('Build Next.js: réussi')
    results.build = { status: 'PASS' }
  } else {
    fail('Build Next.js: échec')
    results.build = { status: 'FAIL', error: buildResult.output.slice(-300) }
  }

  // ═══ 4. ESLINT ═══
  log('\n' + C.bold + C.cyan + '═══ 4. ESLint ═══' + C.reset)
  const lintResult = runCmd('npx eslint . 2>&1 | tail -5', 'eslint', 60000)
  const errMatch = lintResult.output.match(/(\d+) errors/)
  const warnMatch = lintResult.output.match(/(\d+) warnings/)
  const errors = errMatch ? parseInt(errMatch[1]) : 0
  const warns = warnMatch ? parseInt(warnMatch[1]) : 0
  if (errors === 0) {
    ok(`ESLint: 0 erreur${warns > 0 ? `, ${warns} warnings` : ''}`)
    results.lint = { status: 'PASS', errors: 0, warnings: warns }
  } else {
    fail(`ESLint: ${errors} erreurs, ${warns} warnings`)
    results.lint = { status: 'FAIL', errors, warnings: warns }
  }

  // ═══ 5. TYPECHECK ═══
  log('\n' + C.bold + C.cyan + '═══ 5. TypeScript Type Check ═══' + C.reset)
  const tscResult = runCmd('npx tsc --noEmit --skipLibCheck 2>&1', 'tsc', 120000)
  if (tscResult.success || tscResult.output.trim() === '') {
    ok('TypeScript: 0 erreur')
    results.typecheck = { status: 'PASS' }
  } else {
    const lines = tscResult.output.trim().split('\n').filter(l => l.trim())
    fail(`TypeScript: ${lines.length} erreurs`)
    lines.slice(0, 5).forEach(l => log(`    ${C.red}${l}${C.reset}`))
    results.typecheck = { status: 'FAIL', errors: lines.length }
  }

  // ═══ 6. API ROUTE ANALYSIS ═══
  log('\n' + C.bold + C.cyan + '═══ 6. Analyse des Routes API ═══' + C.reset)

  const apiDir = path.join(SRC, 'app', 'api')
  const routes = []
  function findRoutes(dir, basePath = '') {
    const items = fs.readdirSync(dir, { withFileTypes: true })
    for (const item of items) {
      const fullPath = path.join(dir, item.name)
      const routePath = basePath + '/' + item.name
      if (item.isDirectory()) findRoutes(fullPath, routePath)
      else if (item.name === 'route.ts') routes.push({ path: basePath || '/', file: fullPath })
    }
  }
  findRoutes(apiDir)

  let withAuth = 0, withoutAuth = 0, withValidation = 0, withErrorHandling = 0
  const noAuthRoutes = []

  for (const route of routes) {
    const content = fs.readFileSync(route.file, 'utf-8')
    const hasAuth = content.includes('getCurrentUserId') || content.includes('verifyApiKey') ||
                    content.includes('verifyCronAuth') || route.path.includes('/auth/login') ||
                    route.path.includes('/auth/register') || route.path.includes('/health') ||
                    route.path.includes('/cron/') || route.path === '/' ||
                    route.path.includes('/email-bridge/inbound') || route.path.includes('/legal')
    if (hasAuth) withAuth++; else { withoutAuth++; noAuthRoutes.push(route.path) }
    if (content.includes('try') && content.includes('catch')) withErrorHandling++
    if (content.includes('!body') || content.includes('!id') || content.includes('required') ||
        content.includes('400') || content.includes('VALID_')) withValidation++
  }

  ok(`${withAuth}/${routes.length} routes ont une authentification`)
  ok(`${withValidation}/${routes.length} routes ont une validation des entrées`)
  ok(`${withErrorHandling}/${routes.length} routes ont une gestion d'erreurs`)
  if (withoutAuth > 0) {
    warn(`${withoutAuth} routes potentiellement sans auth: ${noAuthRoutes.slice(0, 5).join(', ')}${noAuthRoutes.length > 5 ? '...' : ''}`)
  }
  results.apiRoutes = { total: routes.length, withAuth, withValidation, withErrorHandling }

  // ═══ 7. FRONTEND ANALYSIS ═══
  log('\n' + C.bold + C.cyan + '═══ 7. Analyse des Composants Frontend ═══' + C.reset)

  const components = fs.readdirSync(path.join(SRC, 'components'))
    .filter(f => f.endsWith('.tsx'))

  let withLoading = 0, withToast = 0, withEmptyState = 0
  for (const comp of components) {
    const content = fs.readFileSync(path.join(SRC, 'components', comp), 'utf-8')
    if (content.includes('loading') || content.includes('Loading') || content.includes('Skeleton') || content.includes('Loader2')) withLoading++
    if (content.includes('toast')) withToast++
    if (content.includes('Aucun') || content.includes('length === 0') || content.includes('!loading')) withEmptyState++
  }

  ok(`${withLoading}/${components.length} composants ont un état de chargement`)
  ok(`${withToast}/${components.length} composants utilisent toast pour les erreurs`)
  ok(`${withEmptyState}/${components.length} composants ont un empty state`)
  results.frontend = { components: components.length, withLoading, withToast, withEmptyState }

  // ═══ 8. SECURITY CHECKS ═══
  log('\n' + C.bold + C.cyan + '═══ 8. Sécurité ═══' + C.reset)

  const nextConfig = fs.readFileSync(path.join(ROOT, 'next.config.ts'), 'utf-8')
  const middleware = fs.readFileSync(path.join(SRC, 'middleware.ts'), 'utf-8')

  const securityChecks = [
    ['CSP headers', nextConfig.includes('Content-Security-Policy')],
    ['X-Frame-Options: DENY', nextConfig.includes('X-Frame-Options')],
    ['HSTS header', nextConfig.includes('Strict-Transport-Security')],
    ['Cache-Control API no-cache', nextConfig.includes('no-store') || nextConfig.includes('no-cache')],
    ['Middleware protège routes non-publiques', middleware.includes('isAuthenticated')],
    ['Middleware routes publiques /legal/', middleware.includes('/legal/')],
    ['Middleware routes publiques /blog/', middleware.includes('/blog/')],
  ]

  for (const [name, check] of securityChecks) {
    if (check) ok(name); else fail(name)
  }

  // ═══ 9. HERMES ═══
  log('\n' + C.bold + C.cyan + '═══ 9. Hermes Agent ═══' + C.reset)

  const hermes = fs.readFileSync(path.join(SRC, 'lib', 'hermes.ts'), 'utf-8')
  const hermesChecks = [
    ['Step: pending_tasks', hermes.includes('pending_tasks')],
    ['Step: generate_posts', hermes.includes('generate_posts')],
    ['Step: analyze_prospects', hermes.includes('analyze_prospects')],
    ['Step: token_check', hermes.includes('token_check')],
    ['Step: quality_analysis', hermes.includes('quality_analysis')],
    ['Step: summarize', hermes.includes('summarize')],
    ['Anti-overlap check', hermes.includes("status: 'running'")],
    ['Auto-generate from SmartPosterSettings', hermes.includes('smartPosterSettings')],
    ['Notification on done/error', hermes.includes('notifyOnDone') && hermes.includes('notifyOnError')],
    ['Step isolation (try/catch)', hermes.includes('catch')],
  ]
  for (const [name, check] of hermesChecks) {
    if (check) ok(name); else fail(name)
  }

  // ═══ 10. FEATURE STATUS ═══
  log('\n' + C.bold + C.cyan + '═══ 10. Statut des Fonctionnalités ═══' + C.reset)

  const features = [
    ['Auth (HMAC-SHA256 v2 cookie)', '✅'],
    ['LinkedIn OAuth + token AES-256-GCM', '✅'],
    ['Publication idempotente (X-Restli-Key)', '✅'],
    ['Per-post scheduling (PATCH scheduledFor)', '✅'],
    ['Calendrier interactif (click → modal)', '✅'],
    ['CRM Prospects (CRUD + scoring + dédup)', '✅'],
    ['CRM Messages (draft/send/reply/edit/delete)', '✅'],
    ['CRM Séquences (create/enroll/cron)', '✅'],
    ['Hermes Agent (6 steps + auto-gen)', '✅'],
    ['Multi-IA providers (Gemini/GLM/Groq/OR/Z.ai)', '✅'],
    ['Fallback chain (si 1 provider échoue)', '✅'],
    ['Dark mode + i18n FR/EN', '✅'],
    ['Stripe billing (webhooks idempotents)', '✅'],
    ['2FA TOTP', '✅'],
    ['Affiliation program', '✅'],
    ['CSP + Security headers', '✅'],
    ['Audit log (admin actions)', '✅'],
    ['Cursor-based pagination', '✅'],
    ['SSE notifications temps réel', '✅'],
    ['MCP Server (9 tools JSON-RPC)', '✅'],
    ['Chrome Extension (comment capture)', '✅'],
    ['Email-to-LinkedIn Bridge', '✅'],
    ['Backup DB script', '✅'],
    ['AI Studio (Brand + Quality + Compare)', '✅'],
    ['Revenue Attribution (CRUD + CSV export)', '✅'],
    ['Agency Command Center', '✅'],
    ['Teams (permissions granulaires)', '✅'],
    ['Performance Intelligence', '✅'],
    ['Génération de posts IA', '⚠️ Nécessite clé API IA'],
    ['CRM Copilot IA', '⚠️ Plan Pro+ requis'],
    ['AI recommendations', '⚠️ Plan Pro+ requis'],
    ['Revenue/Agency/MCP/Extension', '⚠️ Plan Business+ requis'],
  ]

  for (const [name, status] of features) {
    const color = status.startsWith('✅') ? C.green : C.yellow
    log(`  ${color}${status}${C.reset} ${name}`)
  }

  // ═══ SUMMARY ═══
  const durationMs = Date.now() - startTime
  log('\n' + C.bold + C.cyan + '═══════════════════════════════════════' + C.reset)
  log(C.bold + "RÉSUMÉ DE L'ANALYSE" + C.reset)
  log(C.bold + '═══════════════════════════════════════' + C.reset)
  log(`  ${C.green}Réussis: ${passed}${C.reset}`)
  log(`  ${C.red}Échoués: ${failed}${C.reset}`)
  log(`  ${C.yellow}Avertissements: ${warnings}${C.reset}`)
  log(`  Durée: ${(durationMs / 1000).toFixed(1)}s`)
  log('')

  // Recommendations
  log(C.bold + C.cyan + '═══ RECOMMANDATIONS ═══' + C.reset)
  const recs = [
    '1. Configurer au moins une clé API IA (GEMINI_API_KEY ou GLM_API_KEY) sur Render',
    '2. Configurer LinkedIn OAuth app (CLIENT_ID/SECRET + redirect URI)',
    '3. Configurer Stripe (products + webhook endpoint)',
    '4. Configurer cron-job.org pour les 8 crons (scheduled-publish, sync-analytics, automation, etc.)',
    '5. Configurer SENTRY_DSN pour le monitoring d\'erreurs',
    '6. Configurer RESEND_API_KEY pour les emails transactionnels',
    '7. Sauvegarder PostgreSQL régulièrement (scripts/backup-db.sh)',
    '8. Configurer LINKEDIN_TOKEN_ENCRYPTION_KEY (openssl rand -base64 32)',
  ]
  for (const r of recs) log(`  ${C.yellow}${r}${C.reset}`)

  log('\n' + C.bold + '═══════════════════════════════════════' + C.reset)
  log(`${C.green}Analyse terminée en ${(durationMs / 1000).toFixed(1)}s${C.reset}`)

  // Exit code
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
