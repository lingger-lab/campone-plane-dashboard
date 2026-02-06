#!/usr/bin/env bash
# ============================================
# CampOne Dashboard - 원격 스키마 Push 전용
# Cloud SQL Auth Proxy 경유
# ============================================
set -euo pipefail

PROJECT_ID="campone-plane"
REGION="asia-northeast3"
INSTANCE="free-trial-first-project"
CONNECTION_NAME="${PROJECT_ID}:${REGION}:${INSTANCE}"
PROXY_PORT=5433

DB_USER="campone"
DB_PASS="campone-plane-2026"

GREEN='\033[0;32m'
NC='\033[0m'
log() { echo -e "${GREEN}[+]${NC} $1"; }

log "Cloud SQL Auth Proxy 시작..."
if ! lsof -i :$PROXY_PORT >/dev/null 2>&1; then
  cloud-sql-proxy "$CONNECTION_NAME" --port=$PROXY_PORT &
  PROXY_PID=$!
  sleep 3
  trap "kill $PROXY_PID 2>/dev/null || true" EXIT
else
  log "기존 프록시 사용"
fi

# Generate clients first
log "Prisma Client 생성..."
npx prisma generate
npx prisma generate --schema=prisma/tenant/schema.prisma

# System DB
log "System schema → campone_system..."
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:${PROXY_PORT}/campone_system" \
  npx prisma db push --skip-generate --accept-data-loss

# Tenant DBs
for DB_NAME in camp_dev_db camp_test_db; do
  log "Tenant schema → ${DB_NAME}..."
  DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:${PROXY_PORT}/${DB_NAME}" \
    npx prisma db push --schema=prisma/tenant/schema.prisma --skip-generate --accept-data-loss
done

log "모든 스키마 Push 완료!"
