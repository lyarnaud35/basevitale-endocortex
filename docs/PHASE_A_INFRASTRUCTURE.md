# PHASE A : L'ALLUMAGE PHYSIQUE (INFRASTRUCTURE)

## 📋 Objectif

Valider que les organes (Containers) se parlent et que tous les services critiques sont opérationnels.

---

## 🔧 Étapes de la Phase A

### **Étape 1 : Activation des Variables**

Copiez `.env.example` vers `.env`. Ne modifiez rien pour l'instant (restez en `AI_MODE=MOCK`).

```bash
cp .env.example .env
```

### **Étape 2 : Démarrage du Cœur**

Lancez Docker Compose pour démarrer tous les services :

```bash
# Docker Compose v2 (recommandé)
docker compose up -d

# Ou Docker Compose v1 (legacy)
docker-compose up -d
```

Cette commande va démarrer :
- ✅ `postgres` (port 5432)
- ✅ `neo4j` (ports 7474/7687)
- ✅ `redis` (port 6379)
- ✅ `minio` (ports 9000/9001)
- ✅ `nats` (ports 4222/8222/6222)
- ✅ `ai-cortex` (port 8000)

### **Étape 3 : Vérification des Pouls (Healthchecks)**

#### **Script Automatique (Recommandé)**

Exécutez le script de vérification :

```bash
./scripts/phase-a-start.sh
```

Ce script va :
1. Copier `.env.example` vers `.env`
2. Démarrer tous les containers
3. Vérifier chaque service

#### **Vérification Manuelle**

##### **1. Postgres - Accepte les connexions ?**

```bash
docker exec basevitale-postgres pg_isready -U basevitale
```

**Résultat attendu :** `basevitale-postgres:5432 - accepting connections`

##### **2. Neo4j - Accessible sur localhost:7474 ?**

```bash
curl http://localhost:7474
```

**Résultat attendu :** Page HTML Neo4j Browser (code HTTP 200)

##### **3. Redis - Répond ?**

```bash
docker exec basevitale-redis redis-cli ping
```

**Résultat attendu :** `PONG`

##### **4. AI Cortex - Répond sur port 8000 ?**

```bash
curl http://localhost:8000/health
```

**Résultat attendu :** JSON avec `{"status": "ok"}` ou similaire

##### **5. MinIO - Répond sur port 9000 ?**

```bash
curl http://localhost:9000/minio/health/live
```

**Résultat attendu :** Code HTTP 200

##### **6. NATS - Répond sur port 8222 ?**

```bash
curl http://localhost:8222/healthz
```

**Résultat attendu :** Code HTTP 200

---

## ✅ Critères de Réussite

### **Services Critiques (OBLIGATOIRES)**

- ✅ Postgres : Accepte les connexions
- ✅ Neo4j : Accessible sur localhost:7474
- ✅ Redis : Répond PONG
- ✅ AI Cortex : Répond sur port 8000

### **Services Secondaires (OPTIONNELS pour Phase A)**

- ⚠️ MinIO : Accessible (non bloquant)
- ⚠️ NATS : Accessible (non bloquant)

---

## ❌ Procédure en Cas d'Échec

**RÈGLE D'OR : Si un seul container critique échoue, STOP. On ne code pas sur une infra bancale.**

### **Diagnostics**

1. **Vérifier l'état des containers :**

```bash
docker compose ps
```

2. **Vérifier les logs d'un service spécifique :**

```bash
docker compose logs postgres
docker compose logs neo4j
docker compose logs redis
docker compose logs ai-cortex
```

3. **Redémarrer un service :**

```bash
docker compose restart postgres
docker compose restart neo4j
# etc.
```

4. **Recréer un service :**

```bash
docker compose up -d --force-recreate postgres
```

5. **Vérifier les ports disponibles :**

```bash
lsof -i :5432  # Postgres
lsof -i :7474  # Neo4j
lsof -i :6379  # Redis
lsof -i :8000  # AI Cortex
```

### **Problèmes Courants**

#### **Port déjà utilisé**

**Symptôme :** `Bind for 0.0.0.0:5432 failed: port is already allocated`

**Solution :**
- Trouver le processus qui utilise le port : `lsof -i :5432`
- Arrêter le processus ou changer le port dans `docker-compose.yml`

#### **Container ne démarre pas**

**Symptôme :** Container reste en status "Restarting"

**Solution :**
- Vérifier les logs : `docker compose logs <service>`
- Vérifier les variables d'environnement dans `.env`
- Vérifier que Docker a assez de ressources (RAM, CPU)

#### **Neo4j ne répond pas**

**Symptôme :** `curl http://localhost:7474` retourne une erreur

**Solution :**
- Attendre quelques secondes (Neo4j prend du temps à démarrer)
- Vérifier les logs : `docker compose logs neo4j`
- Vérifier que le port 7474 n'est pas utilisé

#### **AI Cortex ne répond pas**

**Symptôme :** `curl http://localhost:8000/health` retourne une erreur

**Solution :**
- Vérifier que l'image est construite : `docker compose build ai-cortex`
- Vérifier les logs : `docker compose logs ai-cortex`
- Vérifier que Python/requirements.txt sont corrects

---

## 🎯 Après Réussite de la Phase A

Une fois que tous les services critiques sont opérationnels :

1. ✅ **Phase B** : Vérification de la connexion NestJS -> Databases
2. ✅ **Phase C** : Test du Module S (Scribe)
3. ✅ **Phase D** : Tests end-to-end

---

## 📝 Notes

- **AI_MODE=MOCK** : Les appels IA retournent des données fictives (pas de coût)
- **Healthchecks Docker** : Chaque service a un healthcheck configuré dans `docker-compose.yml`
- **Réseau Docker** : Tous les services communiquent via `basevitale-network`
- **Volumes persistants** : Les données sont persistées dans des volumes Docker

---

*Phase A : L'Allumage Physique - BaseVitale V112+*
