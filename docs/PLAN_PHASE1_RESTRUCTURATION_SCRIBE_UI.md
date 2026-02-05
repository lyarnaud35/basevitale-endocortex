# Phase 1 – Restructuration : Widget vs App de test

## 1. Commande de génération (réalisée)

```bash
npx nx g @nx/react:library scribe-ui \
  --directory=libs/scribe-ui \
  --importPath=@basevitale/scribe-ui \
  --bundler=none \
  --component=true \
  --style=css \
  --unitTestRunner=none \
  --tags=type:ui,scope:scribe \
  --projectNameAndRootFormat=as-provided \
  --no-interactive
```

La lib **libs/scribe-ui** existe. `tsconfig.base.json` expose `@basevitale/scribe-ui`.

---

## 2. Analyse du code actuel dans apps/web

### 2.1 Audio / stream

- **Aucun** composant audio (pas de `MediaRecorder`, `getUserMedia`, `SpeechRecognition`).
- **Aucun** composant stream dédié au Scribe dans `apps/web`.
- La dictée Scribe repose sur un **textarea** (saisie / copier-coller).

### 2.2 Où se trouve la logique Scribe aujourd’hui

| Emplacement | Rôle |
|-------------|------|
| **libs/symbiote-ui** | Widget complet : `MedicalScribe`, `ScribeTestView`, `KnowledgeGraphVisualizer`, api client, hooks, config. |
| **apps/web** | Sandbox : pages qui importent `<MedicalScribe />` depuis `@basevitale/symbiote-ui`, layout, providers. |

`apps/web` est déjà une coquille qui n’affiche que le widget. La logique est dans **symbiote-ui**, pas dans web.

### 2.3 À aligner avec le Protocole

- Le Protocole impose **libs/scribe-ui** comme produit (widget, hooks, logique).
- Actuellement le widget est dans **libs/symbiote-ui**. Il faut le rendre disponible via **libs/scribe-ui** et que `apps/web` n’importe que depuis `@basevitale/scribe-ui`.

---

## 3. Plan pour déplacer la logique vers libs/scribe-ui

### Étape 1 – Remplir libs/scribe-ui avec le widget

- Copier dans **libs/scribe-ui** la logique aujourd’hui dans **libs/symbiote-ui** :
  - `config.ts`, `api/`, `hooks/`, `components/`, `utils/`
  - Exporter `MedicalScribe`, `ScribeTestView`, `KnowledgeGraphVisualizer`, `useDebouncedCallback`, `ScribeConfig`, `formatApiError`, etc. depuis `libs/scribe-ui/src/index.ts`.
- Supprimer le placeholder généré (`lib/scribe-ui.tsx`, `lib/scribe-ui.module.css`).
- **Aucune** dépendance Next.js dans la lib (pas de `next/link`, `next/image`, etc.).

### Étape 2 – Réduire apps/web à la coquille

- Remplacer les imports `@basevitale/symbiote-ui` par `@basevitale/scribe-ui` dans toutes les pages.
- Conserver uniquement :
  - Layout, providers, global CSS, ErrorBoundary.
  - Pages qui importent et affichent **uniquement** `<MedicalScribe />` (éventuellement avec config passée en props).
- Aucune logique métier Scribe dans `apps/web` (pas de fetch Scribe, pas de state Scribe).

### Étape 3 – Configuration et nettoyage

- `next.config.js` : `transpilePackages` et alias webpack pour `@basevitale/scribe-ui`.
- `tailwind` (web) : inclure `libs/scribe-ui/src` dans `content`.
- Décider du sort de **libs/symbiote-ui** : suppression après migration, ou conservation comme alias / réexport, selon l’usage futur.

---

## 4. Checklist de vérification

- [ ] `libs/scribe-ui` contient tout le widget (MedicalScribe, hooks, api, config).
- [ ] `apps/web` n’importe que `@basevitale/scribe-ui` et n’affiche que `<MedicalScribe />` (plus de logique Scribe).
- [ ] Aucun `next/*` dans `libs/scribe-ui`.
- [ ] Build `scribe-ui` et `web` OK.

---

## 5. Ordre d’exécution

1. Génération de la lib **scribe-ui** ✅  
2. Migration du code symbiote-ui → scribe-ui (structure + exports).  
3. Bascule des imports web vers `@basevitale/scribe-ui`.  
4. Config Next + Tailwind pour scribe-ui.  
5. Vérifications (build, lint, pas de Next dans la lib).
