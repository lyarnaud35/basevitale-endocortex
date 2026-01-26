# Docker - Guide de Dépannage (macOS)

## Problème : "Cannot connect to the Docker daemon"

### Symptômes
- Docker Desktop est vert dans la barre de menu
- `docker ps` retourne : "Cannot connect to the Docker daemon at unix:///var/run/docker.sock"
- Les containers ne peuvent pas être démarrés

---

## Solutions (dans l'ordre)

### Solution 1 : Redémarrer Docker Desktop

1. **Quitter Docker Desktop complètement :**
   ```
   Menu Docker Desktop > Quit Docker Desktop
   ```
   
2. **Relancer Docker Desktop :**
   - Depuis Applications > Docker
   - Attendre que l'icône soit verte (environ 30 secondes)

3. **Tester :**
   ```bash
   docker ps
   ```

### Solution 2 : Vérifier les Paramètres Docker Desktop

1. **Ouvrir Docker Desktop Settings**
   - Clic droit sur l'icône Docker > Settings

2. **Général :**
   - Vérifier que Docker Desktop est bien démarré
   - Cocher "Start Docker Desktop when you log in" (optionnel)

3. **Ressources :**
   - File Sharing : Vérifier que le projet est accessible
   - CPU/Memory : Vérifier qu'il y a assez de ressources

4. **Appliquer et redémarrer**

### Solution 3 : Vérifier le Socket Docker

Sur macOS, Docker Desktop utilise un socket personnalisé. Vérifier :

```bash
# Lancer le script de diagnostic
./scripts/diagnose-docker.sh
```

Ou manuellement :

```bash
# Rechercher le socket
ls -la ~/.docker/run/docker.sock
ls -la /var/run/docker.sock

# Tester avec le socket trouvé
export DOCKER_HOST=unix://~/.docker/run/docker.sock
docker ps
```

### Solution 4 : Réinitialiser Docker Desktop

⚠️ **ATTENTION :** Cela supprime tous les containers, images et volumes.

1. Quitter Docker Desktop
2. Supprimer les données Docker :
   ```bash
   rm -rf ~/Library/Containers/com.docker.docker
   rm -rf ~/.docker
   ```
3. Relancer Docker Desktop (réinitialisation complète)

### Solution 5 : Vérifier les Permissions

```bash
# Vérifier les groupes de l'utilisateur
groups

# Si nécessaire, ajouter l'utilisateur au groupe docker
# (Normalement non nécessaire sur macOS avec Docker Desktop)
```

### Solution 6 : Mettre à Jour Docker Desktop

1. Menu Docker Desktop > Check for Updates
2. Installer les mises à jour disponibles
3. Redémarrer Docker Desktop

---

## Diagnostic Automatique

Exécutez le script de diagnostic :

```bash
./scripts/diagnose-docker.sh
```

Ce script va :
- ✅ Vérifier l'installation Docker
- ✅ Détecter les processus Docker
- ✅ Trouver le socket Docker
- ✅ Tester la connexion
- ✅ Donner des recommandations personnalisées

---

## Emplacements du Socket Docker sur macOS

Docker Desktop peut utiliser différents emplacements :

1. `/var/run/docker.sock` (Linux standard - rarement sur macOS)
2. `~/.docker/run/docker.sock` (Docker Desktop standard)
3. `/Users/USERNAME/.docker/run/docker.sock` (Chemin absolu)
4. `~/Library/Containers/com.docker.docker/Data/docker.sock` (Containers)

---

## Commandes Utiles

### Vérifier que Docker fonctionne
```bash
docker --version
docker compose version
docker ps
```

### Voir les logs Docker Desktop
```bash
# Logs système (macOS)
log show --predicate 'process == "Docker Desktop"' --last 1h
```

### Redémarrer Docker Desktop via terminal
```bash
killall Docker && open -a Docker
```

---

## Après Résolution

Une fois Docker accessible, relancer la Phase A :

```bash
./scripts/phase-a-start.sh
```

Ou manuellement :

```bash
docker compose up -d
./scripts/phase-a-healthcheck.sh
```

---

## Support Supplémentaire

Si le problème persiste :

1. **Consulter les logs Docker Desktop :**
   - Menu Docker Desktop > Troubleshoot > View logs

2. **Vérifier la documentation Docker :**
   - https://docs.docker.com/desktop/troubleshoot/overview/

3. **Vérifier les prérequis macOS :**
   - macOS 10.15+ (Catalina)
   - CPU avec support de virtualisation
   - Au moins 4 GB RAM disponibles

---

*Guide de dépannage Docker - BaseVitale V112+*
