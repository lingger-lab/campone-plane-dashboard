# CivicHub → Dashboard 연동 구현 현황

> 작성일: 2026-01-24
> 모듈: Civic Hub (campone-civic-hub)
> 상태: 구현 완료, 테스트 대기

---

## 1. 개요

CivicHub에서 Dashboard로 전송하는 메시지 연동이 구현되었습니다.
- **활동 기록 (ACTIVITY)**: 관리자 작업 로그
- **알림 (ALERT)**: 중요 이벤트 알림
- **KPI (KPI_UPDATE)**: 지표 데이터 (구현 예정)

모든 메시지는 `postMessage`를 통해 iframe → parent(Dashboard)로 전송됩니다.

---

## 2. 메시지 공통 구조

```typescript
interface ModuleMessage {
  type: 'ACTIVITY' | 'ALERT' | 'KPI_UPDATE' | 'READY' | 'ERROR'
  source: 'Hub'  // CivicHub 고정
  timestamp: number  // Date.now()
  payload: object
}
```

---

## 3. 구현된 ACTIVITY 이벤트

### 3.1 질문 검수

| 이벤트 | action | target | details |
|--------|--------|--------|---------|
| 질문 승인 | `질문 검수 승인` | `질문 #abc123` | `{ questionId, qualityScore }` |
| 질문 반려 | `질문 검수 반려` | `질문 #abc123` | `{ questionId, reason }` |

**발생 시점**: `/admin` 페이지에서 승인/반려 버튼 클릭 시

### 3.2 문의 관리

| 이벤트 | action | target | details |
|--------|--------|--------|---------|
| 문의 답변 | `문의 답변` | `문의 #abc123` | `{ inquiryId, inquiryType }` |
| 상태 변경 | `문의 상태 변경` | `문의 #abc123` | `{ inquiryId, newStatus }` |

**발생 시점**: `/admin/inquiries` 페이지에서 처리 시작/해결 완료/종료 클릭 시

### 3.3 티켓 관리

| 이벤트 | action | target | details |
|--------|--------|--------|---------|
| 티켓 해결 | `티켓 해결` | `티켓 #abc123` | `{ ticketId, ticketType }` |

**발생 시점**: `/admin/tickets` 페이지에서 완료 처리 클릭 시

### 3.4 문서 관리

| 이벤트 | action | target | details |
|--------|--------|--------|---------|
| 문서 업로드 | `문서 업로드` | `문서제목.pdf` | `{ category }` |
| 문서 삭제 | `문서 삭제` | `문서제목.pdf` | - |

**발생 시점**: `/admin/documents` 페이지에서 업로드/삭제 시

---

## 4. 구현된 ALERT 이벤트 (함수 준비됨)

아래 함수들은 구현되어 있으나, 아직 호출 시점이 연결되지 않았습니다.
서버 사이드 이벤트는 서버-서버 API 연동이 필요합니다.

| 함수 | severity | 용도 |
|------|----------|------|
| `alertQualityGateFailed` | warning | 품질 검수 실패 시 |
| `alertUrgentTicket` | error | L1 긴급 티켓 발생 시 |
| `alertNewInquiry` | info | 중요 문의 접수 시 (취재/인터뷰 등) |

---

## 5. KPI 데이터 (구현 예정)

CivicHub에서 제공 가능한 KPI 목록:

| key | 설명 | unit |
|-----|------|------|
| `questions_today` | 오늘 질문 수 | 건 |
| `total_questions` | 누적 질문 수 | 건 |
| `pending_review` | 승인 대기 질문 | 건 |
| `quality_pass_rate` | 품질 통과율 | % |
| `pending_inquiries` | 대기 중 문의 | 건 |
| `total_inquiries` | 전체 문의 수 | 건 |
| `open_tickets` | 열린 티켓 | 건 |
| `active_documents` | 활성 문서 수 | 건 |

---

## 6. Dashboard 수신 구현 가이드

### 6.1 메시지 리스너 등록

```typescript
// Dashboard에서 구현 필요
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    const { type, source, timestamp, payload } = event.data || {}

    // CivicHub 메시지만 처리
    if (source !== 'Hub') return

    console.log(`[Dashboard] Received from Hub:`, event.data)

    switch (type) {
      case 'ACTIVITY':
        // 최근 활동 목록에 추가
        addActivity({
          module: 'Hub',
          action: payload.action,
          target: payload.target,
          details: payload.details,
          timestamp,
        })
        break

      case 'ALERT':
        // 알림 표시
        showAlert({
          module: 'Hub',
          severity: payload.severity,
          title: payload.title,
          message: payload.message,
          pinned: payload.pinned,
        })
        break

      case 'KPI_UPDATE':
        // KPI 캐시 업데이트
        updateKpiCache('Hub', payload.key, {
          value: payload.value,
          unit: payload.unit,
          change: payload.change,
        })
        break
    }
  }

  window.addEventListener('message', handleMessage)
  return () => window.removeEventListener('message', handleMessage)
}, [])
```

### 6.2 테스트 방법

Dashboard 콘솔에서:
```javascript
// 메시지 수신 확인용
window.addEventListener('message', (e) => {
  if (e.data?.source === 'Hub') {
    console.log('✅ Hub 메시지 수신:', e.data)
  }
})
```

그 후 CivicHub iframe에서 관리자 작업 수행하면 로그 확인 가능.

---

## 7. 실제 메시지 예시

### ACTIVITY 예시
```json
{
  "type": "ACTIVITY",
  "source": "Hub",
  "timestamp": 1706083200000,
  "payload": {
    "action": "문의 답변",
    "target": "문의 #a1b2c3",
    "details": {
      "inquiryId": "clxyz123a1b2c3",
      "inquiryType": "policy"
    }
  }
}
```

### ALERT 예시
```json
{
  "type": "ALERT",
  "source": "Hub",
  "timestamp": 1706083200000,
  "payload": {
    "severity": "warning",
    "title": "품질 검수 필요",
    "message": "질문 #a1b2c3이 품질 기준 미달입니다. (점수: 45.2%)",
    "expiresInMinutes": 60
  }
}
```

---

## 8. 파일 위치

- 연동 헬퍼: `src/lib/dashboard-bridge.ts`
- 관리자 페이지들: `src/app/admin/*/page.tsx`

---

## 9. 테스트 체크리스트

Dashboard 팀에서 확인 필요:

- [ ] ACTIVITY 메시지 수신 확인
- [ ] 최근 활동 목록에 Hub 활동 표시
- [ ] ALERT 메시지 수신 확인
- [ ] 알림 UI에 Hub 알림 표시
- [ ] KPI_UPDATE 메시지 수신 확인 (구현 후)
- [ ] KPI 카드에 Hub 지표 표시 (구현 후)

---

## 10. 문의

- CivicHub 담당: (담당자명)
- 연동 관련 이슈: GitHub Issues 또는 Slack

---

*문서 버전: 1.0*
*최종 수정: 2026-01-24*
