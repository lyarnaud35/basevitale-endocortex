#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOCKETS=("/var/run/docker.sock" "$HOME/.docker/run/docker.sock")
DOCKER_HOST=""
RETRY=0
MAX_RETRIES=20
SLEEP=3
SERVICES="postgres neo4j redis nats minio"
START_MODE="${START_MODE:-local}" # default to local (npx nx serve api)

echo "clean-api: démarrage (mode=${START_MODE})"

# detect docker socket
for s in "${SOCKETS[@]}"; do
  if [ -S "$s" ]; then
    DOCKER_HOST="unix://$s"
    export DOCKER_HOST
    echo "Using DOCKER_HOST=$DOCKER_HOST"
    break
  fi
done

if [ -z "${DOCKER_HOST:-}" ]; then
  echo "Aucun socket docker trouvé. Vérifie Docker Desktop." >&2
fi

# wait for docker daemon
until docker info >/dev/null 2>&1 || [ $RETRY -ge $MAX_RETRIES ]; do
  echo "Attente du daemon Docker... ($RETRY/$MAX_RETRIES)"
  sleep $SLEEP
  RETRY=$((RETRY+1))
done

if ! docker info >/dev/null 2>&1; then
  echo "Impossible de joindre Docker. Abandon." >&2
  exit 2
fi

# free port 3000 safely
echo "Vérification du port 3000..."
port_info="$(lsof -i :3000 -Pn -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$port_info" ]; then
  echo "Processus trouvés sur :3000 :"
  echo "$port_info"
  # If it's a docker container, stop that container
  container_on_3000="$(docker ps --format '{{.ID}} {{.Names}} {{.Ports}}' | grep ':3000->' || true)"
  if [ -n "$container_on_3000" ]; then
    echo "Conteneur projet sur 3000 détecté, arrêt propre..."
    docker stop $(echo "$container_on_3000" | awk '{print $1}') || true
  else
    pid="$(lsof -t -i:3000 || true)"
    if [ -n "$pid" ]; then
      echo "Tuer PID $pid"
      kill -9 "$pid" || true
    fi
  fi
else
  echo "Port 3000 libre."
fi

# Start required services
echo "Démarrage services essentiels: ${SERVICES}"
docker compose up -d $SERVICES || echo "docker compose up failed (continuing to allow local mode)"

# wait for services by checking host ports (more reliable than container healthchecks)
check_port() {
  host="${1:-localhost}"
  port="${2}"
  timeout_secs="${3:-120}"
  interval=2
  waited=0
  while [ $waited -lt $timeout_secs ]; do
    if (echo > /dev/tcp/"$host"/"$port") >/dev/null 2>&1; then
      return 0
    fi
    sleep $interval
    waited=$((waited+interval))
  done
  return 1
}

for svc in $SERVICES; do
  case "$svc" in
    postgres) host_port=5432 ;;
    neo4j) host_port=7474 ;;
    redis) host_port=6379 ;;
    nats) host_port=4222 ;;
    minio) host_port=9000 ;;
    *) host_port="" ;;
  esac
  name="basevitale-$svc"
  if [ -z "$host_port" ]; then
    echo "No host port configured for $svc, skipping port check."
    continue
  fi
  echo "Attente port $host_port pour $name..."
  if check_port "localhost" "$host_port" 120; then
    echo "$name: port $host_port ouvert"
  else
    echo "Service $name non joignable sur le port $host_port après timeout !" >&2
  fi
done

# Start API
if [ "$START_MODE" = "local" ]; then
  echo "Lancement API en mode local (npx nx serve api)"
  npx nx serve api
else
  echo "Build & démarrage API dans docker"
  docker compose up -d --build api
  echo "Suivi logs API (ctrl-c pour quitter)"
  docker logs -f basevitale-api
fi

