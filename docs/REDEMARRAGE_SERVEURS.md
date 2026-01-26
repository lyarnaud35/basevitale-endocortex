# Redémarrage des serveurs – BaseVitale

## Développer sans blocage

Pour éviter timeouts, 503 et dépendance à Ollama/ai-cortex : **`AI_MODE=MOCK`** dans `.env`.  
→ Voir **`docs/DEV_SANS_BLOCAGE.md`** pour le guide complet.

## Actions effectuées

1. **Arrêt des processus**
   - Ports 3000 et 4200 libérés
   - Processus `nx serve` arrêtés

2. **Nettoyage**
   - `npx nx reset` (cache Nx)
   - Suppression de `apps/web/.next` (cache Next.js)

3. **Docker**
   - `docker compose up -d postgres redis ai-cortex`
   - Postgres, Redis, AI-Cortex : **Running**

4. **Backend (NestJS)**
   - `npx nx serve api` lancé en arrière-plan
   - Compilation webpack en cours (peut prendre 1–2 min)
   - À terme : http://localhost:3000

5. **Frontend (Next.js)**
   - `npx nx serve web` lancé en arrière-plan
   - **Ready** : http://localhost:4200

## Vérifications

```bash
# Santé API (une fois prête)
curl http://localhost:3000/api/scribe/health

# Frontend
curl -I http://localhost:4200

# Docker
docker compose ps postgres redis ai-cortex
```

## Comment savoir l’avancée ?

**Logs du serveur**  
Les logs de `npx nx serve api` (ou `nx serve web`) s’affichent dans le terminal où la commande tourne. Si tu l’as lancé en arrière-plan via Cursor, ouvre le terminal concerné ou le fichier de sortie (ex. `terminals/344495.txt`).

**Indicateurs utiles (API)**  
- `webpack compiled successfully` → build terminé  
- `[Nest] … Nest application successfully started` → app démarrée  
- `Error: listen EADDRINUSE :::3000` → port 3000 occupé (voir plus bas)  
- Pas d’erreur juste après → l’API écoute sur http://localhost:3000  

**Vérification rapide**  
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/scribe/health
# 200 = API prête
```

---

## Si l’API ne répond pas

L’API NestJS passe par un build webpack avant de démarrer. Attendre 1–2 minutes puis :

1. Regarder les logs du terminal où tourne `nx serve api`
2. Vérifier qu’on voit : `BaseVitale API is running on http://localhost:3000`
3. Tester : `curl http://localhost:3000/api/scribe/health`

### « localhost n'autorise pas la connexion » / `ERR_CONNECTION_REFUSED`

Le frontend (4200) appelle l’API sur **:3000**. Si tu vois :
- **« localhost n'autorise pas la connexion »** dans le navigateur, ou  
- **`Failed to load resource: net::ERR_CONNECTION_REFUSED`** sur `:3000/api/scribe/...`  

→ **L’API NestJS n’est pas démarrée** (ou pas encore prête).

**À faire :**
1. Démarrer l’API : `npx nx serve api`
2. Attendre la fin de la compilation (1–2 min) jusqu’à voir « Nest application successfully started » / écoute sur 3000
3. Tester : `curl http://localhost:3000/api/scribe/health` → doit retourner du JSON
4. Rafraîchir la page frontend (F5 ou Cmd+R)

Le frontend et l’API doivent **tous deux** tourner pour que Scribe fonctionne.

### EADDRINUSE (port 3000 déjà utilisé)

Si tu vois `Error: listen EADDRINUSE: address already in use :::3000` :

```bash
# Libérer le port 3000 (macOS)
lsof -ti:3000 | xargs kill -9
```

Puis relancer `npx nx serve api`. Utiliser **`npx nx`** (pas `nx` seul).

### Redis « getaddrinfo ENOTFOUND redis »

Si l’API tourne en local (`npx nx serve api`) alors que Redis est dans Docker : le hostname `redis` ne résout que dans le réseau Docker. Le `GpuLockService` utilise automatiquement `localhost` en `NODE_ENV=development`. Vérifier que Redis est bien exposé sur `localhost:6379` (`docker compose ps`).

## URLs

| Service   | URL                      |
|----------|---------------------------|
| Frontend | http://localhost:4200     |
| API      | http://localhost:3000/api |
| Scribe   | http://localhost:4200/scribe |
| Test     | http://localhost:4200/scribe/test |

---

## Vérification des logs (Tir traceur LOCAL)

Pour valider le flux **Frontend → NestJS → Redis (gpuLock) → Python (ai-cortex) → Postgres**, suivre les logs en parallèle.

### Terminal 1 – Backend NestJS

Les logs s’affichent dans le terminal où `nx serve api` tourne.

À vérifier au clic sur « SIMULER CONSULTATION » :

- `[ScribeService] ScribeService initialized with AI_MODE: LOCAL`
- `[GpuLockService] GpuLockService initialized`
- `[ScribeService] GPU lock acquired`
- `[ScribeService] [LOCAL] Appel Python via http://ai-cortex:8000/process-generic`
- `[ScribeService] [LOCAL] Consultation validée par ConsultationSchema`
- `[ScribeService] GPU lock released`
- `[ScribeService] [LOCAL] ConsultationDraft sauvegardé: [id]`

### Terminal 2 – AI-Cortex (Python)

```bash
docker compose logs -f ai-cortex
# ou : docker logs -f basevitale-ai-cortex
```

À vérifier :

- `INFO: POST /process-generic HTTP/1.1`
- `INFO: Using Ollama client at ...`
- `INFO: POST /process-generic HTTP/1.1 200 OK`

### Terminal 3 – Redis (optionnel)

```bash
docker compose logs -f redis
```

### Commandes utiles

```bash
# Dernières lignes ai-cortex
docker compose logs --tail=50 ai-cortex

# Test manuel endpoint Python
curl -X POST http://localhost:8000/process-generic \
  -H "Content-Type: application/json" \
  -d '{"text":"Patient fièvre 38.5","schema":{"type":"object","properties":{"symptoms":{"type":"array","items":{"type":"string"}}}}}'
```

---

## Tir traceur LOCAL – Checklist

Pour tester **Llama** (Ollama) : `AI_MODE=LOCAL`. Pour **développer sans blocage** : `AI_MODE=MOCK` (voir `DEV_SANS_BLOCAGE.md`).

1. `.env` : `AI_MODE=LOCAL` et `AI_CORTEX_URL=http://ai-cortex:8000` (ou `http://localhost:8000` si API sur hôte)
2. Docker : `docker compose up -d postgres redis ai-cortex`
3. Backend : `nx serve api` (redémarrer après changement de `AI_MODE`)
4. Frontend : `nx serve web`
5. Test : http://localhost:4200/scribe/test → « SIMULER CONSULTATION »
6. Vérifier : JSON affiché, ligne créée dans `ConsultationDraft` (Prisma Studio ou SQL)

**Utiliser Llama (Ollama) dans l’app** → voir **`docs/UTILISER_LLAMA.md`**.
