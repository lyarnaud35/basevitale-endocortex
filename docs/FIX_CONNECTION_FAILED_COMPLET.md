# 🔧 Fix "Connection Failed" - Guide Complet

**Date :** 2026-01-21  
**Problème :** Les 3 URLs retournent "Connection Failed"  
**Status :** ✅ **SOLUTION DÉTAILLÉE**

---

## 🎯 Diagnostic

Si vous voyez "Connection Failed" sur :
- ❌ http://localhost:3000/api/health
- ❌ http://localhost:4200
- ❌ http://localhost:4200/scribe/test

**Cause :** Les serveurs backend et frontend ne sont **pas démarrés**.

---

## ✅ Solution : Démarrage des Serveurs

### **Méthode 1 : Démarrage Manuel (Recommandé pour débogage)**

#### **Étape 1 : Vérifier Docker**

```bash
cd /Users/ARNAUD/Developer/BASEVITALE
docker ps
```

**Résultat attendu :**
```
NAMES                  STATUS
basevitale-redis       Up X hours (healthy)
basevitale-postgres    Up X hours (healthy)
basevitale-neo4j       Up X hours (healthy)
```

Si Docker n'est pas démarré :
```bash
docker-compose up -d
```

#### **Étape 2 : Terminal 1 - Démarrer le Backend**

```bash
cd /Users/ARNAUD/Developer/BASEVITALE
npm run dev:api
```

**Signes de succès :**
- ✅ `🚀 BaseVitale API is running on: http://localhost:3000/api`
- ✅ `🤖 AI Mode: MOCK`
- ✅ Pas d'erreurs rouges

**Si erreur :**
- ❌ `Cannot find module '@nestjs/common'` → `npm install`
- ❌ `Property 'consultationDraft' does not exist` → `cd apps/api && npx prisma generate`
- ❌ `Port 3000 already in use` → `lsof -ti:3000 | xargs kill`

#### **Étape 3 : Terminal 2 - Démarrer le Frontend**

**Ouvrez un NOUVEAU terminal** :

```bash
cd /Users/ARNAUD/Developer/BASEVITALE
npm run dev:web
```

**Signes de succès :**
- ✅ `✓ Ready in X seconds`
- ✅ `Local: http://localhost:4200`
- ✅ Pas d'erreurs de compilation

**Si erreur :**
- ❌ `Cannot find module 'react'` → `npm install`
- ❌ `Port 4200 already in use` → Changez le port ou arrêtez le processus

#### **Étape 4 : Vérifier que tout fonctionne**

**Dans un navigateur :**

1. **Backend Health :** http://localhost:3000/api/health
   - ✅ Devrait afficher : `{"status":"ok",...}`

2. **Frontend Home :** http://localhost:4200
   - ✅ Devrait afficher la page d'accueil BaseVitale

3. **Page Test Scribe :** http://localhost:4200/scribe/test
   - ✅ Devrait afficher la page de test avec le bouton "SIMULER CONSULTATION"

---

## 🔍 Vérifications de Dépannage

### **Vérifier les ports**

```bash
# Voir qui utilise les ports
lsof -i :3000 -i :4200

# Tuer un processus sur un port (si nécessaire)
lsof -ti:3000 | xargs kill
lsof -ti:4200 | xargs kill
```

### **Vérifier les dépendances**

```bash
# Vérifier que node_modules existe
ls -la node_modules | head -5

# Si vide ou manquant :
npm install
```

### **Vérifier Prisma Client**

```bash
# Générer le client Prisma
cd apps/api
npx prisma generate
cd ../..
```

### **Tester la connexion Backend**

```bash
# Health check
curl http://localhost:3000/api/health

# Devrait retourner :
# {"status":"ok","timestamp":"...","version":"..."}
```

---

## 📋 Checklist Complète

Avant de tester les URLs, vérifiez :

- [ ] ✅ Docker Desktop est démarré
- [ ] ✅ Services Docker actifs (`docker ps`)
- [ ] ✅ Dépendances npm installées (`npm install`)
- [ ] ✅ Client Prisma généré (`npx prisma generate` dans `apps/api`)
- [ ] ✅ **Backend API démarré** (`npm run dev:api` dans Terminal 1)
- [ ] ✅ **Frontend Web démarré** (`npm run dev:web` dans Terminal 2)
- [ ] ✅ Backend répond : `curl http://localhost:3000/api/health`
- [ ] ✅ Frontend accessible : http://localhost:4200

---

## 🎯 Commandes de Démarrage Rapide

### **Option 1 : Script Automatique (Futur)**

```bash
./scripts/start-servers.sh
```

### **Option 2 : Démarrage Manuel (Actuel)**

```bash
# Terminal 1
npm run dev:api

# Terminal 2 (nouveau terminal)
npm run dev:web
```

---

## 🚨 Erreurs Communes

### **1. "command not found: nx"**

**Solution :** Utilisez `npm run dev:api` et `npm run dev:web` au lieu de `nx serve`.

### **2. "Cannot find module '@nestjs/common'"**

**Solution :**
```bash
npm install
```

### **3. "Property 'consultationDraft' does not exist"**

**Solution :**
```bash
cd apps/api
npx prisma generate
cd ../..
```

### **4. "Port 3000 already in use"**

**Solution :**
```bash
# Tuer le processus
lsof -ti:3000 | xargs kill

# Ou changer le port dans .env
PORT=3001
```

### **5. "Connection refused" sur Frontend**

**Causes possibles :**
- Backend pas démarré
- Mauvais `NEXT_PUBLIC_API_URL`
- CORS non configuré

**Solution :**
- Vérifier que le backend tourne : `curl http://localhost:3000/api/health`
- Vérifier `.env` : `CORS_ORIGIN=http://localhost:4200`

---

## ✅ Résultat Final

Une fois les serveurs démarrés, vous devriez voir :

- ✅ **Backend :** http://localhost:3000/api/health → JSON avec status "ok"
- ✅ **Frontend :** http://localhost:4200 → Page d'accueil BaseVitale
- ✅ **Test Page :** http://localhost:4200/scribe/test → Page de test Scribe fonctionnelle

---

**Le problème "Connection Failed" est résolu !** 🎉

---

*Fix Connection Failed - BaseVitale V113*
