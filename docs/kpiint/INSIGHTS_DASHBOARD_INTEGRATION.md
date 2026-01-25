# Insights 모듈 - Dashboard 연동 구현 상세

> 작성일: 2026-01-24
> 대상: Dashboard 개발팀
> 모듈: Insights (여론분석)

---

## 1. 개요

Insights 모듈은 Dashboard와 `postMessage` API를 통해 통신합니다. 모든 메시지는 `frontend/src/lib/dashboard-bridge.ts`에서 처리됩니다.

### 1.1 메시지 구조

```typescript
interface ModuleMessage {
  type: 'ACTIVITY' | 'ALERT' | 'KPI_UPDATE' | 'READY' | 'ERROR';
  source: 'Insights';
  timestamp: number;  // Date.now()
  payload: object;
}
```

### 1.2 핵심 파일

| 파일 | 역할 |
|------|------|
| `frontend/src/lib/dashboard-bridge.ts` | 모든 Dashboard 통신 함수 |
| `frontend/src/hooks/useAnalysis.ts` | 분석 이벤트 발생 시 호출 |
| `frontend/src/app/analysis/page.tsx` | PDF 다운로드 이벤트 |
| `frontend/src/app/providers.tsx` | READY 알림 |

---

## 2. 활동(ACTIVITY) 이벤트

### 2.1 전송되는 이벤트 목록

| 이벤트 | 발생 시점 | action | target | details |
|--------|----------|--------|--------|---------|
| 분석 시작 | 사용자가 "AI 분석 시작" 클릭 | `'분석 시작'` | 후보자 이름들 (콤마 구분) | `{ analysisId, candidateCount, dataSourceCount }` |
| 분석 완료 | 분석 파이프라인 완료 | `'분석 완료'` | 후보자 이름들 (콤마 구분) | `{ analysisId }` |
| 분석 취소 | 사용자가 "중단" 클릭 | `'분석 취소'` | - | `{ analysisId }` |
| 보고서 다운로드 | DOCX/PDF 다운로드 | `'보고서 다운로드'` | `'DOCX'` 또는 `'PDF'` | `{ analysisId, format }` |

### 2.2 코드 위치

```typescript
// frontend/src/hooks/useAnalysis.ts

// 분석 시작 시 (startMutation.onSuccess)
logAnalysisStart(
  data.analysis_id,
  variables.candidate_ids.map(id => `후보 #${id}`),
  dataSourceCount
);

// 분석 완료 시 (polling에서 status === 'completed')
const candidateNames = result.result?.candidates?.map(c => c.name) || [];
logAnalysisComplete(analysisId, candidateNames);

// 분석 취소 시 (cancelAnalysis)
logAnalysisCancel(targetId);

// DOCX 자동 다운로드 시 (triggerAutoDownload)
logReportDownload(analysisId, 'docx');
```

```typescript
// frontend/src/app/analysis/page.tsx

// PDF 수동 다운로드 시 (handleDownloadPdf)
logReportDownload(analysisId, 'pdf');
```

### 2.3 payload 예시

```json
// 분석 시작
{
  "type": "ACTIVITY",
  "source": "Insights",
  "timestamp": 1769239450169,
  "payload": {
    "action": "분석 시작",
    "target": "김철수, 이영희, 박민수",
    "details": {
      "analysisId": 85,
      "candidateCount": 3,
      "dataSourceCount": 6
    }
  }
}

// 분석 완료
{
  "type": "ACTIVITY",
  "source": "Insights",
  "timestamp": 1769239850000,
  "payload": {
    "action": "분석 완료",
    "target": "김철수, 이영희, 박민수",
    "details": {
      "analysisId": 85
    }
  }
}

// 보고서 다운로드
{
  "type": "ACTIVITY",
  "source": "Insights",
  "timestamp": 1769239900000,
  "payload": {
    "action": "보고서 다운로드",
    "target": "DOCX",
    "details": {
      "analysisId": 85,
      "format": "docx"
    }
  }
}
```

---

## 3. 알림(ALERT) 이벤트

### 3.1 전송되는 알림 목록

| 알림 | severity | title | 발생 시점 | pinned |
|------|----------|-------|----------|--------|
| 분석 오류 | `error` | `'분석 오류'` | API 호출 실패 또는 분석 실패 | `false` |

### 3.2 코드 위치

```typescript
// frontend/src/hooks/useAnalysis.ts

// 분석 시작 실패 시 (startMutation.onError)
alertAnalysisError(errorMsg);

// 분석 중 실패 시 (polling에서 status === 'failed')
alertAnalysisError(errorMsg, analysisId);

// 분석 결과 조회 실패 시
alertAnalysisError('분석 결과를 가져오는 데 실패했습니다.', analysisId);
```

### 3.3 payload 예시

```json
{
  "type": "ALERT",
  "source": "Insights",
  "timestamp": 1769239458994,
  "payload": {
    "severity": "error",
    "title": "분석 오류",
    "message": "Claude API 호출 실패: Rate limit exceeded",
    "pinned": false
  }
}
```

### 3.4 추가 알림 함수 (미사용, 향후 확장용)

Dashboard-bridge에 다음 함수들이 정의되어 있으나, 현재는 사용되지 않습니다:

```typescript
// 부정 여론 감지 (threshold 초과 시 사용 가능)
alertNegativeSentiment(candidateName, percentage, details?);

// 여론 급증/급감 감지
alertTrendSpike(candidateName, changePercent, keyword?);

// 리스크 감지
alertRiskDetected(candidateName, riskTitle, riskLevel);
```

---

## 4. KPI 업데이트

### 4.1 전송되는 KPI 목록

분석 완료 시 `sendAnalysisKpis(result)`가 호출되어 다음 KPI들이 전송됩니다:

| key | 설명 | unit | 계산 방식 | 만료 |
|-----|------|------|----------|------|
| `recognition_score` | 평균 인지도 | `점` | 전체 후보자 인지도 평균 (0-5) | 2시간 |
| `support_score` | 평균 지지도 | `점` | 전체 후보자 지지도 평균 (0-5) | 2시간 |
| `positive_ratio` | 긍정 비율 | `%` | (긍정 수 / 전체 분석 수) × 100 | 2시간 |
| `negative_ratio` | 부정 비율 | `%` | (부정 수 / 전체 분석 수) × 100 | 2시간 |
| `mention_count` | 총 멘션 수 | `건` | 전체 분석된 데이터 수 | 2시간 |
| `sentiment_score` | 감성 점수 | `%` | 긍정 비율과 동일 | 2시간 |
| `total_risks` | 총 리스크 | `건` | 모든 후보자의 리스크 수 합계 | 2시간 |
| `high_risks` | 고위험 리스크 | `건` | severity가 high/critical인 리스크 수 | 2시간 |
| `top_issues_count` | 주요 이슈 수 | `개` | top_issues 배열 길이 | 2시간 |
| `emerging_issues` | 신규 이슈 수 | `개` | emerging_issues 배열 길이 | 2시간 |
| `analyzed_regions` | 분석 지역 수 | `개` | regional_analysis 배열 길이 | 2시간 |
| `analysis_progress` | 분석 진행률 | `%` | 완료 시 항상 100 | 1시간 |

### 4.2 코드 위치

```typescript
// frontend/src/hooks/useAnalysis.ts

// 분석 완료 시 (polling에서 status === 'completed')
sendAnalysisKpis(result);
```

### 4.3 KPI 계산 로직

```typescript
// frontend/src/lib/dashboard-bridge.ts

export function sendAnalysisKpis(result: AnalysisResult) {
  const candidates = result.result.candidates;
  const expiresInMinutes = 120;

  // 1. 인지도 평균
  const recognitionScores = candidates
    .map(c => c.data.recognition?.recognition_score)
    .filter((s): s is number => typeof s === 'number');

  if (recognitionScores.length > 0) {
    const avg = recognitionScores.reduce((a, b) => a + b, 0) / recognitionScores.length;
    sendScoreKpi('recognition_score', avg, { expiresInMinutes });
  }

  // 2. 지지도 평균
  const supportScores = candidates
    .map(c => c.data.support?.support_score)
    .filter((s): s is number => typeof s === 'number');

  if (supportScores.length > 0) {
    const avg = supportScores.reduce((a, b) => a + b, 0) / supportScores.length;
    sendScoreKpi('support_score', avg, { expiresInMinutes });
  }

  // 3. 감성 분석 집계
  let totalPositive = 0, totalNegative = 0, totalAnalyzed = 0;
  candidates.forEach(c => {
    const sentiment = c.data.sentiment?.summary;
    if (sentiment) {
      totalPositive += sentiment.positive_count || 0;
      totalNegative += sentiment.negative_count || 0;
      totalAnalyzed += sentiment.total_analyzed || 0;
    }
  });

  if (totalAnalyzed > 0) {
    sendPercentKpi('positive_ratio', (totalPositive / totalAnalyzed) * 100, { expiresInMinutes });
    sendPercentKpi('negative_ratio', (totalNegative / totalAnalyzed) * 100, { expiresInMinutes });
    sendCountKpi('mention_count', totalAnalyzed, '건', { expiresInMinutes });
  }

  // ... (리스크, 이슈, 지역 등)
}
```

### 4.4 payload 예시

```json
{
  "type": "KPI_UPDATE",
  "source": "Insights",
  "timestamp": 1769239850000,
  "payload": {
    "key": "recognition_score",
    "value": 3.8,
    "unit": "점",
    "expiresInMinutes": 120
  }
}

{
  "type": "KPI_UPDATE",
  "source": "Insights",
  "timestamp": 1769239850010,
  "payload": {
    "key": "positive_ratio",
    "value": 65.4,
    "unit": "%",
    "expiresInMinutes": 120
  }
}

{
  "type": "KPI_UPDATE",
  "source": "Insights",
  "timestamp": 1769239850020,
  "payload": {
    "key": "mention_count",
    "value": 1520,
    "unit": "건",
    "expiresInMinutes": 120
  }
}
```

---

## 5. READY 알림

### 5.1 발생 시점

모듈이 완전히 로드된 후 500ms 지연 후 전송됩니다.

### 5.2 코드 위치

```typescript
// frontend/src/app/providers.tsx

function DashboardReadyNotifier({ children }: { children: React.ReactNode }) {
  const hasNotified = useRef(false);

  useEffect(() => {
    if (!hasNotified.current) {
      hasNotified.current = true;
      const timer = setTimeout(() => {
        notifyReady('1.0.0');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  return <>{children}</>;
}
```

### 5.3 payload 예시

```json
{
  "type": "READY",
  "source": "Insights",
  "timestamp": 1769239450169,
  "payload": {
    "version": "1.0.0"
  }
}
```

---

## 6. ERROR 알림

### 6.1 발생 시점

`alertAnalysisError()` 호출 시 ALERT와 함께 ERROR도 전송됩니다.

### 6.2 payload 예시

```json
{
  "type": "ERROR",
  "source": "Insights",
  "timestamp": 1769239458994,
  "payload": {
    "error": "Claude API 호출 실패: Rate limit exceeded",
    "context": {
      "analysisId": 85
    }
  }
}
```

---

## 7. iframe 환경 감지

모든 메시지 전송 전에 iframe 환경인지 확인합니다:

```typescript
// frontend/src/lib/dashboard-bridge.ts

export function sendToDashboard(type: ModuleMessageType, payload: object): void {
  // iframe 내부인지 확인
  if (typeof window === 'undefined' || window.parent === window) {
    // iframe 외부에서는 로그만 출력
    console.log(`[Insights] Not in iframe context, skipping postMessage`);
    return;
  }

  const message: ModuleMessage = {
    type,
    source: 'Insights',
    timestamp: Date.now(),
    payload,
  };

  window.parent.postMessage(message, '*');
  console.log(`[Insights] Sent to Dashboard:`, message);
}
```

---

## 8. 이벤트 타임라인 예시

사용자가 분석을 시작하고 완료하는 전체 플로우:

```
1. [READY] 모듈 로드 완료
   └─ version: "1.0.0"

2. [ACTIVITY] 분석 시작
   └─ action: "분석 시작"
   └─ target: "김철수, 이영희"
   └─ details: { analysisId: 85, candidateCount: 2, dataSourceCount: 6 }

3. (5-7분 후)

4. [ACTIVITY] 분석 완료
   └─ action: "분석 완료"
   └─ target: "김철수, 이영희"
   └─ details: { analysisId: 85 }

5. [KPI_UPDATE] × 12개 (인지도, 지지도, 감성, 리스크 등)

6. [ACTIVITY] 보고서 다운로드 (자동)
   └─ action: "보고서 다운로드"
   └─ target: "DOCX"
   └─ details: { analysisId: 85, format: "docx" }
```

---

## 9. Dashboard 측 처리 권장사항

### 9.1 활동 표시

- `action`을 메인 텍스트로 표시
- `target`이 있으면 서브텍스트로 표시
- `timestamp`로 "n분 전" 형식 표시

### 9.2 KPI 표시

- `key`로 어떤 지표인지 식별
- `unit`에 따라 포맷팅 (%, 점, 건, 개)
- `expiresInMinutes` 경과 후 표시하지 않거나 "만료됨" 표시

### 9.3 알림 표시

- `severity`에 따라 색상 구분 (error: 빨강, warning: 주황, info: 파랑)
- `pinned: true`인 경우 사용자가 닫기 전까지 유지

---

## 10. 문의

구현 관련 문의사항은 Insights 모듈 담당자에게 연락해주세요.

---

*문서 버전: 1.0*
*최종 수정: 2026-01-24*
