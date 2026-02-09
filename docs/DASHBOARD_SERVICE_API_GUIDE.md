# CampOne Dashboard - 서비스 간 API 연동 가이드

> **대상**: Insight, Studio, Policy Lab, Ops, Civic Hub 전 서비스 개발자
> **Dashboard 버전**: v1.4 (Multi-Tenant)
> **최종 수정**: 2026-02-06

---

## 목차

1. [개요](#1-개요)
2. [인증](#2-인증)
3. [API 엔드포인트](#3-api-엔드포인트)
4. [임베드 (iframe) 연동](#4-임베드-iframe-연동)
5. [서비스별 환경변수 설정](#5-서비스별-환경변수-설정)
6. [에러 처리](#6-에러-처리)
7. [예제 코드](#7-예제-코드)

---

## 1. 개요

### 1.1 아키텍처

```
┌─────────────────────────────────────────────────────┐
│  Dashboard (Next.js)                                │
│  - 사용자 인증 (NextAuth)                            │
│  - 임베드 JWT 발급                                   │
│  - public 스키마 관리 (alerts, kpi_cache, ...)       │
│  - 활동 로그 (audit_logs) - 시스템 DB                │
├─────────────────────────────────────────────────────┤
│  API: POST /api/activities   ← 활동 기록 생성        │
│  API: POST /api/alerts       ← 알림 생성             │
│  API: POST /api/kpi          ← KPI 갱신              │
│  API: GET  /api/auth/embed-token ← iframe 토큰 발급  │
└──────────┬──────────────────────────┬───────────────┘
           │  X-Service-Key           │  Embed JWT
           ▼                          ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Insight    │  │   Studio     │  │  Policy Lab  │
│  (FastAPI)   │  │  (Next.js)   │  │  (Next.js)   │
└──────────────┘  └──────────────┘  └──────────────┘
┌──────────────┐  ┌──────────────┐
│     Ops      │  │  Civic Hub   │
│  (Next.js)   │  │  (Next.js)   │
└──────────────┘  └──────────────┘
```

### 1.2 데이터 흐름 방향

| 방향 | 방법 | 예시 |
|---|---|---|
| **서비스 → Dashboard** | HTTP API (X-Service-Key) | 알림 생성, KPI 갱신, 활동 기록 |
| **Dashboard → 서비스** | iframe 임베드 (Embed JWT) | 모듈 페이지 표시 |
| **서비스 → 자체 DB** | 직접 접근 (자기 스키마) | `insight.*` 테이블 읽기/쓰기 |
| **서비스 → public** | **읽기만 허용** (직접 DB 접근) | `public.alerts` 읽기 |
| **서비스 → public 쓰기** | **Dashboard API 경유** | `POST /api/alerts` 호출 |

---

## 2. 인증

### 2.1 서비스-to-서비스 인증 (X-Service-Key)

Dashboard API를 호출할 때는 **모든 요청에 아래 2개 헤더가 필수**:

```
X-Service-Key: <SERVICE_API_KEY 값>
X-Tenant-Id: <테넌트 ID>  (예: camp-test, camp-dev)
Content-Type: application/json
```

- `X-Service-Key`: Secret Manager `campone-service-api-key`에 저장된 공유 키
- `X-Tenant-Id`: 요청 대상 테넌트 (멀티테넌트 환경에서 어느 캠프의 데이터인지 식별)

> **보안 참고**: API 키 검증은 `crypto.timingSafeEqual`을 사용한 타이밍 세이프 비교로 수행됩니다.
> `SERVICE_API_KEY` 또는 `INTERNAL_API_KEY` 중 하나와 일치하면 인증 성공입니다.

**인증 실패 응답:**

| 상황 | HTTP 코드 | 응답 |
|---|---|---|
| 키 없음 또는 불일치 | `401` | `{ "error": "Unauthorized" }` |
| X-Tenant-Id 누락 | `400` | `{ "error": "Tenant ID required ..." }` |
| 서버 설정 오류 (키 미설정) | `500` | `{ "error": "Server configuration error" }` |

### 2.2 임베드 JWT (iframe 인증)

Dashboard가 서비스를 iframe으로 임베드할 때 사용합니다.

**토큰 발급**: Dashboard가 `GET /api/auth/embed-token`으로 발급
**검증**: 각 서비스가 `EMBED_JWT_SECRET`으로 검증

> **중요**: `EMBED_JWT_SECRET` 환경변수는 **필수**입니다. 미설정 시 Dashboard는 토큰 발급을 거부하고 `500` 응답을 반환합니다.
> 이전 버전의 하드코드 폴백(`campone-embed-secret-change-in-production`)은 보안상 제거되었습니다.

JWT 페이로드:
```json
{
  "userId": "cuid...",
  "email": "user@example.com",
  "name": "홍길동",
  "role": "admin",
  "tenantId": "camp-test",
  "source": "dashboard",
  "iat": 1738800000,
  "exp": 1738803600
}
```

---

## 3. API 엔드포인트

**Base URL**: `https://campone-dashboard-415236799047.asia-northeast3.run.app`

### 3.1 POST /api/activities

활동 기록을 시스템 DB `audit_logs` 테이블에 생성합니다.

**용도**: 사용자 행동 추적, 감사 로그

#### 요청

```http
POST /api/activities
X-Service-Key: <key>
X-Tenant-Id: camp-test
Content-Type: application/json

{
  "action": "trend.analyzed",
  "module": "insight",
  "target": "키워드: 유해남",
  "details": {
    "keywords": ["유해남", "사천시"],
    "resultCount": 42
  },
  "userId": "cuid..."
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `action` | `string` | **필수** | 행동 식별자 (예: `trend.analyzed`, `content.created`, `policy.updated`) |
| `module` | `string` | 권장 | 모듈명 (`insight`, `studio`, `policy`, `ops`, `hub`) |
| `target` | `string` | 선택 | 대상 리소스 (resource 컬럼에 저장) |
| `details` | `object` | 선택 | 추가 메타데이터 (JSON, `detail` 컬럼에 `{ module, ...details }` 형태로 저장) |
| `userId` | `string` | 선택 | 행위자 ID (세션이 없는 서비스 호출 시 명시) |

#### 응답 (201)

```json
{
  "success": true,
  "activity": {
    "id": "cuid...",
    "actorId": "cuid...",
    "tenantId": "camp-test",
    "action": "trend.analyzed",
    "resource": "키워드: 유해남",
    "detail": { "module": "insight", "keywords": ["유해남", "사천시"], "resultCount": 42 },
    "ipAddress": "1.2.3.4",
    "createdAt": "2026-02-06T..."
  }
}
```

#### action 네이밍 컨벤션

```
{모듈}.{동사}
```

| 모듈 | 예시 action |
|---|---|
| insight | `trend.analyzed`, `report.generated`, `keyword.tracked` |
| studio | `content.created`, `content.published`, `template.saved` |
| policy | `policy.created`, `policy.updated`, `roadmap.exported` |
| ops | `task.completed`, `checklist.updated`, `schedule.changed` |
| hub | `petition.received`, `response.sent`, `feedback.resolved` |
| dashboard | `user.login`, `user.logout`, `settings.changed` |

---

### 3.2 POST /api/alerts

대시보드 알림을 생성합니다. 테넌트 DB `alerts` + `user_alerts` 테이블에 저장.

**용도**: 사용자에게 알림 표시 (여론 스파이크, 작업 완료, 시스템 경고 등)

#### 요청

```http
POST /api/alerts
X-Service-Key: <key>
X-Tenant-Id: camp-test
Content-Type: application/json

{
  "type": "workflow",
  "severity": "warning",
  "title": "여론 스파이크 감지",
  "message": "키워드 '유해남'에 대한 언급량이 전일 대비 300% 급증했습니다.",
  "source": "insight",
  "sourceId": "trend-report-20260206",
  "pinned": false,
  "expiresAt": "2026-02-07T00:00:00Z",
  "targetUserIds": null
}
```

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `title` | `string` | **필수** | - | 알림 제목 |
| `message` | `string` | **필수** | - | 알림 내용 |
| `type` | `"system"` \| `"workflow"` | 선택 | `"system"` | 알림 유형 |
| `severity` | `"info"` \| `"warning"` \| `"error"` \| `"success"` | 선택 | `"info"` | 심각도 |
| `source` | `string` | 권장 | `null` | 발신 서비스명 (`insight`, `studio`, `policy`, `ops`, `hub`) |
| `sourceId` | `string` | 선택 | `null` | 발신 서비스 내 리소스 ID (딥링크 등에 활용) |
| `pinned` | `boolean` | 선택 | `false` | 고정 알림 여부 |
| `expiresAt` | `ISO 8601` | 선택 | `null` | 만료 시각 (`null`이면 무기한) |
| `targetUserIds` | `string[]` | 선택 | `null` | 특정 사용자만 대상 (`null`이면 테넌트 전체 활성 사용자) |

#### 응답 (201)

```json
{
  "success": true,
  "alert": {
    "id": "cuid...",
    "type": "workflow",
    "severity": "warning",
    "title": "여론 스파이크 감지",
    "message": "...",
    "source": "insight",
    "sourceId": "trend-report-20260206",
    "pinned": false,
    "expiresAt": "2026-02-07T00:00:00.000Z",
    "createdAt": "2026-02-06T..."
  },
  "notifiedUsers": 5
}
```

#### severity 사용 가이드

| severity | 용도 | 예시 |
|---|---|---|
| `info` | 일반 알림 | 콘텐츠 발행 완료, 리포트 생성 |
| `success` | 성공 알림 | 캠페인 목표 달성, 작업 완료 |
| `warning` | 주의 필요 | 여론 스파이크, 일정 임박 |
| `error` | 긴급/오류 | 서비스 장애, 데이터 이상 |

---

### 3.3 POST /api/kpi

대시보드 KPI 카드에 표시할 데이터를 갱신합니다. 테넌트 DB `kpi_cache` 테이블에 upsert.

**용도**: 모듈별 핵심 지표를 대시보드 메인 화면에 표시

#### 요청

```http
POST /api/kpi
X-Service-Key: <key>
X-Tenant-Id: camp-test
Content-Type: application/json

{
  "module": "insight",
  "key": "trend_index",
  "value": 72.5,
  "unit": "점",
  "change": "+12.3",
  "expiresInMinutes": 60
}
```

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `module` | `string` | **필수** | - | 모듈명 (`insight`, `studio`, `policy`, `ops`, `hub`) |
| `key` | `string` | **필수** | - | KPI 식별자 (모듈 내 고유) |
| `value` | `any` | 권장 | - | 값 (숫자, 문자열 등) |
| `unit` | `string` | 선택 | - | 단위 (`점`, `건`, `%`, `개` 등) |
| `change` | `string` | 선택 | - | 변화량 (`+12.3`, `-5.2`, `N/A`) |
| `expiresInMinutes` | `number` | 선택 | `60` | 캐시 만료 시간 (분) |

> **저장 구조**: `kpi_cache` 테이블에 `key = "{module}:{key}"` 형태로 저장됩니다.
> 예: `"insight:trend_index"`, `"studio:content_count"`

#### 응답 (200)

```json
{
  "success": true,
  "kpi": {
    "module": "insight",
    "key": "trend_index",
    "value": { "value": 72.5, "unit": "점", "change": "+12.3" },
    "expiresAt": "2026-02-06T13:00:00.000Z",
    "updatedAt": "2026-02-06T12:00:00.000Z"
  }
}
```

#### 서비스별 권장 KPI 키

| 서비스 | key | 설명 | 갱신 주기 |
|---|---|---|---|
| **insight** | `trend_index` | 종합 여론 지수 | 1시간 |
| **insight** | `mention_count` | 총 언급량 | 1시간 |
| **insight** | `sentiment_score` | 긍/부정 지수 | 1시간 |
| **insight** | `spike_count` | 스파이크 감지 수 | 실시간 |
| **studio** | `content_count` | 발행 콘텐츠 수 | 발행 시 |
| **studio** | `draft_count` | 작성 중인 초안 수 | 변경 시 |
| **studio** | `scheduled_count` | 예약 발행 건 수 | 변경 시 |
| **policy** | `policy_count` | 등록된 정책 수 | 변경 시 |
| **policy** | `completion_rate` | 공약 이행률 | 1일 |
| **ops** | `task_completion` | 작업 완료율 | 변경 시 |
| **ops** | `pending_tasks` | 미완료 작업 수 | 변경 시 |
| **ops** | `today_schedule` | 오늘 일정 수 | 1일 |
| **hub** | `petition_count` | 접수 민원/청원 수 | 접수 시 |
| **hub** | `response_rate` | 응답률 | 1시간 |
| **hub** | `unresolved_count` | 미처리 건 수 | 변경 시 |

---

## 4. 임베드 (iframe) 연동

### 4.1 흐름

```
1. 사용자가 Dashboard에서 모듈 탭 클릭
2. Dashboard → GET /api/auth/embed-token → JWT 발급
3. Dashboard → iframe src="{서비스URL}/embed?token={jwt}&tenant={id}&theme={light|dark}"
4. 서비스 /embed 라우트에서 JWT 검증 → 인증된 사용자로 렌더링
```

### 4.2 서비스 측 /embed 라우트 구현

각 서비스는 `/embed` 경로에서 아래를 처리해야 합니다:

```
GET /embed?token=<jwt>&tenant=<tenantId>&theme=<light|dark>
```

**JWT 검증 예시 (Python/FastAPI)**:
```python
import jwt

EMBED_JWT_SECRET = os.getenv("EMBED_JWT_SECRET")

def verify_embed_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, EMBED_JWT_SECRET, algorithms=["HS256"])
        assert payload.get("source") == "dashboard"
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
```

**JWT 검증 예시 (Node.js/Next.js)**:
```typescript
import jwt from 'jsonwebtoken';

const EMBED_JWT_SECRET = process.env.EMBED_JWT_SECRET!;

function verifyEmbedToken(token: string) {
  const payload = jwt.verify(token, EMBED_JWT_SECRET) as {
    userId: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
    source: string;
  };
  if (payload.source !== 'dashboard') throw new Error('Invalid source');
  return payload;
}
```

### 4.3 iframe sandbox 정책

Dashboard가 iframe에 적용하는 sandbox:
```
allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads
```

추가 allow 속성:
```
clipboard-write; clipboard-read
```

### 4.4 테마 동기화

Dashboard는 `theme` 쿼리 파라미터로 현재 테마를 전달합니다:
- `light` 또는 `dark`
- 서비스는 이 값에 맞춰 UI 테마를 변경해야 합니다

---

## 5. 서비스별 환경변수 설정

### 5.1 공통 환경변수 (모든 서비스)

```bash
# Dashboard API 호출용
DASHBOARD_API_URL=https://campone-dashboard-415236799047.asia-northeast3.run.app
SERVICE_API_KEY=<campone-service-api-key 시크릿 값>

# 임베드 JWT 검증용 (Dashboard와 동일한 키)
EMBED_JWT_SECRET=<dashboard-embed-jwt-secret 시크릿 값>

# 테넌트 식별
DEFAULT_TENANT_ID=camp-test
```

### 5.2 Secret Manager 시크릿 이름

| 시크릿 이름 | 용도 | 사용 서비스 |
|---|---|---|
| `campone-service-api-key` | 서비스→Dashboard API 인증 | **전 서비스** |
| `dashboard-embed-jwt-secret` | 임베드 JWT 서명/검증 (**필수**) | **전 서비스** |
| `dashboard-internal-api-key` | Dashboard 내부 API 인증 (보조) | Dashboard |
| `campone-system-database-url` | 시스템 DB 접속 | 전 서비스 (인증용) |

### 5.3 Cloud Run 배포 시 시크릿 마운트 예시

```bash
gcloud run deploy <service-name> \
  --region asia-northeast3 \
  --set-secrets "\
SERVICE_API_KEY=campone-service-api-key:latest,\
EMBED_JWT_SECRET=dashboard-embed-jwt-secret:latest"
```

### 5.4 서비스별 추가 설정

**Insight (FastAPI)**:
```bash
# .env
DASHBOARD_API_URL=https://campone-dashboard-415236799047.asia-northeast3.run.app
SERVICE_API_KEY=<campone-service-api-key>
EMBED_JWT_SECRET=<dashboard-embed-jwt-secret>
DEFAULT_TENANT_ID=camp-test
```

**Studio / Policy / Ops / Hub (Next.js)**:
```bash
# .env.local
NEXT_PUBLIC_DASHBOARD_URL=https://campone-dashboard-415236799047.asia-northeast3.run.app
SERVICE_API_KEY=<campone-service-api-key>
EMBED_JWT_SECRET=<dashboard-embed-jwt-secret>
DEFAULT_TENANT_ID=camp-test
```

---

## 6. 에러 처리

### 6.1 공통 에러 응답 형식

```json
{
  "error": "에러 코드 또는 메시지",
  "message": "상세 설명 (선택)"
}
```

### 6.2 HTTP 상태 코드

| 코드 | 의미 | 대응 |
|---|---|---|
| `200` | 성공 (KPI upsert) | - |
| `201` | 생성 성공 (activity, alert) | - |
| `400` | 필수 필드 누락 | 요청 본문 확인 |
| `401` | 인증 실패 | `X-Service-Key` 값 확인 |
| `403` | 권한 부족 | alerts는 admin 세션 or 서비스 키 필요 |
| `500` | 서버 오류 | Dashboard 로그 확인 요청 |

### 6.3 권장 재시도 정책

```python
# Python 예시
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
def call_dashboard_api(endpoint, payload):
    response = httpx.post(
        f"{DASHBOARD_API_URL}{endpoint}",
        json=payload,
        headers={
            "X-Service-Key": SERVICE_API_KEY,
            "X-Tenant-Id": TENANT_ID,
        },
        timeout=10.0,
    )
    response.raise_for_status()
    return response.json()
```

```typescript
// TypeScript 예시
async function callDashboardApi(endpoint: string, payload: object, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${DASHBOARD_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Key': SERVICE_API_KEY,
          'X-Tenant-Id': TENANT_ID,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}
```

---

## 7. 예제 코드

### 7.1 Python (FastAPI/Insight) - 전체 헬퍼 클래스

```python
import os
import httpx
from typing import Optional

class DashboardClient:
    """Dashboard API 클라이언트"""

    def __init__(self, tenant_id: str = None):
        self.base_url = os.getenv("DASHBOARD_API_URL")
        self.api_key = os.getenv("SERVICE_API_KEY")
        self.tenant_id = tenant_id or os.getenv("DEFAULT_TENANT_ID", "camp-test")

    @property
    def _headers(self):
        return {
            "Content-Type": "application/json",
            "X-Service-Key": self.api_key,
            "X-Tenant-Id": self.tenant_id,
        }

    async def log_activity(
        self,
        action: str,
        module: str = "insight",
        target: str = None,
        details: dict = None,
        user_id: str = None,
    ):
        """활동 기록 생성"""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/api/activities",
                headers=self._headers,
                json={
                    "action": action,
                    "module": module,
                    "target": target,
                    "details": details or {},
                    "userId": user_id,
                },
                timeout=10.0,
            )
            resp.raise_for_status()
            return resp.json()

    async def create_alert(
        self,
        title: str,
        message: str,
        severity: str = "info",
        type: str = "workflow",
        source: str = "insight",
        source_id: str = None,
        pinned: bool = False,
        expires_at: str = None,
        target_user_ids: list[str] = None,
    ):
        """알림 생성"""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/api/alerts",
                headers=self._headers,
                json={
                    "type": type,
                    "severity": severity,
                    "title": title,
                    "message": message,
                    "source": source,
                    "sourceId": source_id,
                    "pinned": pinned,
                    "expiresAt": expires_at,
                    "targetUserIds": target_user_ids,
                },
                timeout=10.0,
            )
            resp.raise_for_status()
            return resp.json()

    async def update_kpi(
        self,
        key: str,
        value,
        module: str = "insight",
        unit: str = None,
        change: str = None,
        expires_in_minutes: int = 60,
    ):
        """KPI 갱신"""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/api/kpi",
                headers=self._headers,
                json={
                    "module": module,
                    "key": key,
                    "value": value,
                    "unit": unit,
                    "change": change,
                    "expiresInMinutes": expires_in_minutes,
                },
                timeout=10.0,
            )
            resp.raise_for_status()
            return resp.json()


# 사용 예시
dashboard = DashboardClient(tenant_id="camp-test")

# 여론 분석 완료 시
await dashboard.log_activity(
    action="trend.analyzed",
    target="키워드: 유해남",
    details={"keywords": ["유해남"], "resultCount": 42},
)

# 스파이크 감지 시
await dashboard.create_alert(
    title="여론 스파이크 감지",
    message="'유해남' 언급량 300% 급증",
    severity="warning",
    source_id="spike-20260206-001",
)

# KPI 갱신
await dashboard.update_kpi(key="trend_index", value=72.5, unit="점", change="+12.3")
await dashboard.update_kpi(key="mention_count", value=1523, unit="건", change="+342")
```

### 7.2 TypeScript (Next.js 서비스) - 전체 헬퍼

```typescript
// lib/dashboard-client.ts

const DASHBOARD_API_URL = process.env.DASHBOARD_API_URL
  || process.env.NEXT_PUBLIC_DASHBOARD_URL
  || '';
const SERVICE_API_KEY = process.env.SERVICE_API_KEY || '';
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'camp-test';

interface DashboardClientOptions {
  tenantId?: string;
}

class DashboardClient {
  private tenantId: string;

  constructor(options: DashboardClientOptions = {}) {
    this.tenantId = options.tenantId || DEFAULT_TENANT_ID;
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      'X-Service-Key': SERVICE_API_KEY,
      'X-Tenant-Id': this.tenantId,
    };
  }

  private async request(endpoint: string, body: object) {
    const res = await fetch(`${DASHBOARD_API_URL}${endpoint}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Dashboard API ${res.status}: ${err.error || res.statusText}`);
    }
    return res.json();
  }

  /** 활동 기록 생성 */
  async logActivity(params: {
    action: string;
    module?: string;
    target?: string;
    details?: Record<string, unknown>;
    userId?: string;
  }) {
    return this.request('/api/activities', params);
  }

  /** 알림 생성 */
  async createAlert(params: {
    title: string;
    message: string;
    type?: 'system' | 'workflow';
    severity?: 'info' | 'warning' | 'error' | 'success';
    source?: string;
    sourceId?: string;
    pinned?: boolean;
    expiresAt?: string;
    targetUserIds?: string[];
  }) {
    return this.request('/api/alerts', params);
  }

  /** KPI 갱신 */
  async updateKpi(params: {
    module: string;
    key: string;
    value: unknown;
    unit?: string;
    change?: string;
    expiresInMinutes?: number;
  }) {
    return this.request('/api/kpi', params);
  }
}

export const dashboard = new DashboardClient();

// 사용 예시
// import { dashboard } from '@/lib/dashboard-client';
//
// await dashboard.logActivity({
//   action: 'content.published',
//   module: 'studio',
//   target: '카드뉴스: 공약 5호',
// });
//
// await dashboard.createAlert({
//   title: '콘텐츠 발행 완료',
//   message: '"공약 5호 카드뉴스"가 인스타그램에 발행되었습니다.',
//   severity: 'success',
//   source: 'studio',
// });
//
// await dashboard.updateKpi({
//   module: 'studio',
//   key: 'content_count',
//   value: 28,
//   unit: '건',
//   change: '+1',
// });
```

---

## 8. 보안 참고 사항

### 8.1 인증 체계

- **API 키 비교**: `crypto.timingSafeEqual`을 사용하여 타이밍 공격 방지
- **지원 키**: `SERVICE_API_KEY`(서비스 간 통신용)와 `INTERNAL_API_KEY`(Dashboard 내부용) 두 가지를 모두 허용
- **GET 엔드포인트**: 모든 GET API는 NextAuth 세션 인증 필수 (channels, quick-buttons, campaign-profile, kpi, alerts)
- **POST 엔드포인트**: 세션 인증 또는 X-Service-Key 중 하나 필요

### 8.2 테넌트 격리

- 사용자 수정/삭제 시 해당 테넌트 소속 여부를 `userTenant` 테이블로 검증
- 서비스 호출 시 `X-Tenant-Id` 헤더로 테넌트 지정 (세션 없는 경우)

### 8.3 필수 환경변수

| 변수 | 미설정 시 동작 |
|---|---|
| `NEXTAUTH_SECRET` | 서버 시작 시 FATAL 경고. 세션 보안 불가 |
| `EMBED_JWT_SECRET` | 임베드 토큰 발급 거부 (500 응답) |
| `SERVICE_API_KEY` 또는 `INTERNAL_API_KEY` | 서비스 간 API 호출 불가 (500 응답) |

### 8.4 제거된 기능

- ~~`X-Internal-Call` 헤더~~: 스푸핑 가능하여 제거됨. 모든 내부 호출도 `X-Service-Key`를 사용
- ~~`EMBED_JWT_SECRET` 하드코드 폴백~~: `'campone-embed-secret-change-in-production'` 기본값 제거. 반드시 환경변수로 설정 필요

---

## 부록

### A. DB 스키마 참고 (테넌트 DB public 스키마)

서비스가 **읽기 전용으로 직접 접근** 가능한 테이블:

```sql
-- alerts: 알림 (쓰기는 Dashboard API 경유)
CREATE TABLE alerts (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,          -- 'system' | 'workflow'
  severity    TEXT NOT NULL,          -- 'info' | 'warning' | 'error' | 'success'
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  source      TEXT,                   -- 발신 서비스
  source_id   TEXT,                   -- 발신 서비스 내 ID
  pinned      BOOLEAN DEFAULT false,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- user_alerts: 사용자-알림 매핑
CREATE TABLE user_alerts (
  user_id  TEXT NOT NULL,
  alert_id TEXT NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  read     BOOLEAN DEFAULT false,
  read_at  TIMESTAMPTZ,
  PRIMARY KEY (user_id, alert_id)
);

-- kpi_cache: KPI 캐시
CREATE TABLE kpi_cache (
  key        TEXT PRIMARY KEY,        -- "{module}:{key}" 형식
  value      JSONB NOT NULL,          -- { value, unit, change }
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- channel_links: 채널 링크
CREATE TABLE channel_links (
  key        TEXT PRIMARY KEY,
  url        TEXT NOT NULL,
  label      TEXT NOT NULL,
  icon       TEXT,
  visible    BOOLEAN DEFAULT true,
  "order"    INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ
);

-- campaign_profile: 캠프 프로필
CREATE TABLE campaign_profile (
  id              TEXT PRIMARY KEY DEFAULT 'main',
  candidate_name  TEXT DEFAULT '후보자명',
  candidate_title TEXT DEFAULT 'OO시장 후보',
  org_name        TEXT DEFAULT '선거대책본부',
  photo_url       TEXT,
  careers         JSONB DEFAULT '[]',
  slogans         JSONB DEFAULT '[]',
  address         TEXT,
  phone           TEXT,
  email           TEXT,
  hours           TEXT,
  description     TEXT,
  updated_at      TIMESTAMPTZ
);
```

### B. 테넌트 DB URL 조회 (자체 서비스에서)

각 서비스가 시스템 DB에서 테넌트 DB 이름을 조회하여 연결하는 방법:

```sql
-- 시스템 DB (campone_system)
SELECT db_name FROM tenants WHERE tenant_id = 'camp-test' AND is_active = true;
-- 결과: camp_test_db
```

DB URL 조합:
```
postgresql://{user}:{password}@{host}/{db_name}?...
```

### C. 변경 이력

| 날짜 | 변경 내용 |
|---|---|
| 2026-02-06 | 초안 작성. activities, alerts, kpi 엔드포인트 + 임베드 JWT |
| 2026-02-06 | 보안 강화 반영: 타이밍 세이프 API 키 비교, EMBED_JWT_SECRET 필수화, X-Internal-Call 헤더 제거, GET 엔드포인트 세션 인증 추가, 테넌트 격리 강화 |
