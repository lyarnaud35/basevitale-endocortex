# Récap — Ghost Protocol & API (Semaine 4)

**Version de passation à la racine :** voir **`HANDOVER.md`** (état du système + récap + message à Ben).

**Endocortex API · Golden Master pour l’intégrateur (Ben)**  
*Dernière mise à jour : 2026-02-05*

---

## 1. Vue d’ensemble

- **Backend** : NestJS (API), machines à états (XState), contrats Zod dans `@basevitale/shared`.
- **Frontend** : Next.js (apps/web), hooks SSE, rendu strict piloté par l’état serveur (Ghost Protocol).
- **Doc API** : Swagger/OpenAPI sur **`/api/docs`** (titre **Endocortex API**, version **v115.0**).

---

## 2. Swagger (OpenAPI)

| Élément | Valeur |
|--------|--------|
| **URL** | `http://localhost:3000/api/docs` (ou `PORT` configuré) |
| **Titre** | Endocortex API |
| **Version** | v115.0 |
| **Base path** | `api` (requêtes « Try it out » en `/api/...`) |
| **Auth** | Clé API optionnelle : header `X-INTERNAL-API-KEY` |
| **Important** | L’API doit être **démarrée** sur le même host/port pour que « Try it out » fonctionne. Sinon : `ERR_CONNECTION_REFUSED` (démarrer avec `nx run api:serve` ou `npm run start:api`). |

Les endpoints Ghost (Coding, Security) sont documentés avec **@ApiOperation**, **@ApiResponse**, **@ApiBody** et exemples pour que « Try it out » envoie des payloads valides.

---

## 3. Coding (CIM-10 — Le Stratège)

### Rôle
Analyse de texte (ex. sortie Scribe) et suggestions de codes CIM-10 avec **silence attentionnel** : les suggestions ne sont exposées que si la confiance ≥ seuil (0,6).

### Endpoints

| Méthode | Chemin | Description |
|---------|--------|-------------|
| GET | `/api/coding` | Ping du module |
| GET | `/api/coding/stream` | **SSE** : flux d’état de la machine en temps réel |
| POST | `/api/coding/analyze` | **Analyse (suggest)** : body `{ "text": "..." }` → retourne l’**état stable** (SUGGESTING ou SILENT) avec `suggestions` rempli |
| POST | `/api/coding/send` | Envoi d’un événement (ANALYZE_TEXT, ACCEPT_CODE, RESET) → retour immédiat |
| GET | `/api/coding/state` | État courant de la machine |

### États de la machine
- **IDLE** : en attente de texte.
- **ANALYZING** : analyse en cours (état transitoire).
- **SUGGESTING** : confiance ≥ 0,6 → les suggestions sont affichées.
- **SILENT** : confiance < 0,6 → pas de suggestion affichée (IA « en veille »).

### Comportement POST /analyze
- Le serveur **attend la fin de l’analyse** (sortie de l’état ANALYZING) avant de répondre.
- La réponse contient donc **value** = `SUGGESTING` ou `SILENT` et **context.suggestions** rempli (en SUGGESTING).
- Timeout d’attente : 10 s par défaut.

### Mock démo (CodingService)
- Texte contenant *"fracture"* ou *"tibia"* → code **S82** (Fracture jambe), confiance **0,95** → **SUGGESTING**.
- Texte contenant *"ventre"* ou *"vague"* → code **R10** (Douleur abdo), confiance **0,35** → **SILENT**.
- Sinon → code aléatoire, confiance entre 0,4 et 0,7.

### DTOs (Swagger)
- **CodingResponseDto** : `value`, `context` (CodingContextDto), `updatedAt`.
- **CodingContextDto** : `lastInput`, `suggestions` (CodingSuggestionItemDto[]).
- **CodingSuggestionItemDto** : `code`, `label`, `confidence` (0–1).
- **AnalyzeTextBodyDto** : `text`.

---

## 4. Security (C+ — Vérification prescription)

### Rôle
Vérification d’une prescription (médicament) par rapport au profil patient (ex. allergies). États **SAFE** / **LOCKED** ; dérogation possible avec justification (**REQUEST_OVERRIDE** → **OVERRIDE_APPROVED**).

### Endpoints

| Méthode | Chemin | Description |
|---------|--------|-------------|
| GET | `/api/ghost-security/ping` | Ping du module |
| GET | `/api/ghost-security/stream` | **SSE** : flux d’état de la SecurityMachine |
| POST | `/api/ghost-security/send` | Envoi d’un événement ; si **CHECK_DRUG**, retourne l’**état stable** (SAFE ou LOCKED) après vérification |
| GET | `/api/ghost-security/state` | État courant |

### Événements (body POST /send)
- **CHECK_DRUG** : `{ "type": "CHECK_DRUG", "payload": { "drug": "Amoxicilline" } }` → vérification prescription.
- **RESET** : `{ "type": "RESET", "payload": {} }`.
- **REQUEST_OVERRIDE** : `{ "type": "REQUEST_OVERRIDE", "payload": { "justification": "..." } }` (min. 10 caractères).

### États de la machine
- **IDLE**, **ANALYZING** (transitoire), **SAFE**, **LOCKED**, **OVERRIDE_APPROVED**.

### Comportement POST /send (CHECK_DRUG)
- Pour **CHECK_DRUG**, le serveur attend la fin de l’analyse (sortie de ANALYZING) avant de répondre.
- La réponse contient **value** = **SAFE** ou **LOCKED** avec **context** rempli (`riskLevel`, `blockReason`, etc.).
- Timeout d’attente : 10 s par défaut.

### Mock démo (Patient Zéro)
- Patient allergique à l’**amoxicilline** ; si `drug` = Amoxicilline → **LOCKED** + `blockReason` explicite.

### DTOs (Swagger)
- **SecurityResponseDto** : `value`, `context` (SecurityContextDto), `updatedAt`.
- **SecurityContextDto** : `currentDrug`, `riskLevel`, `blockReason`, `auditTrail`.

---

## 5. Frontend (démo)

- **Hook** : `apps/web/app/demo/hooks/useCodingMachine.ts` — SSE `/api/coding/stream` + `analyzeText(text)` → POST `/api/coding/analyze`.
- **Composant** : `apps/web/app/demo/coding/CodingAssistant.tsx` — rendu strict selon `state.value` (IDLE / ANALYZING / SILENT / SUGGESTING), debounce 500 ms sur `currentText`.
- **Page** : `apps/web/app/demo/coding/page.tsx` — textarea + `CodingAssistant` pour tester le flux CIM-10.
- **Security** : `apps/web/app/demo/security/` — page démo Gardien (vérification médicament + dérogation).

---

## 6. Fichiers clés (API)

| Rôle | Fichier |
|------|--------|
| Swagger | `apps/api/src/main.ts` (DocumentBuilder, setup `api/docs`) |
| Coding machine | `apps/api/src/coding/coding.machine.ts` |
| Coding service | `apps/api/src/coding/coding.service.ts` |
| Coding ghost | `apps/api/src/coding/coding-ghost.service.ts` (`sendEvent`, `sendEventAndWaitStable`) |
| Coding controller | `apps/api/src/coding/coding.controller.ts` |
| Coding DTOs | `apps/api/src/coding/coding.dto.ts` |
| Security machine | `apps/api/src/security/security.machine.ts` |
| Security ghost | `apps/api/src/security/security-ghost.service.ts` (`sendEvent`, `sendEventAndWaitStable`) |
| Security controller | `apps/api/src/security/security-ghost.controller.ts` |
| Security DTOs | `apps/api/src/security/security.dto.ts` |
| Contrats partagés | `libs/shared/src/contracts/coding-machine.schema.ts`, `security-machine.schema.ts` |

---

## 7. Résumé des améliorations (Semaine 4)

1. **Swagger** : exposé sur `/api/docs`, titre Endocortex API, v115.0, base path `api`.
2. **DTOs** : Coding et Security documentés avec **@ApiProperty** ; **@ApiBody** avec exemples pour éviter les 400 en « Try it out ».
3. **Réponses stables** :
   - **POST /api/coding/analyze** : attend SUGGESTING ou SILENT avant de répondre (`sendEventAndWaitStable`).
   - **POST /api/ghost-security/send** (CHECK_DRUG) : attend SAFE ou LOCKED avant de répondre (`sendEventAndWaitStable`).
4. **Security** : même pattern « wait stable » que Coding pour la vérification prescription.
5. **Swagger** : tags sans espaces (`Coding-CIM-10`, `Security-C-Verification-prescription`) pour éviter le warning deep link ; `deepLinking: false` ; mention dans la description que l’API doit être démarrée.

---

*Récap à jour avec les évolutions Semaine 4 (packaging, Swagger, réponses stables).*
