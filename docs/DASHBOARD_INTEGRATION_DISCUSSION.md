# Dashboard 통합 구현 논의 정리

> 작성일: 2026-01-23
> 주제: 대시보드 모듈 임베드 및 실제 데이터 연동 방안

---

## 1. 현재 아키텍처 현황

### 1.1 서비스 구성 (Polyrepo 마이크로서비스)

| 서비스 | Cloud Run URL | 데이터베이스 |
|--------|---------------|-------------|
| Dashboard (본 프로젝트) | campone-dashboard-xxx | campone_dashboard |
| Insights Frontend (v2-frontend) | campone-v2-frontend-2qbgm2n2oq-du.a.run.app | - |
| Insights Backend (v2-backend) | campone-v2-backend-xxx | campone_insights |
| Civic Hub | campone-civic-hub-2qbgm2n2oq-du.a.run.app | campone_civic_hub |
| Policy Lab | campone-policy-2qbgm2n2oq-du.a.run.app | campone_policy |

### 1.2 데이터베이스 현황 (Cloud SQL 동일 인스턴스)

| DB | 실제 데이터 | 주요 테이블 |
|----|------------|-------------|
| **campone_insights** | O (풍부함) | collected_items (2,517건), daily_metrics (962건), analysis_snapshots (358건) |
| **campone_civic_hub** | O (소량) | Question (7건), Pledge (10건), Ticket (4건) |
| **campone_policy** | X (비어있음) | Candidate, Analysis, Strategy 모두 0건 |
| **campone_dashboard** | 시드 데이터 | users, contacts 등 |

---

## 2. 모듈 임베드 방식 검토

### 2.1 iframe 임베드 테스트

테스트 페이지 생성: `/test/embed` ([src/app/test/embed/page.tsx](../src/app/test/embed/page.tsx))

```typescript
const SERVICES = {
  insights: { url: 'https://campone-v2-frontend-2qbgm2n2oq-du.a.run.app' },
  civicHub: { url: 'https://campone-civic-hub-2qbgm2n2oq-du.a.run.app' },
  policy: { url: 'https://campone-policy-2qbgm2n2oq-du.a.run.app' },
};
```

### 2.2 발견된 문제점

#### 문제 1: CORS 에러 (v2-frontend → v2-backend)
```
Access to fetch at 'https://campone-v2-backend-xxx' from origin
'https://campone-v2-frontend-xxx' has been blocked by CORS policy
```

**원인**: v2-backend에 CORS 헤더 미설정

**해결 방안** (v2-backend 수정 필요):
```python
# FastAPI 예시
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://campone-v2-frontend-2qbgm2n2oq-du.a.run.app",
        "https://campone-dashboard-xxx.a.run.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 문제 2: 인증 쿠키 격리 (SameSite)
- 각 서비스는 다른 도메인이므로 쿠키가 공유되지 않음
- Dashboard 로그인 ≠ Insights 로그인 ≠ Civic Hub 로그인

---

## 3. 통합 인증 방안

### 3.1 권장 방식: 공유 JWT 토큰

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Dashboard 로그인                                             │
│     POST /api/auth/callback/credentials                         │
│     → NextAuth 세션 생성                                         │
├─────────────────────────────────────────────────────────────────┤
│  2. 임베드 토큰 생성                                              │
│     GET /api/auth/embed-token                                    │
│     → JWT 생성 (exp: 1h, payload: { userId, role, permissions }) │
├─────────────────────────────────────────────────────────────────┤
│  3. iframe URL에 토큰 포함                                        │
│     <iframe src="https://insights.../embed?token=xxx" />         │
├─────────────────────────────────────────────────────────────────┤
│  4. 각 서비스에서 토큰 검증                                        │
│     /embed 라우트 → JWT 검증 → 세션 생성                          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 구현 필요 사항

**Dashboard 측:**
```typescript
// src/app/api/auth/embed-token/route.ts
import jwt from 'jsonwebtoken';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const token = jwt.sign(
    { userId: session.user.id, role: session.user.role },
    process.env.EMBED_JWT_SECRET!,
    { expiresIn: '1h' }
  );

  return Response.json({ token });
}
```

**각 서비스 측:**
- `/embed` 라우트 추가
- 쿼리 파라미터에서 토큰 검증
- 내부 세션 생성

**환경 변수:**
- 모든 서비스에 동일한 `EMBED_JWT_SECRET` 설정 필요

---

## 4. Cross-Origin 통신 제약 및 해결

### 4.1 제약 사항

| 항목 | 제약 | 이유 |
|------|-----|------|
| localStorage | 공유 불가 | Origin별 격리 |
| sessionStorage | 공유 불가 | Origin별 격리 |
| Cookie | 공유 불가 | SameSite 정책 |
| DOM 접근 | 불가 | Same-Origin Policy |
| 직접 함수 호출 | 불가 | 보안 샌드박스 |

### 4.2 가능한 통신: postMessage API

```typescript
// Dashboard (부모)에서 수신
useEffect(() => {
  const handler = (event: MessageEvent) => {
    // Origin 검증 필수
    const allowedOrigins = [
      'https://campone-v2-frontend-xxx',
      'https://campone-civic-hub-xxx',
    ];
    if (!allowedOrigins.includes(event.origin)) return;

    if (event.data.type === 'KPI_UPDATE') {
      updateModuleKpis(event.data.module, event.data.kpis);
    }
    if (event.data.type === 'NAVIGATION') {
      router.push(event.data.path);
    }
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}, []);

// Dashboard에서 iframe으로 전송
iframeRef.current?.contentWindow?.postMessage(
  { type: 'USER_CONTEXT', user: session.user },
  'https://campone-v2-frontend-xxx'
);
```

```typescript
// 임베드된 서비스 (자식)에서 전송
window.parent.postMessage(
  { type: 'KPI_UPDATE', module: 'insights', kpis: { trendIndex: 75 } },
  'https://campone-dashboard-xxx'
);
```

---

## 5. 메인 페이지 데이터 연동

### 5.1 현재 하드코딩된 항목

| 섹션 | 파일 위치 | 라인 |
|------|----------|------|
| 모듈 카드 KPI | [src/app/page.tsx](../src/app/page.tsx) | 51-111 |
| 핵심 지표 KPI | [src/app/page.tsx](../src/app/page.tsx) | 114-176 |
| 최근 활동 | [src/app/page.tsx](../src/app/page.tsx) | 713-728 |
| 알림 센터 | [src/app/page.tsx](../src/app/page.tsx) | 740-773 |

### 5.2 데이터 연동 출처 매핑

| 항목 | 데이터 출처 | 테이블/필드 |
|------|------------|-------------|
| 여론 트렌드 (72pt) | campone_insights | `daily_metrics.composite_score` |
| 급증 경보 (2건) | campone_insights | spike detection 로직 |
| 메시지 발송 (2,680건) | campone_civic_hub | messaging 테이블 |
| 오픈율 (45%) | campone_civic_hub | 이메일 트래킹 |
| 공약 완성도 (78%) | campone_policy | `Analysis.status` 집계 |
| 활성 연락처 (1,350명) | campone_dashboard | `contacts` 테이블 |
| 최근 활동 | campone_dashboard | `audit_logs` 테이블 |
| 알림 | 조건 기반 동적 생성 | 각 DB 쿼리 |

### 5.3 권장 구현 방식: Dashboard API 레이어

```
┌─────────────────────────────────────────────────────────────┐
│                    Dashboard Backend                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            /api/v1/dashboard/summary                 │   │
│  │  - 모든 모듈 KPI 집계                                  │   │
│  │  - 캐싱 (5분 TTL)                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│           │              │              │                    │
│     ┌─────▼────┐   ┌─────▼────┐   ┌─────▼────┐             │
│     │ insights │   │ civic_hub│   │  policy  │             │
│     │    DB    │   │    DB    │   │    DB    │             │
│     └──────────┘   └──────────┘   └──────────┘             │
└─────────────────────────────────────────────────────────────┘
```

**구현 예시:**
```typescript
// src/lib/prisma-clients.ts
import { PrismaClient as InsightsClient } from '@prisma-insights/client';
import { PrismaClient as CivicHubClient } from '@prisma-civichub/client';

export const insightsDb = new InsightsClient({
  datasources: { db: { url: process.env.INSIGHTS_DATABASE_URL } },
});

export const civicHubDb = new CivicHubClient({
  datasources: { db: { url: process.env.CIVICHUB_DATABASE_URL } },
});
```

```typescript
// src/app/api/v1/dashboard/summary/route.ts
export async function GET() {
  const [latestMetrics, questionCount, pledgeCount] = await Promise.all([
    insightsDb.daily_metrics.findFirst({ orderBy: { date: 'desc' } }),
    civicHubDb.question.count(),
    civicHubDb.pledge.count(),
  ]);

  return Response.json({
    insights: {
      trendIndex: latestMetrics?.composite_score ?? 0,
      spikes: await detectSpikes(),
    },
    civicHub: {
      questions: questionCount,
      pledges: pledgeCount,
    },
    // ...
  });
}
```

---

## 6. 구현 우선순위

### Phase 1: 기반 구축
- [ ] 다중 DB Prisma 클라이언트 설정
- [ ] `/api/v1/dashboard/summary` API 구현
- [ ] 메인 페이지 KPI 동적 로딩 연결

### Phase 2: 인증 통합
- [ ] `/api/auth/embed-token` 구현
- [ ] 각 서비스에 `/embed` 라우트 추가 요청
- [ ] `EMBED_JWT_SECRET` 환경 변수 배포

### Phase 3: 실시간 연동
- [ ] postMessage 프로토콜 정의
- [ ] 각 서비스에 parent 통신 코드 추가
- [ ] Dashboard에서 수신 및 UI 반영

### Phase 4: CORS/백엔드 수정 (타 팀 협조)
- [ ] v2-backend CORS 설정 추가
- [ ] Civic Hub API CORS 확인
- [ ] Policy Lab API 연결 테스트

---

## 7. 참고: 테스트 페이지

임베드 테스트: `http://localhost:3000/test/embed`

로그인 후 접근 가능하며, 세 개 서비스(Insights, Civic Hub, Policy)를 iframe으로 전환하며 테스트할 수 있음.

---

## 8. 미해결 이슈

1. **v2-backend CORS**: 해당 프로젝트에서 수정 필요
2. **Policy DB 비어있음**: Policy 서비스에서 데이터 생성 필요
3. **통합 인증**: 각 서비스에 `/embed` 라우트 구현 협조 필요
4. **실시간 알림**: WebSocket 또는 SSE 고려 (현재는 폴링 방식)
