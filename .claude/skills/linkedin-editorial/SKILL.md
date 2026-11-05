---
name: linkedin-editorial
description: Préparer des contenus LinkedIn fiables et conformes aux règles DataSphere, à partir d'un brief, sans publication automatique.
---
# LinkedIn Editorial — DataSphere

## Périmètre
Ce skill est réservé au dépôt `skaba89/datasphere_linke_agent`. Il n'inclut aucun workflow TikTok ou Instagram. Lire `docs/AI_AGENT_INTEGRATION.md` avant tout usage.

## Entrées
Demander seulement les informations essentielles absentes : public cible, objectif, sujet, ton, langue (FR par défaut), offre et appel à l'action. Ne jamais inventer des chiffres, témoignages, citations ou résultats clients.

## Production
1. Identifier le persona, le problème et la promesse vérifiable.
2. Proposer trois angles distincts et leurs accroches.
3. Rédiger un brouillon LinkedIn clair, concret et accessible, avec un appel à l'action pertinent.
4. Ajouter 3 à 5 hashtags seulement s'ils sont pertinents.
5. Vérifier les faits, la confidentialité, l'originalité, l'absence de spam et de promesses non fondées.
6. Renvoyer un objet structuré : `title`, `content`, `hashtags`, `audience`, `objective`, `sources_to_verify`, `approval_required: true`.

## Intégration
Si le MCP DataSphere est déjà configuré et authentifié, utiliser uniquement `create_post` pour enregistrer un brouillon au statut `pending`. Ne pas accéder directement à la base de données. Ne pas déclencher publication, envoi de messages, prospection automatisée ou modification d'abonnement. Ne jamais demander ni imprimer de jetons OAuth ou de clés API.

## Validation
Confirmer le statut `pending` après création. Si le MCP n'est pas disponible, renvoyer simplement le brouillon pour saisie manuelle. Toute publication exige une approbation humaine explicite et les permissions LinkedIn requises.
