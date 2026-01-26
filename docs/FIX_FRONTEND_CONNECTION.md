# 🔧 Résolution : Connexion Frontend Échouée

## ❌ Problème

`http://localhost:4200/scribe` - Connexion failed

---

## 🔍 Diagnostic

### Causes Possibles

1. **Frontend non démarré** (cause la plus probable)
2. **Mauvais port** (Next.js peut utiliser un port différent)
3. **Erreur de compilation** empêchant le démarrage
4. **Port déjà utilisé**

---

## ✅ Solutions

### Solution 1 : Démarrer le Frontend

**Dans un terminal :**
```bash
cd /Users/ARNAUD/Developer/BASEVITALE/apps/web
npm run dev
```

**Attendre :**
```
▲ Next.js 14.0.0
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000
```

**Note importante :** Next.js utilise par défaut le port **3000**, pas 4200 !

---

### Solution 2 : Vérifier le Port Utilisé

**Next.js peut utiliser différents ports :**
- Port par défaut : `3000`
- Si 3000 est occupé : `3001`, `3002`, etc.
- Configuration personnalisée possible

**Vérifier le port dans les logs du terminal** après avoir démarré `npm run dev`.

---

### Solution 3 : Si le Port 3000 est Occupé

**Option A : Arrêter le processus sur le port 3000**
```bash
# Trouver le processus
lsof -i :3000

# Arrêter (remplacer PID par le numéro trouvé)
kill -9 PID
```

**Option B : Utiliser un port différent**
```bash
cd apps/web
PORT=4200 npm run dev
```

Puis ouvrir : `http://localhost:4200/scribe`

---

### Solution 4 : Vérifier les Erreurs de Compilation

Si le frontend ne démarre pas, vérifier les erreurs :

```bash
cd apps/web
npm run dev
```

**Erreurs courantes :**
- Modules manquants : `npm install`
- Erreurs TypeScript : Vérifier les types
- Erreurs de configuration : Vérifier `next.config.js`

---

## 🚀 Procédure Complète

### Étape 1 : Vérifier que le Backend n'utilise pas le Port 3000

Le backend NestJS utilise aussi le port 3000 par défaut.

**Si le backend tourne sur 3000, le frontend utilisera 3001 :**

```bash
# Vérifier
lsof -i :3000
```

**Solution :** Utiliser un port différent pour le frontend :
```bash
cd apps/web
PORT=4200 npm run dev
```

---

### Étape 2 : Démarrer le Frontend

```bash
cd /Users/ARNAUD/Developer/BASEVITALE/apps/web
npm run dev
```

**Attendre le message :**
```
✓ Ready in X seconds
○ Local:        http://localhost:XXXX
```

---

### Étape 3 : Ouvrir la Bonne URL

**Selon le port affiché :**
- Si `http://localhost:3000` → `http://localhost:3000/scribe`
- Si `http://localhost:4200` → `http://localhost:4200/scribe`
- Si `http://localhost:3001` → `http://localhost:3001/scribe`

---

## 🔧 Configuration Personnalisée

### Forcer le Port 4200

**Créer/modifier `apps/web/.env.local` :**
```env
PORT=4200
```

**Ou dans `package.json` :**
```json
{
  "scripts": {
    "dev": "next dev -p 4200"
  }
}
```

---

## ✅ Vérification Rapide

1. **Backend démarré ?**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Frontend démarré ?**
   ```bash
   curl http://localhost:4200
   # ou
   curl http://localhost:3000
   ```

3. **Ports utilisés ?**
   ```bash
   lsof -i :3000
   lsof -i :4200
   ```

---

## 🐛 Dépannage Avancé

### Si npm run dev échoue

```bash
cd apps/web

# Nettoyer
rm -rf .next
rm -rf node_modules

# Réinstaller
npm install

# Redémarrer
npm run dev
```

### Si erreurs TypeScript

```bash
# Vérifier les types
npx tsc --noEmit

# Si erreurs, les corriger
```

---

## 📝 Configuration Recommandée

### Backend (NestJS)
- Port : `3000`
- URL : `http://localhost:3000`

### Frontend (Next.js)
- Port : `4200` (pour éviter conflit avec backend)
- URL : `http://localhost:4200`

### Configuration dans `apps/web/.env.local` :
```env
PORT=4200
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## 🎯 Test Rapide

```bash
# Terminal 1 - Backend
cd apps/api
npm run start:dev

# Terminal 2 - Frontend (port 4200)
cd apps/web
PORT=4200 npm run dev

# Terminal 3 - Test
curl http://localhost:4200
```

Si curl retourne du HTML, le frontend fonctionne ! ✅

---

*Fix Frontend Connection - BaseVitale V112+*
