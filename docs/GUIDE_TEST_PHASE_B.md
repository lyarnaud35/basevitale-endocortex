# 🧪 Guide de Test - Phase B : Le Flux Sanguin

**Objectif :** Tester le flux complet Front → NestJS → Postgres → Neo4j

---

## 📋 Prérequis

### 1. Infrastructure Docker

Vérifier que tous les containers sont en cours d'exécution :

```bash
cd /Users/ARNAUD/Developer/BASEVITALE
docker compose ps
```

**Containers requis :**
- ✅ `basevitale-postgres` - Status: Up
- ✅ `basevitale-neo4j` - Status: Up
- ✅ `basevitale-redis` - Status: Up
- ✅ `basevitale-ai-cortex` - Status: Up

**Si des containers sont arrêtés :**
```bash
docker compose up -d
```

### 2. Variables d'Environnement

Vérifier que `.env` existe :
```bash
ls -la .env
```

Si absent, copier depuis `.env.example` :
```bash
cp .env.example .env
```

### 3. Driver Neo4j Installé

Vérifier dans `apps/api/package.json` que `neo4j-driver` est présent :
```bash
cd apps/api
cat package.json | grep neo4j-driver
```

**Si absent, installer :**
```bash
npm install neo4j-driver @types/neo4j-driver
```

---

## 🚀 Démarrage des Services

### 1. Démarrer le Backend (NestJS)

```bash
cd /Users/ARNAUD/Developer/BASEVITALE/apps/api
npm run start:dev
```

**Vérifier les logs :**
- ✅ `Nest application successfully started`
- ✅ `Neo4j connection established successfully` ⭐
- ✅ `ScribeService initialized with AI_MODE: MOCK`

**Si erreur Neo4j :**
- Vérifier que le container Neo4j est démarré
- Vérifier les variables `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` dans `.env`

**Port par défaut :** `http://localhost:3000`

---

### 2. Démarrer le Frontend (Next.js)

**Dans un nouveau terminal :**
```bash
cd /Users/ARNAUD/Developer/BASEVITALE/apps/web
npm run dev
```

**Port par défaut :** `http://localhost:4200` (ou celui indiqué dans les logs)

---

## 🧪 Tests à Effectuer

### TEST 1 : Page Scribe Accessible

1. Ouvrir le navigateur : `http://localhost:4200/scribe`

2. **Vérifier :**
   - ✅ Page charge correctement
   - ✅ Champ "Patient ID" visible
   - ✅ Zone de texte pour la dictée visible
   - ✅ Boutons "🎤 Simuler Dictée" et exemples de textes visibles

---

### TEST 2 : Simuler une Dictée

1. **Dans la page `/scribe` :**
   - Patient ID : `patient_test_123` (ou laisser par défaut)
   - Sélectionner un exemple de dictée OU saisir :
     ```
     Patient présente fièvre modérée à 38.5°C, toux sèche persistante, 
     maux de tête et fatigue depuis 3 jours. Tension artérielle 130/85, 
     fréquence cardiaque 85 bpm. Diagnostic suspecté : grippe saisonnière. 
     Prescription : Paracétamol 500mg, 3 fois par jour pendant 7 jours.
     ```

2. **Cliquer sur "🎤 Simuler Dictée"**

3. **Vérifier dans la console navigateur (F12) :**
   - ✅ Requête `POST /scribe/process-dictation` envoyée
   - ✅ Réponse reçue avec `success: true`

4. **Vérifier sur la page :**
   - ✅ Section "✅ Résultat" affichée
   - ✅ Draft créé avec un ID
   - ✅ Consultation structurée affichée :
     - `symptoms[]` - Array de symptômes
     - `diagnosis[]` - Array avec code, confidence, label
     - `medications[]` - Array avec name, dosage, duration
   - ✅ Bouton "✅ Valider Draft → Neo4j" apparaît

5. **Vérifier dans les logs backend :**
   ```
   Analyzing consultation with AI_MODE: MOCK
   Using MOCK mode with Faker
   Created consultation draft clx...
   ```

---

### TEST 3 : Vérifier le Draft dans Postgres

**Dans un terminal :**

```bash
docker exec -it basevitale-postgres psql -U basevitale -d basevitale_db -c \
  "SELECT id, patient_id, status, created_at FROM consultation_drafts ORDER BY created_at DESC LIMIT 1;"
```

**Vérifier :**
- ✅ Une ligne retournée
- ✅ `status` = `'DRAFT'`
- ✅ `patient_id` correspond à celui saisi

**Voir les données structurées :**
```bash
docker exec -it basevitale-postgres psql -U basevitale -d basevitale_db -c \
  "SELECT id, patient_id, status, structured_data FROM consultation_drafts ORDER BY created_at DESC LIMIT 1;"
```

**Vérifier :**
- ✅ `structured_data` contient un JSON avec `symptoms`, `diagnosis`, `medications`

---

### TEST 4 : Valider le Draft

1. **Dans la page `/scribe` :**
   - Cliquer sur "✅ Valider Draft → Neo4j"

2. **Vérifier dans la console navigateur :**
   - ✅ Requête `PUT /scribe/validate/:id` envoyée
   - ✅ Réponse avec `success: true`, `nodesCreated: X`

3. **Vérifier dans les logs backend :**
   ```
   Validating consultation draft clx...
   Created semantic node: ... (SYMPTOM)
   Created semantic node: ... (DIAGNOSIS)
   Created semantic node: ... (MEDICATION)
   Created Neo4j graph for patient patient_test_123
   Neo4j graph created: X relations for patient patient_test_123
   Validated draft clx...: created X semantic nodes
   ```

4. **Vérifier que le status est passé à "VALIDATED" :**
   ```bash
   docker exec -it basevitale-postgres psql -U basevitale -d basevitale_db -c \
     "SELECT id, patient_id, status FROM consultation_drafts ORDER BY created_at DESC LIMIT 1;"
   ```
   - ✅ `status` = `'VALIDATED'`

---

### TEST 5 : Vérifier les Nœuds dans PostgreSQL

**Vérifier les SemanticNodes créés :**

```bash
docker exec -it basevitale-postgres psql -U basevitale -d basevitale_db -c \
  "SELECT id, node_type, label, patient_id FROM semantic_nodes WHERE patient_id = 'patient_test_123' ORDER BY created_at DESC;"
```

**Vérifier :**
- ✅ Plusieurs lignes avec `node_type` = `'SYMPTOM'`, `'DIAGNOSIS'`, `'MEDICATION'`
- ✅ Chaque ligne a un `label` correspondant

---

### TEST 6 : Vérifier le Graphe dans Neo4j ⭐

1. **Ouvrir Neo4j Browser :**
   ```
   http://localhost:7474
   ```

2. **Se connecter :**
   - Username : `neo4j`
   - Password : `basevitale_graph_secure`

3. **Exécuter la requête de visualisation :**
   ```cypher
   MATCH (p:Patient {id: "patient_test_123"})-[r]->(n)
   RETURN p, r, n
   LIMIT 50
   ```

4. **Vérifier dans le graphe :**
   - ✅ Nœud `(:Patient {id: "patient_test_123"})` visible
   - ✅ Relations `[:HAS_SYMPTOM]` vers des nœuds `(:Symptom)`
   - ✅ Relations `[:HAS_DIAGNOSIS]` vers des nœuds `(:Diagnosis)`
   - ✅ Relations `[:PRESCRIBED]` vers des nœuds `(:Medication)`

5. **Requêtes de vérification :**

   **Compter les symptômes :**
   ```cypher
   MATCH (p:Patient {id: "patient_test_123"})-[:HAS_SYMPTOM]->(s:Symptom)
   RETURN p.id as patient, collect(s.label) as symptoms
   ```

   **Voir les diagnostics :**
   ```cypher
   MATCH (p:Patient {id: "patient_test_123"})-[r:HAS_DIAGNOSIS]->(d:Diagnosis)
   RETURN p.id as patient, d.code as code, d.label as diagnosis, r.confidence as confidence
   ```

   **Voir les médicaments :**
   ```cypher
   MATCH (p:Patient {id: "patient_test_123"})-[r:PRESCRIBED]->(m:Medication)
   RETURN p.id as patient, m.name as medication, r.dosage, r.duration
   ```

---

## ✅ Checklist de Validation Complète

### Frontend
- [ ] Page `/scribe` charge correctement
- [ ] Bouton "Simuler Dictée" fonctionne
- [ ] Résultats s'affichent correctement
- [ ] Bouton "Valider Draft" apparaît après création
- [ ] Validation fonctionne

### Backend
- [ ] Backend démarre sans erreur
- [ ] Connexion Neo4j établie (logs)
- [ ] Endpoint `POST /scribe/process-dictation` fonctionne
- [ ] Endpoint `PUT /scribe/validate/:id` fonctionne
- [ ] Logs détaillés pour debugging

### PostgreSQL
- [ ] ConsultationDraft sauvegardé avec status DRAFT
- [ ] Données structurées en JSONB correctes
- [ ] SemanticNodes créés après validation
- [ ] Status passé à VALIDATED

### Neo4j
- [ ] Connexion Neo4j Browser réussie
- [ ] Nœud Patient créé
- [ ] Nœuds Symptom créés
- [ ] Relations HAS_SYMPTOM créées
- [ ] Nœuds Diagnosis créés
- [ ] Relations HAS_DIAGNOSIS créées
- [ ] Nœuds Medication créés
- [ ] Relations PRESCRIBED créées

---

## 🐛 Dépannage

### Erreur : "Cannot connect to Neo4j"
**Solution :**
```bash
# Vérifier que Neo4j tourne
docker compose ps | grep neo4j

# Si arrêté, démarrer
docker compose up -d neo4j

# Vérifier les logs
docker compose logs neo4j
```

### Erreur : "Neo4j driver not initialized"
**Solution :**
- Vérifier que `neo4j-driver` est installé : `npm list neo4j-driver`
- Redémarrer le backend
- Vérifier les variables d'environnement dans `.env`

### Erreur : "Consultation draft not found"
**Solution :**
- Vérifier que le draft ID est correct
- Vérifier dans Postgres que le draft existe
- Vérifier que vous utilisez le bon ID retourné par la première requête

### Erreur : Frontend ne se connecte pas au backend
**Solution :**
- Vérifier que le backend tourne sur le bon port (3000)
- Vérifier `NEXT_PUBLIC_API_URL` dans `.env` du frontend
- Vérifier les CORS dans le backend

---

## 🎯 Test Rapide (5 minutes)

1. Démarrer backend et frontend
2. Ouvrir `/scribe`
3. Sélectionner un exemple de dictée
4. Cliquer "Simuler Dictée"
5. Cliquer "Valider Draft"
6. Ouvrir Neo4j Browser et visualiser le graphe

**Si tout fonctionne :** ✅ Phase B validée !

---

*Guide de Test Phase B - BaseVitale V112+*
