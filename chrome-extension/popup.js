// ============================================================
// DataSphere Chrome Extension — Popup Script
//
// Gère la configuration (URL + API key) via chrome.storage.sync
// ============================================================

const DEFAULT_API_URL = 'https://datasphere-sq19.onrender.com'

document.addEventListener('DOMContentLoaded', async () => {
  const urlInput = document.getElementById('apiUrl')
  const keyInput = document.getElementById('apiKey')
  const saveBtn = document.getElementById('save')
  const testBtn = document.getElementById('test')
  const statusEl = document.getElementById('status')

  // Load saved config
  const config = await new Promise(resolve => {
    chrome.storage.sync.get(['apiUrl', 'apiKey'], resolve)
  })
  urlInput.value = config.apiUrl || DEFAULT_API_URL
  keyInput.value = config.apiKey || ''

  function showStatus(message, type) {
    statusEl.textContent = message
    statusEl.className = `status ${type}`
    setTimeout(() => {
      statusEl.className = 'status'
    }, 5000)
  }

  // Save config
  saveBtn.addEventListener('click', () => {
    const apiUrl = urlInput.value.trim()
    const apiKey = keyInput.value.trim()

    if (!apiUrl) {
      showStatus('URL du serveur requise', 'error')
      return
    }
    if (!apiKey || !apiKey.startsWith('dsk_live_')) {
      showStatus('Clé API invalide (doit commencer par dsk_live_)', 'error')
      return
    }

    chrome.storage.sync.set({ apiUrl, apiKey }, () => {
      showStatus('Configuration enregistrée ✓', 'success')
    })
  })

  // Test connection
  testBtn.addEventListener('click', () => {
    const apiUrl = urlInput.value.trim()
    const apiKey = keyInput.value.trim()

    if (!apiUrl || !apiKey) {
      showStatus('Configurez URL et clé API d\'abord', 'error')
      return
    }

    // Save first, then test
    chrome.storage.sync.set({ apiUrl, apiKey }, async () => {
      testBtn.textContent = 'Test en cours...'
      testBtn.disabled = true

      try {
        const res = await fetch(`${apiUrl}/api/extension/comments`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${apiKey}` },
        })

        if (res.status === 401) {
          showStatus('Clé API invalide', 'error')
        } else if (res.status === 403) {
          showStatus('Plan Business requis', 'error')
        } else if (res.ok) {
          const data = await res.json()
          showStatus(`Connexion OK ✓ (${data.data.endpoint})`, 'success')
        } else {
          showStatus(`Erreur ${res.status}`, 'error')
        }
      } catch (err) {
        showStatus(`Erreur: ${err.message}`, 'error')
      } finally {
        testBtn.textContent = 'Tester la connexion'
        testBtn.disabled = false
      }
    })
  })
})
