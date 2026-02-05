# Démarrage Ghost Scribe (démo)

Pour que la démo **/ghost-scribe-demo** fonctionne, l’API doit être lancée **avant** le frontend.

## 1. Démarrer l’API (obligatoire)

**Dans un premier terminal**, à la racine du projet :

```bash
PORT=3000 npm run dev:api
```

**Ou** avec le script :

```bash
PORT=3000 ./scripts/start-api-only.sh
```

Attendre d’avoir dans le terminal :

```text
🚀 BaseVitale API is running on: http://0.0.0.0:3000/api
```

(Souvent 30 à 60 secondes la première fois.)

Vérifier :

```bash
curl -s http://localhost:3000/api/ghost-scribe/ping
```

Réponse attendue : `{"success":true,"data":{"ok":true,"message":"ScribeGhostController is active"},...}`

## 2. Démarrer le frontend

**Dans un second terminal** :

```bash
API_BACKEND_URL=http://localhost:3000 npm run dev:web
```

Cela fait pointer le proxy Next.js vers l’API sur le port **3000**.

## 3. Ouvrir la démo

Dans le navigateur : **http://localhost:4200/ghost-scribe-demo**

---

## Dépannage

- **Connection refused sur 3000**  
  L’API n’est pas démarrée ou a planté. Relancer `PORT=3000 npm run dev:api` et regarder les erreurs dans le terminal.

- **500 sur /api/ghost-scribe/stream/default**  
  Soit l’API n’est pas sur le port attendu par le front (vérifier `API_BACKEND_URL=http://localhost:3000`), soit une erreur côté API : regarder le terminal où tourne `npm run dev:api`.

- **Nx “Failed to process project graph”**  
  Exécuter : `npx nx reset` puis relancer `npm run dev:api`.
