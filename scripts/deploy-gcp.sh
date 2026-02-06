#!/usr/bin/env bash
# ============================================
# CampOne Dashboard - GCP 배포 스크립트
# Cloud Run + Cloud SQL (campone-plane)
# ============================================
set -euo pipefail

PROJECT_ID="campone-plane"
REGION="asia-northeast3"
INSTANCE="free-trial-first-project"
CONNECTION_NAME="${PROJECT_ID}:${REGION}:${INSTANCE}"

DB_USER="campone"
DB_PASS="campone-plane-2026"

SERVICE_NAME="campone-dashboard"

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[x]${NC} $1"; }

# ============================================
# Step 0: 프로젝트 설정 확인
# ============================================
log "GCP 프로젝트 확인..."
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
  warn "현재 프로젝트: $CURRENT_PROJECT → $PROJECT_ID 로 전환"
  gcloud config set project "$PROJECT_ID"
fi
log "프로젝트: $PROJECT_ID"

# ============================================
# Step 1: API 활성화
# ============================================
log "필수 API 활성화..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  --quiet

# ============================================
# Step 2: Cloud SQL 상태 확인
# ============================================
log "Cloud SQL 인스턴스 상태 확인..."
STATE=$(gcloud sql instances describe "$INSTANCE" --format="value(state)" 2>/dev/null || echo "NOT_FOUND")
if [ "$STATE" != "RUNNABLE" ]; then
  err "Cloud SQL 인스턴스 '$INSTANCE' 상태: $STATE (RUNNABLE 필요)"
  exit 1
fi
log "Cloud SQL: $INSTANCE (RUNNABLE)"

# ============================================
# Step 3: Secret Manager 등록
# ============================================
log "Secret Manager 시크릿 생성/업데이트..."

create_or_update_secret() {
  local name=$1
  local value=$2
  if gcloud secrets describe "$name" --quiet 2>/dev/null; then
    echo -n "$value" | gcloud secrets versions add "$name" --data-file=- --quiet
    log "  업데이트: $name"
  else
    echo -n "$value" | gcloud secrets create "$name" --data-file=- --quiet
    log "  생성: $name"
  fi
}

# System DB URL (campone_system)
SYSTEM_DB_URL="postgresql://${DB_USER}:${DB_PASS}@/${DB_USER}_system?host=/cloudsql/${CONNECTION_NAME}"
# 수정: DB명은 campone_system
SYSTEM_DB_URL="postgresql://${DB_USER}:${DB_PASS}@/campone_system?host=/cloudsql/${CONNECTION_NAME}"
create_or_update_secret "dashboard-system-db-url" "$SYSTEM_DB_URL"

# Tenant DB URL (camp_dev_db - 스키마 push + dev 테넌트 기본)
TENANT_DB_URL="postgresql://${DB_USER}:${DB_PASS}@/camp_dev_db?host=/cloudsql/${CONNECTION_NAME}"
create_or_update_secret "dashboard-tenant-db-url" "$TENANT_DB_URL"

# NEXTAUTH_SECRET
if ! gcloud secrets describe "dashboard-nextauth-secret" --quiet 2>/dev/null; then
  NEXTAUTH_SECRET=$(openssl rand -base64 32)
  create_or_update_secret "dashboard-nextauth-secret" "$NEXTAUTH_SECRET"
else
  log "  존재함: dashboard-nextauth-secret"
fi

# EMBED_JWT_SECRET
if ! gcloud secrets describe "dashboard-embed-jwt-secret" --quiet 2>/dev/null; then
  EMBED_SECRET=$(openssl rand -base64 32)
  create_or_update_secret "dashboard-embed-jwt-secret" "$EMBED_SECRET"
else
  log "  존재함: dashboard-embed-jwt-secret"
fi

# INTERNAL_API_KEY
if ! gcloud secrets describe "dashboard-internal-api-key" --quiet 2>/dev/null; then
  API_KEY=$(openssl rand -base64 32)
  create_or_update_secret "dashboard-internal-api-key" "$API_KEY"
else
  log "  존재함: dashboard-internal-api-key"
fi

# ============================================
# Step 4: IAM - Cloud Run이 Secret에 접근 가능하도록
# ============================================
log "IAM 권한 설정..."
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding dashboard-system-db-url \
  --member="serviceAccount:${COMPUTE_SA}" --role="roles/secretmanager.secretAccessor" --quiet 2>/dev/null || true
gcloud secrets add-iam-policy-binding dashboard-tenant-db-url \
  --member="serviceAccount:${COMPUTE_SA}" --role="roles/secretmanager.secretAccessor" --quiet 2>/dev/null || true
gcloud secrets add-iam-policy-binding dashboard-nextauth-secret \
  --member="serviceAccount:${COMPUTE_SA}" --role="roles/secretmanager.secretAccessor" --quiet 2>/dev/null || true
gcloud secrets add-iam-policy-binding dashboard-embed-jwt-secret \
  --member="serviceAccount:${COMPUTE_SA}" --role="roles/secretmanager.secretAccessor" --quiet 2>/dev/null || true
gcloud secrets add-iam-policy-binding dashboard-internal-api-key \
  --member="serviceAccount:${COMPUTE_SA}" --role="roles/secretmanager.secretAccessor" --quiet 2>/dev/null || true

log "IAM: Compute SA에 시크릿 접근 권한 부여됨"

# ============================================
# Step 5: Cloud Run 배포 (source deploy)
# ============================================
log "Cloud Run 배포 시작..."
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 2 \
  --add-cloudsql-instances "$CONNECTION_NAME" \
  --set-env-vars "NEXTAUTH_URL=https://TBD" \
  --set-secrets "NEXTAUTH_SECRET=dashboard-nextauth-secret:latest,DATABASE_URL=dashboard-system-db-url:latest,TENANT_DATABASE_URL=dashboard-tenant-db-url:latest,EMBED_JWT_SECRET=dashboard-embed-jwt-secret:latest,INTERNAL_API_KEY=dashboard-internal-api-key:latest" \
  --quiet

# ============================================
# Step 6: 배포 URL 가져와서 NEXTAUTH_URL 업데이트
# ============================================
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format="value(status.url)")
log "배포 URL: $SERVICE_URL"

log "NEXTAUTH_URL 업데이트..."
gcloud run services update "$SERVICE_NAME" \
  --region "$REGION" \
  --set-env-vars "NEXTAUTH_URL=${SERVICE_URL}" \
  --quiet

# ============================================
# 완료
# ============================================
echo ""
echo "============================================"
echo -e "${GREEN}배포 완료!${NC}"
echo "============================================"
echo ""
echo "Dashboard URL: ${SERVICE_URL}"
echo ""
echo "테스트 계정:"
echo "  camp-dev (홍길동 캠프):"
echo "    admin@campone.kr / campone123!  (관리자)"
echo "    analyst@campone.kr              (분석가)"
echo "    operator@campone.kr             (운영)"
echo "    content@campone.kr              (콘텐츠)"
echo "    member@campone.kr               (멤버)"
echo ""
echo "  camp-test (김민주 캠프):"
echo "    testadmin@campone.kr            (관리자)"
echo "    testmember@campone.kr           (멤버)"
echo "    admin@campone.kr                (시스템관리자, 양쪽 모두)"
echo ""
echo "접속: ${SERVICE_URL}/camp-dev  또는  ${SERVICE_URL}/camp-test"
echo ""
echo "※ DB 시드가 필요하면: npm run seed:remote"
