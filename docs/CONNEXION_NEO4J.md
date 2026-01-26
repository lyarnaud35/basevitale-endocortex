# 🔐 Connexion à Neo4j Browser

## 📋 Identifiants par Défaut

### **Username :** `neo4j`

### **Password :** 

Selon votre configuration, le mot de passe peut être :

1. **Si vous avez copié `.env.example` vers `.env` :**
   - Password : `basevitale_graph_secure`

2. **Si vous utilisez les valeurs par défaut du docker-compose.yml :**
   - Password : `neo4j`

3. **Si c'est la première connexion à Neo4j :**
   - Password initial : `neo4j`
   - **Important :** Neo4j vous demandera de changer le mot de passe au premier login !

---

## 🔧 Vérifier votre Configuration

### Option 1 : Vérifier dans `.env`

```bash
cat .env | grep NEO4J
```

Devrait afficher :
```
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=basevitale_graph_secure
```

### Option 2 : Vérifier dans docker-compose.yml

```bash
cat docker-compose.yml | grep -A 10 neo4j
```

Cherchez la ligne :
```yaml
NEO4J_AUTH: ${NEO4J_USER:-neo4j}/${NEO4J_PASSWORD:-neo4j}
```

---

## 🚀 Étapes de Connexion

### 1. Ouvrir Neo4j Browser

```
http://localhost:7474
```

### 2. Entrer les Identifiants

**Premier login :**
- Username : `neo4j`
- Password : `neo4j`

**Si vous avez changé le mot de passe ou utilisé `.env` :**
- Username : `neo4j`
- Password : `basevitale_graph_secure` (ou celui que vous avez configuré)

### 3. Si Mot de Passe Incorrect

Si vous ne vous souvenez plus du mot de passe :

```bash
# Arrêter Neo4j
docker compose stop neo4j

# Supprimer les données (⚠️ ATTENTION : Supprime tout !)
docker volume rm basevitale-neo4j-data

# Redémarrer Neo4j
docker compose up -d neo4j

# Attendre 30 secondes que Neo4j démarre
# Puis reconnecter avec username: neo4j, password: neo4j
```

---

## ✅ Vérifier que Neo4j est Accessible

```bash
# Vérifier que le container tourne
docker compose ps | grep neo4j

# Devrait afficher : basevitale-neo4j   Up   ...   7474:7474, 7687:7687
```

---

## 📝 Configuration Recommandée

Dans votre `.env` :
```env
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=basevitale_graph_secure
```

**Note :** Pour plus de sécurité en production, changez ces valeurs !

---

## 🎯 Première Connexion

1. Allez sur `http://localhost:7474`
2. Entrez :
   - **Username :** `neo4j`
   - **Password :** `neo4j` (ou `basevitale_graph_secure` selon votre config)
3. Si c'est la première fois, Neo4j vous demandera de changer le mot de passe
4. Choisissez un nouveau mot de passe (ou gardez `basevitale_graph_secure` pour être cohérent avec `.env`)

---

## ✅ Test de Connexion

Une fois connecté, testez cette requête dans Neo4j Browser :

```cypher
MATCH (n) RETURN count(n) as totalNodes
```

Si ça retourne un nombre, vous êtes connecté ! 🎉

---

*Connexion Neo4j - BaseVitale V112+*
