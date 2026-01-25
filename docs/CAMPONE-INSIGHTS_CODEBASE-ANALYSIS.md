# CampOne v2 코드베이스 분석 문서

> 사천시장 여론분석 시스템 MVP v2.0 - LLM 기반 여론분석 플랫폼

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [시스템 아키텍처](#2-시스템-아키텍처)
3. [애플리케이션 생명주기](#3-애플리케이션-생명주기)
4. [데이터베이스 구조](#4-데이터베이스-구조)
5. [백엔드 처리 로직](#5-백엔드-처리-로직)
6. [프론트엔드 구조](#6-프론트엔드-구조)
7. [데이터 흐름](#7-데이터-흐름)
8. [핵심 디자인 패턴](#8-핵심-디자인-패턴)
9. [API 엔드포인트](#9-api-엔드포인트)
10. [설정 및 환경변수](#10-설정-및-환경변수)

---

## 1. 프로젝트 개요

### 1.1 목적
2026년 사천시장 선거를 위한 LLM 기반 여론분석 플랫폼. 뉴스, YouTube, 네이버, 카카오 등 13개 데이터 소스에서 병렬 수집 후 Claude API를 활용한 다각도 분석을 수행하고 40+ 페이지 분량의 DOCX/PDF 보고서를 생성합니다.

### 1.2 기술 스택

| 구분 | 기술 |
|------|------|
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy (async), Pydantic |
| **Frontend** | Next.js 14 (App Router), TypeScript, Zustand, TanStack Query |
| **Database** | SQLite (로컬) / PostgreSQL (Cloud SQL) |
| **LLM** | Claude API (Opus 4.5 + Sonnet) |
| **Infrastructure** | Google Cloud Run, Cloud SQL, Redis |

### 1.3 분석 모듈 (9개)

| 모듈 | 설명 | 데이터 소스 |
|------|------|------------|
| 인지도 (Recognition) | 미디어 노출도 | 뉴스 + YouTube + 블로그 + 카페 |
| 지지도 (Support) | 감성 기반 지지도 | 플랫폼별 감성 가중치 적용 |
| 감성 (Sentiment) | 긍정/부정/중립 분포 | 전체 플랫폼 |
| 추세 (Trend) | 시계열 변화 추이 | 플랫폼별 추세 비교 |
| SWOT | 전략 분석 | 전체 소스 통합 |
| 이슈레이더 (Issues) | 주요 이슈 탐지 | SNS 이슈 포함 |
| 타임라인 (Timeline) | 시간순 이벤트 | SNS 이벤트 포함 |
| 지역뷰 (Regions) | 읍면동별 분석 | 지역 커뮤니티 |
| 리스크 (Risk) | 바이럴 리스크 탐지 | SNS 확산 위험 |

---

## 2. 시스템 아키텍처

### 2.1 전체 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐   │
│  │Dashboard│ │Analysis │ │ Metrics │ │ Reports │ │ Candidates  │   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └──────┬──────┘   │
│       └───────────┴───────────┴───────────┴─────────────┘           │
│                              │ API Calls                            │
└──────────────────────────────┼──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    API Routes (routes.py)                     │  │
│  └─────────────────────────────┬────────────────────────────────┘  │
│                                │                                    │
│  ┌─────────────────────────────┴────────────────────────────────┐  │
│  │                  Analysis Service                             │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ │  │
│  │  │ Collection │ │    LLM     │ │    Data    │ │   Report   │ │  │
│  │  │  Manager   │ │  Service   │ │ Repository │ │  Service   │ │  │
│  │  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ │  │
│  └────────┼──────────────┼──────────────┼──────────────┼────────┘  │
│           │              │              │              │            │
│  ┌────────┴───────┐ ┌────┴────┐ ┌──────┴──────┐ ┌─────┴─────┐     │
│  │   Collectors   │ │ Claude  │ │  Database   │ │   DOCX/   │     │
│  │ (13 Sources)   │ │   API   │ │  (SQLite/   │ │    PDF    │     │
│  └────────────────┘ └─────────┘ │ PostgreSQL) │ └───────────┘     │
│                                 └─────────────┘                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 디렉토리 구조

```
campone-v2/
├── backend/
│   └── app/
│       ├── main.py              # FastAPI 앱 + Lifespan
│       ├── config.py            # 설정 (Pydantic Settings)
│       ├── database.py          # SQLAlchemy 모델
│       ├── api/
│       │   └── routes.py        # REST API 엔드포인트
│       ├── collectors/          # 데이터 수집기
│       │   ├── base.py          # BaseCollector 추상 클래스
│       │   ├── manager.py       # 병렬 수집 오케스트레이션
│       │   ├── youtube.py       # YouTube Data API
│       │   ├── naver.py         # Naver Search API
│       │   ├── kakao.py         # Kakao Search API
│       │   ├── google.py        # Google Custom Search
│       │   └── local_news.py    # 지역뉴스 스크래핑
│       ├── services/
│       │   ├── analysis_service.py  # 파이프라인 오케스트레이션
│       │   ├── llm_service.py       # Claude API 래퍼
│       │   ├── data_repository.py   # UPSERT & 통계
│       │   └── report_service.py    # DOCX/PDF 생성
│       ├── prompts/             # LLM 프롬프트 템플릿
│       │   ├── recognition.py
│       │   ├── support.py
│       │   ├── sentiment.py
│       │   ├── swot.py
│       │   ├── risk.py
│       │   ├── trend.py
│       │   └── regions.py
│       └── stores/
│           └── progress_store.py  # Redis + In-memory 진행률
│
└── frontend/
    └── src/
        ├── app/                 # Next.js App Router
        │   ├── layout.tsx       # 루트 레이아웃
        │   ├── page.tsx         # 대시보드
        │   ├── analysis/        # 분석 실행
        │   ├── metrics/         # 인지도/지지도
        │   ├── sentiment/       # 감성분석
        │   ├── swot/            # SWOT
        │   ├── risk/            # 리스크
        │   ├── trend/           # 추세
        │   ├── issues/          # 이슈레이더
        │   ├── timeline/        # 타임라인
        │   ├── regions/         # 지역분석
        │   └── reports/         # 보고서 다운로드
        ├── lib/
        │   └── api.ts           # Axios API 클라이언트
        ├── stores/
        │   ├── analysisStore.ts # 분석 상태 (Zustand)
        │   └── settingsStore.ts # 설정 상태
        ├── hooks/
        │   ├── useAnalysis.ts   # 분석 실행 훅
        │   └── useHydration.ts  # SSR 하이드레이션
        └── types/
            └── index.ts         # TypeScript 타입 정의
```

---

## 3. 애플리케이션 생명주기

### 3.1 Backend Lifespan (main.py)

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ========== STARTUP ==========
    # 1. 데이터베이스 테이블 초기화
    await init_db()

    # 2. Progress Store 초기화 (Redis/In-memory)
    progress_store = get_progress_store()
    await progress_store.ping()

    print("Server started successfully")

    yield  # 애플리케이션 실행

    # ========== SHUTDOWN ==========
    print("Server shutting down...")
```

### 3.2 Frontend 초기화

```typescript
// layout.tsx
<Providers>           // TanStack Query + Zustand
  <Sidebar />         // 네비게이션
  <Header />          // 상단바
  <main>{children}</main>
</Providers>

// 페이지 마운트 시
useEffect(() => {
  // 1. Settings 로드 (서버에서)
  settingsStore.loadFromServer()

  // 2. 진행 중인 분석 체크 및 폴링 재개
  if (analysisId && status === 'running') {
    startPolling(analysisId)
  }
}, [])
```

### 3.3 분석 실행 생명주기

```
[Frontend]                    [Backend]                    [External]
     │                            │                            │
     │  POST /api/analyze         │                            │
     ├───────────────────────────►│                            │
     │                            │  Create Analysis record    │
     │                            ├──────────────────────────► │
     │   {analysis_id, status}    │                            │
     │◄───────────────────────────┤                            │
     │                            │                            │
     │   Start Background Task    │                            │
     │                            ├──────────┐                 │
     │                            │          │ run_analysis()  │
     │  GET /api/status/{id}      │          │                 │
     ├───────────────────────────►│          │                 │
     │   (polling every 2s)       │          │ Phase 1: Collect│
     │                            │          ├────────────────►│
     │   {progress: 15%}          │          │ (13 sources)    │
     │◄───────────────────────────┤          │                 │
     │                            │          │                 │
     │   ...polling continues...  │          │ Phase 2-4: LLM  │
     │                            │          ├────────────────►│
     │   {progress: 85%}          │          │ (Claude API)    │
     │◄───────────────────────────┤          │                 │
     │                            │          │                 │
     │                            │          │ Phase 5: Report │
     │   {status: completed}      │◄─────────┘                 │
     │◄───────────────────────────┤                            │
     │                            │                            │
     │   Auto-download DOCX       │                            │
     │                            │                            │
```

---

## 4. 데이터베이스 구조

### 4.1 ER 다이어그램

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│    Candidate    │     │  CollectionSession  │     │    Analysis      │
├─────────────────┤     ├─────────────────────┤     ├──────────────────┤
│ id (PK)         │     │ id (PK)             │     │ id (PK)          │
│ name            │     │ period_start        │     │ status           │
│ party           │     │ period_end          │     │ result_data (JSON│
│ position        │     │ status              │     │ docx_path        │
│ keywords (JSON) │     │ config (JSON)       │     │ pdf_path         │
│ career          │     │ statistics          │     │ created_at       │
│ origin_region   │     │ created_at          │     └────────┬─────────┘
└────────┬────────┘     └──────────┬──────────┘              │
         │                         │                          │
         │ 1:N                     │ 1:N                      │
         ▼                         ▼                          │
┌─────────────────────────────────────────────┐              │
│              CollectedItem                   │              │
├─────────────────────────────────────────────┤              │
│ id (PK)                                      │              │
│ candidate_id (FK) ──────────────────────────┘              │
│ platform (news, youtube, naver_blog, ...)    │              │
│ source_url (UNIQUE)                          │◄─────────────┘
│ title, content, author                       │
│ published_at                                 │
│ view_count, like_count, comment_count        │
│ sentiment, sentiment_score                   │
│ first_session_id (FK)                        │
│ last_session_id (FK)                         │
│ update_count                                 │
│ raw_data (JSON)                              │
└──────────────────────────────────────────────┘
         │
         │ Aggregated
         ▼
┌─────────────────────────────────────────────┐
│              PlatformStats                   │
├─────────────────────────────────────────────┤
│ candidate_id + platform (UNIQUE)             │
│ total_items, items_last_7/30_days            │
│ total_views, total_likes, total_comments     │
│ positive/negative/neutral_count              │
│ recognition_score, support_score (0.0-5.0)   │
│ last_calculated_at                           │
└──────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│            AnalysisSnapshot                  │
├─────────────────────────────────────────────┤
│ id (PK)                                      │
│ session_id (FK)                              │
│ candidate_id (FK)                            │
│ analysis_type (recognition, support, ...)    │
│ score (0.0-5.0)                              │
│ result_data (JSON)                           │
│ input_summary                                │
│ model_used                                   │
│ created_at                                   │
└──────────────────────────────────────────────┘
```

### 4.2 주요 테이블 설명

| 테이블 | 용도 | 특징 |
|--------|------|------|
| **Candidate** | 후보자 정보 | keywords는 JSON 배열 |
| **CollectionSession** | 수집 세션 단위 | 기간, 설정, 통계 저장 |
| **CollectedItem** | 수집된 개별 아이템 | URL 기준 UPSERT, update_count 추적 |
| **PlatformStats** | 플랫폼별 집계 | 실시간 업데이트, 점수 캐싱 |
| **AnalysisSnapshot** | 분석 결과 스냅샷 | 불변, 시계열 분석용 |
| **Analysis** | 분석 작업 상태 | result_data에 전체 결과 JSON |

### 4.3 데이터베이스 연결 설정

```python
# SQLite (로컬 개발)
DATABASE_URL = "sqlite+aiosqlite:///./data/election.db"
pool = NullPool  # 풀링 불필요

# PostgreSQL (Cloud SQL)
DATABASE_URL = "postgresql+asyncpg://user:pass@/dbname?host=/cloudsql/project:region:instance"
pool = AsyncAdaptedQueuePool
pool_size = 5
max_overflow = 10
pool_recycle = 1800  # 30분
pool_pre_ping = True
```

---

## 5. 백엔드 처리 로직

### 5.1 5단계 분석 파이프라인

```
┌──────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: COLLECTION (~60초)                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   asyncio.gather(*tasks, return_exceptions=True)                    │
│                                                                      │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│   │ YouTube  │ │  Google  │ │  Naver   │ │  Kakao   │              │
│   │ Collector│ │ Collector│ │ Collector│ │ Collector│              │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘              │
│        │            │            │            │                      │
│        └────────────┴────────────┴────────────┘                      │
│                           │                                          │
│                           ▼                                          │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ 지역뉴스 Collectors (6개)                                    │   │
│   │ 사천신문, 뉴스사천, 경남신문, 경남뉴스25, 경남도민일보, 국제신문 │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                           │                                          │
│                           ▼                                          │
│               CollectedItem UPSERT (URL 기준)                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   PHASE 2: BASE ANALYSIS (~30-45초)                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   LLMService.analyze_sentiment()                                    │
│   └─ 모델: Claude Sonnet (빠름)                                      │
│   └─ 플랫폼별 감성 분포 계산                                          │
│                                                                      │
│   PlatformStats 업데이트                                             │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                PHASE 3: METRICS CALCULATION (~45-60초)               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ 인지도 (Recognition) 계산                                    │   │
│   │ ├─ 뉴스: 35%                                                 │   │
│   │ ├─ YouTube: 25%                                              │   │
│   │ ├─ Naver: 25%                                                │   │
│   │ └─ Kakao: 15%                                                │   │
│   │ 모델: Claude Opus 4.5 (정확함)                                │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ 지지도 (Support) 계산                                        │   │
│   │ ├─ 뉴스 감성: 30%                                            │   │
│   │ ├─ YouTube 댓글: 30%                                         │   │
│   │ ├─ 블로그 감성: 25%                                          │   │
│   │ └─ 카페 감성: 15%                                            │   │
│   │ 모델: Claude Opus 4.5 (정확함)                                │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   AnalysisSnapshot 저장                                              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│              PHASE 4: COMPREHENSIVE ANALYSIS (~90-150초)             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                   │
│   │    SWOT     │ │   Issues    │ │  Timeline   │                   │
│   │  (Opus 4.5) │ │  (Sonnet)   │ │  (Sonnet)   │                   │
│   └─────────────┘ └─────────────┘ └─────────────┘                   │
│                                                                      │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                   │
│   │    Risk     │ │    Trend    │ │   Regions   │                   │
│   │  (Opus 4.5) │ │  (Opus 4.5) │ │  (Opus 4.5) │                   │
│   └─────────────┘ └─────────────┘ └─────────────┘                   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                 PHASE 5: REPORT GENERATION (~20-30초)                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ReportService.generate_docx_report()                              │
│   └─ 40+ 페이지 DOCX 생성                                            │
│                                                                      │
│   DOCX → PDF 변환 (LibreOffice/MS Word)                             │
│                                                                      │
│   Report 레코드 저장 (docx_path, pdf_path)                           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.2 LLM 서비스 상세

```python
class LLMService:
    MODEL_SONNET = "claude-sonnet-4-20250514"   # 기본 (빠름)
    MODEL_OPUS = "claude-opus-4-5-20251101"     # 프리미엄 (정확함)
```

**모델 사용 전략:**

| 분석 유형 | 사용 모델 | 이유 |
|----------|----------|------|
| 감성 분석 | Sonnet | 빠른 처리, 간단한 분류 |
| 이슈 탐지 | Sonnet | 대량 데이터 처리 |
| 타임라인 | Sonnet | 시간순 정렬 |
| 인지도 | Opus 4.5 | 복잡한 가중치 계산 |
| 지지도 | Opus 4.5 | 미묘한 감성 해석 |
| SWOT | Opus 4.5 | 전략적 분석 |
| 리스크 | Opus 4.5 | 위험 판단 |
| 추세 | Opus 4.5 | 패턴 인식 |
| 지역분석 | Opus 4.5 | 지역 맥락 이해 |

**비용 최적화 - Prompt Caching:**
```python
# 1024 토큰 이상의 시스템 프롬프트에 캐싱 적용
if len(system_prompt) > 1024:
    system_config = [{
        "type": "text",
        "text": system_prompt,
        "cache_control": {"type": "ephemeral"}  # 5분 TTL
    }]
# → 90% 비용 절감
```

### 5.3 데이터 수집 상세

**13개 데이터 소스:**

| 카테고리 | 소스 | API/방식 | 특징 |
|----------|------|----------|------|
| **뉴스** | 네이버뉴스 | Naver Search API | 일 25,000건 |
| | 구글뉴스 | Custom Search API | 제한적 할당량 |
| | 지역뉴스 (6개) | Web Scraping | Beautiful Soup |
| **영상** | YouTube | Data API v3 | 일 10,000 units |
| **블로그** | 네이버블로그 | Naver Search API | - |
| | 카카오블로그 | Kakao Search API | 10 req/sec |
| **카페** | 네이버카페 | Naver Search API | - |
| | 카카오카페 | Kakao Search API | 10 req/sec |

**병렬 수집 패턴:**
```python
tasks = [
    ('youtube', self._collect_youtube(query)),
    ('google_news', self._collect_google(query)),
    ('naver_news', self._collect_naver(query, ['news'])),
    ('naver_blog', self._collect_naver(query, ['blog'])),
    ('naver_cafe', self._collect_naver(query, ['cafearticle'])),
    ('kakao_blog', self._collect_kakao(query, ['blog'])),
    ('kakao_cafe', self._collect_kakao(query, ['cafe'])),
    *[('local_' + name, self._collect_local_news(name))
      for name in local_news_sources]
]

results = await asyncio.gather(*[t[1] for t in tasks], return_exceptions=True)
```

---

## 6. 프론트엔드 구조

### 6.1 페이지 구성

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/` | Dashboard | 대시보드 (요약 지표) |
| `/analysis` | AnalysisPage | 분석 실행 및 진행률 모니터링 |
| `/metrics` | MetricsPage | 인지도/지지도 점수 |
| `/sentiment` | SentimentPage | 감성 분포 |
| `/swot` | SwotPage | SWOT 분석 |
| `/risk` | RiskPage | 리스크 분석 |
| `/trend` | TrendPage | 추세 분석 |
| `/issues` | IssuesPage | 이슈 레이더 |
| `/timeline` | TimelinePage | 타임라인 |
| `/regions` | RegionsPage | 지역분석 |
| `/candidates` | CandidatesPage | 후보자 관리 |
| `/reports` | ReportsPage | 보고서 다운로드 |

### 6.2 상태 관리 (Zustand)

**analysisStore.ts:**
```typescript
interface AnalysisStore {
  // 상태
  isRunning: boolean
  currentPhase: string
  progress: number
  analysisId: number | null
  result: AnalysisResult | null
  completedAnalyses: CompletedAnalysis[]
  startedAt: number | null

  // 액션
  startAnalysis: (analysisId: number) => void
  updateProgress: (phase: string, progress: number) => void
  completeAnalysis: (result: AnalysisResult) => void
  reset: () => void
}

// localStorage 영속화 (isRunning 제외)
persist: ['analysisId', 'result', 'completedAnalyses', 'startedAt']
```

**settingsStore.ts:**
```typescript
interface SettingsStore {
  // 서버에서 로드
  electionName: string      // "2026년 제8회 전국동시지방선거"
  regionName: string        // "사천시"
  candidateName: string     // 후보자명
  subRegions: string[]      // 14개 읍면동

  // 사용자 설정
  periodStart: string
  periodEnd: string
  additionalKeywords: string[]
  theme: 'light' | 'dark'

  // 계산된 값
  getSearchPrefix: () => string
  getAnalysisPeriod: () => { start: string, end: string }
}
```

### 6.3 핵심 훅 (useAnalysis.ts)

```typescript
function useAnalysis() {
  // 분석 시작
  async function startAnalysis(request: AnalysisRequest) {
    const { analysis_id } = await api.post('/analyze', request)
    analysisStore.startAnalysis(analysis_id)
    startPolling(analysis_id)
  }

  // 진행률 폴링 (2초 간격)
  function startPolling(analysisId: number) {
    pollingRef.current = setInterval(async () => {
      const status = await api.get(`/status/${analysisId}`)
      analysisStore.updateProgress(status.phase, status.progress)

      if (status.status === 'completed') {
        stopPolling()
        const result = await api.get(`/result/${analysisId}`)
        analysisStore.completeAnalysis(result)
        triggerAutoDownload(analysisId)  // DOCX 자동 다운로드
      }
    }, 2000)
  }

  // 분석 취소
  async function cancelAnalysis() {
    await api.post(`/analyze/${analysisId}/cancel`)
    stopPolling()
    analysisStore.reset()
  }

  return { startAnalysis, cancelAnalysis, isRunning, progress }
}
```

### 6.4 API 클라이언트 (api.ts)

```typescript
// 환경별 baseURL 결정
function getBaseURL(): string {
  if (typeof window !== 'undefined') {
    return '/api'  // 클라이언트: 상대 경로
  }
  if (process.env.DOCKER_ENV) {
    return 'http://localhost:8000/api'  // Docker
  }
  return process.env.NEXT_PUBLIC_API_URL + '/api'  // Cloud Run
}

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 300000,  // 5분
  headers: { 'Content-Type': 'application/json' }
})
```

---

## 7. 데이터 흐름

### 7.1 전체 데이터 흐름도

```
┌─────────────────────────────────────────────────────────────────────┐
│                        사용자 인터페이스                             │
├─────────────────────────────────────────────────────────────────────┤
│  [후보자 등록] → [분석 설정] → [분석 시작] → [결과 조회] → [보고서]  │
└───────┬─────────────┬─────────────┬─────────────┬───────────┬───────┘
        │             │             │             │           │
        ▼             ▼             ▼             ▼           ▼
┌───────────────────────────────────────────────────────────────────┐
│                      REST API Layer                               │
├───────────────────────────────────────────────────────────────────┤
│ POST /candidates  POST /analyze  GET /status  GET /result  GET /download │
└───────┬─────────────┬─────────────┬─────────────┬───────────┬─────┘
        │             │             │             │           │
        ▼             ▼             ▼             ▼           ▼
┌───────────────────────────────────────────────────────────────────┐
│                     Service Layer                                 │
├─────────────────┬─────────────────┬─────────────┬─────────────────┤
│ CandidateService│ AnalysisService │ProgressStore│ ReportService   │
└─────────────────┴────────┬────────┴──────┬──────┴─────────────────┘
                           │               │
        ┌──────────────────┼───────────────┘
        │                  │
        ▼                  ▼
┌───────────────┐  ┌───────────────┐
│ CollectionMgr │  │  LLMService   │
├───────────────┤  ├───────────────┤
│ - YouTube     │  │ - Claude API  │
│ - Naver       │  │ - Prompts     │
│ - Kakao       │  │ - JSON Parse  │
│ - Google      │  └───────────────┘
│ - LocalNews   │
└───────┬───────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────────┐
│                     Data Layer                                    │
├─────────────────┬─────────────────┬───────────────────────────────┤
│ DataRepository  │ CollectedItem   │ AnalysisSnapshot              │
│ (UPSERT logic)  │ PlatformStats   │ DailyMetrics                  │
└─────────────────┴─────────────────┴───────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────────┐
│                     Database                                      │
│                (SQLite / PostgreSQL)                              │
└───────────────────────────────────────────────────────────────────┘
```

### 7.2 분석 결과 데이터 구조

```json
{
  "analysis_id": 82,
  "status": "completed",
  "collection_stats": {
    "total_items": 156,
    "platforms": {
      "news": { "count": 45, "status": "completed" },
      "youtube": { "count": 12, "views": 15000 },
      "naver_blog": { "count": 38 },
      "naver_cafe": { "count": 25 },
      "kakao_blog": { "count": 20 },
      "kakao_cafe": { "count": 16 }
    }
  },
  "candidates": [
    {
      "id": 1,
      "name": "홍길동",
      "recognition": {
        "score": 3.8,
        "reasoning": "...",
        "platform_analysis": { "news": 4.2, "youtube": 3.5 }
      },
      "support": {
        "score": 3.2,
        "sentiment_distribution": {
          "positive": 45,
          "negative": 25,
          "neutral": 30
        }
      },
      "sentiment": { ... },
      "swot": {
        "strengths": ["...", "..."],
        "weaknesses": ["..."],
        "opportunities": ["..."],
        "threats": ["..."]
      },
      "risk": {
        "level": "medium",
        "identified_risks": [...],
        "viral_risks": [...]
      },
      "trend": { ... },
      "issues": { ... },
      "timeline": { ... },
      "regions": { ... }
    }
  ],
  "comparison": {
    "recognition_ranking": [...],
    "support_ranking": [...]
  }
}
```

---

## 8. 핵심 디자인 패턴

### 8.1 싱글톤 패턴

```python
# Backend - lru_cache 활용
@lru_cache()
def get_settings() -> Settings:
    return Settings()

@lru_cache()
def get_collection_manager() -> CollectionManager:
    return CollectionManager()

@lru_cache()
def get_llm_service() -> LLMService:
    return LLMService()
```

```typescript
// Frontend - Zustand Store
const useAnalysisStore = create(
  persist(
    (set, get) => ({ ... }),
    { name: 'analysis-storage' }
  )
)
```

### 8.2 Repository 패턴

```python
class DataRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def upsert_collected_items(
        self,
        session_id: int,
        candidate_id: int,
        items: List[CollectorItem]
    ) -> Tuple[int, int, int]:
        # URL 기준 UPSERT 로직
        for item in items:
            existing = await self._find_by_url(item.url)
            if existing:
                await self._update_item(existing, item)
                updated += 1
            else:
                await self._create_item(session_id, candidate_id, item)
                new += 1
        return (len(items), new, updated)
```

### 8.3 팩토리 패턴

```python
class CollectionManager:
    def __init__(self):
        self.collectors = {
            'youtube': YouTubeCollector(),
            'naver': NaverCollector(),
            'kakao': KakaoCollector(),
            'google': GoogleSearchCollector(),
        }
        # 지역뉴스는 동적 생성
        self.local_news_collectors = {
            name: LocalNewsCollector(name)
            for name in ['news_sacheon', 'news_sacheon_news', ...]
        }
```

### 8.4 옵저버 패턴 (Progress Tracking)

```python
# Backend - Callback 기반 진행률 보고
async def run_analysis(..., progress_callback: Optional[callable]):
    await progress_callback(phase='collection', progress=10, message='수집 중...')
    # ... 작업 수행 ...
    await progress_callback(phase='sentiment', progress=30, message='감성 분석 중...')
```

```typescript
// Frontend - Polling 기반 상태 구독
function startPolling(analysisId: number) {
  setInterval(async () => {
    const status = await api.get(`/status/${analysisId}`)
    store.updateProgress(status.phase, status.progress)
  }, 2000)
}
```

### 8.5 전략 패턴 (Collector)

```python
class BaseCollector(ABC):
    @abstractmethod
    async def collect(self, query: str, max_results: int) -> List[CollectedItem]:
        pass

class YouTubeCollector(BaseCollector):
    async def collect(self, query: str, max_results: int = 20):
        # YouTube API 호출 로직

class NaverCollector(BaseCollector):
    async def collect(self, query: str, max_results: int = 20):
        # Naver API 호출 로직
```

### 8.6 Retry with Exponential Backoff

```python
async def _call_llm_with_retry(self, messages, max_retries=3):
    for attempt in range(max_retries):
        try:
            return await self.client.messages.create(...)
        except (RateLimitError, APIConnectionError) as e:
            if attempt == max_retries - 1:
                raise
            wait_time = 2 ** (attempt + 1)  # 2, 4, 8초
            await asyncio.sleep(wait_time)
```

---

## 9. API 엔드포인트

### 9.1 후보자 관리

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/candidates` | 후보자 목록 조회 |
| POST | `/api/candidates` | 후보자 생성 |
| PUT | `/api/candidates/{id}` | 후보자 수정 |
| DELETE | `/api/candidates/{id}` | 후보자 삭제 |

### 9.2 분석 실행

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/analyze` | 분석 시작 |
| GET | `/api/status/{id}` | 진행 상태 조회 |
| GET | `/api/result/{id}` | 분석 결과 조회 |
| POST | `/api/analyze/{id}/cancel` | 분석 취소 |
| POST | `/api/analyze/{id}/reanalyze/{module}` | 모듈 재분석 |

### 9.3 보고서 다운로드

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/download/{id}/docx` | DOCX 다운로드 |
| GET | `/api/download/{id}/pdf` | PDF 다운로드 |
| GET | `/api/download/{id}/section/{section}/docx` | 섹션별 DOCX |
| GET | `/api/download/{id}/section/{section}/pdf` | 섹션별 PDF |

### 9.4 데이터 조회

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/metrics/{candidate_id}` | 후보자 지표 |
| GET | `/api/trends/{candidate_id}` | 추세 데이터 |
| GET | `/api/articles/{candidate_id}` | 수집된 기사 |
| GET | `/api/settings` | 선거 설정 |

### 9.5 요청/응답 예시

**분석 시작 (POST /api/analyze):**
```json
// Request
{
  "candidate_ids": [1, 2],
  "period_start": "2026-01-01",
  "period_end": "2026-01-21",
  "data_sources": {
    "google": true,
    "news": true,
    "youtube": true,
    "naver_blog": true,
    "naver_cafe": true,
    "kakao_blog": true,
    "kakao_cafe": true,
    "news_sacheon": true
  },
  "selected_modules": ["recognition", "support", "sentiment", "swot"],
  "skip_collection": false
}

// Response
{
  "analysis_id": 82,
  "status": "pending",
  "candidates": [
    { "id": 1, "name": "홍길동" },
    { "id": 2, "name": "김철수" }
  ]
}
```

---

## 10. 설정 및 환경변수

### 10.1 필수 환경변수 (.env)

```bash
# LLM API
CLAUDE_API_KEY=sk-ant-...

# 데이터 수집 API
GOOGLE_API_KEY=AIza...
NAVER_API_CLIENT_ID=...
NAVER_API_CLIENT_SECRET=...
KAKAO_REST_API_KEY=...

# 데이터베이스
DATABASE_URL=sqlite:///./data/election.db

# Cloud SQL (프로덕션)
INSTANCE_CONNECTION_NAME=project:region:instance
DB_USER=postgres
DB_PASS=...
DB_NAME=election

# Redis (선택)
REDIS_URL=redis://localhost:6379

# 선거 설정
ELECTION_NAME=2026년 제8회 전국동시지방선거
REGION_NAME=사천시
```

### 10.2 API 할당량

| API | 일일 한도 | 대응 전략 |
|-----|----------|----------|
| YouTube Data API | 10,000 units | 쿼리 최적화 |
| Naver Search API | 25,000 requests | 충분 |
| Kakao Search API | 10 req/sec | 0.1초 딜레이 |
| Claude API | 토큰 제한 | 분할 호출, 캐싱 |

### 10.3 예상 실행 시간

| 단계 | 소요 시간 |
|------|----------|
| 병렬 수집 | ~60초 |
| 기본 분석 (감성) | 30-45초 |
| 지표 계산 (인지도/지지도) | 45-60초 |
| 종합 분석 (6개 모듈) | 90-150초 |
| 보고서 생성 | 20-30초 |
| **전체** | **5-7분** |

---

## 부록

### A. 한국어 도메인 용어

| 용어 | 영문 | 설명 |
|------|------|------|
| 인지도 | Recognition | 미디어 노출도 지표 (0-5) |
| 지지도 | Support | 감성 기반 지지도 (0-5) |
| 감성 | Sentiment | positive/negative/neutral |
| 바이럴 리스크 | Viral Risk | SNS 확산 위험도 |
| 사천시 | Sacheon-si | 분석 대상 지역 |
| 읍면동 | Sub-region | 14개 하위 행정구역 |

### B. 파일 참조

| 파일 | 설명 |
|------|------|
| [main.py](backend/app/main.py) | FastAPI 앱 진입점 |
| [config.py](backend/app/config.py) | 설정 관리 |
| [database.py](backend/app/database.py) | DB 모델 |
| [routes.py](backend/app/api/routes.py) | API 엔드포인트 |
| [analysis_service.py](backend/app/services/analysis_service.py) | 분석 파이프라인 |
| [llm_service.py](backend/app/services/llm_service.py) | Claude API |
| [api.ts](frontend/src/lib/api.ts) | API 클라이언트 |
| [analysisStore.ts](frontend/src/stores/analysisStore.ts) | 상태 관리 |
| [useAnalysis.ts](frontend/src/hooks/useAnalysis.ts) | 분석 훅 |

---

*문서 생성일: 2026-01-22*
*CampOne v2.0*
