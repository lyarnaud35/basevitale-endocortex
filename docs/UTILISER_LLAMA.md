# Utiliser Llama (Ollama) dans BaseVitale

Ce guide décrit **comment faire appel au LLM local (Llama via Ollama)** dans l’application.

**Pour développer sans blocage** (pas d’Ollama, réponses instantanées) : utilise **`AI_MODE=MOCK`** et vois **`docs/DEV_SANS_BLOCAGE.md`**.

---

## 1. Prérequis

| Élément | Rôle |
|--------|------|
| **Ollama** | Fait tourner le modèle (ex. `llama3`). Doit tourner sur la machine hôte. |
| **ai-cortex** | Sidecar Python qui appelle Ollama et retourne du JSON structuré (instructor). |
| **API NestJS** | Reçoit les requêtes, appelle ai-cortex en `AI_MODE=LOCAL`. |
| **Redis** | Verrou GPU / files Bull pour réguler les appels IA. |

**Vérifications rapides :**

```bash
# Ollama (modèle disponible)
curl -s http://localhost:11434/api/tags | head -c 200

# ai-cortex (depuis la machine hôte)
curl -s -m 5 http://localhost:8000/health | head -c 200

# API Scribe
curl -s http://localhost:3000/api/scribe/health
```

**.env (exemples) :**

- `AI_MODE=LOCAL` → NestJS utilise ai-cortex (donc Ollama/Llama).
- `OLLAMA_BASE_URL=http://host.docker.internal:11434/v1` si ai-cortex est dans Docker.
- `OLLAMA_MODEL=llama3` (ou le modèle que tu utilises).

Voir aussi `REDEMARRAGE_SERVEURS.md` pour Docker, `nx serve api` / `nx serve web`, et dépannage.

---

## 2. Utilisation dans l’interface (Scribe)

C’est **le flux principal** où Llama est utilisé.

1. **Démarrer** : API (`npx nx serve api`), Web (`npx nx serve web`), Docker (postgres, redis, ai-cortex), Ollama.
2. **Ouvrir** :  
   - **http://localhost:4200/scribe**  
   - ou **http://localhost:4200/scribe/test** pour le test minimal.
3. **Saisir** :
   - Un **patient ID** (ex. `patient_test_123`).
   - Le **texte de consultation** (dictée ou zone de texte).
4. **Lancer l’analyse** :
   - **« Simuler consultation »** (texte pré-rempli) ou **« Analyser »** après avoir saisi ton propre texte.
5. **Résultat** :  
   Le front envoie `POST /scribe/process-dictation`.  
   L’API appelle ai-cortex → Ollama/Llama structure la consultation (symptômes, diagnostics, médicaments) → création d’un **draft** → redirection vers la page d’édition du draft (`/scribe/[id]`).
6. **Suite** : Tu peux modifier le draft, **Sauvegarder** (PATCH), puis **Valider** (POST validate).

En résumé : **Scribe + « Simuler / Analyser » = utilisation de Llama** pour structurer la consultation.

---

## 3. Utilisation via l’API (sans interface)

Si tu veux appeler Llama **directement via l’API** :

### Analyser un texte (sans créer de draft)

```bash
curl -X POST http://localhost:3000/api/scribe/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ton-token>" \
  -d '{"text": "Patient fièvre 38.5, toux, maux de gorge. Diagnostic : angine. Paracétamol 1g x3/j."}'
```

Réponse : JSON structuré (symptômes, diagnostic, médicaments) selon `ConsultationSchema`.

### Dictée → draft (comme l’interface)

```bash
curl -X POST http://localhost:3000/api/scribe/process-dictation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ton-token>" \
  -d '{"text": "Patient fièvre 38.5, toux...", "patientId": "patient_123"}'
```

Réponse : draft créé + consultation structurée. Tu peux ensuite PATCH `/scribe/draft/:id` et POST `/scribe/draft/:id/validate`.

En `AI_MODE=LOCAL`, ces deux endpoints passent par **ai-cortex → Ollama/Llama**.

---

## 4. Où Llama intervient dans le logiciel

| Endpoint / flux | Rôle |
|-----------------|------|
| `POST /scribe/analyze` | Analyse du texte → JSON structuré (Llama si LOCAL). |
| `POST /scribe/process-dictation` | Dictée → analyse (Llama) → création draft. |
| `POST /scribe/analyze-consultation` | Variante analyse consultation (Llama si LOCAL). |
| **Page /scribe** | Utilise `process-dictation` donc Llama quand LOCAL. |
| **Page /scribe/test** | Utilise `analyze` donc Llama quand LOCAL. |

**Condition** : `AI_MODE=LOCAL`. En `MOCK`, ce sont des données factices ; en `CLOUD`, OpenAI est utilisé.

---

## 5. En cas de problème

- **« Service IA (Cortex) indisponible »** : ai-cortex ne répond pas. Vérifier `curl http://localhost:8000/health` et les logs `docker logs -f basevitale-ai-cortex`.
- **Timeouts / retries** : Le premier appel à Llama peut être long (chargement du modèle). Les routes Scribe ont un timeout de **6 min** ; l’appel HTTP vers ai-cortex utilise `AI_CORTEX_TIMEOUT_MS` (défaut **180 s**). Tu peux augmenter dans `.env` si besoin (ex. `AI_CORTEX_TIMEOUT_MS=300000`).
- **Ollama injoignable depuis Docker** : ai-cortex utilise `host.docker.internal:11434`. Sur Mac, en général ça fonctionne. Voir `docker-compose.yml` et `.env` pour `OLLAMA_BASE_URL`.

Pour le détail des services et logs, voir **REDEMARRAGE_SERVEURS.md** (section « Vérification des logs », « Tir traceur LOCAL »).
