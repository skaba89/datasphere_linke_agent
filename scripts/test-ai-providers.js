// ============================================================
// Test réel des providers IA
// Teste chaque provider avec un prompt simple et vérifie
// que la réponse est valide.
//
// Usage: node scripts/test-ai-providers.js
// ============================================================

const TEST_PROMPT = {
  system: 'Tu es un assistant. Réponds brièvement en français.',
  user: 'Dis "Bonjour" en un mot.',
}

const COLORS = {
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', reset: '\x1b[0m', bold: '\x1b[1m',
}

function log(msg, color = COLORS.reset) {
  console.log(`${color}${msg}${COLORS.reset}`)
}

// ============================================================
// Provider 1: Gemini
// ============================================================
async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    log('  ⚠ GEMINI_API_KEY non configuré', COLORS.yellow)
    return false
  }

  log('  Test Gemini...', COLORS.blue)

  // 1. ListModels pour trouver un modèle
  let model = null
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    )
    if (listRes.ok) {
      const data = await listRes.json()
      const models = data.models || []
      const flash = models.find((m) =>
        m.supportedGenerationMethods?.includes('generateContent') &&
        (m.name?.toLowerCase().includes('flash'))
      )
      model = flash?.name?.replace('models/', '') || null
      if (model) {
        log(`    Modèle trouvé: ${model}`, COLORS.green)
      }
    } else {
      const errText = await listRes.text()
      log(`    ListModels échec: ${listRes.status} ${errText.slice(0, 200)}`, COLORS.red)
    }
  } catch (err) {
    log(`    ListModels erreur: ${err.message}`, COLORS.red)
  }

  // 2. Fallback modèles connus
  if (!model) {
    const fallbacks = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest']
    for (const m of fallbacks) {
      try {
        const testRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
              generationConfig: { maxOutputTokens: 5 },
            }),
          }
        )
        if (testRes.ok) {
          model = m
          log(`    Modèle fallback: ${m}`, COLORS.green)
          break
        }
      } catch {}
    }
  }

  if (!model) {
    log('  ✗ Gemini: aucun modèle disponible', COLORS.red)
    return false
  }

  // 3. Test réel
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: TEST_PROMPT.system }] },
          contents: [{ role: 'user', parts: [{ text: TEST_PROMPT.user }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 50 },
        }),
      }
    )
    if (res.ok) {
      const data = await res.json()
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      log(`  ✓ Gemini OK — réponse: "${content.trim().slice(0, 50)}"`, COLORS.green)
      return true
    } else {
      const err = await res.text()
      log(`  ✗ Gemini échec: ${res.status} ${err.slice(0, 200)}`, COLORS.red)
      return false
    }
  } catch (err) {
    log(`  ✗ Gemini erreur: ${err.message}`, COLORS.red)
    return false
  }
}

// ============================================================
// Provider 2: GLM (open.bigmodel.cn)
// ============================================================
async function testGLM() {
  const apiKey = process.env.GLM_API_KEY
  if (!apiKey) {
    log('  ⚠ GLM_API_KEY non configuré', COLORS.yellow)
    return false
  }

  log('  Test GLM (open.bigmodel.cn)...', COLORS.blue)

  try {
    const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [
          { role: 'system', content: TEST_PROMPT.system },
          { role: 'user', content: TEST_PROMPT.user },
        ],
        temperature: 0.7,
        max_tokens: 50,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content || ''
      log(`  ✓ GLM OK — réponse: "${content.trim().slice(0, 50)}"`, COLORS.green)
      return true
    } else {
      const err = await res.text()
      log(`  ✗ GLM échec: ${res.status} ${err.slice(0, 200)}`, COLORS.red)
      return false
    }
  } catch (err) {
    log(`  ✗ GLM erreur: ${err.message}`, COLORS.red)
    return false
  }
}

// ============================================================
// Provider 3: Z.ai (chat.z.ai — natif HTTP)
// ============================================================
async function testZAI() {
  const apiKey = process.env.ZAI_API_KEY || process.env.GLM_API_KEY
  if (!apiKey) {
    log('  ⚠ ZAI_API_KEY (ou GLM_API_KEY) non configuré', COLORS.yellow)
    return false
  }

  const apiUrl = process.env.ZAI_API_URL || 'https://api.z.ai/api/paas/v4/chat/completions'
  const model = process.env.ZAI_MODEL || 'glm-4-flash'

  log(`  Test Z.ai (${apiUrl}) modèle=${model}...`, COLORS.blue)

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: TEST_PROMPT.system },
          { role: 'user', content: TEST_PROMPT.user },
        ],
        temperature: 0.7,
        max_tokens: 50,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content || ''
      log(`  ✓ Z.ai OK — réponse: "${content.trim().slice(0, 50)}"`, COLORS.green)
      return true
    } else {
      const err = await res.text()
      log(`  ✗ Z.ai échec: ${res.status} ${err.slice(0, 200)}`, COLORS.red)

      // Si 404, essayer l'URL alternative
      if (res.status === 404 && !process.env.ZAI_API_URL) {
        log('  → Tentative URL alternative: https://open.bigmodel.cn/api/paas/v4/chat/completions', COLORS.yellow)
        try {
          const res2 = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: TEST_PROMPT.system },
                { role: 'user', content: TEST_PROMPT.user },
              ],
              temperature: 0.7,
              max_tokens: 50,
            }),
          })
          if (res2.ok) {
            const data2 = await res2.json()
            const content2 = data2.choices?.[0]?.message?.content || ''
            log(`  ✓ Z.ai OK (URL alt) — réponse: "${content2.trim().slice(0, 50)}"`, COLORS.green)
            log('  💡 Recommandation: définir ZAI_API_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions', COLORS.yellow)
            return true
          }
        } catch {}
      }
      return false
    }
  } catch (err) {
    log(`  ✗ Z.ai erreur: ${err.message}`, COLORS.red)
    return false
  }
}

// ============================================================
// Provider 4: Groq
// ============================================================
async function testGroq() {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    log('  ⚠ GROQ_API_KEY non configuré', COLORS.yellow)
    return false
  }

  log('  Test Groq...', COLORS.blue)

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: TEST_PROMPT.system },
          { role: 'user', content: TEST_PROMPT.user },
        ],
        temperature: 0.7,
        max_tokens: 50,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content || ''
      log(`  ✓ Groq OK — réponse: "${content.trim().slice(0, 50)}"`, COLORS.green)
      return true
    } else {
      const err = await res.text()
      log(`  ✗ Groq échec: ${res.status} ${err.slice(0, 200)}`, COLORS.red)
      return false
    }
  } catch (err) {
    log(`  ✗ Groq erreur: ${err.message}`, COLORS.red)
    return false
  }
}

// ============================================================
// Provider 5: OpenRouter
// ============================================================
async function testOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    log('  ⚠ OPENROUTER_API_KEY non configuré', COLORS.yellow)
    return false
  }

  log('  Test OpenRouter...', COLORS.blue)

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://datasphere.app',
        'X-Title': 'DataSphere',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          { role: 'system', content: TEST_PROMPT.system },
          { role: 'user', content: TEST_PROMPT.user },
        ],
        temperature: 0.7,
        max_tokens: 50,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content || ''
      log(`  ✓ OpenRouter OK — réponse: "${content.trim().slice(0, 50)}"`, COLORS.green)
      return true
    } else {
      const err = await res.text()
      log(`  ✗ OpenRouter échec: ${res.status} ${err.slice(0, 200)}`, COLORS.red)
      return false
    }
  } catch (err) {
    log(`  ✗ OpenRouter erreur: ${err.message}`, COLORS.red)
    return false
  }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  log(COLORS.bold + COLORS.cyan)
  log('╔══════════════════════════════════════════════════╗')
  log('║   DataSphere 360 — Test des Providers IA          ║')
  log('╚══════════════════════════════════════════════════╝')
  log(COLORS.reset)

  log('\nVérification des variables d\'environnement:\n')

  const envVars = ['GEMINI_API_KEY', 'GLM_API_KEY', 'ZAI_API_KEY', 'GROQ_API_KEY', 'OPENROUTER_API_KEY']
  for (const v of envVars) {
    const val = process.env[v]
    if (val) {
      log(`  ✓ ${v}: ${val.slice(0, 8)}...${val.slice(-4)}`, COLORS.green)
    } else {
      log(`  ✗ ${v}: non configuré`, COLORS.dim || COLORS.reset)
    }
  }

  log('\n' + COLORS.bold + COLORS.cyan + '═══ Tests des providers ═══' + COLORS.reset + '\n')

  const results = {}

  log(COLORS.bold + '1. Google Gemini' + COLORS.reset)
  results.gemini = await testGemini()

  log('\n' + COLORS.bold + '2. GLM (open.bigmodel.cn)' + COLORS.reset)
  results.glm = await testGLM()

  log('\n' + COLORS.bold + '3. Z.ai (chat.z.ai — natif HTTP)' + COLORS.reset)
  results.zai = await testZAI()

  log('\n' + COLORS.bold + '4. Groq' + COLORS.reset)
  results.groq = await testGroq()

  log('\n' + COLORS.bold + '5. OpenRouter' + COLORS.reset)
  results.openrouter = await testOpenRouter()

  // Summary
  log('\n' + COLORS.bold + COLORS.cyan + '═══════════════════════════════════════' + COLORS.reset)
  log(COLORS.bold + 'RÉSUMÉ' + COLORS.reset)
  log(COLORS.bold + '═══════════════════════════════════════' + COLORS.reset)

  const working = Object.entries(results).filter(([_, v]) => v === true)
  const failed = Object.entries(results).filter(([_, v]) => v === false)
  const skipped = Object.entries(results).filter(([_, v]) => v === null)

  log(`  ${COLORS.green}Providers fonctionnels: ${working.length}${COLORS.reset}`)
  working.forEach(([name]) => log(`    ${COLORS.green}✓ ${name}${COLORS.reset}`))

  if (failed.length > 0) {
    log(`  ${COLORS.red}Providers en échec: ${failed.length}${COLORS.reset}`)
    failed.forEach(([name]) => log(`    ${COLORS.red}✗ ${name}${COLORS.reset}`))
  }

  if (skipped.length > 0) {
    log(`  ${COLORS.yellow}Providers non configurés: ${skipped.length}${COLORS.reset}`)
  }

  log('\n' + COLORS.bold + '═══════════════════════════════════════' + COLORS.reset)

  if (working.length > 0) {
    log(`\n${COLORS.green}✅ Au moins un provider IA fonctionne !${COLORS.reset}`)
    log(`${COLORS.green}   Les fonctionnalités IA (génération de posts, Hermes, Brand Studio, etc.)${COLORS.reset}`)
    log(`${COLORS.green}   utiliseront le provider: ${working[0][0]}${COLORS.reset}`)
  } else {
    log(`\n${COLORS.red}❌ Aucun provider IA ne fonctionne.${COLORS.reset}`)
    log(`${COLORS.yellow}   Configurez au moins une clé API sur Render:${COLORS.reset}`)
    log(`   - GEMINI_API_KEY: https://aistudio.google.com/apikey`)
    log(`   - GLM_API_KEY: https://open.bigmodel.cn/usercenter/apikeys`)
    log(`   - GROQ_API_KEY: https://console.groq.com/keys`)
  }

  process.exit(working.length > 0 ? 0 : 1)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
