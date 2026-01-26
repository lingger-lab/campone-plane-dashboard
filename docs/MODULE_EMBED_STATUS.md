# CampOne Dashboard - 모듈 임베드 현황

> 최종 업데이트: 2026-01-26

---

## 1. 모듈별 연동 현황

| 모듈 | 코드 | URL | 상태 | 비고 |
|------|------|-----|------|------|
| Insights | M1 | `https://campone-v2-frontend-755458598444.asia-northeast3.run.app` | ✅ 운영 중 | 여론 분석 |
| Studio | M2 | `https://campone-studio-web-755458598444.asia-northeast3.run.app` | 🔧 준비 완료 | 콘텐츠 제작 |
| Policy Lab | M3 | `https://campone-policy-755458598444.asia-northeast3.run.app` | ✅ 운영 중 | 정책/전략 분석 |
| Ops | M4 | `https://campone-ops-755458598444.asia-northeast3.run.app` | 🔧 준비 완료 | 캠프 운영 |
| Civic Hub | M5 | `https://campone-civic-hub-755458598444.asia-northeast3.run.app` | ✅ 운영 중 | 시민 소통 |

---

## 2. Dashboard 연동 정보 (모듈 팀에 전달)

### 2.1 기본 정보

| 항목 | 값 |
|------|-----|
| Dashboard URL | `https://campone-dashboard-755458598444.asia-northeast3.run.app` |
| GCP Project ID | `campone-v1-0` |
| Region | `asia-northeast3` (서울) |

### 2.2 인증 (JWT)

| 항목 | 값 |
|------|-----|
| JWT Secret | `campone-embed-secret-change-in-production` |
| Secret Manager | `embed-jwt-secret` |
| 토큰 만료 | 60분 (Dashboard에서 50분마다 갱신) |

### 2.3 API Key (서버-서버 통신용)

| 항목 | 값 |
|------|-----|
| API Key | `151ebde2377f280365b4c54cf7b37ca5b2eed5773489d049486e6342e49ce930` |
| Header | `X-API-Key` |
| Secret Manager | `dashboard-api-key` |

---

## 3. 모듈 임베드 URL 형식

### 3.1 기본 형식 (Policy, Hub, Ops)

```
{MODULE_URL}/embed?token={JWT_TOKEN}&theme={light|dark}
```

### 3.2 Studio 형식 (예외)

```
{STUDIO_URL}?embed=true&token={JWT_TOKEN}&theme={light|dark}
```

---

## 4. 모듈 측 필수 설정

### 4.1 CORS 허용 Origin

```
https://campone-dashboard-755458598444.asia-northeast3.run.app
```

로컬 개발 시:
```
http://localhost:3000
```

### 4.2 JWT 검증

```typescript
import jwt from 'jsonwebtoken';

const EMBED_JWT_SECRET = 'campone-embed-secret-change-in-production';

function verifyEmbedToken(token: string) {
  try {
    return jwt.verify(token, EMBED_JWT_SECRET);
  } catch {
    return null;
  }
}
```

### 4.3 테마 적용

URL 쿼리에서 `theme` 파라미터 확인:
- `light`: 라이트 모드
- `dark`: 다크 모드

---

## 5. Dashboard로 데이터 전송

### 5.1 postMessage 프로토콜

```typescript
// 활동 기록
window.parent.postMessage({
  type: 'ACTIVITY',
  source: 'Studio',  // 모듈명
  timestamp: Date.now(),
  payload: {
    action: '콘텐츠 발행',
    target: '카드뉴스 #15',
  }
}, '*');

// KPI 업데이트
window.parent.postMessage({
  type: 'KPI_UPDATE',
  source: 'Studio',
  timestamp: Date.now(),
  payload: {
    key: 'published_content',
    value: 45,
    unit: '건',
    change: 3,
  }
}, '*');

// 알림 생성
window.parent.postMessage({
  type: 'ALERT',
  source: 'Studio',
  timestamp: Date.now(),
  payload: {
    severity: 'success',
    title: '콘텐츠 발행 완료',
    message: '카드뉴스가 모든 채널에 발행되었습니다.',
  }
}, '*');
```

### 5.2 메시지 타입

| Type | 용도 | 페이로드 |
|------|------|----------|
| `ACTIVITY` | 활동 기록 | `{ action, target?, details? }` |
| `ALERT` | 알림 생성 | `{ severity, title, message, pinned? }` |
| `KPI_UPDATE` | KPI 데이터 | `{ key, value, unit?, change? }` |
| `READY` | 로드 완료 | `{ version? }` |
| `ERROR` | 에러 보고 | `{ code, message, stack? }` |

---

## 6. 권장 KPI (모듈별)

### Insights (M1)
| Key | 설명 | 단위 |
|-----|------|------|
| `support_score` | 지지도 점수 | 점 |
| `positive_ratio` | 긍정 여론 비율 | % |
| `mention_count` | 멘션 수 | 건 |

### Studio (M2)
| Key | 설명 | 단위 |
|-----|------|------|
| `published_content` | 발행 콘텐츠 수 | 건 |
| `scheduled_content` | 예약 콘텐츠 수 | 건 |
| `total_views` | 총 조회수 | 회 |

### Policy (M3)
| Key | 설명 | 단위 |
|-----|------|------|
| `overallProgress` | 분석 진행률 | % |
| `competitorCount` | 경쟁자 수 | 명 |

### Ops (M4)
| Key | 설명 | 단위 |
|-----|------|------|
| `tasks_completed` | 완료 태스크 | 건 |
| `checklist_progress` | 체크리스트 진행률 | % |
| `d_day` | D-Day | 일 |

### Civic Hub (M5)
| Key | 설명 | 단위 |
|-----|------|------|
| `total_questions` | 시민 질문 수 | 건 |
| `pending_review` | 검수 대기 | 건 |
| `quality_pass_rate` | 품질 통과율 | % |

---

## 7. Cloud SQL 연결 정보

| 항목 | 값 |
|------|-----|
| 연결명 | `campone-v1-0:asia-northeast3:campone` |
| 인스턴스 | `campone` |
| 엔진 | PostgreSQL 18 |

Studio 전용 DB:
- Database: `campone_studio`
- Secret: `DATABASE_URL_STUDIO`

---

## 8. 참고 문서

- [MODULE_INTEGRATION_GUIDE.md](./MODULE_INTEGRATION_GUIDE.md) - 상세 연동 가이드
- [KPI_INTEGRATION_GUIDE.md](./KPI_INTEGRATION_GUIDE.md) - KPI 전송 가이드
- [ACTIVITY_ALERT_INTEGRATION_GUIDE.md](./ACTIVITY_ALERT_INTEGRATION_GUIDE.md) - 활동/알림 가이드

---

*문서 버전: 1.0*
*최종 수정: 2026-01-26*
