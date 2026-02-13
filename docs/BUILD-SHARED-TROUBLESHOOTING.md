# Build `@basevitale/shared` — Dépannage

**Correctif appliqué :** `libs/shared/tsconfig.lib.json` est autonome (sans `extends` du `tsconfig.base.json`). L’héritage des `paths` du monorepo faisait bloquer ou échouer le build. Avec un tsconfig autonome, `npx nx build shared` termine en ~40 s.

En dev, les apps résolvent `@basevitale/shared` via les paths TypeScript (sources), donc tout peut fonctionner sans build.

Si `npx nx build shared` échoue (souvent sans message d’erreur explicite) :

1. **Vérifier la config TypeScript**
   - `libs/shared/tsconfig.lib.json` : `outDir`, `rootDir`, `include`/`exclude`.
   - S’assurer que `rootDir` couvre bien `./src` et que tous les fichiers exportés dans `index.ts` existent.

2. **Lancer tsc à la main pour voir l’erreur**
   ```bash
   cd libs/shared && npx tsc -p tsconfig.lib.json --noEmit
   ```
   Ou depuis la racine :
   ```bash
   npx tsc -p libs/shared/tsconfig.lib.json --noEmit 2>&1
   ```

3. **Dépendances**
   - La lib utilise `zod` ; il doit être installé à la racine du monorepo (`package.json`).

4. **Cache Nx**
   ```bash
   npx nx reset
   npx nx build shared
   ```

En CI/CD, si le build de `shared` est requis avant d’autres libs (ex. `ghost-sdk`), corriger le build en priorité ou désactiver temporairement la cible `shared:build` si tout est consommé en source (paths).
