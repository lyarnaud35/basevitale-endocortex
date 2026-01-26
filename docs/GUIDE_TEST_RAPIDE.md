# ⚡ Guide de Test Rapide - Phase B

**Temps estimé :** 5 minutes

---

## 🚀 Étapes Rapides

### 1. Vérifier l'Infrastructure (1 min)

```bash
cd /Users/ARNAUD/Developer/BASEVITALE

# Lancer le script de test
./scripts/test-phase-b.sh
```

**OU vérifier manuellement :**
```bash
docker compose ps
```

Tous les containers doivent être `Up`.

---

### 2. Démarrer les Services (2 min)

**Terminal 1 - Backend :**
```bash
cd apps/api
npm run start:dev
```

**Attendre :** `✅ Neo4j connection established successfully`

**Terminal 2 - Frontend :**
```bash
cd apps/web
npm run dev
```

**Attendre :** `Ready on http://localhost:4200`

---

### 3. Tester dans le Navigateur (2 min)

1. **Ouvrir :** `http://localhost:4200/scribe`

2. **Sélectionner un exemple de dictée** (ou saisir votre texte)

3. **Cliquer sur "🎤 Simuler Dictée"**

4. **Vérifier :** Résultats affichés ✅

5. **Cliquer sur "✅ Valider Draft → Neo4j"**

6. **Vérifier :** Message de succès ✅

---

### 4. Vérifier dans Neo4j Browser (1 min)

1. **Ouvrir :** `http://localhost:7474`

2. **Login :**
   - Username : `neo4j`
   - Password : `basevitale_graph_secure`

3. **Exécuter :**
   ```cypher
   MATCH (p:Patient)-[r]->(n)
   RETURN p, r, n
   LIMIT 50
   ```

4. **Vérifier :** Graphe visible avec relations ✅

---

## ✅ Succès si :

- ✅ Page `/scribe` charge
- ✅ Dictée simulée avec succès
- ✅ Draft validé
- ✅ Graphe visible dans Neo4j Browser

**Si tout fonctionne :** 🎉 **Phase B validée !**

---

*Guide de Test Rapide - BaseVitale V112+*
