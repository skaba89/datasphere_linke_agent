# DataSphere — Chrome Extension

Capture les commentaires LinkedIn et les envoie vers DataSphere pour auto-réponse IA.

## Installation

1. Ouvrez `chrome://extensions/` dans Chrome
2. Activez le **Mode développeur** (en haut à droite)
3. Cliquez sur **Charger l'extension non empaquetée**
4. Sélectionnez le dossier `chrome-extension/`
5. L'icône DataSphere apparaît dans la barre d'outils

## Configuration

1. Cliquez sur l'icône DataSphere dans la barre d'outils
2. Entrez l'URL de votre serveur DataSphere (défaut: `https://datasphere-sq19.onrender.com`)
3. Entrez votre **clé API** (`dsk_live_...`) — créez-en une dans DataSphere → Paramètres → API Keys
   - ⚠️ Plan Business requis
4. Cliquez **Enregistrer** puis **Tester la connexion**

## Utilisation

1. Naviguez sur LinkedIn (feed, posts, profil)
2. L'extension capture automatiquement les commentaires visibles
3. Les commentaires sont envoyés à DataSphere
4. L'IA génère des réponses (visible dans DataSphere → Commentaires)
5. Approuvez et publiez les réponses d'un clic

## Fonctionnalités

- ✅ Capture automatique des commentaires (MutationObserver)
- ✅ Déduplication (évite les doublons sur 24h)
- ✅ Détection du post URN LinkedIn
- ✅ Test de connexion intégré
- ✅ Re-scan toutes les 30 secondes
- ✅ Fonctionne sur le feed, les posts individuels et les profils

## Sécurité

- La clé API est stockée via `chrome.storage.sync` (chiffrée par Chrome)
- Les commentaires sont envoyés uniquement vers votre serveur DataSphere configuré
- Aucune donnée n'est envoyée vers des tiers

## Dépannage

| Problème | Solution |
|---|---|
| "Clé API invalide" | Vérifiez que la clé commence par `dsk_live_` |
| "Plan Business requis" | Upgradez vers le plan Business dans DataSphere |
| Aucun commentaire capturé | Vérifiez que vous êtes sur `linkedin.com/feed` ou `/posts/` |
| Sélecteurs LinkedIn périmés | LinkedIn change souvent son DOM. Éditez `content.js` si besoin |

## Développement

```
chrome-extension/
├── manifest.json    # Manifest V3
├── background.js    # Service worker (envoi vers API)
├── content.js       # Script de capture (tourne sur LinkedIn)
├── popup.html       # Interface de configuration
├── popup.js         # Logique du popup
└── icons/           # Icônes 16/48/128px
```

## Compatibilité

- Chrome / Edge / Brave / Opera (Chromium-based)
- Manifest V3
- Permissions: `storage`, `activeTab`, `scripting`
- Host permissions: `linkedin.com`, votre serveur DataSphere
