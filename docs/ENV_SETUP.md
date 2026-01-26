# Configuration des Variables d'Environnement

## 📋 **Fichier .env.example**

Un fichier `.env.example` est disponible à la racine du projet avec toutes les variables nécessaires, organisées selon l'architecture BaseVitale.

## 🚀 **Installation Rapide**

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Modifier les valeurs selon votre environnement
nano .env  # ou votre éditeur préféré
```

## 🔑 **Variables Requises par Section**

### **1. GLOBAL & ORCHESTRATION (Module O)**
- `NODE_ENV` : `development` | `production` | `test`
- `PORT` : Port de l'API NestJS (défaut: `3000`)
- `AI_MODE` : **Invariant Critique** - `MOCK` | `CLOUD` | `LOCAL`
  - **MOCK** : Réponse statique immédiate (Pas de Python, Pas de Coût)
  - **CLOUD** : Appel API OpenAI/Groq (Vitesse Dev)
  - **LOCAL** : Appel Python + Ollama (Souveraineté Prod)
- `JWT_SECRET` : Secret pour signer les tokens JWT (Module C+)
- `CORS_ORIGIN` : Origine autorisée pour CORS (défaut: `http://localhost:4200`)

### **2. MÉMOIRES (Persistance)**

#### **POSTGRES** (Module E+ & Drafts)
- `POSTGRES_HOST` : Host PostgreSQL (dans Docker: `postgres`, pas `localhost`)
- `POSTGRES_PORT` : Port PostgreSQL (défaut: `5432`)
- `POSTGRES_USER` : Utilisateur PostgreSQL
- `POSTGRES_PASSWORD` : Mot de passe PostgreSQL
- `POSTGRES_DB` : Nom de la base de données

#### **NEO4J** (Module S - Graphe de Connaissances)
- `NEO4J_URI` : URI de connexion Neo4j (ex: `bolt://neo4j:7687`)
- `NEO4J_USER` : Utilisateur Neo4j
- `NEO4J_PASSWORD` : Mot de passe Neo4j

#### **REDIS** (Files d'attente & Sémaphore GPU)
- `REDIS_HOST` : Host Redis (dans Docker: `redis`)
- `REDIS_PORT` : Port Redis (défaut: `6379`)

#### **MINIO** (Stockage Audio - S3 Compatible)
- `MINIO_ENDPOINT` : Endpoint MinIO (dans Docker: `minio`)
- `MINIO_PORT` : Port MinIO (défaut: `9000`)
- `MINIO_ROOT_USER` : Utilisateur root MinIO
- `MINIO_ROOT_PASSWORD` : Mot de passe root MinIO
- `BUCKET_NAME` : Nom du bucket pour les consultations audio

### **3. INTELLIGENCE (Hémisphère Droit)**

#### **PYTHON SIDECAR** (Module IA)
- `AI_CORTEX_URL` : URL interne dans le réseau Docker (ex: `http://ai-cortex:8000`)

#### **CLOUD FALLBACK** (Pour AI_MODE=CLOUD)
- `OPENAI_API_KEY` : Clé API OpenAI (requis si `AI_MODE=CLOUD`)
- `GROQ_API_KEY` : Clé API Groq (optionnel)

### **4. MONITORING**
- `LOG_LEVEL` : Niveau de logging (défaut: `debug`)

## 🔒 **Sécurité**

⚠️ **IMPORTANT** : Le fichier `.env` ne doit JAMAIS être commité dans Git. Il est automatiquement ignoré par `.gitignore`.

Le fichier `.env.example` sert uniquement de template/documentation.

## ✅ **Validation**

Pour valider votre configuration, utilisez :

```bash
npm run validate:env
```

## 📝 **Modes AI_MODE**

### **MOCK** (Par défaut)
- Retourne des données générées par Faker
- Aucune dépendance externe requise
- Parfait pour le développement

### **CLOUD**
- Utilise OpenAI directement via Node.js SDK
- Requis : `OPENAI_API_KEY`
- Plus rapide (pas de sidecar Python)

### **LOCAL**
- Utilise le sidecar Python avec Ollama
- Requis : Ollama installé et running
- Plus de contrôle, pas de coûts API

---

*Configuration BaseVitale V112+*
