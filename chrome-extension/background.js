// ============================================================
// DataSphere Chrome Extension — Background Service Worker
//
// Reçoit les commentaires du content script et les envoie
// vers l'API DataSphere.
// Stocke la configuration (URL + API key) via chrome.storage.
// ============================================================

const DEFAULT_API_URL = 'https://datasphere-sq19.onrender.com'

// ============================================================
// Listen for messages from content script
// ============================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DATASPHERE_COMMENTS_CAPTURED') {
    handleCommentsCaptured(message.payload)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }))
    return true // async response
  }

  if (message.type === 'DATASPHERE_TEST_CONNECTION') {
    testConnection()
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }))
    return true
  }
})

// ============================================================
// Handle captured comments
// ============================================================
async function handleCommentsCaptured(comments) {
  const config = await getConfig()
  if (!config.apiKey) {
    console.log('[DataSphere] No API key configured, skipping')
    return { success: false, error: 'No API key configured' }
  }

  try {
    const res = await fetch(`${config.apiUrl}/api/extension/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ comments }),
    })

    const data = await res.json()
    if (!data.success) {
      console.error('[DataSphere] API error:', data.error)
      return { success: false, error: data.error }
    }

    console.log('[DataSphere] Comments sent:', data.data)
    return { success: true, data: data.data }
  } catch (err) {
    console.error('[DataSphere] Fetch error:', err)
    return { success: false, error: err.message }
  }
}

// ============================================================
// Test connection (used by popup)
// ============================================================
async function testConnection() {
  const config = await getConfig()
  if (!config.apiKey) {
    return { success: false, error: 'API key not configured' }
  }
  try {
    const res = await fetch(`${config.apiUrl}/api/extension/comments`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${config.apiKey}` },
    })
    if (res.status === 401) {
      return { success: false, error: 'API key invalide ou plan Business requis' }
    }
    if (res.status === 403) {
      return { success: false, error: 'Plan Business requis pour cette fonctionnalité' }
    }
    const data = await res.json()
    return { success: data.success, data: data.data }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// ============================================================
// Get config from storage
// ============================================================
async function getConfig() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['apiUrl', 'apiKey'], result => {
      resolve({
        apiUrl: result.apiUrl || DEFAULT_API_URL,
        apiKey: result.apiKey || '',
      })
    })
  })
}

// ============================================================
// On install: open options page
// ============================================================
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    console.log('[DataSphere] Extension installed')
  }
})
