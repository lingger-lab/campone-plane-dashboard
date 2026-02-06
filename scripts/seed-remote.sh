#!/usr/bin/env bash
# ============================================
# CampOne Dashboard - 원격 DB 시드 스크립트
# Cloud SQL Auth Proxy 경유로 시드 실행
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
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[x]${NC} $1"; }

TARGET=${1:-"all"}  # "all", "system", "camp-dev", "camp-test"

# ============================================
# Step 1: Cloud SQL Auth Proxy 시작
# ============================================
log "Cloud SQL Auth Proxy 시작 (포트 $PROXY_PORT)..."

# 이미 실행 중인지 확인
if lsof -i :$PROXY_PORT >/dev/null 2>&1 || netstat -an 2>/dev/null | grep -q ":$PROXY_PORT "; then
  warn "포트 $PROXY_PORT 이미 사용 중 - 기존 프록시 사용"
  PROXY_PID=""
else
  cloud-sql-proxy "$CONNECTION_NAME" --port=$PROXY_PORT &
  PROXY_PID=$!
  sleep 3

  # 프록시 연결 확인
  if ! kill -0 $PROXY_PID 2>/dev/null; then
    err "Cloud SQL Auth Proxy 시작 실패"
    exit 1
  fi
  log "프록시 PID: $PROXY_PID"
fi

cleanup() {
  if [ -n "${PROXY_PID:-}" ]; then
    log "프록시 종료 (PID: $PROXY_PID)..."
    kill $PROXY_PID 2>/dev/null || true
  fi
}
trap cleanup EXIT

# ============================================
# Step 2: 스키마 Push
# ============================================
log "Prisma 스키마 Push..."

# System DB
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:${PROXY_PORT}/campone_system"
export SYSTEM_DATABASE_URL="$DATABASE_URL"
log "  System DB (campone_system)..."
npx prisma db push --skip-generate --accept-data-loss 2>&1 | tail -3

# Tenant DB - camp_dev_db
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:${PROXY_PORT}/camp_dev_db"
log "  Tenant DB (camp_dev_db)..."
npx prisma db push --schema=prisma/tenant/schema.prisma --skip-generate --accept-data-loss 2>&1 | tail -3

# Tenant DB - camp_test_db
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:${PROXY_PORT}/camp_test_db"
log "  Tenant DB (camp_test_db)..."
npx prisma db push --schema=prisma/tenant/schema.prisma --skip-generate --accept-data-loss 2>&1 | tail -3

# ============================================
# Step 3: 시드 실행
# ============================================
log "시드 데이터 입력 (target: $TARGET)..."

# 시드용 환경변수 설정
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:${PROXY_PORT}/campone_system"
export SYSTEM_DATABASE_URL="$DATABASE_URL"
export TENANT_DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:${PROXY_PORT}/camp_dev_db"
export CAMP_TEST_DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:${PROXY_PORT}/camp_test_db"
export DB_SSL="false"

npx tsx prisma/seed.ts "$TARGET"

echo ""
log "원격 시드 완료!"
echo ""
echo "테스트 계정 (비밀번호: campone123!):"
echo "  camp-dev: admin@campone.kr, analyst@campone.kr, operator@campone.kr, content@campone.kr, member@campone.kr"
echo "  camp-test: testadmin@campone.kr, testmember@campone.kr, admin@campone.kr"
