# Guide de Déploiement - BaseVitale

## 🚀 Déploiement en Production

### Prérequis

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+ avec extension pgvector
- (Optionnel) Neo4j pour projections

---

## 📋 Étapes de Déploiement

### 1. Configuration Environnement

Créer un fichier `.env` :

```env
# Environment
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@postgres:5432/basevitale

# AI Configuration
AI_MODE=CLOUD  # ou LOCAL pour Ollama
OPENAI_API_KEY=your_key_here

# CORS
CORS_ORIGIN=https://votredomaine.com

# Security
JWT_SECRET=your_jwt_secret_here
```

### 2. Build

```bash
# Build de l'API
npm run build

# Générer le client Prisma
npm run prisma:generate
```

### 3. Migrations

```bash
# Appliquer les migrations
npm run prisma:migrate

# Vérifier la base de données
npm run prisma:studio
```

### 4. Docker Compose

```bash
# Démarrer les services
docker-compose up -d

# Vérifier les logs
docker-compose logs -f
```

### 5. Démarrage API

```bash
# En production
node dist/apps/api/main.js

# Ou avec PM2
pm2 start dist/apps/api/main.js --name basevitale-api
```

---

## 🔒 Sécurité Production

### Checklist Sécurité

- [ ] Variables d'environnement sécurisées
- [ ] JWT secret fort configuré
- [ ] 2FA activé pour authentification
- [ ] CORS restreint au domaine
- [ ] HTTPS activé
- [ ] Rate limiting configuré
- [ ] Logs sécurisés (pas de données sensibles)
- [ ] Backups automatiques PostgreSQL

---

## 📊 Monitoring

### Health Checks

- `GET /api/health` - Health simple
- `GET /api/health/db` - Health avec DB

### Logs

Les logs sont structurés et incluent :
- Timestamp
- Niveau (error, warn, log, debug)
- Contexte
- Message

---

## 🔄 Mises à Jour

### Processus de Mise à Jour

1. Backup de la base de données
2. Pull du nouveau code
3. `npm install`
4. `npm run prisma:generate`
5. `npm run prisma:migrate` (si nouvelles migrations)
6. `npm run build`
7. Redémarrage de l'API

---

## 📦 Options de Déploiement

### Option 1 : Docker Compose (Simple)

Tout dans Docker Compose, adapté pour déploiement simple.

### Option 2 : Kubernetes (Scalable)

- Déploiement des services séparément
- Scaling horizontal
- Load balancing

### Option 3 : Cloud (AWS/GCP/Azure)

- API dans containers
- PostgreSQL géré
- Neo4j géré
- Redis géré

---

*Guide de Déploiement - BaseVitale Production*
