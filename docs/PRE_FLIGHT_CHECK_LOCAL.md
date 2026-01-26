# Pre-Flight Check – Mode LOCAL (Ollama / ai-cortex)

## 1. ScribeService (NestJS)

- **AI_MODE** : lu depuis `process.env.AI_MODE` (défaut `MOCK`). En LOCAL, le service appelle le sidecar Python.
- **URL Python** : **`ConfigService.aiServiceUrl`** (pas `pythonSidecarUrl`). Utilisée pour tous les appels `POST .../process-generic`.

## 2. ConfigService.aiServiceUrl

Priorité :

1. **`AI_CORTEX_URL`** (si défini)
2. **`AI_SERVICE_URL`** (si défini)
3. Sinon : `isDevelopment ? 'http://localhost:8000' : 'http://ai-cortex:8000'`

- **API sur l’hôte** (`nx serve api`) → utiliser **`http://localhost:8000`** (ai-cortex exposé sur 8000).
- **API dans Docker** (même réseau que ai-cortex) → utiliser **`http://ai-cortex:8000`**.

## 3. Docker

- **docker-compose** : pas de service `api`. Uniquement `ai-cortex`, postgres, redis, nats, etc.
- **ai-cortex** : sur le réseau `basevitale-network` (bridge).
- **Réseau** : si tu ajoutes un service `api` plus tard, le brancher sur `basevitale-network` pour joindre `ai-cortex` par hostname.

## 4. Verdict

| Setup | AI_CORTEX_URL | Résultat |
|-------|----------------|----------|
| **API sur hôte** (`nx serve api`), ai-cortex en Docker | `http://localhost:8000` | OK |
| **API sur hôte**, `http://ai-cortex:8000` | `http://ai-cortex:8000` | **ECONNREFUSED** (hostname non résolu) |
| **API dans Docker** (même réseau), `http://ai-cortex:8000` | `http://ai-cortex:8000` | OK |

**Actuellement** : l’API tourne en général sur l’hôte. Il faut **`AI_CORTEX_URL=http://localhost:8000`** (ou ne pas le définir et laisser le défaut dev). Si tu mets `ai-cortex:8000`, le front va renvoyer une erreur type « Service IA indisponible » / timeout.

**Correction Pre-Flight** : `ConfigService.aiServiceUrl` priorise désormais `AI_CORTEX_URL` puis `AI_SERVICE_URL`. Le `.env` a été mis à **`AI_CORTEX_URL=http://localhost:8000`** pour l’exécution API sur hôte. La requête depuis le front **aboutira** (pas d’ECONNREFUSED).

## 5. Checklist avant premier test LOCAL

- [ ] `AI_MODE=LOCAL` dans `.env`
- [ ] `AI_CORTEX_URL=http://localhost:8000` **ou** absent (défaut) si API sur hôte
- [ ] `AI_CORTEX_URL=http://ai-cortex:8000` **uniquement** si API dans Docker (même compose que ai-cortex)
- [ ] `docker compose up -d` (postgres, redis, ai-cortex au minimum)
- [ ] `npx nx serve api` puis `npx nx serve web`
- [ ] Ollama + modèle (ex. `llama3`) disponibles

## 6. Vérifications rapides

```bash
# Santé ai-cortex (depuis l’hôte)
curl -s http://localhost:8000/health

# Santé Scribe
curl -s http://localhost:3000/api/scribe/health
```
