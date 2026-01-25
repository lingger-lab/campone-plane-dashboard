# CampOne Dashboard - KPI 연동 가이드

> 작성일: 2026-01-24
> 대상: Insights, Studio, Policy Lab, Ops, Civic Hub 개발팀
> 버전: 1.0

---

## 1. 개요

이 문서는 iframe으로 임베드되는 모듈들이 Dashboard의 **KPI 지표** 데이터를 전송하는 방법을 설명합니다.

### 1.1 KPI 데이터 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                      Dashboard                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               KPI 카드 / 대시보드 지표                  │   │
│  └───────────────────────┬─────────────────────────────┘   │
│                          │ useKpi hooks                     │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Cloud SQL (kpi_cache 테이블)             │   │
│  └───────────────────────▲─────────────────────────────┘   │
│                          │ /api/kpi                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │   postMessage 수신 → API 저장 (1시간 캐시)            │   │
│  └───────────────────────▲─────────────────────────────┘   │
└──────────────────────────│──────────────────────────────────┘
                           │ postMessage (KPI_UPDATE)
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────┴────┐      ┌─────┴────┐      ┌────┴────┐
    │ Insights│      │  Policy  │      │   Hub   │
    │(iframe) │      │ (iframe) │      │(iframe) │
    └─────────┘      └──────────┘      └─────────┘
```

**특징:**
- KPI 데이터는 `kpi_cache` 테이블에 저장
- 기본 만료 시간: 1시간 (설정 가능)
- Dashboard가 1분마다 자동으로 데이터 갱신

---

## 2. 메시지 프로토콜

### 2.1 KPI_UPDATE 메시지 구조

```typescript
interface KpiUpdateMessage {
  type: 'KPI_UPDATE';
  source: 'Insights' | 'Studio' | 'Policy' | 'Ops' | 'Hub';
  timestamp: number;  // Date.now()
  payload: KpiUpdatePayload;
}

interface KpiUpdatePayload {
  key: string;              // KPI 식별자 (필수)
  value: number | string;   // KPI 값 (필수)
  unit?: string;            // 단위 (예: '%', '건', '원')
  change?: number;          // 변화율 (%, 양수=증가, 음수=감소)
  expiresInMinutes?: number; // 만료 시간 (기본: 60분)
}
```

### 2.2 예시

```javascript
// 기본 사용
window.parent.postMessage({
  type: 'KPI_UPDATE',
  source: 'Insights',
  timestamp: Date.now(),
  payload: {
    key: 'sentiment_score',
    value: 72.5,
    unit: '%',
    change: 3.2
  }
}, '*');

// 만료 시간 지정
window.parent.postMessage({
  type: 'KPI_UPDATE',
  source: 'Hub',
  timestamp: Date.now(),
  payload: {
    key: 'active_supporters',
    value: 15420,
    unit: '명',
    change: 120,
    expiresInMinutes: 30  // 30분 후 만료
  }
}, '*');
```

---

## 3. 구현 방법

### 3.1 헬퍼 함수

```typescript
// src/lib/dashboard-bridge.ts

type ModuleName = 'Insights' | 'Studio' | 'Policy' | 'Ops' | 'Hub';

const MODULE_NAME: ModuleName = 'Insights'; // 각 모듈에 맞게 변경

interface KpiPayload {
  key: string;
  value: number | string;
  unit?: string;
  change?: number;
  expiresInMinutes?: number;
}

/**
 * KPI 데이터를 Dashboard로 전송합니다.
 */
export function sendKpiUpdate(payload: KpiPayload): void {
  if (typeof window === 'undefined' || window.parent === window) {
    console.warn('[Module] Not in iframe context');
    return;
  }

  const message = {
    type: 'KPI_UPDATE',
    source: MODULE_NAME,
    timestamp: Date.now(),
    payload,
  };

  window.parent.postMessage(message, '*');
  console.log(`[${MODULE_NAME}] Sent KPI update:`, payload.key, payload.value);
}

// 편의 함수: 퍼센트 값
export function sendPercentKpi(key: string, value: number, change?: number) {
  sendKpiUpdate({ key, value, unit: '%', change });
}

// 편의 함수: 카운트 값
export function sendCountKpi(key: string, value: number, unit: string, change?: number) {
  sendKpiUpdate({ key, value, unit, change });
}
```

### 3.2 사용 예시

```typescript
import { sendKpiUpdate, sendPercentKpi, sendCountKpi } from '@/lib/dashboard-bridge';

// 여론 분석 완료 시 (Insights)
function onAnalysisComplete(result) {
  // 감성 점수
  sendPercentKpi('sentiment_score', result.sentimentScore, result.sentimentChange);

  // 멘션 수
  sendCountKpi('mention_count', result.totalMentions, '건', result.mentionChange);

  // 긍정/부정 비율
  sendKpiUpdate({
    key: 'positive_ratio',
    value: result.positiveRatio,
    unit: '%',
    change: result.ratioChange,
    expiresInMinutes: 120  // 분석 결과는 2시간 유지
  });
}

// 콘텐츠 발행 시 (Studio)
function onContentPublished() {
  sendCountKpi('published_content', totalPublished, '건', 1);
}

// 지지자 등록 시 (Hub)
function onSupporterRegistered() {
  sendCountKpi('total_supporters', newTotal, '명', 1);
}
```

---

## 4. 모듈별 권장 KPI

### 4.1 Insights 모듈

| KPI Key | 설명 | unit | 예시 값 |
|---------|------|------|---------|
| `sentiment_score` | 전체 감성 점수 | `%` | `72.5` |
| `positive_ratio` | 긍정 여론 비율 | `%` | `65.2` |
| `negative_ratio` | 부정 여론 비율 | `%` | `12.8` |
| `mention_count` | 총 멘션 수 | `건` | `1520` |
| `trend_index` | 여론 지수 | `점` | `85` |

### 4.2 Studio 모듈

| KPI Key | 설명 | unit | 예시 값 |
|---------|------|------|---------|
| `published_content` | 발행된 콘텐츠 수 | `건` | `45` |
| `scheduled_content` | 예약된 콘텐츠 수 | `건` | `12` |
| `total_views` | 총 조회수 | `회` | `125000` |
| `engagement_rate` | 참여율 | `%` | `4.2` |

### 4.3 Policy 모듈 (전략 분석)

| KPI Key | 설명 | unit | 예시 값 |
|---------|------|------|---------|
| `analysis_progress` | 분석 진행률 | `%` | `75` |
| `completed_phases` | 완료 단계 수 | `단계` | `3` |
| `strategy_score` | 전략 점수 | `점` | `82` |

### 4.4 Civic Hub 모듈

| KPI Key | 설명 | unit | 예시 값 |
|---------|------|------|---------|
| `total_supporters` | 총 지지자 수 | `명` | `15420` |
| `new_supporters_today` | 오늘 신규 가입 | `명` | `32` |
| `messages_sent` | 발송 메시지 수 | `건` | `8500` |
| `open_rate` | 메시지 오픈율 | `%` | `42.5` |
| `response_rate` | 응답률 | `%` | `12.3` |

### 4.5 Ops 모듈

| KPI Key | 설명 | unit | 예시 값 |
|---------|------|------|---------|
| `tasks_completed` | 완료된 태스크 | `건` | `28` |
| `tasks_pending` | 대기 중 태스크 | `건` | `15` |
| `checklist_progress` | 체크리스트 진행률 | `%` | `68` |
| `d_day` | D-Day | `일` | `-30` |

---

## 5. 서버-서버 API

서버 사이드에서 직접 KPI를 업데이트해야 하는 경우:

```bash
POST https://campone-dashboard-755458598444.asia-northeast3.run.app/api/kpi
Content-Type: application/json
X-Service-Key: <INTERNAL_API_KEY>

{
  "module": "Insights",
  "key": "sentiment_score",
  "value": 72.5,
  "unit": "%",
  "change": 3.2,
  "expiresInMinutes": 60
}
```

**응답:**
```json
{
  "success": true,
  "kpi": {
    "module": "Insights",
    "key": "sentiment_score",
    "value": { "value": 72.5, "unit": "%", "change": 3.2 },
    "expiresAt": "2026-01-24T11:00:00.000Z",
    "updatedAt": "2026-01-24T10:00:00.000Z"
  }
}
```

---

## 6. KPI 조회 API

Dashboard에서 저장된 KPI를 조회하는 API:

### 6.1 모든 KPI 조회

```bash
GET /api/kpi
```

### 6.2 특정 모듈의 KPI 조회

```bash
GET /api/kpi?module=Insights
```

### 6.3 특정 KPI 조회

```bash
GET /api/kpi?module=Insights&key=sentiment_score
```

---

## 7. 주의사항

### 7.1 Key 네이밍 규칙

- 소문자 + 언더스코어 사용 (snake_case)
- 모듈 내에서 고유해야 함
- 예: `sentiment_score`, `total_supporters`, `d_day`

### 7.2 만료 시간

- 기본: 60분 (1시간)
- 실시간 데이터: 5-15분 권장
- 분석 결과: 60-120분 권장
- 만료된 KPI는 조회되지 않음

### 7.3 변화율 (change)

- 양수: 증가 (예: `+3.2%`)
- 음수: 감소 (예: `-1.5%`)
- Dashboard에서 색상으로 표시 (녹색/빨간색)

### 7.4 업데이트 빈도

- 동일한 KPI를 너무 자주 업데이트하지 마세요
- 권장: 값이 변경될 때만 또는 5분 이상 간격
- 동일한 key로 업데이트하면 기존 값을 덮어씁니다

---

## 8. 테스트 방법

### 8.1 브라우저 콘솔 테스트

```javascript
// iframe 내부 콘솔에서
window.parent.postMessage({
  type: 'KPI_UPDATE',
  source: 'Insights',  // 모듈명 변경
  timestamp: Date.now(),
  payload: {
    key: 'test_kpi',
    value: 100,
    unit: '점',
    change: 5.5
  }
}, '*');
```

### 8.2 확인 방법

1. Dashboard 개발자 도구 콘솔에서 `[Dashboard] Received from ...` 로그 확인
2. API 직접 호출하여 저장 확인:
   ```bash
   curl https://campone-dashboard-xxx.run.app/api/kpi?module=Insights
   ```

---

## 9. FAQ

### Q: KPI가 표시되지 않아요

1. `key`가 올바른지 확인
2. 만료 시간이 지났는지 확인
3. `source`가 유효한 모듈명인지 확인

### Q: 값이 업데이트되지 않아요

- 동일한 `key`로 새 값을 전송하면 자동으로 업데이트됩니다
- Dashboard가 1분마다 갱신하므로 잠시 기다려주세요

### Q: 히스토리를 보고 싶어요

- 현재 KPI는 최신 값만 저장합니다
- 히스토리가 필요하면 Dashboard 팀에 문의하세요

---

## 10. 연락처

문의사항:
- Dashboard 프로젝트 담당자

참고 문서:
- [ACTIVITY_ALERT_INTEGRATION_GUIDE.md](./ACTIVITY_ALERT_INTEGRATION_GUIDE.md)

---

*문서 버전: 1.0*
*최종 수정: 2026-01-24*
