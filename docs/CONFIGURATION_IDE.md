# Configuration IDE - BaseVitale

## 📝 Configuration Recommandée

### VS Code / Cursor

Le fichier `.vscode/settings.json` a été créé avec les paramètres optimaux pour TypeScript et Nx.

### Paramètres Principaux

- **TypeScript SDK** : Utilise la version du workspace
- **Import Module Specifier** : Relatif pour la cohérence
- **Exclusions** : Cache Nx et dist exclus de la recherche

### Commandes Utiles

#### Redémarrer le Serveur TypeScript
- **VS Code** : `Cmd+Shift+P` → "TypeScript: Restart TS Server"
- **Cursor** : Même raccourci

#### Recharger la Fenêtre
- **VS Code/Cursor** : `Cmd+Shift+P` → "Developer: Reload Window"

## 🔧 Résolution des Problèmes

### L'autocomplétion ne fonctionne pas

1. Redémarrer le serveur TypeScript
2. Vérifier que `node_modules/typescript` existe
3. Vérifier la configuration dans `.vscode/settings.json`

### Les imports `@basevitale/shared` ne sont pas résolus

1. Vérifier `tsconfig.base.json` contient le path mapping
2. Vérifier `apps/api/tsconfig.app.json` étend correctement
3. Redémarrer le serveur TypeScript
4. Exécuter : `./scripts/check-config.sh`

### Erreurs de compilation

1. Nettoyer les caches :
   ```bash
   rm -rf node_modules/.cache
   rm -rf .nx/cache
   ```

2. Rebuild :
   ```bash
   npm run build
   ```

## ✅ Script de Vérification

Un script est disponible pour vérifier la configuration :

```bash
./scripts/check-config.sh
```

Ce script vérifie :
- ✅ Configuration TypeScript
- ✅ Exports du module shared
- ✅ Modules NestJS
- ✅ Configuration Webpack
- ✅ Prisma

---

*Configuration IDE - BaseVitale*
