# Phase 1 : Mise à niveau Node 20 (fix the root cause)

NestJS, Orval et Next.js doivent tourner avec **Node 20 LTS**. Sous Node 24, Orval (Spectral/AJV) plante. Ne pas contourner avec Docker : installer Node 20 en natif.

---

## Phase 1 : Le coup d’État (forcer le PATH avec Conda)

Si après `conda activate endocortex-env` la commande `node -v` affiche encore v24, **force le chemin** dans un seul terminal neuf :

```bash
conda activate endocortex-env
export PATH="$(conda info --base)/envs/endocortex-env/bin:$PATH"
node -v
```

- Si tu vois **v20.x.x** : c’est bon. Ne ferme pas ce terminal ; tout le travail (dev:api, sdk:gen:file) se fait dans ce terminal.
- Si tu vois encore **v24** : l’env Conda est peut-être corrompu ou mal placé → passer à NVM (Option A ci‑dessous).

---

## Option A : NVM (recommandé)

Si tu as **nvm** :

```bash
nvm install 20
nvm use 20
nvm alias default 20   # Rend le changement permanent
```

Si tu n’as pas nvm, installe-le puis fais ce qui précède :

```bash
# Installation nvm (une fois)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# Redémarre le terminal, puis :
nvm install 20
nvm use 20
nvm alias default 20
```

---

## Option B : Conda (tu es déjà dans (base))

Sans nvm, avec **Conda** :

```bash
conda create -n endocortex-env nodejs=20
conda activate endocortex-env
```

Ensuite, à chaque session sur ce projet : `conda activate endocortex-env` avant `npm run dev:api` ou `npm run sdk:gen:file`.

### Si `node -v` affiche encore v24 après `conda activate endocortex-env`

Un autre Node (système ou Homebrew) est prioritaire dans le `PATH`. À faire :

1. **Vérifier quel `node` est utilisé :**
   ```bash
   which node
   ```
   Tu dois voir un chemin dans ton env conda, ex. : `.../anaconda3/envs/endocortex-env/bin/node`. Si tu vois `/usr/local/bin/node` ou un chemin sans `endocortex-env`, le PATH est incorrect.

2. **Ouvrir un nouveau terminal** (onglet ou fenêtre), puis :
   ```bash
   conda activate endocortex-env
   node -v
   ```
   Souvent, dans un shell frais, le PATH de l’env conda est correct.

3. **Si ça persiste** : forcer l’usage du Node de l’env dans ce terminal :
   ```bash
   export PATH="$(conda info --base)/envs/endocortex-env/bin:$PATH"
   node -v
   ```
   Tu dois obtenir `v20.x.x`.

---

## Vérification impérative

Après avoir activé Node 20 (nvm ou conda), exécute :

```bash
node -v
```

**Résultat attendu :** `v20.x.x` (par ex. v20.18.0).

Si tu obtiens autre chose (ex. v24.x.x), **ne passe pas à la suite**. Réactive le bon env (nvm use 20 ou conda activate endocortex-env) jusqu’à avoir `v20.x.x`.

Vérification automatisée (depuis la racine du repo) :

```bash
npm run check:node20
```

En cas d’échec, le script affiche un message et quitte avec code 1.

---

## Phase 2 : Exécution propre (clean slate)

Tes `node_modules` ont peut‑être été installés avec Node 24. Réinstalle tout avec Node 20 dans le **même terminal** où `node -v` donne v20.

**Nettoyage radical :**
```bash
rm -rf node_modules package-lock.json
```

**Réinstallation alignée :**
```bash
npm install
```

Ou en une commande : `npm run phase2:clean-install` (depuis la racine du repo).

**Ensuite – 2 terminaux :**

| Onglet 1 (Node 20) | Onglet 2 (Node 20) |
|--------------------|--------------------|
| `conda activate endocortex-env` | `conda activate endocortex-env` |
| `export PATH="$(conda info --base)/envs/endocortex-env/bin:$PATH"` | `export PATH="$(conda info --base)/envs/endocortex-env/bin:$PATH"` |
| `node -v` → v20 | `node -v` → v20 |
| **Génération SDK** (une fois l’API prête) : | **Lancer le Cerveau** : |
| `npm run openapi:fetch` | `npm run dev:api` |
| `npm run sdk:gen:file` | (laisser tourner) |

Ordre : démarre l’API dans l’onglet 2, attends le message de Nest, puis dans l’onglet 1 lance `openapi:fetch` puis `sdk:gen:file`.

---

## Ensuite (après Phase 2)

Une fois Node 20 + dépendances réinstallées :

1. Onglet 2 : `npm run dev:api` (démarrer l’API)
2. Onglet 1 : `npm run openapi:fetch` puis `npm run sdk:gen:file` (générer le SDK)

Plus besoin de Docker pour la génération du SDK.
