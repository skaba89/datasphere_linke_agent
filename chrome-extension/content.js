// ============================================================
// DataSphere Chrome Extension — Content Script
//
// Tourne sur les pages LinkedIn (feed, posts, profil)
// Capture les commentaires visibles et les envoie au background
// worker pour transmission vers DataSphere.
// ============================================================

(function () {
  'use strict'

  // Éviter double-injection
  if (window.__datasphereExtensionLoaded) return
  window.__datasphereExtensionLoaded = true

  const PROCESSED_ATTR = 'data-ds-processed'

  // ============================================================
  // Extract comments from the current page DOM
  // ============================================================
  function extractComments() {
    const comments = []

    // LinkedIn comment selectors (juin 2024, peut nécessiter MAJ)
    // Les commentaires sont dans des <article> avec role="article"
    // ou des div avec data-test-id="comments-comment
    const commentElements = document.querySelectorAll(
      '[data-test-id="comments-comment"], ' +
      '.comments-comment-item, ' +
      'article.comments-comment-item, ' +
      'div[class*="comments-comment-item__comment"]'
    )

    const currentUrl = window.location.href
    // Extraire l'URN du post depuis l'URL si possible
    // Format: https://www.linkedin.com/posts/username_urn-ou-slug-activity-123456
    let postUrn = null
    const urnMatch = currentUrl.match(/activity-(\d+)/)
    if (urnMatch) {
      postUrn = `urn:li:activity:${urnMatch[1]}`
    }

    commentElements.forEach(el => {
      // Éviter de re-traiter le même commentaire
      if (el.hasAttribute(PROCESSED_ATTR)) return

      // Nom du commentateur
      const nameEl = el.querySelector(
        '[data-test-id="comment-author-name"], ' +
        '.comments-comment-item__actor-name, ' +
        'a span[dir="ltr"], ' +
        'span.comments-comment-item__actor-name'
      )
      // Texte du commentaire
      const textEl = el.querySelector(
        '[data-test-id="comment-text"], ' +
        '.comments-comment-item__comment-text, ' +
        'p.comments-comment-item__comment-text, ' +
        'div[class*="comments-comment-item__comment-text"]'
      )

      if (!nameEl || !textEl) return

      const commenterName = nameEl.textContent?.trim() || ''
      const commenterText = textEl.textContent?.trim() || ''

      if (commenterName.length < 2 || commenterText.length < 2) return
      // Ignorer ses propres commentaires (le user est le propriétaire du post)
      // On ne peut pas savoir avec certitude, donc on envoie tout et le serveur dédupliquera

      comments.push({
        commenterName,
        commenterText,
        postUrl: currentUrl,
        postUrn: postUrn,
        commentUrl: currentUrl,
        timestamp: new Date().toISOString(),
      })

      el.setAttribute(PROCESSED_ATTR, 'true')
    })

    return comments
  }

  // ============================================================
  // Send comments to background worker
  // ============================================================
  function sendComments(comments) {
    if (comments.length === 0) return
    chrome.runtime.sendMessage({
      type: 'DATASPHERE_COMMENTS_CAPTURED',
      payload: comments,
    })
  }

  // ============================================================
  // Scan + send
  // ============================================================
  function scanAndSend() {
    const comments = extractComments()
    if (comments.length > 0) {
      console.log(`[DataSphere] ${comments.length} commentaire(s) capturé(s)`)
      sendComments(comments)
    }
  }

  // ============================================================
  // MutationObserver : détecter les nouveaux commentaires chargés
  // ============================================================
  let scanTimeout = null
  const observer = new MutationObserver(() => {
    // Debounce: attendre 1s après le dernier changement DOM
    if (scanTimeout) clearTimeout(scanTimeout)
    scanTimeout = setTimeout(scanAndSend, 1000)
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  // Scan initial après 3s (laisser le DOM se stabiliser)
  setTimeout(scanAndSend, 3000)

  // Re-scan toutes les 30s (au cas où l'observer rate quelque chose)
  setInterval(scanAndSend, 30000)

  console.log('[DataSphere] Content script loaded on', window.location.href)
})()
