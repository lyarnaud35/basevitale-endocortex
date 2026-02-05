# Checklist d’export – Livrable Ben

Variables d’environnement et étapes pour livrer le « Colis » (API + Docker) à l’Hôte.


**Voir aussi :** `docs/INTEGRATION.md` (démarrage, init IA, intégration widget).
---

## 1. Variables d’environnement (`.env`)

Fichiers de référence : **`env.example.prod`** ou **`env.prod.example`** (mode Souverain / Ollama dans le compose). Copier en `.env` puis ajuster.

| Variable | Obligatoire | Défaut | Rôle |
|----------|-------------|--------|------|
| `PORT` | Non | `3000` | Port d’exposition de l’API |
| `POSTGRES_USER` | Non | `postgres` | Utilisateur PostgreSQL |
| `POSTGRES_PASSWORD` | Non | `postgres` | Mot de passe PostgreSQL |
| `POSTGRES_DB` | Non | `basevitale` | Base PostgreSQL |
| `NEO4J_USER` | Non | `neo4j` | Utilisateur Neo4j |
| `NEO4J_PASSWORD` | Non | `neo4j` | Mot de passe Neo4j |
| `REDIS_PASSWORD` | Non | *(vide)* | Mot de passe Redis (optionnel) |
| `AI_MODE` | Non | `MOCK` | `MOCK` \| `LOCAL` \| `CLOUD` |
| `OLLAMA_BASE_URL` | Si `LOCAL` | `http://host.docker.internal:11434/v1` | URL Ollama (Docker → hôte Mac) |
| `OLLAMA_MODEL` | Non | `llama3.2` | Modèle Ollama |
| `GROQ_API_KEY` | Si `CLOUD` + Groq | — | Clé API Groq |
| `OPENAI_API_KEY` | Si `CLOUD` + OpenAI | — | Clé API OpenAI |
| `CORS_ORIGIN` | Non | `*` | Origines CORS autorisées |

**Zéro config :** sans `.env`, le `docker-compose.prod` utilise les valeurs par défaut. Seuls `GROQ_API_KEY` ou `OPENAI_API_KEY` sont requis si `AI_MODE=CLOUD`.

---

## 2. Lancement (Zéro config)

```bash
cp env.example.prod .env   # optionnel
docker compose -f docker-compose.prod.yml up -d
```

- **API** : `http://localhost:3000` (ou `PORT`)
- **Swagger** : `http://localhost:3000/api-docs`
- **Neo4j Browser** : `http://localhost:7474`

---

## 3. Contenu du livrable

| Élément | Emplacement |
|--------|-------------|
| Compose prod | `docker-compose.prod.yml` |
| Dockerfile API | `apps/api/Dockerfile` |
| Exemple env | `env.example.prod` / `env.prod.example` (Souverain) |
| Seed alertes (Cypher) | `scripts/seed-intelligence-alerts.cypher` |
| Payload process-dictation | `scripts/payloads/process-dictation-alertes.json` |
| Doc seeding | `docs/DATA_SEEDING_INTELLIGENCE_ALERTES.md` |
| **Doc intégration** | `docs/INTEGRATION.md` (démarrage, init IA, widget) |
| Brain Loader | `scripts/init-ai.sh` |

---

## 4. Vérifications rapides

- `GET http://localhost:3000/api/scribe/health` → 200
- `GET http://localhost:3000/api-docs` → Swagger UI
- `GET http://localhost:3000/api/scribe/patient/patient_demo_phase3/intelligence` → 200 (après seed + process-dictation + validate)
