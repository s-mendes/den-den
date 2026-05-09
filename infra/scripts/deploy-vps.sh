#!/usr/bin/env bash
set -euo pipefail

APP_IMAGE="${1:?Usage: deploy-vps.sh <app-image>}"
DEPLOY_DIR="${DEPLOY_DIR:-$(pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-compose.yaml}"
ENV_FILE="${ENV_FILE:-.env}"

cd "$DEPLOY_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $DEPLOY_DIR/$ENV_FILE. Create it from infra/.env.production.example before the first deploy." >&2
  exit 1
fi

export APP_IMAGE

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull app
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm app ./node_modules/.bin/prisma migrate deploy
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d app --remove-orphans
