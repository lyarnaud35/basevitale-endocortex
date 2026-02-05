# Plan de migration : Scribe → `libs/scribe-ui` (Phase 1 restructuration)

**Objectif :** `apps/web` ne contienne plus que l’import `<MedicalScribe />`. Toute la logique Scribe vit dans `libs/scribe-ui`.

---

## Phase 1 – Restructuration (état actuel)

### ✅ Réalisé

1. **Librairie `libs/scribe-ui` créée** (Nx `@nx/react:library`)
   - `src/components/MedicalScribe.tsx` : widget placeholder (props `patientId`, `mode`, `draftId`, callbacks)
   - `src/index.ts` : export `MedicalScribe`, `MedicalScribeProps`
   - Lint OK, pas de dépendance Next.js

2. **Configuration**
   - `tsconfig.base.json` : `@basevitale/scribe-ui` → `libs/scribe-ui/src/index.ts`
   - `apps/web/next.config.js` : `transpilePackages` + alias webpack pour `@basevitale/scribe-ui`
   - `apps/web/tailwind.config.js` : `libs/scribe-ui/src/**/*.{ts,tsx}` dans `content`

3. **Sandbox**
   - `apps/web/app/scribe/sandbox/page.tsx` : **uniquement** `import { MedicalScribe } from '@basevitale/scribe-ui'` et affichage du widget.

### À valider

- **Build web** : actuellement en échec pour des raisons **externes** au Scribe (`socket.io-client`, `DicomViewer`). Dès que ces deps sont corrigées, vérifier que la sandbox et l’import scribe-ui fonctionnent.
- **Dev** : `nx serve web` puis ouvrir `/scribe/sandbox` pour tester le widget.

---

## Analyse du code actuel dans `apps/web`

### 1. Audio / stream

- **Aucun composant audio** dédié au Scribe (pas de `MediaRecorder`, `getUserMedia`, `SpeechRecognition`).
- La dictée Scribe repose sur un **textarea** (saisie / copier-coller de texte).
- **WebSocket / stream** :
  - `SocketProvider`, `useWebSocket` : utilisés par **messaging** et **monitoring**, **pas par le Scribe**.
  - Le flux Scribe actuel est **REST uniquement** (fetch vers `/scribe/...`).

**Conclusion :** Rien à migrer côté “audio” ou “stream” pour le Scribe. Si plus tard on ajoute dictée vocale ou temps réel, ce sera dans `libs/scribe-ui` (composants + hooks dédiés).

### 2. Ce qui est Scribe et doit aller dans `libs/scribe-ui`

| Emplacement | Fichier / rôle | Action |
|-------------|----------------|--------|
| **Pages** | `app/scribe/page.tsx`, `app/scribe/[id]/page.tsx`, `app/scribe/test/page.tsx` | Remplacer par des pages sandbox qui ne font qu’importer et rendre `<MedicalScribe />` (ou sous-vues) avec config + callbacks. Migrer toute la logique (forms, fetch, état) vers la lib. |
| **Composants** | `components/KnowledgeGraphVisualizer.tsx` | Déplacer dans `libs/scribe-ui` (ex. `components/KnowledgeGraphVisualizer.tsx`). |
| **API** | `lib/api/client.ts` (fetch, `formatApiError`, `API_BASE`) | Extraire une partie **Scribe-only** : client API Scribe (process-dictation, drafts, validate) + `formatApiError`. Créer `libs/scribe-ui` `api/scribe-client` configurable (`apiBaseUrl`, `getToken`). Ne pas dépendre de `localStorage` / Host auth ; le token vient de la config fournie par l’Host. |
| **Hooks** | `app/hooks/useScribe.ts`, `app/hooks/useKnowledgeGraph.ts` (usage Scribe) | Migrer vers `libs/scribe-ui` (ex. `useScribeApi`, `useScribeDraft`, etc.). |
| **Hooks** | `lib/hooks/useDebounce.ts` (utilisé par scribe) | Migrer dans `libs/scribe-ui` (ou garder une copie dans la lib). |
| **Contracts** | `@basevitale/shared` (Consultation, etc.) | Déjà partagé ; la lib dépend de `@basevitale/shared`, pas de duplication. |

### 3. Ce qui reste dans `apps/web` (hors Scribe)

- **SocketProvider, useWebSocket** : messaging / monitoring. Rester dans `apps/web` (ou dans une autre lib si on structure par domaine).
- **useAuthStore**, **lib/api/client** (usage non-Scribe) : restent dans `apps/web`. Le widget Scribe ne doit pas en dépendre ; il reçoit token / config via props ou context fourni par l’Host.
- **Layout, providers, global CSS, autres pages** : inchangés pour la migration Scribe.

---

## Plan de migration (étapes suivantes)

### Étape 1 – Client API et config (libs/scribe-ui)

- Créer `api/scribe-client.ts` : `processDictation`, `getDraft`, `patchDraft`, `validateDraft`, `listDrafts`, `health`.
- Config injectable : `apiBaseUrl`, `getToken?`, etc. (ex. context `ScribeConfig`).
- Adapter `formatApiError` (ex. depuis `lib/api/client`) dans la lib, sans `localStorage`.

### Étape 2 – Hooks

- `useDebounce` → `libs/scribe-ui/hooks/useDebounce.ts`.
- `useScribeApi`, `useScribeDraft` : mutations / queries Scribe (TanStack Query), utilisant le client configuré.

### Étape 3 – Composants

- Déplacer `KnowledgeGraphVisualizer` dans `libs/scribe-ui`, sans dépendance Next.
- Créer les vues **Scribe** dans la lib :
  - **ScribeDictationView** : dictée (textarea), patientId, exemples, brouillons, “Analyser” → callbacks `onDraftCreated`, etc. (pas de `Link` / `useRouter`).
  - **ScribeDraftEditor** : split-view, formulaire (RHF + `ConsultationSchema`), sauvegarde, validation → `onBack`, `onValidated`.
  - **ScribeTestView** : tracer bullet (Dicter, Cristalliser, health, Cypher) pour le sandbox.
- **MedicalScribe** : orchestre les vues selon `mode` + `draftId`, utilise config + hooks.

### Étape 4 – Refactor des pages `apps/web`

- `scribe/page.tsx` : uniquement `<MedicalScribe mode="dictation" ... />` (ou `ScribeDictationView`) + config sandbox + callbacks (ex. `onDraftCreated` → `router.push(\`/scribe/${id}\`)`).
- `scribe/[id]/page.tsx` : uniquement `<MedicalScribe mode="edit" draftId={...} ... />` (ou `ScribeDraftEditor`) + config + `onBack` → `router.push('/scribe')`.
- `scribe/test/page.tsx` : uniquement `ScribeTestView` ou `<MedicalScribe mode="test" />` + config sandbox.
- Supprimer toute logique Scribe (forms, fetch, state) des pages.

### Étape 5 – Nettoyage

- Supprimer de `apps/web` : `KnowledgeGraphVisualizer`, logique Scribe des pages, hooks Scribe, partie Scribe du client API si extraite.
- Garder `useAuthStore` et client API générique dans `apps/web` ; le widget ne les utilise pas.

---

## Récap

- **Phase 1** : lib `scribe-ui` créée, `MedicalScribe` placeholder, sandbox minimal, config Next + Tailwind.
- **Audio / stream** : aucun composant Scribe concerné ; WebSocket utilisé seulement par messaging / monitoring.
- **Prochaines phases** : client API + config → hooks → composants (dont `KnowledgeGraphVisualizer`) → refactor des pages scribe pour ne garder que l’import du widget + config + callbacks.

---

*Document généré pour la Phase 1 restructuration (Symbiote Protocol).*
