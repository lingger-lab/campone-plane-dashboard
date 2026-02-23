#!/usr/bin/env bash
# ============================================
# CampOne Dashboard - 기존 테넌트 DB 베이스라인
# Prisma migrate 전환 시 1회만 실행
#
# 이미 테이블이 있는 기존 테넌트 DB에
# _prisma_migrations 테이블 + init 레코드를 삽입하여
# Prisma migrate가 init을 "이미 적용됨"으로 인식하게 함.
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

# init migration checksum (prisma/tenant/migrations/20260223135950_init/migration.sql)
CHECKSUM="a8ac98057726a95593a5718add5bb6c907c9cc6f66a06299d0c990f3b15a6fcb"
MIGRATION_NAME="20260223135950_init"

log "Cloud SQL Auth Proxy 시작..."
if ! lsof -i :$PROXY_PORT >/dev/null 2>&1; then
  cloud-sql-proxy "$CONNECTION_NAME" --port=$PROXY_PORT &
  PROXY_PID=$!
  sleep 3
  trap "kill $PROXY_PID 2>/dev/null || true" EXIT
else
  log "기존 프록시 사용"
fi

for DB_NAME in camp_dev_db camp_test_db; do
  log "Baseline → ${DB_NAME}..."
  psql "postgresql://${DB_USER}:${DB_PASS}@localhost:${PROXY_PORT}/${DB_NAME}" <<SQL
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) NOT NULL DEFAULT gen_random_uuid()::text,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
    );

    INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "finished_at", "applied_steps_count")
    SELECT gen_random_uuid()::text, '${CHECKSUM}', '${MIGRATION_NAME}', now(), 1
    WHERE NOT EXISTS (
      SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '${MIGRATION_NAME}'
    );
SQL
  log "  ${DB_NAME} 베이스라인 완료"
done

log "모든 테넌트 베이스라인 완료!"
