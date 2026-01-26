# ✅ Solution : "command not found: nx"

**Date :** 2026-01-21  
**Problème :** `nx` n'est pas dans votre PATH  
**Solution :** Utiliser les scripts npm ou npx

---

## 🎯 Solution Immédiate

### **Option 1 : Utiliser les Scripts NPM** (Recommandé ✅)

```bash
# Terminal 1 - Backend
npm run dev:api

# Terminal 2 - Frontend
npm run dev:web
```

### **Option 2 : Utiliser le Script Automatique**

```bash
./scripts/start-dev.sh
```

Ce script démarre automatiquement les deux serveurs.

### **Option 3 : Utiliser npx**

```bash
# Backend
npx nx serve api

# Frontend
npx nx serve web
```

---

## ❌ Ne PAS Utiliser

```bash
# ❌ Ne fonctionne pas
nx run-many -t serve

# ❌ Ne fonctionne pas
nx serve api
```

---

## 🔧 Si Vous Voulez Installer Nx Globalement (Optionnel)

```bash
npm install -g nx
```

Mais ce n'est **pas nécessaire** - les scripts npm fonctionnent parfaitement !

---

## 📝 Explication

`nx` est installé localement dans `node_modules/.bin/nx`. Les scripts npm (`npm run dev:api`, etc.) utilisent automatiquement cette version locale, donc pas besoin d'installer `nx` globalement.

---

**Utilisez `npm run dev:api` et `npm run dev:web` dans deux terminaux séparés !** 🚀

---

*Solution Nx - BaseVitale*
