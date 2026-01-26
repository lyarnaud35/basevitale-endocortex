# Sprint 1 : Finalisation - Fondation Invariante

## ✅ Ce qui a été fait

1. **Schéma Prisma complet** avec :
   - Module C+ : Patient avec INS (Identité Nationale de Santé)
   - Knowledge Graph : Nœuds sémantiques et relations
   - Structure pour consultations, facturation, feedback

2. **Module C+ (Identité/INS)** implémenté :
   - Service de gestion des patients
   - Contrôleur REST
   - Validation Zod complète
   - Dédoublonnage par hash INS

3. **Contrats Zod** créés :
   - `patient.schema.ts`
   - `knowledge-graph.schema.ts`

4. **Infrastructure** :
   - Docker Compose avec pgvector
   - Module Prisma global

## 🔧 Commandes à exécuter

### 1. Installer les dépendances (si nécessaire)
```bash
npm install
```

### 2. Démarrer les services Docker
```bash
docker-compose up -d
```

### 3. Générer le client Prisma
```bash
npx prisma generate
```

### 4. Créer et appliquer la migration
```bash
npx prisma migrate dev --name init_sprint1_foundation
```

### 5. Vérifier que l'extension pgvector est active
```bash
docker exec -it basevitale-postgres psql -U postgres -d basevitale -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"
```

## 📝 Tests du Module C+

### Créer un patient via l'API
```bash
curl -X POST http://localhost:3000/identity/patients \
  -H "Content-Type: application/json" \
  -d '{
    "insToken": "INS123456789",
    "firstName": "Jean",
    "lastName": "Dupont",
    "birthDate": "1980-01-15",
    "birthPlace": "Paris",
    "email": "jean.dupont@example.com",
    "phone": "+33123456789",
    "address": {
      "addressLine1": "123 Rue de la Paix",
      "city": "Paris",
      "postalCode": "75001",
      "country": "FR"
    }
  }'
```

### Rechercher un patient par INS
```bash
curl http://localhost:3000/identity/patients/by-ins/INS123456789
```

### Rechercher des patients
```bash
curl "http://localhost:3000/identity/patients/search?lastName=Dupont"
```

## ✅ Checklist Sprint 1

- [x] Schéma Prisma avec INS et Knowledge Graph
- [x] Module C+ (Identité/INS) implémenté
- [x] Contrats Zod créés
- [x] Docker Compose avec pgvector
- [ ] Client Prisma généré
- [ ] Migration créée et appliquée
- [ ] Tests manuels effectués

## 🚀 Prochaine étape : Sprint 2

Une fois le Sprint 1 complété, passer au **Sprint 2 : Cortex Sémantique** qui est la priorité absolue selon la méthodologie.
