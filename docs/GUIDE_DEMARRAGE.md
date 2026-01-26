# 🚀 Guide de Démarrage - BaseVitale

**Date :** 2026-01-21  
**Status :** ✅ **GUIDE COMPLET**

---

## 🎯 Démarrage Rapide

### **Option 1 : Script Automatique** (Recommandé)

```bash
./scripts/start-all.sh
```

Démarre automatiquement :
- ✅ Services Docker
- ✅ Backend API (port 3000)
- ✅ Frontend Web (port 4200)

---

### **Option 2 : Démarrage Manuel**

#### **1. Services Docker**

```bash
docker-compose up -d
```

#### **2. Backend API**

```bash
npm run dev:api
```

Ou :
```bash
npx nx serve api
```

**API disponible :** `http://localhost:3000/api`

#### **3. Frontend Web**

Dans un **nouveau terminal** :

```bash
npm run dev:web
```

Ou :
```bash
npx nx serve web
```

**Frontend disponible :** `http://localhost:4200`

---

## 📋 Commandes Utiles

### **NPM Scripts Disponibles**

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarre l'API |
| `npm run dev:api` | Démarre l'API |
| `npm run dev:web` | Démarre le Frontend |
| `npm run build` | Build production |
| `npm test` | Lance les tests |

### **Nx Direct (si installé globalement)**

```bash
# Installer nx globalement
npm install -g nx

# Ensuite :
nx serve api
nx serve web
```

---

## 🔍 Résolution de Problèmes

### **Erreur : "command not found: nx"**

**Solution :** Utilisez les scripts npm au lieu de `nx` directement :

```bash
# ❌ Ne pas utiliser
nx run-many -t serve

# ✅ Utiliser à la place
npm run dev:api  # Terminal 1
npm run dev:web  # Terminal 2
```

### **Erreur : "Connection Failed"**

**🔴 DIAGNOSTIC :** Si vous voyez "Connection Failed" sur les 3 URLs, **les serveurs ne sont pas démarrés**.

**✅ SOLUTION IMMÉDIATE :**

#### **Option A : Démarrage Automatique (2 terminaux)**

**Terminal 1 - Backend :**
```bash
cd /Users/ARNAUD/Developer/BASEVITALE
npm run dev:api
```
Attendez de voir : `🚀 BaseVitale API is running on: http://localhost:3000/api`

**Terminal 2 - Frontend :**
```bash
cd /Users/ARNAUD/Developer/BASEVITALE
npm run dev:web
```
Attendez de voir : `✓ Ready in X seconds` ou `Local: http://localhost:4200`

#### **Option B : Vérification étape par étape**

1. ✅ **Docker actif ?**
   ```bash
   docker ps
   ```
   Vous devriez voir : `basevitale-postgres`, `basevitale-neo4j`, `basevitale-redis`

2. ✅ **Ports libres ?**
   ```bash
   lsof -i :3000 -i :4200
   ```
   Si des processus sont listés, arrêtez-les ou changez les ports.

3. ✅ **Backend démarre correctement ?**
   ```bash
   npm run dev:api
   ```
   Si erreur, vérifiez : `node_modules` existe, `npx prisma generate` exécuté.

4. ✅ **Frontend démarre correctement ?**
   ```bash
   npm run dev:web
   ```
   Si erreur, vérifiez : dépendances installées.

5. ✅ **Test de connexion :**
   ```bash
   curl http://localhost:3000/api/health
   ```
   Devrait retourner : `{"status":"ok",...}`

---

## 🎯 URLs Importantes

- **Backend API :** http://localhost:3000/api
- **Frontend Web :** http://localhost:4200
- **Page Test Scribe :** http://localhost:4200/scribe/test
- **Health Check :** http://localhost:3000/api/health
- **Prisma Studio :** `npm run prisma:studio`

---

## ✅ Checklist Démarrage

- [ ] Docker Desktop démarré
- [ ] Services Docker actifs (`docker-compose up -d`)
- [ ] Dépendances npm installées (`npm install`)
- [ ] Client Prisma généré (`npm run prisma:generate`)
- [ ] Backend démarré (`npm run dev:api`)
- [ ] Frontend démarré (`npm run dev:web`)

---

**Le système est maintenant prêt !** 🎉

---

*Guide de Démarrage - BaseVitale V112+*
