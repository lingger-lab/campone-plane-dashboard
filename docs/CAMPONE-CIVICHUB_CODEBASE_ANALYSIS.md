# CampOne Civic Hub - 코드베이스 분석 문서

> **프로젝트명**: CampOne Civic Hub (캠프원 시민소통 솔루션)
> **설명**: 선거 후보자와 유권자를 위한 투명하고 신뢰할 수 있는 소통 플랫폼
> **문서 작성일**: 2026-01-22

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [아키텍처 구조](#3-아키텍처-구조)
4. [프로젝트 디렉토리 구조](#4-프로젝트-디렉토리-구조)
5. [프론트엔드 구조](#5-프론트엔드-구조)
6. [백엔드 API 구조](#6-백엔드-api-구조)
7. [데이터베이스 구조](#7-데이터베이스-구조)
8. [핵심 기능별 처리 흐름](#8-핵심-기능별-처리-흐름)
9. [외부 서비스 연동](#9-외부-서비스-연동)
10. [환경 변수](#10-환경-변수)
11. [배포 구성](#11-배포-구성)
12. [개발 워크플로우](#12-개발-워크플로우)

---

## 1. 프로젝트 개요

### 1.1 목적
- 선거 후보자(유해남 사천시장 후보)와 유권자 간의 투명한 소통 플랫폼
- AI 기반 Q&A 시스템으로 유권자 질문에 실시간 답변 제공
- 음성 입력 지원으로 접근성 향상

### 1.2 주요 기능
| 기능 | 설명 |
|------|------|
| **AI Q&A 시스템** | RAG 기반 질문응답, OpenAI GPT-4 활용 |
| **음성 인식(ASR)** | WebSocket 기반 실시간 음성 인식 |
| **품질 게이트** | 답변 품질 자동 검증 및 티켓 시스템 |
| **CMS** | 공약, 비전, 공지사항 등 콘텐츠 관리 |
| **관리자 패널** | 질문 검수, 문서 관리, 통계 대시보드 |

---

## 2. 기술 스택

### 2.1 프론트엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 14.2.0 | React 풀스택 프레임워크 (App Router) |
| React | 18.3.0 | UI 라이브러리 |
| TypeScript | 5.x | 타입 안전성 |
| Tailwind CSS | 3.x | 유틸리티 CSS 프레임워크 |
| TanStack Query | 5.51.0 | 서버 상태 관리 |
| Zod | 3.23.0 | 런타임 검증 |

### 2.2 백엔드
| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js API Routes | - | REST API 서버 |
| Prisma | 5.18.0 | ORM (PostgreSQL) |
| OpenAI | 4.104.0 | LLM API (GPT-4, Whisper, Embeddings) |
| Winston | 3.13.0 | 로깅 |
| ws | 8.18.0 | WebSocket 서버 (ASR) |

### 2.3 데이터베이스
| 기술 | 버전 | 용도 |
|------|------|------|
| PostgreSQL | 15 | 주 데이터베이스 |
| pgvector | 0.2.0 | 벡터 검색 (임베딩) |
| pg | 8.12.0 | PostgreSQL 클라이언트 |

### 2.4 인프라/배포
| 기술 | 용도 |
|------|------|
| Docker | 컨테이너화 |
| Docker Compose | 로컬/프로덕션 오케스트레이션 |
| Google Cloud Run | 클라우드 배포 |
| Cloud Build | CI/CD |
| Nginx | 리버스 프록시 |

---

## 3. 아키텍처 구조

### 3.1 전체 아키텍처
```
┌─────────────────────────────────────────────────────────────────┐
│                         클라이언트                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   웹 브라우저  │  │  음성 입력    │  │  관리자 패널  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼─────────────────┼─────────────────┼──────────────────┘
          │ HTTP            │ WebSocket        │ HTTP
          ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Next.js 서버                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    API Routes (/api)                      │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │  │
│  │  │  /auth  │ │  /qna   │ │ /admin  │ │  /cms   │        │  │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘        │  │
│  └───────┼───────────┼───────────┼───────────┼──────────────┘  │
│          │           │           │           │                  │
│  ┌───────▼───────────▼───────────▼───────────▼──────────────┐  │
│  │                   서비스 레이어                            │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │  │
│  │  │   RAG   │ │ Quality │ │  Auth   │ │  Risk   │        │  │
│  │  │Retriever│ │  Gate   │ │ Session │ │Detector │        │  │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘        │  │
│  └───────┼───────────┼───────────┼───────────┼──────────────┘  │
└──────────┼───────────┼───────────┼───────────┼──────────────────┘
           │           │           │           │
           ▼           ▼           ▼           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      데이터베이스 레이어                          │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐  │
│  │      PostgreSQL         │  │         OpenAI API           │  │
│  │  ┌──────┐ ┌──────────┐  │  │  ┌──────┐ ┌──────┐ ┌──────┐ │  │
│  │  │ Core │ │ pgvector │  │  │  │GPT-4 │ │Whisper│ │Embed │ │  │
│  │  │ Data │ │ Embeddings│  │  │  │      │ │ (ASR)│ │dings │ │  │
│  │  └──────┘ └──────────┘  │  │  └──────┘ └──────┘ └──────┘ │  │
│  └─────────────────────────┘  └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                  별도 WebSocket 서버 (ASR)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  server/asr-websocket.ts (포트 8080)                        │ │
│  │  - 실시간 음성 스트리밍                                      │ │
│  │  - OpenAI Whisper API 연동                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 모노리식 구조 특징
- **단일 코드베이스**: 프론트엔드/백엔드 통합
- **공유 타입 정의**: TypeScript로 타입 안전성 보장
- **통합 배포**: 하나의 Docker 이미지로 배포 (ASR 서버는 별도)

---

## 4. 프로젝트 디렉토리 구조

```
campone/
├── src/                          # 메인 소스 코드
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API 라우트 (백엔드)
│   │   │   ├── admin/            # 관리자 API
│   │   │   ├── auth/             # 인증 API
│   │   │   ├── qna/              # Q&A API
│   │   │   ├── cms/              # CMS API
│   │   │   ├── asr/              # 음성 인식 업로드
│   │   │   ├── feedback/         # 피드백
│   │   │   ├── risk/             # 위험도 분석
│   │   │   └── cron/             # 정기 작업
│   │   │
│   │   ├── (페이지들)             # 프론트엔드 페이지
│   │   │   ├── page.tsx          # 홈페이지
│   │   │   ├── qna/              # Q&A 페이지
│   │   │   ├── admin/            # 관리자 패널
│   │   │   ├── pledges/[id]/     # 공약 상세
│   │   │   ├── vision/           # 비전 페이지
│   │   │   └── ...
│   │   │
│   │   ├── layout.tsx            # 루트 레이아웃
│   │   └── globals.css           # 전역 스타일
│   │
│   ├── components/               # React 컴포넌트
│   │   ├── home/                 # 홈페이지 컴포넌트
│   │   ├── qna/                  # Q&A 컴포넌트
│   │   ├── admin/                # 관리자 컴포넌트
│   │   └── common/               # 공통 컴포넌트
│   │
│   ├── lib/                      # 라이브러리/유틸리티
│   │   ├── db/                   # 데이터베이스 함수
│   │   ├── api/                  # API 헬퍼
│   │   ├── auth/                 # 인증
│   │   ├── openai/               # OpenAI 클라이언트
│   │   ├── quality-gate/         # 품질 검증
│   │   ├── risk/                 # 위험도 감지
│   │   ├── ranking/              # 질문 순위
│   │   └── schemas/              # Zod 스키마
│   │
│   ├── services/                 # 비즈니스 로직
│   │   ├── rag/                  # RAG 시스템
│   │   │   ├── retriever.ts      # 문서 검색
│   │   │   └── generator.ts      # 답변 생성
│   │   └── quality/              # 품질 게이트
│   │
│   ├── hooks/                    # React Custom Hooks
│   ├── types/                    # TypeScript 타입 정의
│   ├── utils/                    # 유틸리티 함수
│   └── __tests__/                # 테스트
│
├── server/                       # 별도 WebSocket 서버
│   └── asr-websocket.ts          # ASR 스트리밍 서버
│
├── prisma/                       # Prisma ORM
│   ├── schema.prisma             # DB 스키마 (420줄)
│   ├── seed.ts                   # 초기 데이터 시딩
│   └── migrations/               # 마이그레이션
│
├── public/                       # 정적 자산
├── docs/                         # 문서
├── scripts/                      # 배포 스크립트
├── nginx/                        # Nginx 설정
│
├── 설정 파일들
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
├── vitest.config.ts
│
├── Docker 파일들
├── Dockerfile
├── Dockerfile.asr
├── Dockerfile.cloudrun
├── docker-compose.yml
└── docker-compose.prod.yml
```

---

## 5. 프론트엔드 구조

### 5.1 라우팅 (Next.js App Router)

| 경로 | 파일 | 설명 |
|------|------|------|
| `/` | `app/page.tsx` | 홈페이지 |
| `/qna` | `app/qna/page.tsx` | Q&A 페이지 |
| `/vision` | `app/vision/page.tsx` | 비전 페이지 |
| `/pledges/[id]` | `app/pledges/[id]/page.tsx` | 공약 상세 |
| `/schedule` | `app/schedule/page.tsx` | 일정 |
| `/notices` | `app/notices/page.tsx` | 공지사항 |
| `/admin` | `app/admin/page.tsx` | 관리자 대시보드 |
| `/admin/login` | `app/admin/login/page.tsx` | 관리자 로그인 |
| `/admin/questions` | `app/admin/questions/page.tsx` | 질문 관리 |
| `/admin/tickets` | `app/admin/tickets/page.tsx` | 티켓 관리 |
| `/admin/documents` | `app/admin/documents/page.tsx` | 문서 관리 |

### 5.2 주요 컴포넌트

#### 홈페이지 컴포넌트 (`components/home/`)
- **HeroSection**: 후보자 프로필, 출마선언 비디오
- **QuickButtons**: 퀵 네비게이션 버튼
- **NoticeSection**: 공지사항
- **ScheduleSection**: 일정
- **MarqueeMessages**: 스크롤 메시지
- **Footer**: 푸터

#### Q&A 컴포넌트 (`components/qna/`)
- **QuestionInput**: 질문 입력 (텍스트/음성)
- **VoiceButton**: 음성 입력 버튼
- **AnswerCard**: 답변 표시 + 피드백
- **TranscriptDisplay**: 음성 전사 표시

#### 공통 컴포넌트 (`components/common/`)
- **Modal**: 범용 모달
- **ConsentModal**: 이용약관 동의
- **SourceCard**: 출처 카드
- **StatusBadge**: 상태 배지
- **RiskAlert**: 위험도 알림

### 5.3 상태 관리

```typescript
// React Query - 서버 상태 관리
import { useQuery, useMutation } from '@tanstack/react-query'

// Custom Hooks
useConsent()         // 동의 상태 관리
useASRWebSocket()    // 음성 인식 WebSocket
useInView()          // 뷰포트 감지
```

### 5.4 스타일링

- **Tailwind CSS**: 유틸리티 클래스 기반
- **커스텀 애니메이션**: `tailwind.config.js`에 정의
  - softReveal, popIn, textReveal, softPulse, marquee

---

## 6. 백엔드 API 구조

### 6.1 API 엔드포인트 목록

#### 인증 API (`/api/auth/`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/login` | 관리자 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 현재 세션 확인 |

#### Q&A API (`/api/qna/`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/qna/questions` | 질문 제출 + AI 답변 |

#### 관리자 API (`/api/admin/`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/admin/stats` | 종합 통계 |
| GET/POST | `/api/admin/documents` | 문서 관리 |
| GET/PATCH/DELETE | `/api/admin/documents/[id]` | 문서 상세 |
| GET | `/api/admin/questions` | 질문 목록 |
| PATCH | `/api/admin/questions/[id]` | 질문 상태 업데이트 |
| GET/PATCH | `/api/admin/tickets` | 티켓 관리 |
| GET/POST | `/api/admin/feature-flags` | 기능 플래그 |

#### CMS API (`/api/cms/`)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET/POST | `/api/cms/pledges` | 공약 관리 |
| GET | `/api/cms/pledges/[slug]` | 공약 상세 |
| GET | `/api/cms/buttons` | 퀵버튼 목록 |
| GET | `/api/cms/vision` | 비전 데이터 |

#### 기타 API
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/asr/upload` | 음성 파일 업로드 (HTTP 폴백) |
| POST | `/api/feedback` | 답변 피드백 |
| POST | `/api/risk/analyze` | 텍스트 위험도 분석 |
| POST | `/api/cron/rerank` | 일일 리랭킹 (Cron) |

### 6.2 API 응답 형식

**성공 응답 (200-201)**
```json
{
  "id": "cuid",
  "field": "value",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**에러 응답 (400-500)**
```json
{
  "error": "에러 메시지",
  "details": { ... }
}
```

**리스트 응답**
```json
{
  "questions": [...],
  "stats": {
    "total": 100,
    "answered": 85,
    "pendingReview": 15
  }
}
```

### 6.3 CRUD 팩토리 패턴

`src/lib/api/crud.ts`에서 제공하는 재사용 가능한 핸들러:

```typescript
// 목록 조회
createListHandler({ context, resourceName, parseFilters, fetchItems, fetchStats })

// 상세 조회
createGetByIdHandler({ context, resourceLabel, fetchById, transform })

// 수정
createUpdateByIdHandler({ context, resourceLabel, schema, fetchById, update, createAuditLog })

// 삭제
createDeleteByIdHandler({ context, resourceLabel, fetchById, delete, createAuditLog })
```

---

## 7. 데이터베이스 구조

### 7.1 Prisma 스키마 개요

**스키마 파일**: `prisma/schema.prisma` (420줄)

### 7.2 핵심 데이터 모델

#### Q&A 시스템
```prisma
model Question {
  id              String           @id @default(cuid())
  questionText    String
  summary         String?          @db.Text
  inputType       InputType        @default(text)
  status          QuestionStatus   @default(ANSWERED)
  qualityTop1     Float?
  qualityTop3Avg  Float?
  helpfulCount    Int              @default(0)
  viewCount       Int              @default(0)
  rank            Int              @default(0)
  responseTime    Int?             // 응답 시간 (ms)
  reviewNote      String?
  reviewedBy      String?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  sources         QuestionSource[]
  tickets         Ticket[]
  feedbacks       Feedback[]
}

enum QuestionStatus {
  ANSWERED        // 품질 통과
  PENDING_REVIEW  // 검수 필요
  REVIEWED        // 검수 완료
}

enum InputType {
  voice
  text
}
```

#### 티켓 시스템
```prisma
model Ticket {
  id          String         @id @default(cuid())
  type        TicketType
  severity    TicketSeverity
  status      TicketStatus   @default(open)
  description String         @db.Text
  metadata    Json?
  resolution  String?        @db.Text
  resolvedBy  String?
  questionId  String?
  question    Question?      @relation(fields: [questionId], references: [id])
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}

enum TicketType {
  QUALITY_GATE   // 품질 미달
  USER_REPORT    // 사용자 신고
  SYSTEM_ERROR   // 시스템 오류
}

enum TicketSeverity {
  L1  // 긴급
  L2  // 보통
  L3  // 낮음
}
```

#### CMS 모델
```prisma
model Pledge {
  id            String        @id @default(cuid())
  slug          String        @unique
  title         String
  summary       String        @db.Text
  tags          String[]      @default([])
  kpi           String[]      @default([])
  budget        String?
  background    String?       @db.Text
  problem       String?       @db.Text
  solution      String?       @db.Text
  roadmap       String?       @db.Text
  isActive      Boolean       @default(true)
  displayOrder  Int           @default(0)

  sources       PledgeSource[]
  faqs          PledgeFAQ[]
}

model CandidateProfile {
  id        String   @id @default(cuid())
  name      String
  title     String
  slogan    String
  imageUrl  String?
  careers   Json?    // 경력 배열
}

model Vision {
  id        String   @id @default(cuid())
  slogan    String
  subText   String?
  isActive  Boolean  @default(true)
}
```

### 7.3 데이터베이스 관계도

```
Question (질문)
├── QuestionSource (1:N) - 답변 출처
├── Ticket (1:N) - 관련 이슈
└── Feedback (1:N) - 사용자 평가

Pledge (공약)
├── PledgeSource (1:N) - 출처 문서
└── PledgeFAQ (1:N) - FAQ

Document (RAG 문서)
└── embedding (JSON) - 벡터 임베딩

AuditLog - 모든 주요 작업 기록
Admin - 관리자 계정
FeatureFlag - 기능 플래그
```

### 7.4 DB 접근 레이어

`src/lib/db/` 디렉토리:

| 파일 | 설명 |
|------|------|
| `prisma.ts` | Prisma 클라이언트 싱글톤 |
| `questions.ts` | Question CRUD 함수 |
| `tickets.ts` | Ticket CRUD 함수 |
| `audit.ts` | AuditLog 함수 |

---

## 8. 핵심 기능별 처리 흐름

### 8.1 Q&A 질문 처리 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                    사용자 질문 입력                              │
│  ┌──────────────────┐     ┌──────────────────┐                 │
│  │   텍스트 입력     │ OR  │    음성 입력      │                 │
│  └────────┬─────────┘     └────────┬─────────┘                 │
│           │                        │                            │
│           │                        ▼                            │
│           │              ┌──────────────────┐                  │
│           │              │  ASR WebSocket   │                  │
│           │              │ (음성→텍스트)     │                  │
│           │              └────────┬─────────┘                  │
│           │                       │                            │
│           └───────────┬───────────┘                            │
│                       ▼                                        │
└───────────────────────┼────────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────────────┐
│                 POST /api/qna/questions                        │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 1. 요청 검증 (Zod questionRequestSchema)                 │  │
│  └────────────────────────┬────────────────────────────────┘  │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 2. RAG 검색 (retrieveRelevantSources)                    │  │
│  │    - 질문 임베딩 생성 (OpenAI text-embedding-3-small)    │  │
│  │    - 유사 문서 검색 (Cosine Similarity)                  │  │
│  │    - 상위 5개 문서 선정                                  │  │
│  └────────────────────────┬────────────────────────────────┘  │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 3. LLM 답변 생성 (generateAnswer)                        │  │
│  │    - OpenAI GPT-4-turbo-preview                         │  │
│  │    - 검색된 문서 + 질문 → 프롬프트 구성                   │  │
│  └────────────────────────┬────────────────────────────────┘  │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 4. 품질 게이트 검증 (validateQuality)                    │  │
│  │    - top1 >= 0.75? AND top3avg >= 0.70?                 │  │
│  │    - YES → status: ANSWERED                             │  │
│  │    - NO → status: PENDING_REVIEW + 티켓 생성             │  │
│  └────────────────────────┬────────────────────────────────┘  │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 5. DB 저장                                               │  │
│  │    - Question 생성                                       │  │
│  │    - QuestionSource 생성 (검색 결과)                     │  │
│  │    - Ticket 생성 (필요시)                                │  │
│  │    - AuditLog 기록                                       │  │
│  └────────────────────────┬────────────────────────────────┘  │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 6. 응답 반환                                             │  │
│  │    QuestionResponse { id, summary, sources, quality }    │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### 8.2 음성 인식(ASR) 처리 흐름

```
┌───────────────────────────────────────────────────────────────┐
│                    클라이언트                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ useASRWebSocket Hook                                     │  │
│  │   - connect() → WebSocket 연결                           │  │
│  │   - startRecording() → 마이크 액세스                     │  │
│  │   - 오디오 청크 전송 (base64)                            │  │
│  │   - stopRecording() → 연결 종료                          │  │
│  └────────────────────────┬────────────────────────────────┘  │
└───────────────────────────┼────────────────────────────────────┘
                            │ WebSocket
                            ▼
┌───────────────────────────────────────────────────────────────┐
│              ASR WebSocket 서버 (포트 8080)                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ server/asr-websocket.ts                                  │  │
│  │   - 연결 수락                                            │  │
│  │   - 오디오 스트림 수신                                   │  │
│  │   - OpenAI Whisper API 호출                              │  │
│  │   - partial/final 결과 전송                              │  │
│  └────────────────────────┬────────────────────────────────┘  │
└───────────────────────────┼────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                    메시지 형식                                 │
│                                                               │
│  클라이언트 → 서버:                                           │
│  { type: "start|audio|stop", data: "base64-audio" }          │
│                                                               │
│  서버 → 클라이언트:                                           │
│  { type: "partial|final|error", text: "인식 결과" }           │
└───────────────────────────────────────────────────────────────┘
```

### 8.3 품질 게이트 흐름

```
┌───────────────────────────────────────────────────────────────┐
│                    품질 게이트 검증                            │
│                                                               │
│  검색 결과                                                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ sources: [                                               │  │
│  │   { score: 0.85, ... },  // Top-1                       │  │
│  │   { score: 0.78, ... },  // Top-2                       │  │
│  │   { score: 0.72, ... },  // Top-3                       │  │
│  │ ]                                                        │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  검증 조건:                                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ top1 >= 0.75 (QUALITY_GATE_TOP1_THRESHOLD)              │  │
│  │ AND                                                      │  │
│  │ top3avg >= 0.70 (QUALITY_GATE_TOP3AVG_THRESHOLD)        │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  결과:                                                        │
│  ┌──────────────────────┐    ┌──────────────────────┐        │
│  │ 통과 (0.85 >= 0.75)  │    │ 실패 (예: 0.60 < 0.75)│       │
│  │ → ANSWERED           │    │ → PENDING_REVIEW      │       │
│  └──────────────────────┘    └─────────┬────────────┘        │
│                                        │                      │
│                                        ▼                      │
│                              ┌──────────────────────┐        │
│                              │ 티켓 자동 생성        │        │
│                              │ type: QUALITY_GATE   │        │
│                              │ severity: L1/L2/L3   │        │
│                              └──────────────────────┘        │
└───────────────────────────────────────────────────────────────┘
```

---

## 9. 외부 서비스 연동

### 9.1 OpenAI API

| 모델 | 용도 | 환경 변수 |
|------|------|----------|
| `gpt-4-turbo-preview` | 답변 생성 | `RAG_MODEL` |
| `text-embedding-3-small` | 임베딩 생성 | `EMBEDDING_MODEL` |
| `whisper-1` | 음성 인식 | (ASR 서버) |

**클라이언트 초기화** (`src/lib/openai/client.ts`):
```typescript
import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})
```

### 9.2 RAG 시스템

**검색 전략 (우선순위)**:
1. 임베딩 기반 검색 (Cosine Similarity)
2. 키워드 기반 검색 (PostgreSQL LIKE) - 폴백
3. Stub 데이터 반환 - 테스트용

**점수 스케일링**:
```
Raw Score (0.1~0.5) → Scaled Score (0.4~0.95) → Display (0.6~0.95)
```

---

## 10. 환경 변수

### 10.1 필수 환경 변수

```env
# 데이터베이스
DATABASE_URL=postgresql://postgres:password@localhost:5432/campone_civic_hub

# OpenAI
OPENAI_API_KEY=sk-...

# 후보자 정보
CANDIDATE_NAME=유해남
CANDIDATE_DISTRICT=사천시
```

### 10.2 선택 환경 변수

```env
# 품질 게이트
QUALITY_GATE_TOP1_THRESHOLD=0.75
QUALITY_GATE_TOP3AVG_THRESHOLD=0.70

# RAG/LLM 모델
RAG_MODEL=gpt-4-turbo-preview
EMBEDDING_MODEL=text-embedding-3-small

# ASR
ASR_WS_PORT=8080
NEXT_PUBLIC_ASR_WS_URL=ws://localhost:8080

# ASR 성능 목표
ASR_PARTIAL_TARGET_MS=700
ASR_FINAL_TIMEOUT_MS=1200

# 로깅
LOG_LEVEL=info
LOG_FILE_PATH=./logs

# 관리자
ADMIN_USERNAME=admin
ADMIN_PASSWORD=...
ADMIN_SECRET=...

# Cron
CRON_SECRET=...
```

---

## 11. 배포 구성

### 11.1 Docker 구성

**개발 환경** (`docker-compose.yml`):
```yaml
services:
  db:
    image: postgres:15-alpine
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  app:
    build: .
    ports: ["3000:3000"]
    depends_on: [db]

  asr:
    build:
      dockerfile: Dockerfile.asr
    ports: ["8080:8080"]
```

**프로덕션 환경** (`docker-compose.prod.yml`):
```yaml
services:
  app:
    deploy:
      replicas: 2
      resources:
        limits: { cpus: '1', memory: 1G }
        reservations: { cpus: '0.5', memory: 512M }

  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
```

### 11.2 Google Cloud Run 배포

**배포 스크립트**: `scripts/deploy-cloudrun.sh`

**Cloud Build 설정** (`cloudbuild.yaml`):
```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/campone', '-f', 'Dockerfile.cloudrun', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/campone']
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args: ['run', 'deploy', 'campone', '--image', 'gcr.io/$PROJECT_ID/campone', '--region', 'asia-northeast3']
```

---

## 12. 개발 워크플로우

### 12.1 개발 명령어

```bash
# 개발 서버
npm run dev               # Next.js 개발 서버 (localhost:3000)
npm run asr:server        # ASR WebSocket 서버 (localhost:8080)

# 빌드
npm run build             # 프로덕션 빌드
npm run start             # 프로덕션 서버

# 데이터베이스
npm run db:generate       # Prisma 클라이언트 생성
npm run db:push           # 스키마 반영
npm run db:migrate        # 마이그레이션 생성/실행
npm run db:studio         # Prisma Studio (GUI)
npm run db:seed           # 초기 데이터 시딩

# 테스트
npm test                  # Vitest (watch mode)
npm run test:run          # 1회 실행
npm run test:coverage     # 커버리지 리포트

# 린팅
npm run lint              # ESLint
```

### 12.2 테스트 구조

```
src/__tests__/
├── api/                  # API 테스트
├── components/           # 컴포넌트 테스트
├── lib/                  # 라이브러리 테스트
├── services/             # 서비스 테스트
├── e2e/                  # E2E 테스트
└── setup.ts              # 테스트 설정
```

---

## 부록: 주요 파일 참조

| 파일 | 설명 |
|------|------|
| `src/app/api/qna/questions/route.ts` | Q&A API 핵심 로직 |
| `src/services/rag/retriever.ts` | RAG 문서 검색 |
| `src/services/rag/generator.ts` | LLM 답변 생성 |
| `src/lib/quality-gate/validator.ts` | 품질 게이트 검증 |
| `src/lib/db/questions.ts` | Question DB 함수 |
| `src/lib/db/tickets.ts` | Ticket DB 함수 |
| `src/hooks/useASRWebSocket.ts` | 음성 인식 훅 |
| `server/asr-websocket.ts` | ASR 서버 |
| `prisma/schema.prisma` | DB 스키마 |
| `prisma/seed.ts` | 초기 데이터 |

---

*문서 끝*
