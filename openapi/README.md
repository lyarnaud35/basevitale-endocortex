# OpenAPI – Source de vérité pour le SDK (Golden Master)

Ce dossier contient le spec OpenAPI extrait de l’API. **Aucun code client ne doit être écrit à la main** : le frontend consomme le SDK généré.

**Génération :** `npm run sdk:gen:file` utilise un script standalone (sans Orval/Spectral), car Orval plante sous Node 20 et 24 (Spectral/AJV). Le script lit `openapi/base-vitale.json` et écrit les hooks dans `libs/ghost-sdk/src/lib/generated/`.

## Phase 1 : Node 20 pour le reste du projet

Le projet exige **Node 20 LTS** pour NestJS et Next.js. La génération du SDK (standalone) fonctionne avec toute version de Node.

→ **Voir [docs/NODE20-SETUP.md](../docs/NODE20-SETUP.md)** pour installer et activer Node 20 (nvm ou conda).

Vérification : `node -v` doit afficher **v20.x.x**. Sinon : `npm run check:node20` pour un contrôle automatisé.

## Workflow (Semaine 4)

1. **Activer Node 20** (nvm ou conda), puis vérifier : `node -v` → v20.x.x.

2. **Démarrer l’API**  
   `npm run dev:api`

3. **Extraire le JSON**  
   `npm run openapi:fetch`  
   → Enregistre `openapi/base-vitale.json` depuis `http://localhost:3000/api-json`.

4. **Générer le SDK**  
   `npm run sdk:gen:file` (ou `npm run sdk:gen` si l’API tourne).

Le résultat est écrit dans `libs/ghost-sdk/src/lib/generated/` (hooks React Query + types).

## Contournement Docker (optionnel)

Si tu ne peux pas utiliser Node 20 en natif : `npm run sdk:gen:docker` (prérequis Docker). La solution recommandée reste Node 20 natif (Phase 1).
