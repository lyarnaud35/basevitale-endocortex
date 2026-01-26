# 🧪 Guide de Test Rapide - BaseVitale

## ⚡ Démarrage Ultra-Rapide (2 minutes)

### 1. Infrastructure
```bash
./scripts/start-dev.sh
```

### 2. Backend (Terminal 1)
```bash
cd apps/api && npm run start:dev
```

### 3. Frontend (Terminal 2)
```bash
cd apps/web && PORT=4200 npm run dev
```

### 4. Tester
- Frontend : http://localhost:4200/scribe
- Backend : http://localhost:3000/health
- Neo4j : http://localhost:7474

---

## 📖 Documentation Complète

- **Guide de Test Phase B :** `docs/GUIDE_TEST_PHASE_B.md`
- **Fix Frontend :** `docs/FIX_FRONTEND_CONNECTION.md`
- **Connexion Neo4j :** `docs/CONNEXION_NEO4J.md`
- **Phase B Complète :** `docs/PHASE_B_COMPLETE.md`

---

## ✅ Test Rapide Phase B

1. Ouvrir `/scribe`
2. Sélectionner une dictée
3. Cliquer "Simuler Dictée"
4. Cliquer "Valider Draft"
5. Vérifier dans Neo4j Browser

**C'est tout !** 🎉

---

*Guide de Test Rapide - BaseVitale V112+*
