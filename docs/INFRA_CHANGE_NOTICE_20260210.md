# CampOne 인프라 변경 공지 (2026-02-10)

> 대상: ops, policy, civichub, insight, control 서비스 담당자
> 작업자: Dashboard 팀
> 영향 범위: Secret Manager, Cloud Run 환경변수, DB 접속 패턴

---

## 1. 요약

Secret Manager 시크릿을 **27개 → 17개**로 정리하고, 서비스별로 흩어져 있던 DB/JWT 시크릿을 `campone-` 접두사의 **공유 시크릿 5개**로 통합했습니다.
각 서비스의 Cloud Run 환경변수 바인딩도 이미 업데이트 완료했으므로, **현재 배포된 서비스는 정상 동작합니다.**

다만 각 팀에서 **로컬 `.env`** 및 **코드 내 환경변수 참조명**을 맞춰야 할 수 있습니다.

---

## 2. 삭제된 시크릿 (10개)

다음 시크릿은 중복이거나 사용되지 않아 **삭제**했습니다.

| 삭제된 시크릿 | 사유 |
|---|---|
| `dashboard-system-db-url` | `campone-system-db-url`로 통합 |
| `SYSTEM_DATABASE_URL` | `campone-system-db-url`로 통합 |
| `campone-system-database-url` | `campone-system-db-url`로 통합 (이름 정리) |
| `control-system-db-url` | `campone-system-db-url`로 통합 |
| `dashboard-embed-jwt-secret` | `campone-embed-jwt-secret`로 통합 |
| `insight-embed-jwt-secret` | `campone-embed-jwt-secret`로 통합 |
| `TENANT_DB_PASSWORD` | `campone-tenant-db-password`로 통합 (이름 정리) |
| `dashboard-database-url` | 미사용 (대시보드는 system-db-url 사용) |
| `TENANT_DATABASE_URL_MAP` | 미사용 (동적 라우팅으로 전환됨) |
| `insight-db-user` | insight-backend가 `DB_USER=campone` 환경변수로 전환 |
| `insight-db-password` | `campone-tenant-db-password` 공유 시크릿으로 전환 |

---

## 3. 현재 시크릿 목록 (17개)

### 공유 시크릿 (campone- 접두사, 전 서비스 공통)

| 시크릿 이름 | 용도 | 사용 서비스 |
|---|---|---|
| `campone-system-db-url` | campone_system DB 연결 URL | dashboard, ops, policy, civichub, control |
| `campone-tenant-db-password` | 테넌트 DB 비밀번호 | ops, policy, insight-backend |
| `campone-embed-jwt-secret` | 임베드 iframe JWT 서명 | 전체 7개 서비스 |
| `campone-service-api-key` | 서비스 간 API 인증 | dashboard, ops, policy, civichub, insight-backend |
| `campone-standalone-jwt-secret` | 독립 서비스 JWT (비-NextAuth) | ops, policy |

### 서비스별 시크릿

| 시크릿 이름 | 용도 | 사용 서비스 |
|---|---|---|
| `dashboard-nextauth-secret` | NextAuth 세션 | dashboard |
| `dashboard-internal-api-key` | 내부 API 키 | dashboard |
| `control-nextauth-secret` | NextAuth 세션 | control |
| `civichub-database-url` | CivicHub DB URL | civichub |
| `civichub-jwt-secret` | CivicHub JWT | civichub |
| `civichub-openai-key` | OpenAI API | civichub |
| `insight-claude-api-key` | Anthropic API | insight-backend, policy |
| `insight-google-api-key` | Google API | insight-backend |
| `insight-google-cse-id` | Google CSE | insight-backend |
| `insight-naver-client-id` | Naver API | insight-backend |
| `insight-naver-client-secret` | Naver API | insight-backend |
| `insight-kakao-api-key` | Kakao API | insight-backend |

---

## 4. 서비스별 Cloud Run 현재 상태

### campone-ops

```
# 환경변수 (plain text)
NODE_ENV=production
CLOUD_SQL_SOCKET_PATH=/cloudsql/campone-plane:asia-northeast3:free-trial-first-project
DEFAULT_TENANT_ID=camp-dev
TENANT_DB_USER=campone
DASHBOARD_API_URL=https://campone-dashboard-415236799047.asia-northeast3.run.app  ← 수정됨 (구 755 URL에서 변경)

# 시크릿 바인딩
SYSTEM_DATABASE_URL  = campone-system-db-url:latest
JWT_SECRET           = campone-standalone-jwt-secret:latest
EMBED_JWT_SECRET     = campone-embed-jwt-secret:latest
SERVICE_API_KEY      = campone-service-api-key:latest
TENANT_DB_PASSWORD   = campone-tenant-db-password:latest
```

**변경사항:**
- `DASHBOARD_API_URL`: 잘못된 URL(755 프로젝트) → 올바른 URL(415 프로젝트)로 수정
- ~~`DATABASE_URL`~~: 더미값 `postgresql://unused` 제거

---

### campone-policy

```
# 환경변수
NODE_ENV=production
DEFAULT_TENANT_ID=camp-dev
TENANT_CONFIG_SOURCE=local
TENANT_DB_INSTANCE=campone-plane:asia-northeast3:free-trial-first-project
TENANT_DB_USER=campone
DASHBOARD_API_URL=https://campone-dashboard-415236799047.asia-northeast3.run.app

# 시크릿 바인딩
SYSTEM_DATABASE_URL  = campone-system-db-url:latest
TENANT_DB_PASSWORD   = campone-tenant-db-password:latest
JWT_SECRET           = campone-standalone-jwt-secret:latest
ANTHROPIC_API_KEY    = insight-claude-api-key:latest
SERVICE_API_KEY      = campone-service-api-key:latest
EMBED_JWT_SECRET     = campone-embed-jwt-secret:latest
```

**변경사항:** 없음 (이미 올바른 상태였음)

---

### campone-civichub

```
# 환경변수
NODE_ENV=production
NEXT_PUBLIC_CANDIDATE_NAME=홍길동
NEXT_PUBLIC_CANDIDATE_DISTRICT=창녕군
DASHBOARD_API_URL=https://campone-dashboard-415236799047.asia-northeast3.run.app
DEFAULT_TENANT_ID=camp-dev

# 시크릿 바인딩
DATABASE_URL         = civichub-database-url:latest
SYSTEM_DATABASE_URL  = campone-system-db-url:latest
OPENAI_API_KEY       = civichub-openai-key:latest
JWT_SECRET           = civichub-jwt-secret:latest
SERVICE_API_KEY      = campone-service-api-key:latest
EMBED_JWT_SECRET     = campone-embed-jwt-secret:latest
```

**변경사항:**
- ~~`CIVICHUB_JWT_SECRET`~~: `JWT_SECRET`과 중복 바인딩 제거

**TODO (CivicHub팀):**
1. **[버그] `/api/internal/candidates` 인증 실패** — 코드가 `process.env.INTERNAL_SERVICE_KEY`를 읽지만 Cloud Run에는 `SERVICE_API_KEY`만 바인딩됨. `src/app/api/internal/candidates/route.ts` 10번째 줄을 `process.env.SERVICE_API_KEY`로 수정 필요. 현재 Policy→CivicHub 후보자 동기화가 항상 실패함.
2. `civichub-database-url`이 `camp_dev_db`로 하드코딩되어 있음. 멀티테넌트 지원 시 동적 라우팅으로 전환 필요 (아래 섹션 6 참고)

---

### insight-backend

```
# 환경변수
CORS_ORIGINS=https://insight-frontend-415236799047.asia-northeast3.run.app,...
DASHBOARD_API_URL=https://campone-dashboard-415236799047.asia-northeast3.run.app
DEFAULT_TENANT_ID=camp-dev
DB_USER=campone                        ← 변경됨 (구: insight-db-user 시크릿)

# 시크릿 바인딩
CLAUDE_API_KEY               = insight-claude-api-key:latest
GOOGLE_API_KEY               = insight-google-api-key:latest
GOOGLE_CSE_ID                = insight-google-cse-id:latest
NAVER_API_CLIENT_ID          = insight-naver-client-id:latest
NAVER_API_CLIENT_SECRET      = insight-naver-client-secret:latest
KAKAO_REST_API_KEY           = insight-kakao-api-key:latest
EMBED_JWT_SECRET             = campone-embed-jwt-secret:latest
SERVICE_API_KEY              = campone-service-api-key:latest
DB_PASSWORD                  = campone-tenant-db-password:latest  ← 변경됨 (구: insight-db-password 시크릿)
```

**변경사항:**
- `DB_USER`: 시크릿(`insight-db-user`) → 환경변수(`campone`)로 변경
- `DB_PASSWORD`: 서비스 전용 시크릿(`insight-db-password`) → 공유 시크릿(`campone-tenant-db-password`)으로 변경
- 비밀번호 값 자체는 동일 (`campone-plane-2026`)

**TODO (Insight팀):** 시스템 DB 연동 없음. 동적 테넌트 라우팅 구현 필요 (아래 섹션 6 참고)

---

### insight-frontend

```
# 환경변수
DASHBOARD_API_URL=https://campone-dashboard-415236799047.asia-northeast3.run.app

# 시크릿 바인딩
EMBED_JWT_SECRET  = campone-embed-jwt-secret:latest
```

**변경사항:** 없음

---

### campone-control

```
# 환경변수
NEXTAUTH_URL=https://campone-control-415236799047.asia-northeast3.run.app

# 시크릿 바인딩
NEXTAUTH_SECRET  = control-nextauth-secret:latest
DATABASE_URL     = campone-system-db-url:latest    ← 수정됨 (구: control-system-db-url, 삭제된 시크릿)
```

**변경사항:**
- `DATABASE_URL`: 삭제된 시크릿(`control-system-db-url`) → 공유 시크릿(`campone-system-db-url`)으로 변경

---

## 5. 각 팀 액션 아이템

### 전체 팀 공통

- [ ] 로컬 `.env` 파일의 환경변수명이 위 Cloud Run 바인딩과 일치하는지 확인
- [ ] 코드에서 `process.env.XXX` 또는 `os.getenv("XXX")` 참조가 올바른지 확인

### Ops팀

- [x] Cloud Run 환경변수 업데이트 완료 (작업 없음)
- [ ] `DASHBOARD_API_URL` 변경 확인 (로컬 `.env`에도 반영)

### Policy팀

- [x] Cloud Run 환경변수 업데이트 완료 (변경 없었음)
- [ ] 확인만 하면 됨

### CivicHub팀

- [ ] **동적 테넌트 라우팅 구현** (우선순위 높음)
  - 현재: `civichub-database-url` → `camp_dev_db` 하드코딩
  - 목표: `campone-system-db-url`에서 `tenants.db_name` 조회 → URL 동적 조합
  - 아래 섹션 6 참조

### Insight팀

- [ ] 로컬 `.env`에서 `DB_USER=campone` 확인 (더 이상 시크릿이 아님)
- [ ] **시스템 DB 연동 구현** (동적 테넌트 라우팅)
  - 현재: DB 직접 접속만 (시스템 DB 미사용)
  - 목표: 시스템 DB에서 `tenants.db_name` 조회 → 테넌트 DB URL 동적 조합
  - 아래 섹션 6 참조

### Control팀

- [ ] `DATABASE_URL` 시크릿 변경 확인 (`campone-system-db-url`로 전환됨)

---

## 6. 동적 테넌트 라우팅 표준 패턴

모든 서비스는 아래 패턴으로 테넌트 DB에 접속해야 합니다.

### 환경변수 (3개만 필요)

```
DATABASE_URL (또는 SYSTEM_DATABASE_URL)
  → campone_system 연결 URL
  → 시크릿: campone-system-db-url

TENANT_DB_PASSWORD (또는 DB_PASSWORD)
  → 테넌트 DB 비밀번호
  → 시크릿: campone-tenant-db-password

CLOUD_SQL_SOCKET_PATH (또는 CLOUD_SQL_INSTANCE)
  → /cloudsql/campone-plane:asia-northeast3:free-trial-first-project
  → 환경변수 (시크릿 아님)
```

### 로직 흐름

```
1. 시스템 DB 접속 (DATABASE_URL 사용)
       ↓
2. SELECT db_name FROM tenants WHERE tenant_id = $1 AND is_active = true
   → "camp_dev_db" (결과 5분 캐시)
       ↓
3. 시스템 DB URL에서 DB명만 교체
   campone_system → camp_dev_db
       ↓
4. search_path 설정: {서비스명},public
   예: search_path=hub,public
       ↓
5. PrismaClient (또는 DB Pool) 생성 후 캐시
   (tenantId별 1개, 레이스 컨디션 방지 필요)
```

### TypeScript 참고 구현 (Ops/Policy 기반)

```typescript
// getTenantDbName: 시스템 DB에서 테넌트 DB명 조회 (5분 캐시)
async function getTenantDbName(tenantId: string): Promise<string> {
  const cached = dbNameCache.get(tenantId);
  if (cached && cached.expires > Date.now()) return cached.name;

  const result = await systemPool.query(
    "SELECT db_name FROM tenants WHERE tenant_id = $1 AND is_active = true",
    [tenantId]
  );
  if (!result.rows[0]) throw new Error(`Tenant not found: ${tenantId}`);

  dbNameCache.set(tenantId, { name: result.rows[0].db_name, expires: Date.now() + 300_000 });
  return result.rows[0].db_name;
}

// buildTenantUrl: 테넌트 DB URL 조합
function buildTenantUrl(dbName: string): string {
  const socketPath = process.env.CLOUD_SQL_SOCKET_PATH;
  const user = process.env.TENANT_DB_USER || "campone";
  const password = process.env.TENANT_DB_PASSWORD;
  const searchPath = "SERVICE_NAME,public";  // ← 서비스마다 변경

  return `postgresql://${user}:${password}@localhost/${dbName}?host=${socketPath}&options=-c%20search_path%3D${searchPath}`;
}
```

### Python 참고 구현 (Insight용)

```python
SERVICE_NAME = "insight"

async def get_tenant_pool(tenant_id: str) -> asyncpg.Pool:
    db_name = await get_db_name(tenant_id)  # 시스템 DB 조회 + 5분 캐시
    base_url = os.environ["DATABASE_URL"]
    tenant_url = re.sub(r'/([^/?]+)(\?|$)', f'/{db_name}\\2', base_url)

    return await asyncpg.create_pool(
        dsn=tenant_url,
        server_settings={"search_path": f"{SERVICE_NAME},public"},
        max_size=10
    )
```

### 테넌트 DB 스키마 구조

```
camp_dev_db/          camp_test_db/
├── public            ├── public          ← 대시보드 공용
├── insight           ├── insight         ← Insight 전용
├── studio            ├── studio          ← Studio 전용
├── policy            ├── policy          ← Policy 전용
├── ops               ├── ops             ← Ops 전용
└── hub               └── hub             ← CivicHub 전용
```

> 스키마는 이미 생성 완료. 각 서비스는 `search_path={서비스명},public` 설정만 하면 됩니다.

### 데이터 접근 규칙

- 자기 스키마: 읽기/쓰기 자유
- `public` 스키마: 읽기만 (쓰기는 Dashboard API 호출)
- 다른 서비스 스키마: 직접 접근 금지 (해당 서비스 API 호출)

---

## 7. 문의

- Dashboard 팀: Secret Manager, Cloud Run 환경변수 관련
- 아키텍처 전체: `docs/DB_MIGRATION_GUIDE.md` 참고
- DB 스키마: `docs/CAMPONE_V2_ARCHITECTURE_v1.4.md` 참고
