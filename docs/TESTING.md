# Guide de Test - BaseVitale Version Cabinet

## 🧪 Tests Rapides

### Setup initial

```bash
# Script automatisé (recommandé)
./scripts/setup-and-test.sh

# Ou manuellement:
docker-compose up -d
npm install
npx prisma generate
npx prisma migrate dev --name init_sprint1_foundation
npm run dev
```

### Test complet Sprint 2

```bash
./scripts/test-sprint2.sh
```

---

## 📋 Tests Manuels

### 1. Module C+ : Créer un patient

```bash
curl -X POST http://localhost:3000/identity/patients \
  -H "Content-Type: application/json" \
  -d '{
    "insToken": "INS123456789",
    "firstName": "Jean",
    "lastName": "Dupont",
    "birthDate": "1980-01-15",
    "birthPlace": "Paris",
    "email": "jean.dupont@example.com"
  }'
```

**Résultat attendu** : Patient créé avec un ID unique

### 2. Module C+ : Rechercher un patient par INS

```bash
curl http://localhost:3000/identity/patients/by-ins/INS123456789
```

**Résultat attendu** : Données du patient créé

### 3. Module C+ : Test de dédoublonnage

```bash
# Essayer de créer le même patient deux fois
curl -X POST http://localhost:3000/identity/patients \
  -H "Content-Type: application/json" \
  -d '{
    "insToken": "INS123456789",
    "firstName": "Jean",
    "lastName": "Dupont",
    "birthDate": "1980-01-15"
  }'
```

**Résultat attendu** : Erreur 409 (Conflict) - Patient déjà existant

---

### 4. Module S : Extraction Knowledge Graph (MOCK)

```bash
curl -X POST http://localhost:3000/scribe/extract-graph \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Le patient présente une fièvre à 38.5°C et des maux de tête depuis 3 jours. Diagnostic probable : grippe saisonnière. Prescription : paracétamol 1g, 3 fois par jour pendant 5 jours."
  }'
```

**Résultat attendu** : JSON avec `nodes` (tableau de nœuds sémantiques) et `relations` (tableau de relations)

**Exemple de réponse** :
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "nodeType": "SYMPTOM",
        "label": "Fièvre",
        "value": 38.5,
        "unit": "°C",
        "confidence": 0.95
      },
      {
        "nodeType": "DIAGNOSIS",
        "label": "Grippe saisonnière",
        "cim10Code": "J11.1",
        "confidence": 0.85
      }
    ],
    "relations": []
  }
}
```

### 5. Module S : Flux complet (extraction + stockage)

**Étape 1** : Créer un patient (voir test 1)

**Étape 2** : Traiter une transcription complète

```bash
curl -X POST http://localhost:3000/scribe/transcribe-and-extract \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Consultation du patient. Fièvre à 38.5°C, maux de tête, fatigue. Diagnostic : grippe saisonnière. Prescription : paracétamol 1g x 3/jour pendant 5 jours.",
    "patientId": "VOTRE_PATIENT_ID"
  }'
```

**Résultat attendu** :
```json
{
  "success": true,
  "data": {
    "consultation": {
      "id": "...",
      "patientId": "...",
      "status": "DRAFT",
      "consultationDate": "...",
      "createdAt": "..."
    },
    "knowledgeGraph": {
      "nodes": [...],
      "relations": [...]
    }
  }
}
```

### 6. Vérification dans la base de données

```bash
# Ouvrir Prisma Studio
npx prisma studio

# Ou via SQL direct
docker exec -it basevitale-postgres psql -U postgres -d basevitale

# Requêtes utiles:
SELECT * FROM patients LIMIT 5;
SELECT * FROM consultations LIMIT 5;
SELECT * FROM semantic_nodes LIMIT 10;
SELECT * FROM semantic_relations LIMIT 10;
```

---

## 🔧 Tests avec différents modes AI

### Mode MOCK (par défaut)

```bash
# Aucune configuration nécessaire
curl -X POST http://localhost:3000/scribe/extract-graph \
  -H "Content-Type: application/json" \
  -d '{"text": "Test"}'
```

### Mode CLOUD (OpenAI)

```bash
# Définir les variables d'environnement
export AI_MODE=CLOUD
export OPENAI_API_KEY=votre_cle_ici

# Redémarrer l'API
npm run dev

# Tester
curl -X POST http://localhost:3000/scribe/extract-graph \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Le patient présente une douleur thoracique, dyspnée, et une tachycardie. Antécédents : père décédé d'\''infarctus à 55 ans. ECG montre des anomalies. Diagnostic probable : embolie pulmonaire."
  }'
```

### Mode LOCAL (Ollama)

```bash
# Démarrer Ollama (doit être installé et démarré)
# ollama serve

# Définir les variables
export AI_MODE=LOCAL
export AI_CORTEX_URL=http://localhost:8000
export OLLAMA_BASE_URL=http://localhost:11434/v1
export OLLAMA_MODEL=llama2

# Démarrer le sidecar Python (si nécessaire)
cd apps/ai-cortex
python main.py

# Tester
curl -X POST http://localhost:3000/scribe/extract-graph \
  -H "Content-Type: application/json" \
  -d '{"text": "Test"}'
```

---

## ✅ Checklist de Tests

### Sprint 1 : Fondation Invariante
- [ ] Patient peut être créé avec INS
- [ ] Recherche par INS fonctionne
- [ ] Dédoublonnage fonctionne (erreur si INS existant)
- [ ] Recherche multi-critères fonctionne

### Sprint 2 : Cortex Sémantique
- [ ] Extraction Knowledge Graph en mode MOCK
- [ ] Extraction Knowledge Graph en mode CLOUD (si configuré)
- [ ] Flux complet transcribe-and-extract
- [ ] Nœuds stockés dans PostgreSQL
- [ ] Relations stockées dans PostgreSQL
- [ ] Consultation créée avec status DRAFT

---

## 🐛 Dépannage

### L'API ne démarre pas

```bash
# Vérifier que PostgreSQL est démarré
docker-compose ps

# Vérifier les logs
docker-compose logs postgres

# Vérifier la variable DATABASE_URL dans .env
```

### Erreur Prisma

```bash
# Régénérer le client
npx prisma generate

# Réappliquer les migrations
npx prisma migrate dev

# Reset complet (⚠️ supprime les données)
npx prisma migrate reset
```

### Erreur de connexion à la base

```bash
# Vérifier que PostgreSQL est accessible
docker exec -it basevitale-postgres psql -U postgres -d basevitale

# Vérifier l'extension pgvector
docker exec basevitale-postgres psql -U postgres -d basevitale -c "SELECT extname FROM pg_extension WHERE extname='vector';"
```

---

*Guide de test - BaseVitale Version Cabinet*
