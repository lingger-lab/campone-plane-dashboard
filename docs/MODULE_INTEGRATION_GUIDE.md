# CampOne Dashboard 모듈 연동 가이드 v2.0

> 작성일: 2026-01-24
> 대상: Insights, Policy, CivicHub 모듈 개발팀
> 상태: **방식 변경 - 반드시 확인 필요**

---

## 1. 변경 사항 요약

### 기존 방식 (v1.0)
- 모든 이벤트를 `postMessage`로 전송
- **문제점**: iframe이 현재 페이지에 있을 때만 작동

### 새로운 방식 (v2.0)
- **클라이언트 이벤트** → postMessage (기존대로)
- **서버/백그라운드 이벤트** → Dashboard API 직접 호출 (신규)

```
┌─────────────────────────────────────────────────────────────────┐
│  문제 상황                                                       │
│                                                                  │
│  1. 사용자가 Insights에서 AI 분석 시작                           │
│  2. 사용자가 다른 페이지(Settings 등)로 이동                      │
│  3. Insights iframe 언로드됨                                     │
│  4. 분석 완료되어도 postMessage 전송 불가 ❌                      │
│  5. 사용자는 분석 완료 알림을 못 받음 ❌                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  해결 방법                                                       │
│                                                                  │
│  [모듈 서버] ──── API 호출 ────→ [Dashboard API]                │
│                                         │                        │
│                                         ▼                        │
│                                   DB에 저장                      │
│                                         │                        │
│                                         ▼                        │
│                              사용자가 어디에 있든                 │
│                              헤더 알림 배지에 표시 ✅             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 이벤트 분류 기준

### 2.1 postMessage 사용 (클라이언트 이벤트)

**특징**: 사용자가 해당 모듈 페이지에서 직접 조작하는 경우

| 모듈 | 이벤트 예시 |
|------|------------|
| Insights | 분석 시작 버튼 클릭, 보고서 다운로드 버튼 클릭 |
| Policy | 프로필 저장 버튼 클릭, PDF 업로드 버튼 클릭 |
| CivicHub | 질문 승인/반려 버튼 클릭, 문의 답변 버튼 클릭 |

### 2.2 서버 API 호출 (백그라운드 이벤트)

**특징**: 서버에서 처리 완료 후 발생하는 경우, 사용자가 다른 페이지에 있을 수 있음

| 모듈 | 이벤트 예시 |
|------|------------|
| Insights | AI 분석 완료, 분석 실패, KPI 데이터 |
| Policy | ME/FIELD/PLAN/DO 분석 완료, 분석 실패 |
| CivicHub | 품질 검수 실패, 긴급 티켓 발생, KPI 데이터 |

---

## 3. Dashboard API 인증

### 3.1 API 키

```
DASHBOARD_API_KEY=151ebde2377f280365b4c54cf7b37ca5b2eed5773489d049486e6342e49ce930
```

**보안 주의사항**:
- 절대 클라이언트 코드에 포함하지 마세요
- 환경변수로 관리하세요
- Git에 커밋하지 마세요

### 3.2 Base URL

```
# Production
DASHBOARD_API_URL=https://campone-dashboard-755458598444.asia-northeast3.run.app

# Local Development
DASHBOARD_API_URL=http://localhost:3000
```

### 3.3 인증 헤더

```typescript
const headers = {
  'Content-Type': 'application/json',
  'X-Service-Key': process.env.DASHBOARD_API_KEY
};
```

---

## 4. API 엔드포인트 상세

### 4.1 Activity API (활동 기록)

**용도**: 사용자 활동 로그 저장 (최근 활동 목록에 표시)

```
POST /api/activities
```

**Request Body**:
```typescript
{
  action: string;       // 필수. 활동 동작 (아래 표준 값 참고!)
  module: string;       // 필수. 모듈명 ("Insights" | "Policy" | "Hub")
  target: string;       // 필수. 대상 (깔끔한 텍스트, ID 금지!)
  details?: object;     // 선택. 추가 정보 (ID, 상태 등 상세 정보는 여기에)
  userId?: string;      // 선택. 사용자 ID (없으면 "system")
  userName?: string;    // 선택. 사용자 이름 (없으면 "System")
}
```

#### ⚠️ 중요: action 필드 표준 값 (배지 색상 매핑됨)

| 액션 | 키워드 (포함되면 매칭) | 배지 색상 |
|------|----------------------|----------|
| 실패 | `실패`, `fail`, `error`, `오류` | 🔴 빨강 |
| 반려 | `반려`, `거절`, `reject`, `거부` | 🔴 빨강 |
| 생성 | `생성`, `create`, `추가`, `등록`, `접수`, `신규`, `발생`, `업로드`, `upload` | 🟢 초록 |
| 수정 | `수정`, `update`, `변경`, `편집`, `갱신`, `답변`, `reply`, `response` | 🔵 파랑 |
| 삭제 | `삭제`, `delete`, `제거`, `취소` | 🔴 빨강 |
| 발송 | `발송`, `send`, `전송`, `발행` | ⚫ 기본 |
| 완료 | `승인`, `approve`, `완료`, `처리` | 🟡 노랑 |
| 조회 | `조회`, `검색`, `read`, `다운로드`, `download` | ⚪ 회색 |

**⚠️ 우선순위**: 실패/반려 > 생성 > 수정 > 삭제 > 발송 > 완료 > 조회

**권장 사용법**:
```typescript
// ✅ 간단한 영문 동작 키워드 사용 (권장)
action: "create"    // → 🟢 생성
action: "update"    // → 🔵 수정
action: "delete"    // → 🔴 삭제
action: "approve"   // → 🟡 완료
action: "fail"      // → 🔴 실패

// ✅ 또는 한글 키워드 포함
action: "문의 접수"       // "접수" 포함 → 🟢 생성
action: "상태 변경"       // "변경" 포함 → 🔵 수정
action: "분석 완료"       // "완료" 포함 → 🟡 완료
action: "분석 실패"       // "실패" 포함 → 🔴 실패
action: "질문 반려"       // "반려" 포함 → 🔴 반려
action: "티켓 발생"       // "발생" 포함 → 🟢 생성
action: "문서 업로드"     // "업로드" 포함 → 🟢 생성
```

#### ⚠️ 중요: target 필드 작성 규칙

**target 필드는 사용자에게 그대로 표시됩니다. 깔끔하게 작성하세요!**

```
┌─────────────────────────────────────────────────────────────────┐
│  ❌ 잘못된 예시 (ID, 코드 포함)                                   │
├─────────────────────────────────────────────────────────────────┤
│  "문의 #ykd07m 취재/인터뷰 요청이(가) 접수되었습니다."            │
│  "분석 작업 ID:85가 완료됨"                                       │
│  "ticket_abc123 상태 변경"                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ✅ 올바른 예시 (깔끔한 텍스트만)                                 │
├─────────────────────────────────────────────────────────────────┤
│  "문의: 취재/인터뷰 요청"                                         │
│  "여론 분석: 김철수 외 2명"                                       │
│  "티켓: 로그인 오류 문의"                                         │
│  "세그먼트: 서울 지지자"                                          │
│  "캠페인: 공약 안내"                                              │
└─────────────────────────────────────────────────────────────────┘
```

**ID, 상태코드 등 기술적 정보는 details 필드에 넣으세요:**

```typescript
// ❌ 잘못된 방식
{
  action: "문의 상태 변경",
  module: "Hub",
  target: "문의 #ykd07m 취재/인터뷰 요청이(가) 접수되었습니다. (문의 #o7f12c)"
}

// ✅ 올바른 방식
{
  action: "update",                    // 간단한 동작 키워드
  module: "Hub",
  target: "문의: 취재/인터뷰 요청",    // 깔끔한 표시 텍스트
  details: {                           // 상세 정보는 여기에
    inquiryId: "ykd07m",
    status: "접수",
    type: "취재/인터뷰"
  }
}
```

**Response**:
```typescript
{
  success: true,
  activity: {
    id: string;
    action: string;
    module: string;
    target: string;
    createdAt: string;
  }
}
```

**예시 - Insights 분석 완료**:
```typescript
await fetch(`${DASHBOARD_API_URL}/api/activities`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Service-Key': process.env.DASHBOARD_API_KEY
  },
  body: JSON.stringify({
    action: 'AI 분석 완료',
    module: 'Insights',
    target: '김철수, 이영희, 박민수',
    details: {
      analysisId: 85,
      duration: '5분 32초'
    },
    userName: 'Insights System'
  })
});
```

---

### 4.2 Alert API (알림)

**용도**: 알림 생성 (헤더 알림 배지 + 알림 센터에 표시)

```
POST /api/alerts
```

**Request Body**:
```typescript
{
  type?: string;              // 선택. "system" | "workflow" (기본: "system")
  severity: string;           // 필수. "info" | "warning" | "error" | "success"
  title: string;              // 필수. 알림 제목
  message: string;            // 필수. 알림 내용
  source?: string;            // 선택. 출처 모듈명 ("Insights" | "Policy" | "Hub")
  pinned?: boolean;           // 선택. 상단 고정 여부 (기본: false)
  expiresAt?: string;         // 선택. 만료 시간 (ISO 8601 형식)
  targetUserIds?: string[];   // 선택. 특정 사용자에게만 알림 (없으면 전체)
}
```

**Response**:
```typescript
{
  success: true,
  alert: {
    id: string;
    title: string;
    severity: string;
    createdAt: string;
  },
  notifiedUsers: number  // 알림 받은 사용자 수
}
```

**Severity 가이드**:
| severity | 용도 | UI 색상 |
|----------|------|--------|
| `info` | 일반 정보 | 파랑 |
| `success` | 성공/완료 | 초록 |
| `warning` | 주의/확인 필요 | 주황 |
| `error` | 오류/실패 | 빨강 |

**예시 - Insights 분석 완료 알림**:
```typescript
await fetch(`${DASHBOARD_API_URL}/api/alerts`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Service-Key': process.env.DASHBOARD_API_KEY
  },
  body: JSON.stringify({
    type: 'workflow',
    severity: 'success',
    title: 'AI 분석 완료',
    message: '김철수 외 2명에 대한 여론 분석이 완료되었습니다. 결과를 확인하세요.',
    source: 'Insights',
    pinned: false
  })
});
```

**예시 - CivicHub 긴급 티켓 알림**:
```typescript
await fetch(`${DASHBOARD_API_URL}/api/alerts`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Service-Key': process.env.DASHBOARD_API_KEY
  },
  body: JSON.stringify({
    type: 'workflow',
    severity: 'error',
    title: '긴급 티켓 발생',
    message: 'L1 긴급 티켓이 접수되었습니다. 즉시 확인이 필요합니다.',
    source: 'Hub',
    pinned: true  // 긴급이므로 상단 고정
  })
});
```

---

### 4.3 KPI API (지표 데이터)

**용도**: KPI 데이터 저장/업데이트 (대시보드 KPI 카드에 표시)

```
POST /api/kpi
```

**Request Body**:
```typescript
{
  module: string;           // 필수. 모듈명 ("Insights" | "Policy" | "Hub")
  key: string;              // 필수. KPI 식별자 (예: "recognition_score")
  value: number | string;   // 필수. 값
  unit?: string;            // 선택. 단위 (예: "점", "%", "건")
  change?: number;          // 선택. 변화율 (예: 5.2 → +5.2%)
  expiresInMinutes?: number; // 선택. 만료 시간 (분, 기본: 60)
}
```

**Response**:
```typescript
{
  success: true,
  kpi: {
    module: string;
    key: string;
    value: object;
    expiresAt: string;
    updatedAt: string;
  }
}
```

**예시 - Insights KPI 전송**:
```typescript
// 여러 KPI를 한 번에 전송하는 헬퍼 함수
async function sendKpis(kpis: Array<{key: string, value: number, unit: string}>) {
  const promises = kpis.map(kpi =>
    fetch(`${DASHBOARD_API_URL}/api/kpi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': process.env.DASHBOARD_API_KEY
      },
      body: JSON.stringify({
        module: 'Insights',
        key: kpi.key,
        value: kpi.value,
        unit: kpi.unit,
        expiresInMinutes: 120
      })
    })
  );

  await Promise.all(promises);
}

// 사용 예시
await sendKpis([
  { key: 'recognition_score', value: 3.8, unit: '점' },
  { key: 'support_score', value: 4.2, unit: '점' },
  { key: 'positive_ratio', value: 65.4, unit: '%' },
  { key: 'negative_ratio', value: 12.3, unit: '%' },
  { key: 'mention_count', value: 1520, unit: '건' },
]);
```

---

## 5. 모듈별 구현 가이드

### 5.1 Insights (여론분석)

**서버에서 호출해야 하는 이벤트**:

| 이벤트 | API | 타이밍 |
|--------|-----|-------|
| 분석 완료 | Activity + Alert(success) + KPI(12개) | 분석 파이프라인 완료 시 |
| 분석 실패 | Activity + Alert(error) | 분석 중 에러 발생 시 |

**클라이언트 postMessage 유지**:
- 분석 시작 버튼 클릭
- 보고서 다운로드 버튼 클릭
- READY 알림

**구현 위치 제안**:
```
# 백엔드 (FastAPI 등)
backend/app/services/analysis_service.py
  → 분석 완료/실패 시 Dashboard API 호출

# 프론트엔드 (기존 유지)
frontend/src/lib/dashboard-bridge.ts
  → postMessage 함수들 유지
```

---

### 5.2 Policy (전략 분석)

**서버에서 호출해야 하는 이벤트**:

| 이벤트 | API | 타이밍 |
|--------|-----|-------|
| ME 분석 완료 | Activity + KPI | ME 분석 API 완료 시 |
| FIELD 분석 완료 | Activity + KPI | FIELD 분석 API 완료 시 |
| PLAN 분석 완료 | Activity + KPI | PLAN 분석 API 완료 시 |
| DO 분석 완료 | Activity + KPI + Alert(success) | DO 분석 API 완료 시 (전체 완료) |
| 분석 실패 | Alert(error) | 각 단계 실패 시 |

**클라이언트 postMessage 유지**:
- 프로필 저장 버튼 클릭
- PDF 업로드 버튼 클릭
- 보고서 다운로드 버튼 클릭
- READY 알림

---

### 5.3 CivicHub (시민 소통)

**서버에서 호출해야 하는 이벤트**:

| 이벤트 | API | 타이밍 |
|--------|-----|-------|
| 품질 검수 실패 | Alert(warning) | 자동 검수에서 품질 미달 시 |
| 긴급 티켓 발생 | Alert(error, pinned) | L1 티켓 생성 시 |
| 중요 문의 접수 | Alert(info) | 취재/인터뷰 문의 접수 시 |
| KPI 갱신 | KPI | 주기적 또는 변경 시 |

**클라이언트 postMessage 유지**:
- 질문 승인/반려 버튼 클릭
- 문의 답변/상태변경 버튼 클릭
- 티켓 완료 처리 버튼 클릭
- 문서 업로드/삭제 버튼 클릭
- READY 알림

**KPI 목록**:
| key | 설명 | unit |
|-----|------|------|
| `questions_today` | 오늘 질문 수 | 건 |
| `total_questions` | 누적 질문 수 | 건 |
| `pending_review` | 승인 대기 질문 | 건 |
| `quality_pass_rate` | 품질 통과율 | % |
| `pending_inquiries` | 대기 중 문의 | 건 |
| `open_tickets` | 열린 티켓 | 건 |

---

## 6. 헬퍼 함수 예시 (Node.js/TypeScript)

각 모듈 서버에서 사용할 수 있는 헬퍼 함수:

```typescript
// lib/dashboard-api.ts

const DASHBOARD_API_URL = process.env.DASHBOARD_API_URL;
const DASHBOARD_API_KEY = process.env.DASHBOARD_API_KEY;

interface ActivityParams {
  action: string;
  module: string;
  target?: string;
  details?: Record<string, unknown>;
  userName?: string;
}

interface AlertParams {
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  source: string;
  pinned?: boolean;
  expiresAt?: string;
}

interface KpiParams {
  module: string;
  key: string;
  value: number | string;
  unit?: string;
  change?: number;
  expiresInMinutes?: number;
}

async function callDashboardApi(endpoint: string, body: object): Promise<Response> {
  const response = await fetch(`${DASHBOARD_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Key': DASHBOARD_API_KEY!,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    console.error(`Dashboard API error: ${response.status} ${response.statusText}`);
  }

  return response;
}

// 활동 기록
export async function logActivity(params: ActivityParams): Promise<void> {
  await callDashboardApi('/api/activities', {
    ...params,
    userName: params.userName || `${params.module} System`,
  });
}

// 알림 전송
export async function sendAlert(params: AlertParams): Promise<void> {
  await callDashboardApi('/api/alerts', {
    type: 'workflow',
    ...params,
  });
}

// KPI 전송
export async function sendKpi(params: KpiParams): Promise<void> {
  await callDashboardApi('/api/kpi', {
    ...params,
    expiresInMinutes: params.expiresInMinutes || 120,
  });
}

// 여러 KPI 한 번에 전송
export async function sendKpis(module: string, kpis: Array<Omit<KpiParams, 'module'>>): Promise<void> {
  await Promise.all(
    kpis.map(kpi => sendKpi({ ...kpi, module }))
  );
}
```

**Python (FastAPI) 예시**:
```python
# lib/dashboard_api.py

import os
import httpx
from typing import Optional, Dict, Any, List

DASHBOARD_API_URL = os.environ.get("DASHBOARD_API_URL")
DASHBOARD_API_KEY = os.environ.get("DASHBOARD_API_KEY")

async def call_dashboard_api(endpoint: str, body: dict) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{DASHBOARD_API_URL}{endpoint}",
            json=body,
            headers={
                "Content-Type": "application/json",
                "X-Service-Key": DASHBOARD_API_KEY,
            },
            timeout=10.0
        )
        response.raise_for_status()
        return response.json()

async def log_activity(
    action: str,
    module: str,
    target: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    user_name: Optional[str] = None
):
    await call_dashboard_api("/api/activities", {
        "action": action,
        "module": module,
        "target": target,
        "details": details,
        "userName": user_name or f"{module} System",
    })

async def send_alert(
    severity: str,  # "info" | "warning" | "error" | "success"
    title: str,
    message: str,
    source: str,
    pinned: bool = False
):
    await call_dashboard_api("/api/alerts", {
        "type": "workflow",
        "severity": severity,
        "title": title,
        "message": message,
        "source": source,
        "pinned": pinned,
    })

async def send_kpi(
    module: str,
    key: str,
    value: float | int | str,
    unit: Optional[str] = None,
    change: Optional[float] = None,
    expires_in_minutes: int = 120
):
    await call_dashboard_api("/api/kpi", {
        "module": module,
        "key": key,
        "value": value,
        "unit": unit,
        "change": change,
        "expiresInMinutes": expires_in_minutes,
    })
```

---

## 7. 환경변수 설정

각 모듈 서버에 다음 환경변수 추가:

```bash
# .env 또는 Cloud Run 환경변수
DASHBOARD_API_URL=https://campone-dashboard-755458598444.asia-northeast3.run.app
DASHBOARD_API_KEY=151ebde2377f280365b4c54cf7b37ca5b2eed5773489d049486e6342e49ce930
```

---

## 8. 테스트 방법

### 8.1 API 직접 테스트 (curl)

```bash
# Activity 테스트
curl -X POST https://campone-dashboard-755458598444.asia-northeast3.run.app/api/activities \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: 151ebde2377f280365b4c54cf7b37ca5b2eed5773489d049486e6342e49ce930" \
  -d '{
    "action": "테스트 활동",
    "module": "Test",
    "target": "테스트 대상"
  }'

# Alert 테스트
curl -X POST https://campone-dashboard-755458598444.asia-northeast3.run.app/api/alerts \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: 151ebde2377f280365b4c54cf7b37ca5b2eed5773489d049486e6342e49ce930" \
  -d '{
    "severity": "info",
    "title": "테스트 알림",
    "message": "이것은 테스트 알림입니다.",
    "source": "Test"
  }'

# KPI 테스트
curl -X POST https://campone-dashboard-755458598444.asia-northeast3.run.app/api/kpi \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: 151ebde2377f280365b4c54cf7b37ca5b2eed5773489d049486e6342e49ce930" \
  -d '{
    "module": "Test",
    "key": "test_score",
    "value": 85.5,
    "unit": "점"
  }'
```

### 8.2 확인 방법

1. Dashboard 접속: https://campone-dashboard-755458598444.asia-northeast3.run.app
2. 로그인 후 메인 페이지에서:
   - **최근 활동** 섹션에 Activity 표시 확인
   - **헤더 알림 배지** 숫자 증가 확인
   - **알림 드롭다운**에서 Alert 내용 확인
3. `/audit` 페이지에서 전체 목록 확인

---

## 9. FAQ

**Q: postMessage 코드는 삭제해야 하나요?**
A: 아니요. 사용자가 해당 모듈 페이지에 있을 때의 즉각적인 피드백을 위해 postMessage도 유지하세요. 서버 API는 백그라운드 이벤트용 추가 채널입니다.

**Q: 같은 이벤트를 postMessage와 서버 API 둘 다 보내면 중복되나요?**
A: Activity와 Alert는 각각 새 레코드로 저장되므로 중복 가능합니다. 클라이언트 이벤트는 postMessage만, 서버 이벤트는 API만 사용하도록 분리하세요.

**Q: API 호출이 실패하면?**
A: 모듈 서비스의 핵심 기능에 영향을 주지 않도록 try-catch로 감싸고 로깅만 하세요. Dashboard 알림은 부가 기능입니다.

**Q: KPI 데이터는 얼마나 자주 보내야 하나요?**
A: 데이터 변경 시 또는 주기적으로 (예: 5분마다). `expiresInMinutes` 설정에 따라 만료되므로, 만료 전에 갱신하면 됩니다.

---

## 10. 문의

- Dashboard 연동 관련: (담당자)
- API 키 재발급 요청: (담당자)
- GitHub Issues: https://github.com/xxx/campone-dashboard/issues

---

*문서 버전: 2.0*
*최종 수정: 2026-01-24*
