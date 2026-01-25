# Campone Policy 코드베이스 분석 문서

> 작성일: 2026-01-22
> 프로젝트: AI 기반 선거 전략 수립 시스템

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [아키텍처 개요](#2-아키텍처-개요)
3. [디렉토리 구조](#3-디렉토리-구조)
4. [핵심 생명주기: ME-FIELD-PLAN-DO 파이프라인](#4-핵심-생명주기-me-field-plan-do-파이프라인)
5. [데이터베이스 설계](#5-데이터베이스-설계)
6. [API 라우트 구조](#6-api-라우트-구조)
7. [인증 및 권한 관리](#7-인증-및-권한-관리)
8. [백그라운드 작업 처리](#8-백그라운드-작업-처리)
9. [캐싱 전략](#9-캐싱-전략)
10. [에러 처리 및 로깅](#10-에러-처리-및-로깅)

---

## 1. 프로젝트 개요

### 1.1 기술 스택

| 분류 | 기술 |
|------|------|
| **프레임워크** | Next.js 14 (App Router) |
| **언어** | TypeScript |
| **UI** | React 18 + Tailwind CSS + shadcn/ui |
| **상태 관리** | Zustand + React Query |
| **폼 관리** | React Hook Form + Zod |
| **ORM** | Prisma 5.19 |
| **데이터베이스** | PostgreSQL |
| **캐싱** | Redis |
| **AI** | Anthropic Claude API |
| **인증** | NextAuth.js (JWT) |
| **배포** | Docker + Google Cloud Run |

### 1.2 주요 기능

- 후보자 프로필 관리
- 4단계 AI 전략 분석 (ME → FIELD → PLAN → DO)
- 여론분석/정책 PDF 업로드 및 파싱
- 전략 버전 관리 및 승인 워크플로우
- 보고서 생성 (PDF/DOCX)

---

## 2. 아키텍처 개요

### 2.1 시스템 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                         클라이언트                               │
│   React Components + Zustand + React Query                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js API Routes                          │
│   /api/strategy/*  /api/strategy-runs/*  /api/strategies/*      │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Service Layer  │  │  Engine Layer   │  │   Cache Layer   │
│  프로필/전략/   │  │  ME-FIELD-      │  │   Redis 캐싱    │
│  보고서 서비스  │  │  PLAN-DO 분석   │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Prisma ORM + PostgreSQL                       │
│   User  Candidate  Analysis  Strategy  StrategyRun              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 계층 분리

| 계층 | 역할 | 위치 |
|------|------|------|
| **Presentation** | UI 컴포넌트, 페이지 | `src/app/`, `src/components/` |
| **API** | HTTP 요청/응답 처리 | `src/app/api/` |
| **Service** | 비즈니스 로직 | `src/lib/services/` |
| **Engine** | AI 분석 로직 | `src/lib/engine/` |
| **Data** | 데이터베이스 접근 | `src/lib/db/`, `prisma/` |
| **Cache** | 캐싱 | `src/lib/cache/` |

---

## 3. 디렉토리 구조

```
campone-policy/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (dashboard)/              # 대시보드 라우트 그룹
│   │   │   └── strategy/             # 전략 모듈
│   │   │       ├── me/               # ME 분석 페이지
│   │   │       ├── field/            # FIELD 분석 페이지
│   │   │       ├── plan/             # PLAN 분석 페이지
│   │   │       ├── do/               # DO 분석 페이지
│   │   │       ├── poll/             # 여론분석 페이지
│   │   │       └── report/           # 보고서 페이지
│   │   └── api/                      # REST API 라우트
│   │       ├── strategy/             # 전략 관련 API
│   │       ├── strategy-runs/        # 백그라운드 작업 API
│   │       └── strategies/           # 전략 버전 API
│   │
│   ├── components/                   # React 컴포넌트
│   │   ├── strategy/                 # 전략 관련 컴포넌트
│   │   └── ui/                       # shadcn/ui 기반 UI
│   │
│   ├── lib/                          # 핵심 라이브러리
│   │   ├── engine/                   # 분석 엔진
│   │   │   ├── pipeline.ts           # 파이프라인 오케스트레이터
│   │   │   ├── me-analyzer.ts        # ME 분석
│   │   │   ├── field-analyzer.ts     # FIELD 분석
│   │   │   ├── plan-builder.ts       # PLAN 수립
│   │   │   ├── do-designer.ts        # DO 설계
│   │   │   └── prompts/              # LLM 프롬프트 (12개)
│   │   ├── services/                 # 비즈니스 서비스
│   │   ├── db/                       # Prisma 클라이언트
│   │   ├── cache/                    # Redis 캐싱
│   │   ├── ai/                       # Claude API 클라이언트
│   │   └── api/                      # API 유틸리티
│   │
│   ├── types/                        # TypeScript 타입 정의
│   └── jobs/                         # 백그라운드 작업
│       └── strategy-runner.ts        # Cloud Run Job
│
├── prisma/
│   ├── schema.prisma                 # DB 스키마
│   └── migrations/                   # 마이그레이션
│
└── docs/                             # 문서
```

---

## 4. 핵심 생명주기: ME-FIELD-PLAN-DO 파이프라인

### 4.1 파이프라인 개요

4단계 순차 분석 시스템으로, 각 단계는 이전 단계 결과를 입력으로 사용합니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Pipeline.runAll(userId)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
    ┌─────────────────────────┼─────────────────────────┐
    ▼                         ▼                         ▼
┌─────────┐              ┌─────────┐              ┌─────────┐
│ Profile │              │  Poll   │              │ Policy  │
│  입력   │              │  PDF    │              │  PDF    │
└────┬────┘              └────┬────┘              └────┬────┘
     │                        │                        │
     └────────────────────────┼────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  [ME 분석] 자기 분석                                             │
│  ├─ PROMPT 1-1: 프로필 정리 → ProfileSummary                    │
│  ├─ PROMPT 1-2: SWOT 분석 → SWOTAnalysis                        │
│  └─ PROMPT 1-3: 포지셔닝 (6축) → PositioningAnalysisV2           │
└─────────────────────────────────────────────────────────────────┘
                              │ meResult
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  [FIELD 분석] 환경 분석                                          │
│  ├─ PROMPT 2-1: 선거구 분석 → DistrictAnalysis                   │
│  ├─ PROMPT 2-2: 경쟁자 분석 → CompetitorAnalysis                 │
│  └─ PROMPT 2-3: PEST 분석 → PESTAnalysis                        │
└─────────────────────────────────────────────────────────────────┘
                              │ fieldResult
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  [PLAN 수립] 전략 수립                                           │
│  ├─ PROMPT 3-1: 승리 공식 → WinningFormula                      │
│  ├─ PROMPT 3-2: 메시지 전략 → MessageStrategy                    │
│  └─ PROMPT 3-3: 캠페인 로드맵 → CampaignRoadmap                  │
└─────────────────────────────────────────────────────────────────┘
                              │ planResult
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  [DO 설계] 실행 설계                                             │
│  ├─ PROMPT 4-1: 세그먼트 공략 → SegmentStrategy                  │
│  ├─ PROMPT 4-2: 세그먼트 정책 → SegmentPolicyStrategy            │
│  └─ PROMPT 4-3: 콘텐츠 방향 → ContentDirection                   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 단계별 입력/출력

| 단계 | 입력 | 출력 | 예상 시간 |
|------|------|------|----------|
| **ME** | 프로필, (여론분석), (정책) | ProfileSummary, SWOT, Positioning | 1-2분 |
| **FIELD** | ME 결과, 여론분석, 정책, 읍면동 목록 | District, Competitor, PEST | 1-2분 |
| **PLAN** | ME, FIELD 결과, D-day 계산 | WinningFormula, Message, Roadmap | 1-2분 |
| **DO** | ME, FIELD, PLAN 결과 | Segment, Policy, Content | 1분 |

### 4.3 프롬프트 설계 원칙

1. **일관된 구조**: 미션 → 입력 데이터 → 분석 프레임워크 → JSON 출력 형식
2. **JSON 강제**: 코드펜스/설명 문장 금지, 추가 키 금지
3. **개수 제한**: 배열 항목 수 명시 (비용 절감)
4. **온도 조절**: 수치 계산(0) vs 창의적 분석(0.7)

### 4.4 데이터 흐름 코드

```typescript
// src/lib/engine/pipeline.ts
class Pipeline {
  async runAll(userId: string, options?: PipelineOptions): Promise<PipelineResult> {
    const candidateId = await this.getCandidateId(userId);

    // ME 분석 (필수)
    const meResult = await this.runME(userId, candidateId);

    // FIELD 분석 (ME 필수)
    const fieldResult = await this.runFIELD(userId, candidateId, meResult);

    // PLAN 수립 (ME, FIELD 필수)
    const planResult = await this.runPLAN(userId, candidateId, meResult, fieldResult);

    // DO 설계 (ME, FIELD, PLAN 필수)
    const doResult = await this.runDO(userId, candidateId, meResult, fieldResult, planResult);

    return { meResult, fieldResult, planResult, doResult };
  }
}
```

---

## 5. 데이터베이스 설계

### 5.1 모델 관계도

```
┌────────────────────────────────────────────────────────────────────┐
│                         User 인증 계층                              │
│  User ──1:1──> Candidate                                          │
│   ├─> Account[] (소셜 로그인)                                       │
│   ├─> Session[] (활성 세션)                                         │
│   ├─> AuditLog[] (감사 로그)                                        │
│   └─> StrategyRun[] (전략 실행)                                     │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                       Candidate 프로필 계층                         │
│  Candidate (후보자 프로필)                                          │
│   ├─> Education[] (학력)                                           │
│   ├─> Career[] (경력, order로 정렬)                                 │
│   ├─> PoliticalHistory[] (정치 경력)                                │
│   ├─> SocialActivity[] (사회 활동)                                  │
│   ├─> Resource (1:1, 선거 자원)                                     │
│   ├─> Motivation (1:1, 정치 동기)                                   │
│   ├─> Pledge[] (정책 공약)                                          │
│   ├─> Analysis[] (분석 결과)                                        │
│   └─> Strategy[] (전략 버전)                                        │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                     Analysis 분석 결과 계층                         │
│  Analysis (단계별 분석 결과)                                        │
│   - phase: ME | FIELD | PLAN | DO | POLL | POLICY                  │
│   - type: me_full | field_analysis | plan_analysis | do_analysis   │
│   - inputData: JSON (입력 데이터 스냅샷)                             │
│   - outputData: JSON (분석 결과)                                    │
│   - status: pending | running | completed | failed                 │
│   - tokenUsage: LLM 토큰 사용량                                     │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                  StrategyRun 전략 실행 관리 계층                     │
│  StrategyRun (백그라운드 작업)                                       │
│   - status: PENDING | RUNNING | SUCCEEDED | FAILED | CANCELED      │
│   - dedupeKey: SHA256 해시 (중복 실행 방지)                          │
│   - inputSnapshot: JSON (실행 입력값)                                │
│   └─> StrategyVersion[] (버전 관리)                                  │
│         - versionNo: 자동 증가                                      │
│         - output: JSON (정규화된 분석 결과)                          │
│         └─> StrategyApproval (1:1, 승인 워크플로우)                  │
│               - status: DRAFT | IN_REVIEW | APPROVED | REJECTED    │
└────────────────────────────────────────────────────────────────────┘
```

### 5.2 주요 모델 상세

#### User (사용자)
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  role          String    @default("user")  // admin, manager, user
  candidate     Candidate?
  strategyRuns  StrategyRun[]
  auditLogs     AuditLog[]
}
```

#### Candidate (후보자)
```prisma
model Candidate {
  id              String   @id @default(cuid())
  userId          String   @unique
  name            String
  birthDate       DateTime?
  electionType    String?
  district        String?
  electionDate    DateTime?
  party           String?

  education       Education[]
  career          Career[]
  politicalHistory PoliticalHistory[]
  socialActivity  SocialActivity[]
  resource        Resource?
  motivation      Motivation?
  pledges         Pledge[]
  analyses        Analysis[]
  strategies      Strategy[]
}
```

#### Analysis (분석 결과)
```prisma
model Analysis {
  id           String   @id @default(cuid())
  candidateId  String
  phase        String   // ME, FIELD, PLAN, DO, POLL, POLICY
  type         String   // me_full, swot, positioning, etc.
  inputData    Json?
  outputData   Json?
  status       String   @default("pending")
  tokenUsage   Int?
  startedAt    DateTime?
  completedAt  DateTime?
  errorMessage String?

  @@index([candidateId, phase])
  @@index([candidateId, type])
}
```

### 5.3 CRUD 패턴

#### 트랜잭션 사용 예시 (프로필 업데이트)
```typescript
await prisma.$transaction(async (tx) => {
  // 1. 기본 정보 업데이트
  await tx.candidate.update({ where: { userId }, data: updateData });

  // 2. 교육 정보 (DELETE + CREATE)
  await tx.education.deleteMany({ where: { candidateId } });
  await tx.education.createMany({ data: validEducation });

  // 3. 자원 정보 (UPSERT)
  await tx.resource.upsert({
    where: { candidateId },
    create: { candidateId, ...resourceData },
    update: resourceData
  });
});
```

---

## 6. API 라우트 구조

### 6.1 엔드포인트 목록

#### 프로필 API
| 엔드포인트 | 메서드 | 역할 |
|-----------|--------|------|
| `/api/strategy/profile` | GET | 프로필 조회 |
| `/api/strategy/profile` | POST | 프로필 생성 |
| `/api/strategy/profile` | PUT | 프로필 업데이트 |

#### 분석 API
| 엔드포인트 | 메서드 | 역할 | 캐싱 |
|-----------|--------|------|------|
| `/api/strategy/me` | GET/POST | ME 분석 | Redis 1h |
| `/api/strategy/field` | GET/POST | FIELD 분석 | Redis 1h |
| `/api/strategy/plan` | GET/POST | PLAN 분석 | Redis 1h |
| `/api/strategy/do` | GET/POST | DO 분석 | Redis 1h |
| `/api/strategy/run` | GET/POST | 전체 파이프라인 | - |

#### 데이터 업로드 API
| 엔드포인트 | 메서드 | 역할 |
|-----------|--------|------|
| `/api/strategy/poll-report/upload` | POST | 여론분석 PDF 업로드 |
| `/api/strategy/policy-report/upload` | POST | 정책 PDF 업로드 |
| `/api/strategy/district-data/upload` | POST | 선거구 데이터 업로드 |

#### 전략 관리 API
| 엔드포인트 | 메서드 | 역할 |
|-----------|--------|------|
| `/api/strategy/active` | GET/POST | 활성 전략 조회/생성 |
| `/api/strategy/history` | GET | 전략 이력 |
| `/api/strategy/compare` | POST | 전략 비교 |
| `/api/strategy/report/generate` | POST | 보고서 생성 |

#### 백그라운드 작업 API
| 엔드포인트 | 메서드 | 역할 |
|-----------|--------|------|
| `/api/strategy-runs` | GET/POST | 실행 목록/요청 |
| `/api/strategy-runs/:runId` | GET | 실행 상태 조회 |
| `/api/strategies/:versionId/approve` | POST | 전략 승인/반려 |

### 6.2 공통 패턴

#### 인증 처리
```typescript
// src/lib/api/auth-helper.ts
export async function requireUserId(request: NextRequest) {
  // 우선순위: X-User-Id 헤더 > userId 쿼리 > DEFAULT_USER_ID
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json(
      { error: "userId가 필요합니다" },
      { status: 400 }
    );
  }
  return { userId };
}
```

#### 응답 형식
```typescript
// 성공 응답
{ data: {...}, cached?: boolean }

// 에러 응답
{ error: "에러 메시지", message?: "상세 설명" }
```

---

## 7. 인증 및 권한 관리

### 7.1 NextAuth 설정

```typescript
// src/lib/auth.ts
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60  // 30일
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    }
  }
};
```

### 7.2 사용자 식별 플로우

```
클라이언트 요청
    │
    ├─ X-User-Id 헤더 (통합 대시보드)
    │   └─> userId 추출
    │
    ├─ userId 쿼리 파라미터
    │   └─> userId 추출
    │
    └─ DEFAULT_USER_ID 환경 변수 (개발용)
        └─> userId 추출
```

### 7.3 역할 기반 접근 제어

| 역할 | 권한 |
|------|------|
| **admin** | 모든 기능 접근 |
| **manager** | 전략 승인/반려 |
| **user** | 프로필 관리, 분석 실행 |

---

## 8. 백그라운드 작업 처리

### 8.1 Cloud Run Jobs 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. 사용자 요청                                                   │
│    POST /api/strategy-runs                                      │
│    { candidateId, period, summaryPayload }                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. StrategyRun 생성                                              │
│    - dedupeKey 생성 (SHA256)                                    │
│    - 중복 체크 (PENDING/RUNNING 상태)                            │
│    - status: PENDING                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Cloud Run Job 트리거                                          │
│    triggerStrategyRunJob(runId)                                 │
│    - 환경 변수로 RUN_ID 전달                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Worker 실행 (strategy-runner.ts)                              │
│    - StrategyRun 조회                                            │
│    - 상태 업데이트: RUNNING                                      │
│    - Pipeline.runAll() 실행                                     │
│    - StrategyVersion 생성                                       │
│    - 상태 업데이트: SUCCEEDED/FAILED                             │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 중복 실행 방지

```typescript
// dedupeKey 생성
const dedupeKey = createHash("sha256")
  .update(JSON.stringify(summaryPayload))
  .digest("hex");

// 중복 체크
const existing = await prisma.strategyRun.findFirst({
  where: {
    candidateId,
    dedupeKey,
    status: { in: ["PENDING", "RUNNING"] }
  }
});

if (existing) {
  return { runId: existing.id, deduplicated: true };
}
```

### 8.3 Worker 실행 모드

| 모드 | 조건 | 동작 |
|------|------|------|
| **개발** | `LOCAL_JOB_MODE=true` 또는 `NODE_ENV=development` | Job 트리거 스킵 |
| **프로덕션** | 기본 | Cloud Run Jobs API 호출 |

---

## 9. 캐싱 전략

### 9.1 Redis 캐시 구조

```typescript
// src/lib/cache/redis.ts
const CACHE_PREFIX = process.env.REDIS_KEY_PREFIX || "campone_policy:";

// 캐시 키 형식
`${CACHE_PREFIX}analysis:${phase}:${userId}`     // 분석 결과
`${CACHE_PREFIX}claude:${cacheKey}`              // Claude 응답
`${CACHE_PREFIX}poll_data:${candidateId}`        // 여론 데이터
`${CACHE_PREFIX}policy_data:${candidateId}`      // 정책 데이터
```

### 9.2 TTL 전략

| 항목 | TTL | 이유 |
|------|-----|------|
| 분석 결과 (ME/FIELD/PLAN/DO) | 1시간 | 빈번한 조회 |
| Claude API 응답 | 30일 | 비용 절감 |
| 여론/정책 데이터 | 1시간 | 빈번한 조회 |

### 9.3 캐시 무효화

```typescript
// 프로필 변경 시
await clearAnalysisCache(userId);

// PDF 업로드 시
await redis.del(`poll_data:${candidateId}`);
await clearAnalysisCache(candidateId, "ME");  // 관련 분석도 무효화
```

### 9.4 Redis 연결 실패 처리

```typescript
// 연결 실패 시 캐싱 비활성화 (폴백)
if (error) {
  globalForRedis.redisDisabled = true;
}

// 이후 모든 redis.get() → null 반환
// 이후 모든 redis.set() → false 반환
```

---

## 10. 에러 처리 및 로깅

### 10.1 구조화된 로깅

```typescript
// src/lib/logger.ts
const logger = {
  error: (message: string, error?: Error, metadata?: object) => {
    console.log(JSON.stringify({
      severity: "error",
      message,
      timestamp: new Date().toISOString(),
      error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
      ...metadata
    }));
  }
};

// 사용 예시
logger.error("분석 실패", error, { userId, phase: "ME" });
```

### 10.2 HTTP 상태 코드 매핑

| 상태 | 상황 |
|------|------|
| 400 | 입력 검증 실패, userId 누락 |
| 401 | 인증 실패 |
| 403 | 권한 없음 (소유권 불일치) |
| 404 | 리소스 없음 (프로필, 분석 등) |
| 409 | 중복 요청 |
| 500 | 서버 에러 (LLM 실패 등) |
| 503 | 의존성 없음 (puppeteer 등) |

### 10.3 DO 단계 폴백 메커니즘

```typescript
// DO 단계에서 LLM 파싱 실패 시
try {
  segmentStrategy = await this.analyzeSegmentStrategy(...);
} catch (error) {
  logger.warn("DO 4-1 파싱 실패, 폴백 생성");
  segmentStrategy = this.createFallbackSegmentStrategy(planAnalysis, fieldAnalysis);
}
```

---

## 부록: 주요 환경 변수

```bash
# 필수
DATABASE_URL              # PostgreSQL 연결 문자열
ANTHROPIC_API_KEY         # Claude API 키

# 선택
REDIS_URL                 # Redis 연결 (캐싱)
NEXTAUTH_SECRET           # 인증 시크릿
CLAUDE_MODEL              # Claude 모델명 (기본: claude-sonnet-4-5)

# 캠페인 정보
ELECTION_NAME             # 선거명
REGION_NAME               # 지역명
CANDIDATE_NAME            # 후보자명
SUB_REGIONS               # 읍면동 목록 (쉼표 구분)

# Cloud Run Jobs
GCP_PROJECT_ID            # GCP 프로젝트 ID
CLOUD_RUN_JOB_NAME        # Job 이름
GCP_REGION                # 리전 (기본: asia-northeast3)

# 개발용
DEFAULT_USER_ID           # 기본 userId
LOCAL_JOB_MODE            # true → Job 트리거 스킵
```

---

## 부록: 개발 명령어

```bash
# 개발 서버
npm run dev

# 빌드
npm run build

# 테스트
npm test
npm run test:watch
npm run test:coverage

# 데이터베이스
npm run db:generate       # Prisma 클라이언트 생성
npm run db:push           # 스키마 동기화
npm run db:migrate        # 마이그레이션 실행
npm run db:studio         # Prisma Studio

# 백그라운드 작업
npm run job:strategy-runner
```

---

*이 문서는 코드베이스 분석을 바탕으로 자동 생성되었습니다.*
