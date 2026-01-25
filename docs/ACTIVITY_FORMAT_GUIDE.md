# Dashboard 활동/알림 형식 가이드

> 작성일: 2026-01-24
> 대상: Insights, Policy, CivicHub 개발팀

---

## 1. 액션(action) 형식

### 배지 색상 매핑 표

| 배지 | 키워드 (포함되면 자동 매칭) | 예시 |
|------|---------------------------|------|
| 🔴 **실패** | `실패`, `fail`, `error`, `오류` | "분석 실패", "AI analysis fail" |
| 🔴 **반려** | `반려`, `거절`, `reject`, `거부` | "질문 반려", "승인 거절" |
| 🟢 **생성** | `생성`, `create`, `추가`, `등록`, `접수`, `신규`, `발생`, `업로드`, `upload` | "문의 접수", "티켓 발생" |
| 🔵 **수정** | `수정`, `update`, `변경`, `편집`, `갱신`, `답변`, `reply`, `response` | "상태 변경", "문의 답변" |
| 🔴 **삭제** | `삭제`, `delete`, `제거`, `취소` | "문서 삭제", "예약 취소" |
| ⚫ **발송** | `발송`, `send`, `전송`, `발행` | "메시지 발송", "보고서 발행" |
| 🟡 **완료** | `승인`, `approve`, `완료`, `처리` | "분석 완료", "질문 승인" |
| ⚪ **조회** | `조회`, `검색`, `read`, `다운로드`, `download` | "보고서 다운로드" |

### 매칭 우선순위

```
실패/반려 → 생성 → 수정 → 삭제 → 발송 → 완료 → 조회 → 기본(회색)
```

"분석 완료 실패" → "실패"가 먼저 매칭되어 🔴 실패로 표시

---

## 2. 모듈별 권장 액션

### Insights (여론분석)

| 이벤트 | action 값 | target 예시 |
|--------|-----------|------------|
| AI 분석 완료 | `분석 완료` | `여론 분석: 김철수 외 2명` |
| 분석 실패 | `분석 실패` | `여론 분석: 김철수 외 2명` |
| 보고서 생성 | `create` | `보고서: 1월 4주차 여론 리포트` |
| 보고서 다운로드 | `download` | `보고서: 1월 4주차 여론 리포트` |
| 데이터 갱신 | `갱신` | `트렌드 데이터` |

```typescript
// Insights 예시
await logActivity({
  action: "분석 완료",
  module: "Insights",
  target: "여론 분석: 김철수 외 2명",
  details: {
    analysisId: 85,
    targetCount: 3,
    duration: "5분 32초"
  },
  userName: "Insights System"
});
```

### Policy (전략 분석)

| 이벤트 | action 값 | target 예시 |
|--------|-----------|------------|
| ME 분석 완료 | `분석 완료` | `ME 분석: 홍길동 프로필` |
| FIELD 분석 완료 | `분석 완료` | `FIELD 분석: 서울 강남구` |
| PLAN 분석 완료 | `분석 완료` | `PLAN 분석: 청년 정책` |
| DO 분석 완료 | `분석 완료` | `DO 분석: 전체 전략` |
| 분석 실패 | `분석 실패` | `ME 분석: 홍길동 프로필` |
| 프로필 저장 | `update` | `후보 프로필: 홍길동` |
| PDF 업로드 | `업로드` | `공약집: 청년정책.pdf` |

```typescript
// Policy 예시
await logActivity({
  action: "분석 완료",
  module: "Policy",
  target: "ME 분석: 홍길동 프로필",
  details: {
    stage: "ME",
    profileId: "profile_123"
  },
  userName: "Policy System"
});
```

### CivicHub (시민 소통)

| 이벤트 | action 값 | target 예시 |
|--------|-----------|------------|
| 문의 접수 | `접수` | `문의: 취재/인터뷰 요청` |
| 문의 답변 | `답변` | `문의: 취재/인터뷰 요청` |
| 상태 변경 | `변경` | `문의: 취재/인터뷰 요청` |
| 질문 승인 | `승인` | `질문: 청년 일자리 정책은?` |
| 질문 반려 | `반려` | `질문: 스팸 질문` |
| 티켓 발생 | `발생` | `티켓: 로그인 오류` |
| 티켓 완료 | `완료` | `티켓: 로그인 오류` |
| 문서 업로드 | `업로드` | `FAQ: 선거 일정 안내` |
| 품질 검수 실패 | `실패` | `질문: 품질 미달` |

```typescript
// CivicHub 예시
await logActivity({
  action: "접수",
  module: "Hub",
  target: "문의: 취재/인터뷰 요청",
  details: {
    inquiryId: "inq_abc123",
    type: "취재/인터뷰",
    priority: "high"
  },
  userName: "김관리"
});
```

---

## 3. 대상(target) 형식

### 기본 규칙

```
❌ 잘못된 예시:
- "문의 #ykd07m 취재/인터뷰 요청이(가) 접수되었습니다."
- "분석 작업 ID:85가 완료됨"
- "ticket_abc123 상태 변경"

✅ 올바른 예시:
- "문의: 취재/인터뷰 요청"
- "여론 분석: 김철수 외 2명"
- "티켓: 로그인 오류 문의"
```

### 권장 형식

```
{카테고리}: {간단한 설명}
```

| 카테고리 | 예시 |
|---------|------|
| 문의 | `문의: 취재/인터뷰 요청` |
| 질문 | `질문: 청년 일자리 정책은?` |
| 티켓 | `티켓: 로그인 오류` |
| 보고서 | `보고서: 1월 4주차 여론 리포트` |
| 여론 분석 | `여론 분석: 김철수 외 2명` |
| ME 분석 | `ME 분석: 홍길동 프로필` |
| FIELD 분석 | `FIELD 분석: 서울 강남구` |
| FAQ | `FAQ: 선거 일정 안내` |

### ID는 details에

```typescript
{
  action: "접수",
  module: "Hub",
  target: "문의: 취재/인터뷰 요청",  // 깔끔한 텍스트
  details: {                          // ID, 코드는 여기에
    inquiryId: "inq_abc123",
    status: "pending",
    type: "media"
  }
}
```

---

## 4. API 엔드포인트

### 활동 기록

```
POST https://campone-dashboard-755458598444.asia-northeast3.run.app/api/activities

Headers:
  Content-Type: application/json
  X-Service-Key: {API_KEY}

Body:
{
  "action": "분석 완료",
  "module": "Insights",
  "target": "여론 분석: 김철수 외 2명",
  "details": { ... },
  "userName": "Insights System"
}
```

### 알림 생성

```
POST https://campone-dashboard-755458598444.asia-northeast3.run.app/api/alerts

Body:
{
  "severity": "success",  // info, warning, error, success
  "title": "AI 분석 완료",
  "message": "김철수 외 2명에 대한 분석이 완료되었습니다.",
  "source": "Insights",
  "pinned": false
}
```

### KPI 전송

```
POST https://campone-dashboard-755458598444.asia-northeast3.run.app/api/kpi

Body:
{
  "module": "Insights",
  "key": "recognition_score",
  "value": 3.8,
  "unit": "점"
}
```

---

## 5. 테스트 (curl)

```bash
# 활동 기록 테스트
curl -X POST https://campone-dashboard-755458598444.asia-northeast3.run.app/api/activities \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: YOUR_API_KEY" \
  -d '{
    "action": "분석 완료",
    "module": "Insights",
    "target": "여론 분석: 테스트",
    "userName": "Test System"
  }'
```

---

*문서 버전: 1.0*
*최종 수정: 2026-01-24*
