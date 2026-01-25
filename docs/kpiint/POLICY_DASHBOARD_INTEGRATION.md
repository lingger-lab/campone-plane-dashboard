# Policy 모듈 - Dashboard 연동 명세서

> 작성일: 2026-01-24
> 대상: Dashboard 개발팀
> 버전: 1.0

---

## 1. 개요

Policy 모듈(전략 분석)에서 Dashboard로 전송하는 데이터 명세입니다.
iframe postMessage를 통해 **활동 기록**, **알림**, **KPI** 세 가지 유형의 데이터를 전송합니다.

### 1.1 모듈 정보

| 항목 | 값 |
|------|-----|
| 모듈명 | `Policy` |
| 주요 기능 | ME-FIELD-PLAN-DO 4단계 전략 분석 |
| 구현 파일 | `src/lib/dashboard-bridge.ts` |

### 1.2 메시지 공통 구조

```typescript
interface ModuleMessage {
  type: "ACTIVITY" | "ALERT" | "KPI_UPDATE";
  source: "Policy";           // 항상 "Policy"
  timestamp: number;          // Date.now()
  payload: object;            // 타입별 상이
}
```

---

## 2. 활동 기록 (ACTIVITY)

사용자의 주요 활동을 Dashboard 최근활동 목록에 표시합니다.

### 2.1 메시지 구조

```typescript
{
  type: "ACTIVITY",
  source: "Policy",
  timestamp: number,
  payload: {
    action: string;           // 활동 내용 (필수)
    target?: string;          // 대상
    details?: object;         // 추가 정보
  }
}
```

### 2.2 전송 이벤트 목록

| 이벤트 | action | target | details | 전송 시점 |
|--------|--------|--------|---------|----------|
| 프로필 저장 | `"프로필 저장"` | `"후보자 프로필"` | - | 프로필 저장 완료 시 |
| 여론분석 PDF 업로드 | `"여론분석 PDF 업로드"` | - | `{ fileName }` | PDF 업로드 완료 시 |
| 정책 PDF 업로드 | `"정책 PDF 업로드"` | - | `{ fileName }` | PDF 업로드 완료 시 |
| ME 분석 완료 | `"ME 분석 완료"` | `"SWOT/포지셔닝"` | - | ME 분석 완료 시 |
| FIELD 분석 완료 | `"FIELD 분석 완료"` | `"선거구/경쟁자 분석"` | - | FIELD 분석 완료 시 |
| PLAN 분석 완료 | `"PLAN 분석 완료"` | `"승리공식/메시지 전략"` | - | PLAN 분석 완료 시 |
| DO 분석 완료 | `"DO 분석 완료"` | `"세그먼트 공략"` | - | DO 분석 완료 시 |
| 보고서 다운로드 | `"전략 보고서 다운로드"` | - | `{ format: "DOCX" \| "PDF" }` | 보고서 다운로드 시 |

### 2.3 예시 메시지

```json
{
  "type": "ACTIVITY",
  "source": "Policy",
  "timestamp": 1706083200000,
  "payload": {
    "action": "ME 분석 완료",
    "target": "SWOT/포지셔닝"
  }
}
```

### 2.4 연동 컴포넌트

| 컴포넌트 | 파일 경로 | 호출 함수 |
|---------|----------|----------|
| ProfileForm | `src/components/strategy/ProfileForm.tsx` | `logProfileSaved()` |
| PollReportUpload | `src/components/strategy/PollReportUpload.tsx` | `logPdfUploaded("poll")` |
| PolicyReportUpload | `src/components/strategy/PolicyReportUpload.tsx` | `logPdfUploaded("policy")` |
| ReportGenerator | `src/components/strategy/ReportGenerator.tsx` | `logReportDownloaded()` |
| me-client | `src/app/(dashboard)/strategy/me/me-client.tsx` | `logAnalysisCompleted("ME")` |
| field-client | `src/app/(dashboard)/strategy/field/field-client.tsx` | `logAnalysisCompleted("FIELD")` |
| plan-client | `src/app/(dashboard)/strategy/plan/plan-client.tsx` | `logAnalysisCompleted("PLAN")` |
| do-client | `src/app/(dashboard)/strategy/do/do-client.tsx` | `logAnalysisCompleted("DO")` |

---

## 3. 알림 (ALERT)

중요한 이벤트(성공/실패)를 Dashboard 알림 센터에 표시합니다.

### 3.1 메시지 구조

```typescript
{
  type: "ALERT",
  source: "Policy",
  timestamp: number,
  payload: {
    severity: "info" | "warning" | "error" | "success";
    title: string;
    message: string;
    pinned?: boolean;
    expiresInMinutes?: number;
  }
}
```

### 3.2 전송 이벤트 목록

| 이벤트 | severity | title | message | 전송 시점 |
|--------|----------|-------|---------|----------|
| 전체 분석 완료 | `success` | `"전략 분석 완료"` | `"ME-FIELD-PLAN-DO 4단계 분석이 완료되었습니다."` | 4단계 모두 완료 시 |
| ME 분석 실패 | `error` | `"분석 실패"` | `"{에러 메시지}"` | ME 분석 실패 시 |
| FIELD 분석 실패 | `error` | `"분석 실패"` | `"{에러 메시지}"` | FIELD 분석 실패 시 |
| PLAN 분석 실패 | `error` | `"분석 실패"` | `"{에러 메시지}"` | PLAN 분석 실패 시 |
| DO 분석 실패 | `error` | `"분석 실패"` | `"{에러 메시지}"` | DO 분석 실패 시 |

### 3.3 예시 메시지

```json
{
  "type": "ALERT",
  "source": "Policy",
  "timestamp": 1706083200000,
  "payload": {
    "severity": "error",
    "title": "분석 실패",
    "message": "ME 분석 중 프로필 데이터를 찾을 수 없습니다."
  }
}
```

### 3.4 연동 컴포넌트

| 컴포넌트 | 파일 경로 | 호출 함수 |
|---------|----------|----------|
| me-client | `src/app/(dashboard)/strategy/me/me-client.tsx` | `notifyAnalysisFailed("ME")` |
| field-client | `src/app/(dashboard)/strategy/field/field-client.tsx` | `notifyAnalysisFailed("FIELD")` |
| plan-client | `src/app/(dashboard)/strategy/plan/plan-client.tsx` | `notifyAnalysisFailed("PLAN")` |
| do-client | `src/app/(dashboard)/strategy/do/do-client.tsx` | `notifyAnalysisFailed("DO")` |

---

## 4. KPI (KPI_UPDATE)

대시보드 KPI 카드에 표시할 지표를 전송합니다.

### 4.1 메시지 구조

```typescript
{
  type: "KPI_UPDATE",
  source: "Policy",
  timestamp: number,
  payload: {
    key: string;              // KPI 식별자
    value: number | string;   // 값
    unit?: string;            // 단위
    change?: number;          // 변화율
    expiresInMinutes?: number; // 만료 시간 (기본 60분)
  }
}
```

### 4.2 구현된 KPI 목록

| key | 설명 | unit | 값 범위 | 전송 시점 |
|-----|------|------|---------|----------|
| `analysis_progress` | 분석 진행률 | `%` | `0` ~ `100` | 각 단계 완료 시 |
| `completed_phases` | 완료 단계 수 | `단계` | `0` ~ `4` | 각 단계 완료 시 |

### 4.3 값 계산 로직

| 완료 단계 | analysis_progress | completed_phases |
|----------|-------------------|------------------|
| ME | 25% | 1 |
| FIELD | 50% | 2 |
| PLAN | 75% | 3 |
| DO | 100% | 4 |

### 4.4 예시 메시지

```json
{
  "type": "KPI_UPDATE",
  "source": "Policy",
  "timestamp": 1706083200000,
  "payload": {
    "key": "analysis_progress",
    "value": 75,
    "unit": "%",
    "expiresInMinutes": 120
  }
}
```

### 4.5 연동 컴포넌트

| 컴포넌트 | 파일 경로 | 호출 함수 |
|---------|----------|----------|
| me-client | `src/app/(dashboard)/strategy/me/me-client.tsx` | `updateAnalysisKpi("ME")` |
| field-client | `src/app/(dashboard)/strategy/field/field-client.tsx` | `updateAnalysisKpi("FIELD")` |
| plan-client | `src/app/(dashboard)/strategy/plan/plan-client.tsx` | `updateAnalysisKpi("PLAN")` |
| do-client | `src/app/(dashboard)/strategy/do/do-client.tsx` | `updateAnalysisKpi("DO")` |

### 4.6 추가 가능 KPI (미구현)

Dashboard 요청 시 추가 구현 가능한 KPI:

| key | 설명 | unit | 구현 난이도 |
|-----|------|------|------------|
| `profile_completion` | 프로필 완성도 | `%` | 중 |
| `poll_reports_count` | 여론조사 보고서 수 | `건` | 하 |
| `policy_reports_count` | 정책 보고서 수 | `건` | 하 |
| `strategy_version` | 전략 버전 | `회차` | 하 |
| `strategy_score` | 전략 종합 점수 | `점` | 높음 (보류) |

---

## 5. 구현 코드 요약

### 5.1 핵심 함수

```typescript
// src/lib/dashboard-bridge.ts

// 공통 전송 함수
sendToDashboard(type, payload)

// 활동 기록
logActivity(action, target?, details?)
logProfileSaved()
logPdfUploaded(type, fileName?)
logAnalysisCompleted(phase)
logReportDownloaded(format)

// 알림
sendAlert(severity, title, message, options?)
notifyAnalysisFailed(phase, errorMessage?)

// KPI
sendKpiUpdate(payload)
updateAnalysisKpi(phase)
```

### 5.2 사용 예시

```typescript
import {
  logAnalysisCompleted,
  notifyAnalysisFailed,
  updateAnalysisKpi
} from "@/lib/dashboard-bridge";

// 분석 성공 시
const handleSuccess = () => {
  logAnalysisCompleted("ME");    // 활동 기록
  updateAnalysisKpi("ME");       // KPI 업데이트
};

// 분석 실패 시
const handleError = (error: Error) => {
  notifyAnalysisFailed("ME", error.message);  // 알림
};
```

---

## 6. 테스트 방법

### 6.1 로컬 테스트 페이지

```bash
npm run dev
# 브라우저에서 http://localhost:3000/test-receiver.html 접속
```

테스트 페이지에서 iframe 내 Policy 모듈의 모든 postMessage를 수신하여 표시합니다.

### 6.2 확인 항목

| 항목 | 확인 내용 |
|------|----------|
| `source` | 항상 `"Policy"` |
| `type` | `"ACTIVITY"`, `"ALERT"`, `"KPI_UPDATE"` 중 하나 |
| `timestamp` | 유효한 Unix timestamp |
| `payload` | 각 타입에 맞는 구조 |

---

## 7. 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2026-01-24 | 최초 작성 - Activity, Alert, KPI 연동 |

---

*문서 버전: 1.0*
*최종 수정: 2026-01-24*
