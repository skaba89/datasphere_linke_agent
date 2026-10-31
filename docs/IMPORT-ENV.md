# Importer votre .env sur Render

Vous avez un fichier `datasphere_linke_agent.env` rempli en local ? Voici 3 méthodes pour l'importer sur Render.

---

## 🚀 Méthode 1 : Script API Render (recommandé, automatique)

Importe toutes les variables en une seule commande via l'API Render.

### Prérequis
1. **API key Render** : https://dashboard.render.com/u/settings#api-keys → "Create API key"
2. **Service ID** : Dans l'URL de votre service sur Render dashboard
   - URL : `https://dashboard.render.com/web/srv-XXXXXXXXX`
   - Service ID = `srv-XXXXXXXXX`

### Commande

```bash
# En local, dans le dossier du projet
./scripts/import-env-to-render.sh datasphere_linke_agent.env srv-XXXXXXXXX rnd_XXXXXXXXX
```

### Résultat
- ✅ Toutes les variables importées en une fois
- ✅ Render redéploie automatiquement
- ✅ Aucune manipulation manuelle

---

## 📋 Méthode 2 : Copier-coller Render UI (simple)

Convertit votre .env en format prêt à coller dans l'interface Render.

### Étapes

```bash
# En local
./scripts/env-to-render-ui.sh datasphere_linke_agent.env
```

**Copiez la sortie**, puis :

1. Allez sur https://dashboard.render.com
2. Sélectionnez votre service `datasphere`
3. Onglet **Environment**
4. Cliquez **Add Environment Variable**
5. Dans le champ de saisie, collez toutes les lignes (format `KEY=value`)
6. Render détecte automatiquement chaque variable
7. **Save Changes** → Render redéploie

---

## 🛠️ Méthode 3 : Manuel (au cas où)

Si les scripts ne marchent pas, ajoutez chaque variable manuellement :

1. Render dashboard → service → Environment
2. Pour chaque variable de votre `.env` :
   - Cliquez **Add Environment Variable**
   - Key : le nom (ex: `JWT_SECRET`)
   - Value : la valeur
   - Save

---

## ⚠️ Variables à NE PAS importer

Ces variables sont gérées automatiquement par Render, ne les importez pas :

| Variable | Pourquoi |
|---|---|
| `DATABASE_URL` | Auto-injectée depuis PostgreSQL (render.yaml) |
| `RENDER_EXTERNAL_URL` | Auto-exposée par Render |
| `RENDER_SERVICE_NAME` | Auto-exposée par Render |
| `PORT` | Déjà dans render.yaml (= 10000) |
| `HOSTNAME` | Déjà dans render.yaml (= 0.0.0.0) |
| `NODE_ENV` | Déjà dans render.yaml (= production) |

Le script `import-env-to-render.sh` filtre automatiquement les valeurs vides.

---

## ✅ Vérification post-import

Après l'import, attendez le redéploiement (~2-3 min), puis :

```bash
# Test 1 : Health check
curl https://VOTRE-APP.onrender.com/api/health

# Doit retourner :
# {
#   "status": "ok",
#   "envVars": {
#     "JWT_SECRET": true,         # ✅
#     "DATABASE_URL": true,        # ✅ (auto)
#     "RENDER_EXTERNAL_URL": "https://...",  # ✅ (auto)
#     ...
#   },
#   "integrations": {
#     "linkedin": { "configured": true },    # ✅ si LINKEDIN_* importés
#     "stripe": { "configured": true },      # ✅ si STRIPE_* importés
#     "resend": { "configured": true },      # ✅ si RESEND_API_KEY importé
#     "telegram": { "configured": true },    # ✅ si TELEGRAM_* importés
#     "whatsapp": { "configured": true }     # ✅ si WHATSAPP_* importés
#   }
# }
```

Visitez aussi :
- `https://VOTRE-APP.onrender.com/setup` → guide interactif
- `https://VOTRE-APP.onrender.com/` → landing page

---

## 🐛 Dépannage

### Erreur : "Service not found or API key invalid"
- Vérifiez le Service ID (commence par `srv-`)
- Vérifiez que votre API key Render a bien accès au service

### Erreur : "Variable names not allowed"
- Render n'accepte pas les espaces dans les noms de variables
- Le script gère ça automatiquement, mais en cas de souci, vérifiez votre .env

### Variables non prises en compte après import
- Render met ~30s à propager les nouvelles variables
- Un redéploiement est nécessaire (auto si autoDeploy=true)
- Vérifiez sur le dashboard Render → Environment que vos variables sont là

### Le service ne démarre pas après import
- Vérifiez les logs Render (dashboard → Logs)
- Visitez `/api/health` pour diagnostiquer
- Visitez `/setup` pour le guide interactif
