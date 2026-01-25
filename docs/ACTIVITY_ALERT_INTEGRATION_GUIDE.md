# CampOne Dashboard - 활동/알림 연동 가이드

> 작성일: 2026-01-23
> 대상: Insights, Studio, Policy Lab, Ops, Civic Hub 개발팀
> 버전: 1.0

---

## 1. 개요

이 문서는 iframe으로 임베드되는 모듈들이 Dashboard의 **"최근 활동"** 및 **"알림"** 섹션에 데이터를 전송하는 방법을 설명합니다.

### 1.1 통신 방식

```
┌─────────────────────────────────────────────────────────────┐
│                      Dashboard                               │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  최근 활동 피드   │  │    알림 센터      │                  │
│  └────────┬────────┘  └────────┬────────┘                  │
│           │                    │                            │
│           ▼                    ▼                            │
│  ┌─────────────────────────────────────┐                   │
│  │   postMessage 수신 → API 저장        │                   │
│  └─────────────────────────────────────┘                   │
│                    ▲                                        │
└────────────────────│────────────────────────────────────────┘
                     │ postMessage
         ┌───────────┼───────────┐
         │           │           │
    ┌────┴────┐ ┌────┴────┐ ┌────┴────┐
    │ Insights│ │ Policy  │ │  Hub    │
    │(iframe) │ │(iframe) │ │(iframe) │
    └─────────┘ └─────────┘ └─────────┘
```

모듈에서 `window.parent.postMessage()`를 호출하면:
1. Dashboard가 메시지를 수신
2. 유효성 검증 후 API 호출
3. PostgreSQL DB에 영구 저장
4. Dashboard UI가 자동 갱신

---

## 2. 메시지 프로토콜

### 2.1 기본 구조

```typescript
interface ModuleMessage {
  type: 'ACTIVITY' | 'ALERT' | 'KPI_UPDATE' | 'READY' | 'ERROR';
  source: 'Insights' | 'Studio' | 'Policy' | 'Ops' | 'Hub';
  timestamp: number;  // Date.now()
  payload: object;    // 타입별 페이로드
}
```

### 2.2 메시지 타입별 페이로드

#### ACTIVITY (사용자 활동 기록)

```typescript
interface ActivityPayload {
  action: string;           // 필수: 수행한 작업
  target?: string;          // 선택: 대상 (예: "공약 #3")
  details?: object;         // 선택: 추가 정보
}
```

**예시:**
```javascript
{
  type: 'ACTIVITY',
  source: 'Policy',
  timestamp: Date.now(),
  payload: {
    action: '공약 수정',
    target: '청년 일자리 공약',
    details: { policyId: 'policy-001', changeType: 'content' }
  }
}
```

#### ALERT (알림 생성)

```typescript
interface AlertPayload {
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;            // 필수: 알림 제목
  message: string;          // 필수: 알림 내용
  pinned?: boolean;         // 선택: 고정 여부
  expiresInMinutes?: number; // 선택: 만료 시간 (분)
}
```

**예시:**
```javascript
{
  type: 'ALERT',
  source: 'Insights',
  timestamp: Date.now(),
  payload: {
    severity: 'warning',
    title: '여론 급증 감지',
    message: 'SNS 멘션이 30% 증가했습니다.',
    pinned: true
  }
}
```

#### KPI_UPDATE (KPI 데이터 업데이트)

```typescript
interface KpiUpdatePayload {
  key: string;              // KPI 식별자
  value: number | string;
  unit?: string;
  change?: number;          // 변화율 (%)
}
```

#### READY (모듈 로드 완료)

```typescript
interface ReadyPayload {
  version?: string;
}
```

**예시:**
```javascript
{
  type: 'READY',
  source: 'Hub',
  timestamp: Date.now(),
  payload: { version: '1.2.0' }
}
```

---

## 3. 구현 방법

### 3.1 헬퍼 함수 (복사해서 사용)

```typescript
// src/lib/dashboard-bridge.ts

type ModuleMessageType = 'ACTIVITY' | 'ALERT' | 'KPI_UPDATE' | 'READY' | 'ERROR';
type ModuleName = 'Insights' | 'Studio' | 'Policy' | 'Ops' | 'Hub';

interface ModuleMessage {
  type: ModuleMessageType;
  source: ModuleName;
  timestamp: number;
  payload: object;
}

const MODULE_NAME: ModuleName = 'Policy'; // 각 모듈에 맞게 변경

/**
 * Dashboard로 메시지를 전송합니다.
 * iframe 컨텍스트에서만 동작합니다.
 */
export function sendToDashboard(
  type: ModuleMessageType,
  payload: object
): void {
  // iframe 내부인지 확인
  if (typeof window === 'undefined' || window.parent === window) {
    console.warn('[Module] Not in iframe context');
    return;
  }

  const message: ModuleMessage = {
    type,
    source: MODULE_NAME,
    timestamp: Date.now(),
    payload,
  };

  window.parent.postMessage(message, '*');
  console.log(`[${MODULE_NAME}] Sent to Dashboard:`, message);
}

// 편의 함수들
export function logActivity(action: string, target?: string, details?: object) {
  sendToDashboard('ACTIVITY', { action, target, details });
}

export function sendAlert(
  severity: 'info' | 'warning' | 'error' | 'success',
  title: string,
  message: string,
  options?: { pinned?: boolean; expiresInMinutes?: number }
) {
  sendToDashboard('ALERT', { severity, title, message, ...options });
}

export function notifyReady(version?: string) {
  sendToDashboard('READY', { version });
}
```

### 3.2 사용 예시

```typescript
// 페이지 로드 시
import { notifyReady, logActivity, sendAlert } from '@/lib/dashboard-bridge';

// 컴포넌트 마운트 시
useEffect(() => {
  notifyReady('1.0.0');
}, []);

// 사용자 작업 시
function handleSavePolicy() {
  await savePolicy(data);
  logActivity('공약 저장', policyTitle, { policyId: policy.id });
}

// 중요 이벤트 발생 시
function handleTrendSpike() {
  sendAlert(
    'warning',
    '여론 급증 감지',
    `${keyword} 관련 언급이 ${changePercent}% 증가했습니다.`,
    { pinned: true }
  );
}
```

---

## 4. 권장 이벤트 목록

### 4.1 Insights 모듈

| 이벤트 | type | payload 예시 |
|--------|------|--------------|
| 분석 시작 | ACTIVITY | `{ action: '분석 시작', target: '키워드 분석' }` |
| 분석 완료 | ACTIVITY | `{ action: '분석 완료', details: { keyword: '청년정책' } }` |
| 여론 급증 | ALERT | `{ severity: 'warning', title: '여론 급증', message: '...' }` |
| 부정 여론 감지 | ALERT | `{ severity: 'error', title: '부정 여론 감지', message: '...' }` |

### 4.2 Studio 모듈

| 이벤트 | type | payload 예시 |
|--------|------|--------------|
| 콘텐츠 생성 | ACTIVITY | `{ action: 'SNS 카드 생성', target: '청년정책 안내' }` |
| 콘텐츠 발행 | ACTIVITY | `{ action: '콘텐츠 발행', details: { platform: 'Instagram' } }` |
| 예약 발행 | ACTIVITY | `{ action: '예약 발행 설정', target: '1월 25일 09:00' }` |

### 4.3 Policy Lab 모듈

| 이벤트 | type | payload 예시 |
|--------|------|--------------|
| 공약 생성 | ACTIVITY | `{ action: '공약 생성', target: '청년 일자리' }` |
| 공약 수정 | ACTIVITY | `{ action: '공약 수정', target: '주거 지원' }` |
| 근거자료 추가 | ACTIVITY | `{ action: '근거자료 추가', details: { type: 'link' } }` |

### 4.4 Civic Hub 모듈

| 이벤트 | type | payload 예시 |
|--------|------|--------------|
| 메시지 발송 | ACTIVITY | `{ action: '메시지 발송', details: { count: 1500 } }` |
| 세그먼트 생성 | ACTIVITY | `{ action: '세그먼트 생성', target: '청년층' }` |
| Q&A 답변 | ACTIVITY | `{ action: 'Q&A 답변', target: '질문 #123' }` |
| 승인 대기 | ALERT | `{ severity: 'warning', title: '승인 대기', message: '...' }` |

### 4.5 Ops 모듈

| 이벤트 | type | payload 예시 |
|--------|------|--------------|
| 체크리스트 완료 | ACTIVITY | `{ action: '체크리스트 완료', target: 'D-30 준비사항' }` |
| 일정 등록 | ACTIVITY | `{ action: '일정 등록', details: { date: '2026-02-01' } }` |
| 마감 임박 | ALERT | `{ severity: 'warning', title: '마감 임박', message: '...' }` |

---

## 5. 테스트 방법

### 5.1 로컬 테스트

```javascript
// 브라우저 콘솔에서 직접 테스트
window.parent.postMessage({
  type: 'ACTIVITY',
  source: 'Policy',  // 모듈명 변경
  timestamp: Date.now(),
  payload: {
    action: '테스트 활동',
    target: '테스트 대상'
  }
}, '*');
```

### 5.2 확인 방법

1. Dashboard 개발자 도구 콘솔에서 `[Dashboard] Received from ...` 로그 확인
2. Dashboard 메인 페이지의 "최근 활동" 섹션에서 새 항목 확인
3. (알림의 경우) "알림" 섹션에서 새 알림 확인

---

## 6. 주의사항

### 6.1 Origin 검증

Dashboard는 다음 origin에서 오는 메시지만 처리합니다:

```javascript
const ALLOWED_ORIGINS = [
  // 프로덕션
  'https://campone-v2-backend-755458598444.asia-northeast3.run.app',
  'https://campone-v2-frontend-755458598444.asia-northeast3.run.app',
  'https://campone-civic-hub-755458598444.asia-northeast3.run.app',
  'https://campone-policy-755458598444.asia-northeast3.run.app',
  // 로컬 (localhost:* 허용)
  'http://localhost:*',
];
```

새 도메인이 추가되면 Dashboard 팀에 알려주세요.

### 6.2 메시지 형식 검증

Dashboard는 다음을 검증합니다:
- `type`: 유효한 메시지 타입인지
- `source`: 유효한 모듈 이름인지
- `timestamp`: 존재하는지
- `payload`: 존재하는지

잘못된 형식의 메시지는 무시됩니다.

### 6.3 빈도 제한

과도한 메시지 전송은 자제해주세요:
- 활동 기록: 사용자 주요 작업만 (버튼 클릭마다 X)
- 알림: 중요한 이벤트만
- 디바운싱 권장: 연속 작업 시 마지막 것만 전송

---

## 7. 서버-서버 API (선택사항)

iframe이 아닌 서버 사이드에서 활동/알림을 기록해야 하는 경우:

### 7.1 활동 기록

```bash
POST https://campone-dashboard-755458598444.asia-northeast3.run.app/api/activities
Content-Type: application/json
X-Service-Key: <INTERNAL_API_KEY>

{
  "action": "분석 완료",
  "module": "Insights",
  "target": "키워드 분석",
  "userId": "user-123",
  "userName": "시스템"
}
```

### 7.2 알림 생성

```bash
POST https://campone-dashboard-755458598444.asia-northeast3.run.app/api/alerts
Content-Type: application/json
X-Service-Key: <INTERNAL_API_KEY>

{
  "type": "workflow",
  "severity": "warning",
  "title": "여론 급증 감지",
  "message": "SNS 멘션이 30% 증가했습니다.",
  "source": "Insights",
  "pinned": true
}
```

**참고:** `INTERNAL_API_KEY`는 Dashboard 팀에 문의하세요.

---

## 8. FAQ

### Q: iframe 외부에서 열렸을 때는?

`window.parent === window`일 때 postMessage가 작동하지 않습니다.
헬퍼 함수가 자동으로 감지하여 경고 로그만 출력하고 무시합니다.

### Q: 메시지가 전달되었는지 확인하려면?

Dashboard 개발자 도구 콘솔에서 로그를 확인하거나,
"최근 활동" 섹션이 갱신되는지 확인하세요.

### Q: 특정 사용자에게만 알림을 보내려면?

서버-서버 API를 사용하고 `targetUserIds` 배열을 지정하세요.

---

## 9. 연락처

문의사항:
- Dashboard 프로젝트 담당자

참고 문서:
- [INTEGRATION_REQUIREMENTS_FOR_OTHER_SERVICES.md](./INTEGRATION_REQUIREMENTS_FOR_OTHER_SERVICES.md)
- [INSIGHTS_EMBED_ISSUE.md](./INSIGHTS_EMBED_ISSUE.md)

---

*문서 버전: 1.0*
*최종 수정: 2026-01-23*
