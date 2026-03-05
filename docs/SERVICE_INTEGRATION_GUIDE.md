# CampOne 서비스 ↔ 대시보드 연동 가이드

> 최종 업데이트: 2026-03-04

각 서비스(Insights, Hub, Ops, Policy, Studio)가 대시보드에 **활동(Activity)**, **알림(Alert)**, **KPI** 데이터를 전달하기 위한 설정 가이드입니다.

---

## 1. 통신 경로 개요

데이터를 대시보드로 전달하는 경로는 **두 가지**입니다:

| 경로 | 동작 조건 | 파일 | 용도 |
|------|-----------|------|------|
| **postMessage** (클라이언트) | iframe 내부에서만 | `dashboard-bridge.ts` | 사용자 UI 액션 실시간 전달 |
| **HTTP API** (서버) | 항상 (환경변수 필요) | `dashboard-api.ts` | 서버 액션, 백그라운드 작업 |

**중요**: 개별 서비스 URL로 직접 접속하면 iframe이 아니므로 postMessage가 동작하지 않습니다. 이 경우 **HTTP API만 동작**합니다.

---

## 2. 환경변수 설정 (필수)

각 서비스의 Cloud Run에 아래 환경변수를 설정해야 합니다:

```env
# 대시보드 API URL (서버 간 통신용)
DASHBOARD_API_URL=https://campone-dashboard-415236799047.asia-northeast3.run.app

# 서비스 인증 키 — GCP Secret Manager: campone-dashboard-bridge-key
SERVICE_API_KEY=<campone-dashboard-bridge-key 시크릿 값>
```

### GCP Secret Manager 시크릿

| 시크릿 이름 | 용도 | 설정 위치 |
|------------|------|-----------|
| `campone-dashboard-bridge-key` | 서비스→대시보드 HTTP API 인증 키 | 대시보드: `SERVICE_API_KEY`, 각 서비스: `SERVICE_API_KEY` |

**대시보드(수신 측)**: Cloud Run에 `SERVICE_API_KEY=campone-dashboard-bridge-key:latest` 설정 완료.

### 서비스별 환경변수 이름

| 서비스 | URL 변수 | KEY 변수 | 현재 상태 |
|--------|----------|----------|-----------|
| **CivicHub** | `DASHBOARD_API_URL` | `SERVICE_API_KEY` | URL 설정됨, KEY를 `campone-dashboard-bridge-key`로 교체 필요 |
| **Insight** | `DASHBOARD_API_URL` | `SERVICE_API_KEY` | KEY가 플레이스홀더 → `campone-dashboard-bridge-key`로 설정 |
| **Ops** | `DASHBOARD_API_URL` | `SERVICE_API_KEY` | URL이 localhost → 프로덕션 URL로, KEY → `campone-dashboard-bridge-key` |
| **Policy** | `DASHBOARD_API_URL` | `DASHBOARD_API_KEY` | URL이 구 프로젝트 ID → 프로덕션 URL로, KEY → `campone-dashboard-bridge-key` |

### 조치 사항

1. **모든 서비스**: `DASHBOARD_API_URL`을 `https://campone-dashboard-415236799047.asia-northeast3.run.app`으로 통일
2. **모든 서비스**: `SERVICE_API_KEY`를 GCP 시크릿 `campone-dashboard-bridge-key`로 연결
3. **Policy**: 변수명 `DASHBOARD_API_KEY` → `SERVICE_API_KEY`로 통일 권장 (또는 코드에서 대응)

Cloud Run 설정 예시:
```bash
gcloud run services update <서비스명> \
  --project=campone-plane \
  --region=asia-northeast3 \
  --update-secrets=SERVICE_API_KEY=campone-dashboard-bridge-key:latest
```

---

## 3. HTTP API 엔드포인트

대시보드가 수신하는 API:

### 3a. 활동 기록: `POST /api/activities`

```json
{
  "action": "task.created",
  "module": "ops",
  "target": "팀 미팅 준비",
  "details": { "taskId": "task_123" }
}
```

**헤더:**
```
Content-Type: application/json
X-Service-Key: <SERVICE_API_KEY>
X-Tenant-Id: <tenantId>
```

### 3b. 알림: `POST /api/alerts`

```json
{
  "type": "workflow",
  "severity": "warning",
  "title": "긴급 태스크 등록",
  "message": "새로운 긴급 태스크가 등록되었습니다: 정책 분석",
  "source": "ops",
  "pinned": false,
  "expiresAt": "2026-03-04T12:00:00Z"
}
```

### 3c. KPI: `POST /api/kpi`

```json
{
  "module": "Ops",
  "key": "task_completion",
  "value": 75.5,
  "unit": "%",
  "change": 3.2,
  "expiresInMinutes": 60
}
```

**주의**: `module`은 postMessage의 `source`와 동일한 PascalCase (`Insights`, `Hub`, `Ops`, `Policy`, `Studio`)

---

## 4. postMessage 프로토콜 (iframe 전용)

### 메시지 구조

```typescript
{
  type: 'ACTIVITY' | 'ALERT' | 'KPI_UPDATE' | 'READY' | 'ERROR',
  source: 'Insights' | 'Hub' | 'Ops' | 'Policy' | 'Studio',  // PascalCase 필수
  timestamp: Date.now(),
  payload: { ... }
}
```

### source 이름 (정확히 일치해야 함)

| 서비스 | source 값 |
|--------|-----------|
| camponeinsight | `'Insights'` |
| camponecivichub | `'Hub'` |
| camponeops | `'Ops'` |
| camponepolicy | `'Policy'` |
| camponestudio | `'Studio'` |

---

## 5. KPI 키 카탈로그

대시보드에 표시 가능한 KPI 목록입니다. `key`는 아래 값과 **정확히 일치**해야 합니다.

### Insights

| key | 라벨 | 단위 | 설명 |
|-----|------|------|------|
| `positive_ratio` | 긍정 여론 | % | SNS 긍정 비율 |
| `negative_ratio` | 부정 여론 | % | SNS 부정 비율 |
| `mention_count` | 언급량 | 건 | 총 멘션 수 |
| `recognition_score` | 인지도 | 점 | 후보 인지도 (0-5) |
| `support_score` | 지지도 | 점 | 후보 지지도 (0-5) |
| `total_risks` | 리스크 | 건 | 식별된 리스크 수 |

### Civic Hub

| key | 라벨 | 단위 | 설명 |
|-----|------|------|------|
| `pending_questions` | 대기 질문 | 건 | 검토 대기 중인 질문 수 |
| `response_rate` | 응답률 | % | 질문 응답 비율 |

### Policy Lab

| key | 라벨 | 단위 | 설명 |
|-----|------|------|------|
| `completed_phases` | 완료 단계 | 단계 | 6단계 중 완료 수 |
| `analysis_progress` | 분석 진행률 | % | 전체 분석 진행률 |

### Ops

| key | 라벨 | 단위 | 설명 |
|-----|------|------|------|
| `task_completion` | 업무 완료율 | % | 전체 태스크 완료 비율 |
| `pending_tasks` | 대기 업무 | 건 | 미완료 태스크 수 |
| `urgent_tasks` | 긴급 업무 | 건 | 긴급 태스크 수 |
| `upcoming_events` | 예정 일정 | 건 | 이번 주 예정 일정 수 |

### Studio

| key | 라벨 | 단위 | 설명 |
|-----|------|------|------|
| `contents_published` | 발행 콘텐츠 | 건 | 발행된 콘텐츠 수 |

---

## 6. THEME_CHANGE 수신 (권장)

대시보드가 테마를 변경하면 iframe에 `THEME_CHANGE` 메시지를 보냅니다:

```typescript
// 대시보드 → 서비스
{
  type: 'THEME_CHANGE',
  source: 'Dashboard',
  timestamp: Date.now(),
  payload: { theme: 'dark' | 'light' }
}
```

각 서비스는 `window.addEventListener('message', ...)` 로 수신하여 테마를 적용해야 합니다. 현재 **Ops만 구현**, 나머지 서비스는 미구현 상태입니다.

---

## 7. iframe 보안: X-Frame-Options

대시보드에서 iframe으로 임베드되려면 `X-Frame-Options: SAMEORIGIN`을 **제거**하거나, `Content-Security-Policy: frame-ancestors`로 대체해야 합니다:

```
Content-Security-Policy: frame-ancestors 'self' https://campone-dashboard-415236799047.asia-northeast3.run.app
```

**현재 상태**: Policy 서비스가 `X-Frame-Options: SAMEORIGIN`으로 iframe 임베드를 차단 중.

---

## 8. 체크리스트

각 서비스 담당자가 확인할 항목:

- [ ] `DASHBOARD_API_URL` = `https://campone-dashboard-415236799047.asia-northeast3.run.app`
- [ ] `SERVICE_API_KEY` = GCP 시크릿 `campone-dashboard-bridge-key` 연결
- [ ] `dashboard-api.ts`에서 HTTP API 호출이 정상 동작하는지 로그 확인
- [ ] postMessage `source` 값이 PascalCase인지 확인
- [ ] KPI `key`가 위 카탈로그와 일치하는지 확인
- [ ] (Policy) `X-Frame-Options` 제거 또는 `frame-ancestors` 전환
- [ ] (권장) `THEME_CHANGE` 메시지 수신 구현
