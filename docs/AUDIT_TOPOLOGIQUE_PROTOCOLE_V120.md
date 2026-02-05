# Audit topologique – Protocole Symbiote v120

**Objectif :** État « Livrable à Ben » — Backend Dockerisé + API Swagger + Widget `<MedicalScribe />` consommant l’API.

---

## 1. Analyse de situation (audit topologique)

### 1.1 Le Cerveau — `apps/api` (scribe)

**Emplacement réel :** `apps/api/src/scribe/` (et non `apps/api/src/app/modules/scribe`).

| Fichier | Rôle |
|--------|------|
| `scribe.controller.ts` | Routes sous `/api/scribe` : analyze, process-dictation, drafts, draft/:id, validate, **patient/:patientId/profile**, health, stats |
| `scribe.service.ts` | Analyse (MOCK/CLOUD/LOCAL), validateDraft, updateDraft |
| `graph-projector.service.ts` | Projection Postgres → Neo4j |
| `graph-reader.service.ts` | Lecture Neo4j → `PatientMedicalProfile` (Total Recall) |
| `guardian.service.ts` | Alertes non bloquantes (checkSafety) |
| `scribe.module.ts` | Module NestJS |

**Endpoints existants (préfixe `/api`):**

- `POST /api/scribe/analyze`, `POST /api/scribe/analyze-consultation`
- `POST /api/scribe/process-dictation`
- `GET /api/scribe/drafts`, `GET /api/scribe/draft/:id`
- `PATCH /api/scribe/draft/:id`, `PUT /api/scribe/draft/:id`
- `POST /api/scribe/draft/:id/validate`, `PUT /api/scribe/validate/:id`, `POST /api/scribe/validate/:draftId`
- **`GET /api/scribe/patient/:patientId/profile`** (profil médical : consultations, conditions, medications, symptomsRecurrent)
- **`GET /api/scribe/patient/:patientId/intelligence`** (résumé, timeline, activeAlerts, quickActions — Human-Ready)
- `GET /api/scribe/health`, `GET /api/scribe/stats`

### 1.2 Le Widget — `libs/scribe-ui`

| Élément | Statut |
|--------|--------|
| `MedicalScribe`, `ScribeTestView`, `KnowledgeGraphVisualizer` | Présents |
| `scribe-client` | Appels vers `process-dictation`, `draft/:id`, `validate`, `health`, `drafts`, **`patient/:id/intelligence`** |
| `config` (apiBaseUrl, getToken) | Présent |
| Hooks (`useDebounce`), utils (`formatApiError`) | Présents |
| Dépendances Next.js | Aucune |

### 1.3 Le Sandbox — `apps/web`

- Pages : `/`, `/scribe`, `/scribe/test`, `/scribe/[id]`.
- **Uniquement** import et affichage de `<MedicalScribe />` depuis `@basevitale/scribe-ui`.
- Pas de logique Scribe dans web (layout, providers, config API passée en props).

### 1.4 Docker

- **docker-compose** : postgres, neo4j, redis, minio, nats, **ai-cortex**.
- **Aucun service `api`** : l’API NestJS n’est **pas** dans le compose. Seul **ai-cortex** a un Dockerfile.

---

## 2. Écart avec le Protocole v120

| Exigence | État actuel |
|----------|-------------|
| Backend Dockerisé | DB + sidecars en Docker ; **API NestJS non conteneurisée** |
| API Swagger | ✅ **Configurée** — `@nestjs/swagger`, UI à `/api-docs`, Scribe documenté |
| Widget `<MedicalScribe />` isolé | ✅ Dans `libs/scribe-ui`, web = coquille |
| GET /intelligence (Résumé/Alertes) | ✅ **En place** — `GET /api/scribe/patient/:id/intelligence`, widget connecté |

---

## 3. Réponses aux questions critiques

### [x] GET /patient/:id/intelligence (Résumé/Alertes)

**Oui.**  
**`GET /api/scribe/patient/:patientId/intelligence`** existe. Réponse Human-Ready : `summary`, `timeline`, `activeAlerts`, `quickActions` (contrat `libs/shared` `IntelligenceResponseSchema`).  
Le **widget** (`libs/scribe-ui`) appelle cet endpoint via `usePatientIntelligence` et affiche `<IntelligencePanel />` (résumé, alertes, timeline) ou « Mode Déconnecté » si l’API est indisponible.

### [x] `<MedicalScribe />` isolé dans `libs/scribe-ui` (et non coincé dans `apps/web`)

**Oui.**  
Le widget vit dans `libs/scribe-ui`. `apps/web` n’importe que `@basevitale/scribe-ui` et n’affiche que `<MedicalScribe />` (plus config). Aucune logique Scribe dans web.

### [x] Swagger configuré

**Oui** (mis en place lors de cet audit).  
- `@nestjs/swagger@7.4.2` installé (`--legacy-peer-deps`, compatible Nest 10).  
- `main.ts` : `DocumentBuilder` + `SwaggerModule.setup('api-docs', app, document)`.  
- `ScribeController` : `@ApiTags('Scribe')`, `@ApiOperation` / `@ApiResponse` sur analyze, process-dictation, drafts, patient/profile, health.  
- Swagger UI : `http://localhost:<PORT>/api-docs`.

---

## 4. Ordre de mission — Plan d’action immédiat

**Trou le plus critique pour « Livrable à Ben » :**  
**Pas de Swagger** → Ben ne peut pas lire l’API. Law IV : « Swagger First », « Ben reads Swagger, not code ».

### Plan step-by-step (priorité immédiate)

1. **Installer et configurer Swagger** ✅ (fait)
   - `npm i @nestjs/swagger@7.4.2 --save --legacy-peer-deps` (compatible Nest 10).
   - Dans `main.ts` : `DocumentBuilder` + `SwaggerModule.setup('api-docs', app, document)`.
   - Swagger UI : `http://localhost:<PORT>/api-docs`.

2. **Documenter les endpoints Scribe en premier** ✅ (fait)
   - `@ApiTags('Scribe')` sur `ScribeController`.
   - `@ApiOperation`, `@ApiResponse` sur analyze, process-dictation, drafts, patient/profile, health.

3. **Ensuite : GET /patient/:id/intelligence**
   - Créer un endpoint **`GET /api/scribe/patient/:patientId/intelligence`** (ou `GET /api/patient/:id/intelligence` si on préfère une route globale).
   - Réponse « Human-Ready » : **résumé** (synthèse courte du profil) + **alertes** (issues du Gardien / graphe).
   - Réutiliser `GraphReaderService` (profil) + Gardien (alertes) pour construire le payload.
   - Définir un contrat Zod dans `libs/shared` (ex. `IntelligenceResponseSchema`), puis documenter la route dans Swagger.

4. **Optionnel mais aligné Protocole : API dans Docker**
   - Ajouter un `Dockerfile` pour l’API NestJS.
   - Ajouter un service `api` dans `docker-compose.yml` (dépendances : postgres, redis, etc.).
   - Garder `docker compose up` comme point d’entrée unique pour Ben.

---

## 5. Résumé

| Action | Priorité | Effet |
|--------|----------|--------|
| Swagger install + config + doc Scribe | **Immédiate** | API lisible par Ben |
| GET /patient/:id/intelligence | Haute | Répond au critère « Résumé/Alertes » |
| API Dockerisée (Dockerfile + compose) | Moyenne | « Backend Dockerisé » complet |

**Prochaine étape recommandée :** exécuter les étapes 1 et 2 (Swagger) pour combler le trou le plus critique.

---

## 6. Validation Boucle Complète (Frontend ↔ Backend ↔ Zod)

**Objectif :** Vérifier que le Frontend (libs) parle au Backend (API) et lit le format Zod partagé. Feature Complete V1 pour l’Intelligence.

### Script de validation

```bash
./scripts/validate-boucle-intelligence.sh [BASE_URL]
```

**Étapes :**
1. `GET /api/scribe/health` — API up.
2. `POST /api/scribe/process-dictation` (patient `patient_demo_phase3`) — draft créé.
3. `POST /api/scribe/draft/:id/validate` — projection Neo4j.
4. `GET /api/scribe/patient/patient_demo_phase3/intelligence` — réponse 200, vérification de `summary`, `timeline`, `activeAlerts`, `quickActions`.

**Prérequis :** API (`npm run dev:api`), Postgres, Neo4j (ex. `docker compose up -d postgres neo4j`).

### Résultat

- **Backend ↔ Zod :** L’API retourne un JSON conforme à `IntelligenceResponseSchema` (`libs/shared`).
- **Frontend ↔ Backend :** Le widget utilise `getPatientIntelligence` (scribe-client) et le type `IntelligenceResponse`. `IntelligencePanel` affiche les données ou « Mode Déconnecté » si l’API échoue.
- **Boucle validée :** Le script `validate-boucle-intelligence.sh` a été exécuté avec succès (health → process-dictation → validate → intelligence, format respecté).

### Checklist

| Critère | Statut |
|--------|--------|
| API expose `GET /patient/:id/intelligence` | ✅ |
| Contrat Zod partagé (`intelligence.schema.ts`) | ✅ |
| Widget appelle l’endpoint (fetch, pas de crash si erreur) | ✅ |
| Données affichées (résumé, alertes, timeline) ou « Mode Déconnecté » | ✅ |
| Script de validation boucle complète | ✅ `./scripts/validate-boucle-intelligence.sh` |

**Sécurité psychologique :** Tu peux lancer `npm run dev:api` + `npm run dev:web`, ouvrir `http://localhost:4200/scribe/test`, et voir l’Intelligence patient (ou « Mode Déconnecté » si backend arrêté). Le système fonctionne de bout en bout avant la configuration Docker finale.
