# Rapport d’audit technique « Deep Dive » v2.0 — BaseVitale

**Date :** Généré par l’Auditeur Technique  
**Contexte :** Protocole Lone Wolf v160, Architecture Neuro-Symbiotique  
**Objectif :** Vérifier l’intégrité de l’architecture et la conformité aux invariants (Hybrid Toggle, Contract-First, Universal Worker).

---

## 1. Scanner de densité (filesystem)

**Commande exécutée :**
```bash
find apps libs -name "*.ts" -o -name "*.py" -o -name "*.prisma" | grep -v "spec.ts" | grep -v "node_modules"
```

**Résultat :**
- **~212 fichiers** (TS, Py, Prisma) hors `spec`, `node_modules`, `.next`, `prisma/client`.
- **Concentration :**
  - `apps/api/src` : majorité du code NestJS (scribe, common, modules métier).
  - `apps/ai-cortex` : 4 fichiers Python (`main.py`, `transcribe.py`, `extract_pdf.py`, `test_integration.py`).
  - `libs/shared/src` : contrats Zod + utils (`contracts/*.schema.ts`, `index.ts`).
  - **Prisma :** `apps/api/prisma/schema.prisma` uniquement (pas dans `libs/shared`).

---

## 2. Inspection des invariants logiques

### 2.1 Le Cerveau (NestJS) — Service IA

**Fichier audité :** `apps/api/src/scribe/scribe.service.ts`

**Check critique — `AI_MODE` (MOCK / CLOUD / LOCAL) :** ✅ **Conforme**

- Lecture : `process.env.AI_MODE || 'MOCK'`, normalisé en `'MOCK' | 'CLOUD' | 'LOCAL'`.
- **Méthode `analyze`** : `if (aiMode === 'MOCK')` / `else if (aiMode === 'LOCAL')` / sinon CLOUD.
- **Méthode `analyzeConsultation`** : `switch (this.aiMode)` avec `case 'MOCK'` / `'CLOUD'` / `'LOCAL'` et fallback MOCK.
- **Méthode `extractKnowledgeGraph`** : même `switch` sur `this.aiMode`.

**Extraits :**

```ts
// Ligne 54
this.aiMode = (process.env.AI_MODE || 'MOCK').toUpperCase() as 'MOCK' | 'CLOUD' | 'LOCAL';

// Lignes 109–113 (analyze)
if (aiMode === 'MOCK') {
  // Génération statique factice, pas d'appel Python/AI
  ...
} else if (aiMode === 'LOCAL') {
  // Appel sidecar Python /process-generic
  ...
}
// Sinon CLOUD → OpenAI direct
```

```ts
// Lignes 361–379 (analyzeConsultation)
switch (this.aiMode) {
  case 'MOCK':
    consultation = this.analyzeConsultationMock(text, patientId);
    break;
  case 'CLOUD':
    consultation = await this.analyzeConsultationCloud(text);
    break;
  case 'LOCAL':
    consultation = await this.analyzeConsultationLocal(text);
    break;
  default:
    this.logger.warn(`Unknown AI_MODE: ${this.aiMode}, falling back to MOCK`);
    consultation = this.analyzeConsultationMock(text, patientId);
}
```

**Autres services avec Hybrid Toggle :**  
`DocumentAnalysisService`, `TranscriptionService`, `PDFExtractionService` utilisent aussi `AI_MODE` (lecture env + switch/case).

---

### 2.2 Le Contrat (Zod)

**Fichier audité :** `libs/shared/src/contracts/consultation.schema.ts`

**Check critique — Schéma Zod de sortie (ex. ConsultationSchema) :** ✅ **Conforme**

- **`ConsultationSchema`** définit : `patientId`, `transcript`, `symptoms[]`, `diagnosis[]` (code, confidence, label), `medications[]` (name, dosage, duration).
- **`zodToJsonSchema`** : conversion vers JSON Schema (target `openApi3`, `$refStrategy: 'none'`) pour Python/instructor.
- **Export** : `Consultation`, `ConsultationSchema` via `libs/shared/src/index.ts`.

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
  medications: z.array(...).default([]),
});
export type Consultation = z.infer<typeof ConsultationSchema>;
```

**Utilisation côté API :**  
`ScribeService`, `ScribeController`, `ScribeProcessor` importent `ConsultationSchema` (et `zodToJsonSchema`) depuis `@basevitale/shared`.

---

### 2.3 Le Muscle (Python Sidecar)

**Fichier audité :** `apps/ai-cortex/main.py`

**Check critique — Instructor + endpoint générique acceptant un schéma JSON :** ✅ **Conforme**

- **Instructor :** `from instructor import patch` ; client OpenAI patché avec `PatchMode.JSON` (ou fallback `"json"`).
- **Endpoint générique :** `POST /process-generic`  
  - Reçoit : `text`, `schema` (JSON Schema), `system_prompt`, `llm_provider`, `llm_model`, `base_url` optionnels.
  - Construit un modèle Pydantic **dynamique** via `json_schema_to_pydantic_model(request.schema)` — **aucun hardcoding** de structure métier.
  - Appel `patched_client.chat.completions.create(..., response_model=DynamicModel)`.
  - Réponse : `ProcessGenericResponse(data=structured_data)`.
- **Alias :** `POST /structure` mappe `json_schema` → `schema` et délègue à `process_generic`.

**Extraits :**

```py
# Lignes 274–275, 344–354
@app.post("/process-generic", response_model=ProcessGenericResponse)
async def process_generic(request: ProcessGenericRequest) -> ProcessGenericResponse:
    ...
    DynamicModel = json_schema_to_pydantic_model(request.schema, "StructuredResponse")
    response = patched_client.chat.completions.create(
        ...
        response_model=DynamicModel,
        temperature=0.3,
    )
    structured_data = response.model_dump()  # ou .dict() Pydantic v1
    return ProcessGenericResponse(data=structured_data)
```

**Law III (Universal Worker) :**  
Respectée : pas de logique métier, un seul endpoint principal, schéma fourni par l’appelant.

---

### 2.4 La Mémoire (Prisma & Docker)

**Schéma Prisma :** `apps/api/prisma/schema.prisma`  
**Convention (Option B, alignement Lone Wolf) :** L’API est le seul propriétaire de la DB. Le schéma reste sous `apps/api` ; pas de `libs/shared/.../prisma`. Les contrats métier (Zod) vivent dans `libs/shared/src/contracts`.

**Check critique — Consultation/Draft et type Json (JSONB) :** ✅ **Conforme**

- **`ConsultationDraft`**  
  - `structuredData Json` — données structurées selon ConsultationSchema.  
  - Commentaire : *« Structure conforme à ConsultationSchema (Zod) »*.
- **`Consultation`**  
  - `draftData Json` — structure libre avant validation (ex. ConsultationSchema).

**Docker Stack :** ✅ **Conforme**

- **PostgreSQL** : `pgvector/pgvector:pg15`, healthcheck, volume.
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
| Shared library (Nx, `@basevitale/shared` → `libs/shared`) | ✅ OK |

---

## 4. Audit du code (détails)

### 4.1 Hybrid Toggle (MOCK vs LOCAL vs CLOUD)

- **Implémenté** dans `ScribeService` (if/else pour `analyze`, switch pour `analyzeConsultation` / `extractKnowledgeGraph`).
- **Fallback** : mode inconnu → MOCK ; erreur LOCAL (ex. sidecar indisponible) → MOCK.
- **Config** : `ConfigService.aiMode` et `process.env.AI_MODE` utilisés de façon cohérente.

### 4.2 Contract-First (Python contraint par Zod/JSON)

- **Oui.**  
  - NestJS : Zod `ConsultationSchema` → `zodToJsonSchema` → envoi du JSON Schema au sidecar.  
  - Python : construction dynamique du modèle Pydantic à partir de ce schéma, puis `response_model=DynamicModel`.  
  - Les réponses du sidecar sont en outre **revalidées** par `ConsultationSchema.parse(structuredData)` dans `ScribeService` avant sauvegarde.

### 4.3 Sémaphore GPU / lock Redis avant appel IA

- **Non implémenté.**  
- Aucune utilisation de sémaphore Redis ni de lock explicite avant les appels LLM.  
- **Présent :**  
  - Redis pour **BullMQ** (queue `scribe-consultation`, `ScribeProcessor`) quand `USE_REDIS_QUEUE` + `AI_MODE=LOCAL`.  
  - Cache optionnel (`ENABLE_AI_CACHE`) pour éviter de réanalyser le même texte.  
- **Conclusion :** Pas de « Sémaphore GPU » type lock Redis avant IA ; uniquement file d’attente et cache.

---

## 5. Divergences et points d’attention

### 5.1 Emplacement du schéma Prisma

- **Alignement (Option B) :** Schéma canonique `apps/api/prisma/schema.prisma`. L’API est le seul propriétaire de la DB.  
- **.cursorrules** et docs mis à jour pour refléter cette convention. Aucun déplacement vers `libs/shared`.

### 5.2 Logique métier dans le Python

- **Aucune.**  
  - Le sidecar reste générique : `request.schema` + `request.text` → modèle Pydantic dynamique → LLM → `ProcessGenericResponse`.  
  - Pas de référence à `ConsultationSchema` ou à des types métier dans `main.py`.

### 5.3 Controller NestJS et OpenAI

- **Aucun appel direct à OpenAI depuis un controller.**  
  - `ScribeController` utilise uniquement `ScribeService` ; toute la logique IA (MOCK/CLOUD/LOCAL) est dans le service.

### 5.4 Sémaphore GPU

- **Corrigé** : GpuLockService + `runWithLock` + Bull `concurrency: 1` implémentés (voir § 4.3).

---

## 6. Synthèse et note de conformité

**Résumé :**

- **Architecture** (dossiers, Docker, Nx, shared) : conforme.  
- **Hybrid Toggle** : correctement implémenté (MOCK/CLOUD/LOCAL, fallbacks).  
- **Contract-First** : Zod → JSON Schema → Python/instructor → revalidation Zod ; conforme.  
- **Universal Worker** : Python générique, `/process-generic`, pas de logique métier ; conforme.  
- **Mémoire** : ConsultationDraft / Consultation en `Json` (JSONB) ; conforme.  
- **Sémaphore GPU** : implémenté (GpuLockService, Bull concurrency 1).

**Note de conformité au protocole Lone Wolf :** **9,5 / 10**

- **-0,5** : Schéma Prisma décrit dans la doc sous `libs/shared` alors qu’il est sous `apps/api`.

---

### Mise à jour post-audit (sémaphore GPU)

- **GpuLockService** : verrou Redis `lock:gpu:1` (SET NX EX / DEL), `runWithLock<T>(fn, options?)` avec TTL et maxWait.  
- Intégration : **ScribeService** (analyze LOCAL, analyzeConsultationLocalDirect, extractKnowledgeGraphLocal), **ScribeProcessor** (handleAnalyzeConsultation).  
- **Bull** : `concurrency: 1` sur le job `analyze-consultation`.  
- Variables : `GPU_LOCK_TTL_SECONDS` (déf. 120), `GPU_LOCK_MAX_WAIT_MS` (déf. 60000), Redis via `REDIS_HOST` / `REDIS_PORT`.

---

*Rapport produit par l’Auditeur Technique « Deep Dive » v2.0 pour l’Orchestrateur Topologique.*
