# Rapport d’audit technique « Deep Dive » v3.0 — BaseVitale

**Date :** Généré par l’Auditeur Technique (Ground Truth)  
**Contexte :** Protocole Lone Wolf v160, Architecture Neuro-Symbiotique  
**Objectif :** Vérifier l’intégrité de l’architecture et la conformité aux invariants (Hybrid Toggle, Contracts, Sémaphore GPU).

---

## 1. Scanner de densité (filesystem)

**Commande exécutée :**
```bash
find apps libs -name "*.ts" -o -name "*.py" -o -name "*.prisma" | grep -v "spec.ts" | grep -v "node_modules"
```

**Résultat :**
- **~200+ fichiers** (TS, Py, Prisma) hors `spec`, `node_modules`.
- **Concentration :**
  - `apps/api/src` : NestJS (scribe, common, identity, billing, coding, feedback, knowledge-graph, neo4j, prisma, etc.).
  - `apps/ai-cortex` : 4 fichiers Python (`main.py`, `transcribe.py`, `extract_pdf.py`, `test_integration.py`).
  - `libs/shared/src` : contrats Zod (`contracts/*.schema.ts`), `index.ts`, `utils`.
  - **Prisma :** `apps/api/prisma/schema.prisma` (schéma canonique ; API = propriétaire DB). Client généré dans `apps/api/src/prisma/client`.

---

## 2. Inspection des invariants logiques

### 2.1 Le Cerveau (NestJS) — Service IA

**Fichier audité :** `apps/api/src/scribe/scribe.service.ts`

**Check critique — `AI_MODE` (MOCK / CLOUD / LOCAL) :** ✅ **Conforme**

- Lecture : `(process.env.AI_MODE || 'MOCK').toUpperCase() as 'MOCK' | 'CLOUD' | 'LOCAL'`.
- **`analyze()`** : `if (aiMode === 'MOCK')` → mock + Prisma ; `else if (aiMode === 'LOCAL')` → appel Python via `runWithLock` ; sinon CLOUD via `analyzeConsultation`.
- **`analyzeConsultation()`** : `switch (this.aiMode)` avec `case 'MOCK'` / `'CLOUD'` / `'LOCAL'` et fallback MOCK.
- **`extractKnowledgeGraph()`** : même `switch` sur `this.aiMode`.

**Extraits :**

```ts
// Lignes 56–57, 65
this.aiMode = (process.env.AI_MODE || 'MOCK').toUpperCase() as 'MOCK' | 'CLOUD' | 'LOCAL';
// ...
this.logger.log(`ScribeService initialized with AI_MODE: ${this.aiMode}`);

// Lignes 111–178 (analyze)
if (aiMode === 'MOCK') {
  // Génération statique, ConsultationSchema.parse, prisma.consultationDraft.create
  return validatedConsultation;
} else if (aiMode === 'LOCAL') {
  return await this.gpuLock.runWithLock(async () => {
    const jsonSchema = zodToJsonSchema(ConsultationSchema);
    // HTTP POST sidecar /process-generic, parse, create draft
  });
}
// CLOUD → analyzeConsultation

// Lignes 360–378 (analyzeConsultation)
switch (this.aiMode) {
  case 'MOCK': consultation = this.analyzeConsultationMock(text, patientId); break;
  case 'CLOUD': consultation = await this.analyzeConsultationCloud(text); break;
  case 'LOCAL': consultation = await this.analyzeConsultationLocal(text); break;
  default: consultation = this.analyzeConsultationMock(text, patientId);
}
```

**Autres services avec Hybrid Toggle :**  
`DocumentAnalysisService`, `TranscriptionService`, `PDFExtractionService` utilisent aussi `AI_MODE` (switch/case ou if/else).

---

### 2.2 Le Contrat (Zod)

**Fichier audité :** `libs/shared/src/contracts/consultation.schema.ts`

**Check critique — Schéma Zod de sortie (ConsultationSchema) :** ✅ **Conforme**

- **`ConsultationSchema`** : `patientId`, `transcript`, `symptoms[]`, `diagnosis[]` (code, confidence, label), `medications[]` (name, dosage, duration).
- **`zodToJsonSchema`** : conversion vers JSON Schema (target `openApi3`, `$refStrategy: 'none'`) pour Python/instructor.
- Export via `libs/shared/src/index.ts`. Utilisation dans `scribe.service`, `scribe.controller`, `scribe.processor`, `scribe.dto`, etc. via `@basevitale/shared`.

**Extrait :**

```ts
export const ConsultationSchema = z.object({
  patientId: z.string().min(1, '...'),
  transcript: z.string().min(1, '...'),
  symptoms: z.array(z.string().min(1)).min(1),
  diagnosis: z.array(z.object({
    code: z.string().min(1),
    confidence: z.number().min(0).max(1),
    label: z.string().min(1),
  })).min(1),
  medications: z.array(z.object({ name, dosage, duration })).default([]),
});
```

---

### 2.3 Le Muscle (Python Sidecar)

**Fichier audité :** `apps/ai-cortex/main.py`

**Check critique — Instructor et endpoint générique :** ✅ **Conforme**

- **`instructor`** : `from instructor import patch` ; client patché `patch(client, mode=PatchMode.JSON)` (ou `mode="json"` en fallback).
- **Endpoint générique :** `POST /process-generic` — reçoit `ProcessGenericRequest` avec `text` et `schema` (Dict JSON Schema).
- **Modèle dynamique :** `json_schema_to_pydantic_model(schema)` → `create_model(...)` ; aucun hardcoding métier.
- **Réponse :** `ProcessGenericResponse(data=structured_data)`.
- Alias `/structure` pour compatibilité.

**Extraits :**

```py
@app.post("/process-generic", response_model=ProcessGenericResponse)
async def process_generic(request: ProcessGenericRequest) -> ProcessGenericResponse:
    # ...
    patched_client = patch(client, mode=PatchMode.JSON)  # ou mode="json"
    DynamicModel = json_schema_to_pydantic_model(request.schema)
    response = patched_client.chat.completions.create(
        model=model,
        response_model=DynamicModel,
        messages=[...],
    )
    return ProcessGenericResponse(data=response.model_dump())
```

**Law III (Universal Worker) :** Respectée — pas de logique métier, un seul endpoint principal, schéma fourni par l’appelant.

---

### 2.4 La Mémoire (Prisma & Docker)

**Schéma Prisma :** `apps/api/prisma/schema.prisma`  
**Convention (Option B) :** L’API est le seul propriétaire de la DB. Pas de `libs/shared/.../prisma`.

**Check critique — Consultation/Draft et type Json (JSONB) :** ✅ **Conforme**

- **`ConsultationDraft`**  
  - `structuredData Json` — données structurées selon ConsultationSchema.  
  - Commentaire : *« Structure conforme à ConsultationSchema (Zod) »*.
- **`Consultation`**  
  - `draftData Json` — structure libre avant validation (ex. ConsultationSchema).

**Docker Stack :** ✅ **Conforme**

- **PostgreSQL** : `pgvector/pgvector:pg15`, healthcheck, volume, init pgvector.
- **Neo4j** : `neo4j:latest`, APOC, 7474/7687, healthcheck.
- **Redis** : `redis:latest`, 6379, healthcheck, password optionnel.
- **AI Cortex** : build `apps/ai-cortex`, port 8000, healthcheck `/health`, variables `LLM_*`, `OLLAMA_*`.
- **MinIO, NATS** : présents.

---

## 3. État de l’implémentation

| Item | Statut |
|------|--------|
| Architecture dossiers (`apps/api`, `apps/web`, `apps/ai-cortex`, `libs/shared`) | ✅ OK |
| Docker Stack (Postgres, Redis, Neo4j, AI Cortex) | ✅ OK |
| Shared Library (Nx, `@basevitale/shared` → `libs/shared`) | ✅ OK |
| Schéma Prisma (`apps/api/prisma/schema.prisma`) | ✅ OK |

---

## 4. Audit du code (détails)

### 4.1 Hybrid Toggle (MOCK vs LOCAL vs CLOUD)

- **Implémenté** dans `ScribeService` : `analyze` (if/else MOCK/LOCAL, sinon CLOUD), `analyzeConsultation` / `extractKnowledgeGraph` (switch).
- **Fallback** : mode inconnu → MOCK ; erreur LOCAL (sidecar indisponible) → MOCK.
- **Config** : `process.env.AI_MODE` et `ConfigService` utilisés de façon cohérente.

### 4.2 Contract-First (Python contraint par Zod/JSON)

- **Oui.**  
  - NestJS : Zod `ConsultationSchema` → `zodToJsonSchema` → envoi du JSON Schema au sidecar.  
  - Python : construction dynamique Pydantic via `json_schema_to_pydantic_model`, puis `response_model=DynamicModel`.  
  - Réponses revalidées par `ConsultationSchema.parse(structuredData)` dans `ScribeService` avant sauvegarde.

### 4.3 Sémaphore GPU / lock Redis avant appel IA

- **Implémenté.**  
  - **`GpuLockService`** (`apps/api/src/common/services/gpu-lock.service.ts`) : verrou Redis `lock:gpu:1` (SET NX EX), `runWithLock<T>(fn)`, `ping()` pour health.
  - **Usage :**  
    - `ScribeService` : appels LOCAL (analyze, analyzeConsultationLocal, extractKnowledgeGraph) wrappés dans `runWithLock`.  
    - `ScribeProcessor` : job Bull `analyze-consultation` avec `runWithLock` et `concurrency: 1`.  
    - `TranscriptionService`, `PDFExtractionService` : appels LOCaux wrappés dans `runWithLock`.
  - **Health :** `ScribeHealthService` appelle `gpuLock.ping()`, renvoie `redis: { connected, latencyMs }`.

---

## 5. Divergences et points d’attention

### 5.1 Emplacement du schéma Prisma

- **Alignement (Option B) :** Schéma canonique `apps/api/prisma/schema.prisma`. L’API est le seul propriétaire de la DB.  
- **.cursorrules** et docs alignés. Aucun `libs/shared/.../prisma`.

### 5.2 Logique métier dans le Python

- **Aucune.** Le sidecar reste générique : `request.schema` + `request.text` → modèle Pydantic dynamique → LLM → `ProcessGenericResponse`. Pas de référence à `ConsultationSchema` ou types métier dans `main.py`.

### 5.3 Controller NestJS et OpenAI

- **Aucun appel direct à OpenAI depuis un controller.**  
  - `ScribeController` utilise uniquement `ScribeService` ; toute la logique IA (MOCK/CLOUD/LOCAL) est dans le service.

### 5.4 Sémaphore GPU

- **Implémenté** : GpuLockService, `runWithLock`, Bull `concurrency: 1`, health Redis.

---

## 6. Note de conformité Lone Wolf

**Conformité globale : 9.5 / 10**

- **Hybrid Toggle :** ✅ Complet (MOCK/CLOUD/LOCAL, fallback).
- **Contract-First :** ✅ Zod → JSON Schema → Python dynamique, revalidation côté NestJS.
- **Universal Worker :** ✅ Python générique, `/process-generic` uniquement.
- **Data Safety :** ✅ JSONB (ConsultationDraft, Consultation), sync Neo4j sur validation.
- **Sémaphore GPU :** ✅ Redis lock, étendu à Scribe, Transcription, PDF, health.
- **Architecture :** ✅ Dossiers, Docker, shared lib, Prisma convention.

*Réduction mineure (0.5) : dépendances externes (Jest, peer deps) et éventuelles évolutions (streaming, cache Redis avancé) non auditées en détail.*

---

*Rapport généré à partir du code actuel (Ground Truth). À utiliser pour l’Orchestrateur Topologique.*
