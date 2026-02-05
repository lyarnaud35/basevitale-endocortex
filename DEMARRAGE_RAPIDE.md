# 🚀 DÉMARRAGE RAPIDE - BaseVitale

## ❌ "localhost n'autorise pas la connexion"

**Cause :** Aucun serveur n’écoute sur l’URL (API ou Web non démarrée).

**À faire :** Démarrer l’API dans un terminal :

```bash
cd /Users/ARNAUD/Developer/BASEVITALE
npm run dev:api
```

Attendre le message du type : `BaseVitale API is running on http://0.0.0.0:3000/api`  
Puis ouvrir **http://localhost:3000/api/docs** (Swagger) ou **http://localhost:3000/api/health**.

Si tu utilises un fichier `.env` avec `PORT=3001`, l’API sera sur **http://localhost:3001** → utiliser **http://localhost:3001/api/docs**.

---

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

- **API (santé) :** http://localhost:3000/api/health *(ou 3001 si PORT=3001)*
- **Swagger :** http://localhost:3000/api/docs
- **Frontend :** http://localhost:4200
- **Test Scribe :** http://localhost:4200/scribe/test

---

## ⚠️ Note Importante

**Ne pas utiliser :** `nx run-many -t serve` ❌  
**Utiliser :** `npm run dev:api` et `npm run dev:web` ✅

Les scripts npm utilisent automatiquement le `nx` local depuis `node_modules`.
