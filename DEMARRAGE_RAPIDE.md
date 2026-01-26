# 🚀 DÉMARRAGE RAPIDE - BaseVitale

## ❌ PROBLÈME : "command not found: nx"

**Solution :** Utilisez les scripts npm au lieu de `nx` directement.

---

## ✅ SOLUTION : 2 Terminaux

### **Terminal 1 - Backend API**

```bash
cd /Users/ARNAUD/Developer/BASEVITALE
npm run dev:api
```

### **Terminal 2 - Frontend Web**

```bash
cd /Users/ARNAUD/Developer/BASEVITALE
npm run dev:web
```

---

## 🎯 URLs Une Fois Démarré

- **Backend :** http://localhost:3000/api/health
- **Frontend :** http://localhost:4200
- **Test Scribe :** http://localhost:4200/scribe/test

---

## ⚠️ Note Importante

**Ne pas utiliser :** `nx run-many -t serve` ❌  
**Utiliser :** `npm run dev:api` et `npm run dev:web` ✅

Les scripts npm utilisent automatiquement le `nx` local depuis `node_modules`.
