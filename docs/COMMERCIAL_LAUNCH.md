# DataSphere 360 — Plan de Lancement Commercial

## Phase 1 : Bêta privée (Semaines 1-2)

### Objectif
10-20 utilisateurs bêta testent les parcours clés en conditions réelles.

### Prérequis
- [ ] CI vert sur main
- [ ] P0 fixes déployés (PR #16)
- [ ] Au moins 1 clé API IA configurée (GEMINI_API_KEY ou GLM_API_KEY)
- [ ] LinkedIn OAuth app configurée (redirect URI = URL Render)
- [ ] Stripe en mode TEST (pas de paiement réel)
- [ ] cron-job.org configuré (8 crons)
- [ ] Sentry DSN configuré
- [ ] Backup DB testé + restauration vérifiée

### Parcours à valider
1. **Inscription** → email + password → onboarding
2. **Connexion LinkedIn** → OAuth → compte lié
3. **Génération de posts** → IA génère 3 posts → visible dans Posts tab
4. **Approbation + planification** → approuver un post → calendrier → planifier
5. **Publication** → publier manuellement → statut "published"
6. **CRM** → ajouter prospect → créer message → envoyer
7. **Hermes** → activer → lancer manuellement → voir les résultats
8. **Analytics** → KPIs affichés (même si 0 vues)
9. **Stripe** → checkout en mode test → plan Pro → webhook traité
10. **2FA** → setup → login avec 2FA → vérifier le flow complet

### Feedback
- Formulaire Typeform ou Google Form
- Canal Slack/Discord pour les bêta-testeurs
- Tags sur GitHub Issues : `beta-feedback`, `bug`, `enhancement`

## Phase 2 : Bêta publique (Semaines 3-4)

### Objectif
50-100 utilisateurs, accès libre avec essai Pro 14 jours.

### Prérequis
- [ ] Tous les bugs P0/P1 de la bêta privée corrigés
- [ ] Stripe en mode LIVE
- [ ] Documentation utilisateur (guide de démarrage)
- [ ] Page de pricing fonctionnelle
- [ ] CGU + politique de confidentialité visibles
- [ ] Email support : support@datasphere.app (ou Resend)

### Acquisition
- Product Hunt launch
- Posts LinkedIn (fondateur + early adopters)
- Communautés : IndieHackers, Reddit r/SaaS, r/LinkedIn
- Partenariat avec influenceurs LinkedIn

### Métriques à suivre
| Métrique | Cible semaine 3 | Cible semaine 4 |
|---|---|---|
| Inscriptions | 50 | 100 |
| LinkedIn connectés | 30 (60%) | 60 (60%) |
| Posts générés | 150 | 400 |
| Posts publiés | 30 (20%) | 80 (20%) |
| Conversion Pro | 5 (10%) | 10 (10%) |
| Churn | < 20% | < 30% |
| NPS | > 7 | > 7 |

## Phase 3 : Lancement commercial (Semaines 5-8)

### Objectif
500+ utilisateurs, 50+ abonnés payants, MRR > 1500€

### Prérequis
- [ ] Tous les bugs de la bêta publique corrigés
- [ ] Performance validée (temps de réponse < 2s)
- [ ] Backup automatique en place
- [ ] Monitoring Sentry actif
- [ ] Support email réactif (< 24h réponse)
- [ ] Blog SEO (3+ articles)
- [ ] Landing page optimisée (A/B test CTA)

### Tarification

| Plan | Prix/mois | Fonctionnalités |
|---|---|---|
| Free | 0€ | 3 posts/jour, 1 compte LinkedIn, analytics 14j |
| Pro | 29€ | 20 posts/jour, 3 comptes, AI Studio, Hermes, CRM Copilot, analytics 90j |
| Business | 79€ | 100 posts/jour, 5 sièges équipe, API publique, MCP, Revenue Attribution, Agency Command Center |

### Canaux d'acquisition
1. **SEO** : "automatisation LinkedIn IA", "planificateur LinkedIn gratuit"
2. **LinkedIn Ads** : ciblage B2B, CPC < 2€
3. **Affiliation** : 20% commission récurrente (programme intégré)
4. **Content marketing** : blog + LinkedIn + YouTube
5. **Partenariats** : agences marketing, consultants LinkedIn

### Roadmap produit post-lancement

| Fonctionnalité | Priorité | Effort | Valeur |
|---|---|---|---|
| AI Campaign Planner | Haute | Moyen | Différenciant |
| Carrousels LinkedIn | Haute | Élevé | Très demandé |
| Rapports clients PDF | Moyenne | Faible | Agences |
| Knowledge Base IA | Moyenne | Moyen | Rétention |
| White-label agences | Faible | Élevé | ARR agences |
| PWA / Mobile | Faible | Élevé | UX |

## Risques commerciaux

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| LinkedIn change son API | Moyenne | Élevé | Surveiller LinkedIn developers blog |
| Concurrent avec plus de budget | Élevée | Moyen | Niche Hermès + CRM + MCP |
| Coûts IA excessifs | Moyenne | Élevé | Quotas par plan + monitoring |
| Churn élevé | Moyenne | Élevé | Onboarding + Hermes + valeur rapide |
| Stripe bloque le compte | Faible | Critique | Comptes séparés, KYC en règle |
