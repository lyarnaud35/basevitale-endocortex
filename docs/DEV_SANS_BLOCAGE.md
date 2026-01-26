# Développer sans blocage – BaseVitale

Guide pour travailler sur le projet **sans timeouts, sans Ollama, sans dépendance ai-cortex**.

---

## 1. Principe

- **`AI_MODE=MOCK`** : l’API ne appelle ni Ollama ni ai-cortex. Les réponses Scribe (symptômes, diagnostics, médicaments) sont **instantanées** et factices.
- Tu peux développer l’UI, les parcours, les appels API, PATCH/POST, etc. **sans ralentissement ni 503**.

---

## 2. Configuration minimale

### .env

```bash
AI_MODE=MOCK
```

Aucun besoin de `AI_CORTEX_URL`, Ollama ou ai-cortex pour le dev quotidien.

### Docker (optionnel en MOCK)

En **MOCK**, Scribe n’utilise pas ai-cortex. Tu as quand même besoin de **Postgres** (drafts, Prisma) et **Redis** (Bull, GpuLock). Neo4j sert au Knowledge Graph.

```bash
docker compose up -d postgres redis
# ai-cortex optionnel en MOCK
```

Si tu lances **tout** le stack (y compris ai-cortex), ça ne gêne pas ; il est simplement pas utilisé.

---

## 3. Démarrage typique

```bash
# 1. Docker
docker compose up -d postgres redis

# 2. API
npx nx serve api

# 3. Frontend (autre terminal)
npx nx serve web
```

- **API** : http://localhost:3000  
- **Frontend** : http://localhost:4200  
- **Scribe** : http://localhost:4200/scribe → « Simuler consultation » → réponses immédiates.

---

## 4. Vérifications rapides

```bash
# API prête
curl -s http://localhost:3000/api/scribe/health | head -c 200

# Logs API : doit afficher AI_MODE: MOCK
# [ScribeService] ScribeService initialized with AI_MODE: MOCK
```

---

## 5. Quand passer en LOCAL ou CLOUD ?

- **MOCK** : dev au quotidien, pas de blocage.
- **LOCAL** : tester Llama/Ollama → mettre `AI_MODE=LOCAL`, ai-cortex + Ollama nécessaires. Voir `UTILISER_LLAMA.md`.
- **CLOUD** : OpenAI → `AI_MODE=CLOUD` + `OPENAI_API_KEY`.

Après changement de `AI_MODE`, **redémarrer l’API** (`npx nx serve api`).

---

## 6. Problèmes courants

| Symptôme | Cause probable | Action |
|----------|----------------|--------|
| `ERR_CONNECTION_REFUSED` sur :3000 | API non démarrée | `npx nx serve api`, attendre le build |
| « localhost n'autorise pas » | Front ou API pas prêts | Vérifier que les deux serveurs tournent, rafraîchir |
| `EADDRINUSE :3000` | Port occupé | `lsof -ti:3000 \| xargs kill -9` puis relancer l’API |
| Web ne compile pas / `ProjectGraphError` | Cache Nx / .next | `npx nx reset` puis `rm -rf apps/web/.next` |

Détails : `REDEMARRAGE_SERVEURS.md`.

---

## 7. Résumé

- **`.env`** : `AI_MODE=MOCK`
- **Docker** : au minimum `postgres` + `redis`
- **Serveurs** : `npx nx serve api` puis `npx nx serve web`
- **Scribe** : réponses instantanées, aucun appel à Llama.

Tu peux développer le logiciel sans blocage lié à l’IA.
