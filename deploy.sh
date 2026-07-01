#!/usr/bin/env bash
# Applaut — production deploy script
# Run on Oracle Cloud VM: bash deploy.sh
set -euo pipefail

echo "==> Pulling latest code"
git pull origin main

echo "==> Building production images"
docker compose -f docker-compose.prod.yml build --no-cache backend

echo "==> Running database migrations"
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head

echo "==> Restarting services"
docker compose -f docker-compose.prod.yml up -d

echo "==> Cleaning up unused images"
docker image prune -f

echo "==> Done. Services:"
docker compose -f docker-compose.prod.yml ps
