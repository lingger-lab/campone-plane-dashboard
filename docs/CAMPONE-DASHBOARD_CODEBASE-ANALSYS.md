# CampOne Dashboard - 코드베이스 아키텍처 문서

> 이 문서는 CampOne 관리자 대시보드의 전반적인 아키텍처, 생명주기, 데이터 흐름을 설명합니다.

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | CampOne 관리자 대시보드 (캠프원 관리자 대시보드) |
| **목적** | 정치 캠프 운영을 위한 통합 관리 플랫폼 |
| **프레임워크** | Next.js 14.2.0 (App Router) |
| **언어** | TypeScript 5.3.3 |
| **배포** | Docker → Google Cloud Run |

### 핵심 모듈 (5개)

| 모듈 | 경로 | 설명 |
|------|------|------|
| **Insights (Pulse)** | `/pulse` | 여론 트렌드 분석 (Google Trends, Naver, SNS) |
| **Studio** | `/studio` | 콘텐츠 제작 및 배포 |
| **Policy Lab** | `/policy` | 공약 관리 및 정책 정보 |
| **Ops** | `/ops` | 캠프 운영 체크리스트 |
| **Civic Hub** | `/hub` | 메시징 및 시민 소통 |

---

## 2. 디렉토리 구조

```
campone-dashboard/
├── docs/                    # 문서
├── public/                  # 정적 파일 (이미지, favicon 등)
├── src/
│   ├── app/                 # Next.js App Router 페이지
│   │   ├── (modules)/       # 모듈 라우트 그룹 (공유 레이아웃)
│   │   │   ├── layout.tsx   # 모듈 공유 레이아웃
│   │   │   ├── pulse/       # Insights 모듈
│   │   │   ├── studio/      # Studio 모듈
│   │   │   ├── policy/      # Policy Lab 모듈
│   │   │   ├── ops/         # Ops 모듈
│   │   │   └── hub/         # Civic Hub 모듈
│   │   ├── api/             # API Routes
│   │   │   └── auth/        # NextAuth 엔드포인트
│   │   ├── audit/           # 활동 로그 페이지
│   │   ├── channels/        # 채널 관리 페이지
│   │   ├── help/            # 도움말 페이지
│   │   ├── login/           # 로그인 페이지
│   │   ├── roles/           # 권한 관리 페이지
│   │   ├── settings/        # 설정 페이지
│   │   ├── layout.tsx       # Root 레이아웃
│   │   ├── page.tsx         # 대시보드 홈
│   │   └── providers.tsx    # 전역 프로바이더
│   ├── components/
│   │   ├── ui/              # 기본 UI 컴포넌트 (shadcn/ui)
│   │   ├── layout/          # 레이아웃 컴포넌트 (Header, Sidebar, Footer)
│   │   ├── dashboard/       # 대시보드 전용 컴포넌트
│   │   └── modules/         # 모듈 전용 컴포넌트
│   ├── lib/                 # 유틸리티 및 핵심 로직
│   │   ├── types.ts         # TypeScript 타입 정의 (330줄)
│   │   ├── rbac.ts          # 권한 시스템 (196줄)
│   │   ├── trendIndex.ts    # 여론 지수 계산 (160줄)
│   │   ├── formatters.ts    # 포맷팅 유틸리티 (240줄)
│   │   └── utils.ts         # 공통 유틸리티 (132줄)
│   ├── mocks/               # MSW Mock 데이터
│   │   ├── browser.ts       # MSW 브라우저 설정
│   │   ├── handlers.ts      # API 핸들러 정의
│   │   └── data/            # JSON Mock 데이터
│   └── styles/
│       └── globals.css      # 전역 스타일
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
├── Dockerfile
└── cloudbuild.yaml
```

---

## 3. 애플리케이션 생명주기

### 3.1 초기화 흐름

```
브라우저 요청
    ↓
┌─────────────────────────────────────────────────────┐
│  1. Root Layout (layout.tsx)                        │
│     - HTML 구조 설정 (lang="ko")                     │
│     - 메타데이터 설정 (SEO, OG)                      │
│     - Providers 래핑                                │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│  2. Providers (providers.tsx)                       │
│     ├─ SessionProvider (next-auth)                  │
│     ├─ QueryClientProvider (TanStack Query)         │
│     ├─ ThemeProvider (next-themes)                  │
│     └─ MSW 초기화 (개발 환경만)                      │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│  3. 페이지별 레이아웃                                │
│     ├─ / (대시보드): 단독 페이지                     │
│     └─ /(modules)/*: 공유 레이아웃                  │
│        ├─ AppHeader                                 │
│        ├─ Sidebar                                   │
│        ├─ Main Content                              │
│        └─ AppFooter                                 │
└─────────────────────────────────────────────────────┘
```

### 3.2 Providers 초기화 상세

```typescript
// src/app/providers.tsx

export function Providers({ children }) {
  // 1. TanStack Query 클라이언트 초기화
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,  // 1분간 캐시 유지
        refetchOnWindowFocus: false,
      },
    },
  }));

  // 2. MSW 초기화 (개발 환경)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('@/mocks/browser').then(({ startMSW }) => {
        startMSW();
      });
    }
  }, []);

  // 3. Provider 계층 구조
  return (
    <SessionProvider>           {/* 인증 컨텍스트 */}
      <QueryClientProvider>     {/* 서버 상태 관리 */}
        <ThemeProvider>         {/* 다크모드 지원 */}
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
```

---

## 4. 상태 관리 아키텍처

### 4.1 상태 관리 계층

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: Server State (TanStack Query)             │
│  - API 응답 데이터 캐싱                              │
│  - staleTime: 1분                                   │
│  - refetchOnWindowFocus: false                      │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 2: Global State (Zustand) - 준비됨           │
│  - 사용자 정보                                       │
│  - 테마 설정                                         │
│  - 알림 상태                                         │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Layer 3: Local State (React useState)              │
│  - UI 상태 (사이드바 접힘, 모달 열림 등)             │
│  - 폼 입력 상태                                      │
└─────────────────────────────────────────────────────┘
```

### 4.2 데이터 흐름

```
사용자 액션
    ↓
컴포넌트 이벤트 핸들러
    ↓
┌─────────────────────────────────────────────────────┐
│  TanStack Query                                     │
│  ├─ useQuery: 데이터 조회                           │
│  ├─ useMutation: 데이터 변경                        │
│  └─ queryClient.invalidateQueries: 캐시 무효화     │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│  API Layer (MSW Mock / 실제 백엔드)                 │
│  Base URL: /api/v1/*                                │
└─────────────────────────────────────────────────────┘
    ↓
컴포넌트 리렌더링
```

---

## 5. API 및 데이터 처리

### 5.1 API 구조

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/api/v1/contacts` | GET, POST | 연락처 목록/생성 |
| `/api/v1/contacts/:id` | GET, PUT, DELETE | 연락처 상세/수정/삭제 |
| `/api/v1/segments` | GET, POST | 세그먼트 목록/생성 |
| `/api/v1/segments/:id/build` | POST | 세그먼트 빌드 작업 |
| `/api/v1/messages` | GET, POST | 메시지 목록/생성 |
| `/api/v1/messages/:id/metrics` | GET | 메시지 지표 |
| `/api/v1/messages/preview` | POST | 메시지 미리보기 |
| `/api/v1/messages/send` | POST | 메시지 발송 |
| `/api/v1/events` | GET, POST | 이벤트 목록/생성 |
| `/api/v1/donations` | GET | 기부금 목록 |
| `/api/v1/donations/stats` | GET | 기부금 통계 |
| `/api/v1/tasks` | GET | 태스크 목록 |
| `/api/v1/tasks/:id` | GET, PATCH | 태스크 상세/수정 |
| `/api/v1/trends` | GET | 여론 트렌드 데이터 |
| `/api/v1/trends/index` | GET | 합성 트렌드 지수 |
| `/api/v1/trends/alerts` | GET | 트렌드 알림 |
| `/api/v1/channels` | GET | 채널 링크 목록 |
| `/api/v1/banners/presets` | GET | 배너 프리셋 |
| `/api/v1/banners/render` | POST | 배너 렌더링 |
| `/api/v1/alerts` | GET | 알림 목록 |
| `/api/v1/audit` | GET | 감사 로그 |
| `/api/v1/dashboard/kpis` | GET | 대시보드 KPI |

### 5.2 MSW Mock 처리

```typescript
// src/mocks/handlers.ts

const API_BASE = '/api/v1';
const DELAY_MS = 200;  // 로딩 상태 테스트용 지연

// Mock 데이터는 JSON 파일에서 로드
import contacts from './data/contacts.json';
import segments from './data/segments.json';
// ...

export const handlers = [
  http.get(`${API_BASE}/contacts`, async () => {
    await delay(DELAY_MS);
    return HttpResponse.json({
      items: contacts,
      total: contacts.length,
    });
  }),
  // ...
];
```

### 5.3 Mock 데이터 파일

```
src/mocks/data/
├── contacts.json      # 연락처 목록
├── segments.json      # 세그먼트
├── messages.json      # 메시지
├── events.json        # 이벤트
├── donations.json     # 기부금
├── tasks.json         # 태스크
├── assets.json        # 미디어 자산
├── trends.json        # 여론 지수 원본 데이터
├── trends.config.json # 트렌드 가중치 설정
├── channelLinks.json  # 채널 링크
├── alerts.json        # 알림
└── audit.json         # 감사 로그
```

---

## 6. 인증 시스템

### 6.1 NextAuth 설정

```typescript
// src/app/api/auth/[...nextauth]/route.ts

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: '이메일', type: 'email' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials) {
        // 데모용: 하드코딩된 계정
        // 실제 서비스에서는 DB 조회 필수
        if (credentials?.email === 'admin@campone.cloud' &&
            credentials?.password === 'admin123') {
          return { id: '1', email: '...', name: '관리자', role: 'admin' };
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24시간
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.role = token.role;
      return session;
    },
  },
});
```

### 6.2 인증 흐름

```
사용자 로그인 시도
    ↓
/login 페이지
    ↓
signIn('credentials', { email, password })
    ↓
NextAuth authorize() 콜백
    ↓
┌─────────────────────────────────────────────────────┐
│  성공: JWT 토큰 발급                                 │
│  - 토큰에 role 포함                                 │
│  - 세션 24시간 유지                                 │
└─────────────────────────────────────────────────────┘
    ↓
SessionProvider로 세션 공유
    ↓
useSession() 훅으로 접근
```

---

## 7. 권한 시스템 (RBAC)

### 7.1 역할 정의

| 역할 | 설명 | 주요 권한 |
|------|------|----------|
| **Admin** | 관리자 | 모든 기능 전체 권한 |
| **Manager** | 매니저 | 역할/권한 관리 제외 대부분 권한 |
| **Staff** | 스태프 | 제한된 생성/수정 (일부 승인 필요) |
| **Viewer** | 뷰어 | 읽기 전용 |

### 7.2 권한 매트릭스

```typescript
// src/lib/rbac.ts

export const permissions: Permission[] = [
  // Contacts
  { entity: 'contacts', action: 'read',   roles: ['Admin', 'Manager', 'Staff', 'Viewer'] },
  { entity: 'contacts', action: 'create', roles: ['Admin', 'Manager', 'Staff'] },
  { entity: 'contacts', action: 'update', roles: ['Admin', 'Manager', 'Staff'] },
  { entity: 'contacts', action: 'delete', roles: ['Admin', 'Manager'] },

  // Messages
  { entity: 'messages', action: 'send', roles: ['Admin', 'Manager'] },  // Staff는 승인 필요

  // Roles (Admin 전용)
  { entity: 'roles', action: 'read',   roles: ['Admin'] },
  { entity: 'roles', action: 'create', roles: ['Admin'] },
  { entity: 'roles', action: 'update', roles: ['Admin'] },
  { entity: 'roles', action: 'delete', roles: ['Admin'] },
  // ...
];
```

### 7.3 권한 확인 함수

```typescript
// 권한 확인
hasPermission(role: UserRole, entity: string, action: string): boolean

// 승인 필요 여부 확인
needsApproval(role: UserRole, entity: string, action: string): boolean

// 권한 체커 객체 생성
createPermissionChecker(role: UserRole): PermissionCheck
```

---

## 8. 여론 지수 계산

### 8.1 합성 지수 공식

```
TrendIndex = GT × 0.30 + NV × 0.30 + SNS × 0.40

- GT: Google Trends (0-100)
- NV: Naver 검색 지수 (0-100)
- SNS: SNS 감성 정규화 값 (0-100)
```

### 8.2 SNS 정규화

```typescript
// src/lib/trendIndex.ts

function normalizeSNS(mentions: number, positive: number, negative: number): number {
  if (mentions === 0) return 50;

  // 감성 비율 계산 (-1 ~ 1)
  const sentimentRatio = (positive - negative) / mentions;

  // 0-100 스케일로 변환
  const normalized = 50 + sentimentRatio * 50;

  return clamp01(normalized);  // 0-100 범위로 제한
}
```

### 8.3 급증 감지

```typescript
// 전일 대비 20% 이상 증가 시 급증으로 판단
function detectSpike(data: TrendData[], threshold: number = 0.2): TrendSpike[] {
  // Google, Naver, SNS 각각에 대해 급증 감지
  // ...
}
```

---

## 9. 라우팅 구조

### 9.1 App Router 구조

```
src/app/
├── layout.tsx              # Root 레이아웃 (모든 페이지 공통)
├── page.tsx                # 대시보드 홈 (/)
├── (modules)/              # 라우트 그룹 (URL에 영향 없음)
│   ├── layout.tsx          # 모듈 공유 레이아웃 (Header + Sidebar + Footer)
│   ├── pulse/
│   │   ├── page.tsx        # /pulse
│   │   └── manage/
│   │       └── page.tsx    # /pulse/manage
│   ├── studio/
│   │   ├── page.tsx        # /studio
│   │   ├── manage/
│   │   │   └── page.tsx    # /studio/manage
│   │   └── banners/
│   │       └── page.tsx    # /studio/banners
│   ├── policy/
│   │   ├── page.tsx        # /policy
│   │   └── manage/
│   │       └── page.tsx    # /policy/manage
│   ├── ops/
│   │   ├── page.tsx        # /ops
│   │   └── manage/
│   │       └── page.tsx    # /ops/manage
│   └── hub/
│       ├── page.tsx        # /hub
│       └── manage/
│           └── page.tsx    # /hub/manage
├── audit/page.tsx          # /audit
├── channels/page.tsx       # /channels
├── help/page.tsx           # /help
├── login/page.tsx          # /login
├── roles/page.tsx          # /roles
└── settings/page.tsx       # /settings
```

### 9.2 레이아웃 계층

```
RootLayout (layout.tsx)
    │
    ├── / (대시보드)
    │   └── 단독 페이지 (레이아웃 없음)
    │
    └── /(modules)/* (모듈 페이지들)
        └── ModulesLayout (layout.tsx)
            ├── AppHeader (검색, 알림, 프로필)
            ├── Sidebar (네비게이션, 채널 링크)
            ├── Main Content (동적 콘텐츠)
            └── AppFooter (빠른 링크, 저작권)
```

---

## 10. 컴포넌트 아키텍처

### 10.1 컴포넌트 분류

```
components/
├── ui/                  # 원시 UI (Radix UI + shadcn/ui)
│   ├── button.tsx       # 버튼
│   ├── card.tsx         # 카드
│   ├── badge.tsx        # 배지
│   ├── input.tsx        # 입력
│   └── dialog.tsx       # 모달
│
├── layout/              # 앱 셸
│   ├── AppHeader.tsx    # 헤더 (검색, 알림, 프로필)
│   ├── Sidebar.tsx      # 사이드바 (네비게이션)
│   └── AppFooter.tsx    # 푸터
│
├── dashboard/           # 대시보드 전용
│   ├── KPICard.tsx      # KPI 지표 카드
│   └── ModuleCard.tsx   # 모듈 카드
│
└── modules/             # 모듈 전용
    └── ModulePoster.tsx # 모듈 포스터
```

### 10.2 컴포넌트 설계 원칙

1. **Composition Pattern**: Radix UI 기반 조합형 설계
2. **Props 타입 안전성**: TypeScript 인터페이스 정의
3. **스타일 유틸리티**: `cn()` 함수로 Tailwind 클래스 병합
4. **반응형 설계**: 모바일 우선 접근

---

## 11. 스타일 시스템

### 11.1 Tailwind 설정

```typescript
// tailwind.config.ts

const config = {
  darkMode: ['class'],  // 다크모드 class 전략
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',     // 브랜드 파란색
        accent: '#22C55E',      // 강조 초록색
        success: '#22C55E',
        warning: '#FACC15',
        danger: '#EF4444',
      },
      fontSize: {
        'headline-1': ['2rem', { lineHeight: '2.5rem' }],
        'headline-2': ['1.5rem', { lineHeight: '2rem' }],
        'headline-3': ['1.25rem', { lineHeight: '1.75rem' }],
        'body-lg': ['1rem', { lineHeight: '1.5rem' }],
        'body-md': ['0.875rem', { lineHeight: '1.25rem' }],
        'body-sm': ['0.75rem', { lineHeight: '1rem' }],
        'caption': ['0.625rem', { lineHeight: '0.875rem' }],
      },
    },
  },
};
```

### 11.2 클래스 병합 유틸리티

```typescript
// src/lib/utils.ts

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 사용 예시
<div className={cn(
  'base-class',
  isActive && 'active-class',
  variant === 'primary' ? 'primary-class' : 'secondary-class'
)} />
```

---

## 12. 데이터베이스 및 스키마 모델링

### 12.1 현재 상태: 완전 모킹 (No Database)

현재 프로젝트는 **실제 데이터베이스 연결 없이** MSW(Mock Service Worker)를 통한 클라이언트 사이드 모킹만 사용합니다.

```
┌─────────────────────────────────────────────────────────────────┐
│  현재 데이터 흐름 (Mock 기반)                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   브라우저                                                       │
│      │                                                          │
│      ▼                                                          │
│   fetch('/api/v1/contacts')                                     │
│      │                                                          │
│      ▼                                                          │
│   ┌─────────────────────────────────────┐                       │
│   │  MSW Service Worker (인터셉트)       │                       │
│   │  - public/mockServiceWorker.js      │                       │
│   └─────────────────────────────────────┘                       │
│      │                                                          │
│      ▼                                                          │
│   ┌─────────────────────────────────────┐                       │
│   │  src/mocks/handlers.ts              │                       │
│   │  - 요청 패턴 매칭                    │                       │
│   │  - 200ms 인위적 지연                │                       │
│   └─────────────────────────────────────┘                       │
│      │                                                          │
│      ▼                                                          │
│   ┌─────────────────────────────────────┐                       │
│   │  src/mocks/data/*.json              │                       │
│   │  - 정적 JSON 파일에서 데이터 로드    │                       │
│   │  - 런타임 중 변경 불가 (새로고침 리셋)│                       │
│   └─────────────────────────────────────┘                       │
│      │                                                          │
│      ▼                                                          │
│   HttpResponse.json() 반환                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Mock 데이터 파일 목록:**

| 파일 | 레코드 수 | 설명 |
|------|----------|------|
| `contacts.json` | 10 | 연락처 (지지자/후원자/자원봉사자) |
| `segments.json` | 6 | 타겟 세그먼트 |
| `messages.json` | 5 | SMS/카카오/이메일 메시지 |
| `events.json` | 6 | 캠프 이벤트 |
| `donations.json` | 8 | 후원금 내역 |
| `tasks.json` | 10 | 업무 태스크 |
| `assets.json` | 10 | 미디어 자산 |
| `trends.json` | 10 | 일별 여론 지수 |
| `alerts.json` | 6 | 시스템/워크플로우 알림 |
| `audit.json` | 8 | 감사 로그 |
| `channelLinks.json` | 5 | SNS 채널 링크 |

---

### 12.2 엔티티 관계 다이어그램 (ERD)

현재 Mock 데이터를 기반으로 분석한 엔티티 관계:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CampOne ERD (설계안)                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │       │   Contact   │       │   Segment   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ name        │       │ firstName   │       │ name        │
│ email       │       │ lastName    │       │ criteria    │ ← JSON
│ password    │       │ phone       │       │ size        │
│ role        │       │ email       │       │ updatedAt   │
│ avatar      │       │ region      │       └──────┬──────┘
│ createdAt   │       │ optIn       │              │
└──────┬──────┘       │ createdAt   │              │ M:N
       │              └──────┬──────┘              │
       │                     │                     │
       │              ┌──────┴──────┐       ┌──────┴──────┐
       │              │ ContactTag  │       │SegmentContact│
       │              ├─────────────┤       ├─────────────┤
       │              │ contactId   │       │ segmentId   │
       │              │ tag         │       │ contactId   │
       │              └─────────────┘       └─────────────┘
       │
       │ 1:N
       ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  Campaign   │ 1:N   │   Message   │       │   Event     │
├─────────────┤──────▶├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ name        │       │ campaignId  │       │ title       │
│ description │       │ channel     │       │ type        │
│ segmentId   │       │ templateId  │       │ location    │
│ status      │       │ subject     │       │ start       │
│ createdAt   │       │ body        │       │ end         │
│ updatedAt   │       │ status      │       │ attendeeTarget│
└─────────────┘       │ sendAt      │       │ status      │
                      │ abGroup     │       └─────────────┘
                      │ metrics     │ ← JSON (sent, delivered, opened, replied)
                      └─────────────┘

┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  Donation   │       │    Task     │       │   Asset     │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ donorId (FK)│──────▶│ title       │       │ name        │
│ amount      │Contact│ assignee    │       │ type        │
│ method      │       │ due         │       │ url         │
│ createdAt   │       │ status      │       └──────┬──────┘
└─────────────┘       │ module      │              │
                      └─────────────┘              │
                                            ┌──────┴──────┐
                                            │  AssetTag   │
                                            ├─────────────┤
                                            │ assetId     │
                                            │ tag         │
                                            └─────────────┘

┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  TrendData  │       │    Alert    │       │  AuditLog   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ date        │       │ type        │       │ userId (FK) │
│ google      │       │ severity    │       │ userName    │
│ naver       │       │ title       │       │ action      │
│ snsMentions │       │ message     │       │ module      │
│ snsPos      │       │ read        │       │ target      │
│ snsNeg      │       │ pinned      │       │ details     │ ← JSON
└─────────────┘       │ createdAt   │       │ createdAt   │
                      └─────────────┘       └─────────────┘

┌─────────────┐
│ ChannelLink │
├─────────────┤
│ key (PK)    │
│ url         │
│ label       │
│ visible     │
└─────────────┘
```

---

### 12.3 추천 기술 스택

#### Option A: PostgreSQL + Prisma (추천)

| 구성 요소 | 기술 | 이유 |
|----------|------|------|
| **Database** | PostgreSQL 15+ | JSON 컬럼 지원, 안정성, Cloud SQL 호환 |
| **ORM** | Prisma 5.x | 타입 안전성, 마이그레이션 자동화, Next.js 공식 지원 |
| **Connection** | Prisma Client | 커넥션 풀링, Edge 런타임 지원 |
| **Hosting** | Google Cloud SQL | 기존 GCP 인프라와 통합 |

```
┌─────────────────────────────────────────────────────────────────┐
│  프로덕션 데이터 흐름 (Prisma 기반)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   브라우저                                                       │
│      │                                                          │
│      ▼                                                          │
│   fetch('/api/v1/contacts')                                     │
│      │                                                          │
│      ▼                                                          │
│   ┌─────────────────────────────────────┐                       │
│   │  Next.js API Route                  │                       │
│   │  src/app/api/v1/contacts/route.ts   │                       │
│   └─────────────────────────────────────┘                       │
│      │                                                          │
│      ▼                                                          │
│   ┌─────────────────────────────────────┐                       │
│   │  Prisma Client                      │                       │
│   │  - 타입 안전 쿼리                    │                       │
│   │  - 자동 커넥션 풀링                  │                       │
│   └─────────────────────────────────────┘                       │
│      │                                                          │
│      ▼                                                          │
│   ┌─────────────────────────────────────┐                       │
│   │  PostgreSQL (Cloud SQL)             │                       │
│   │  - 실제 데이터 저장                  │                       │
│   │  - 트랜잭션 지원                     │                       │
│   └─────────────────────────────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Option B: Supabase (빠른 MVP)

| 구성 요소 | 기술 | 이유 |
|----------|------|------|
| **Database** | Supabase (PostgreSQL) | 호스팅/인증/API 통합 |
| **ORM** | Supabase Client | 실시간 구독, Row Level Security |
| **Auth** | Supabase Auth | NextAuth 대체 가능 |

#### Option C: PlanetScale + Drizzle (서버리스 최적화)

| 구성 요소 | 기술 | 이유 |
|----------|------|------|
| **Database** | PlanetScale (MySQL) | 서버리스, 브랜칭, Edge 호환 |
| **ORM** | Drizzle ORM | 경량, SQL-like 문법, 빠른 빌드 |

---

### 12.4 Prisma 스키마 설계안

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// 사용자 및 인증
// ============================================

enum UserRole {
  Admin
  Manager
  Staff
  Viewer
}

model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String
  password  String    // bcrypt 해시
  role      UserRole  @default(Staff)
  avatar    String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  // Relations
  donations   Donation[]
  auditLogs   AuditLog[]
  tasks       Task[]     @relation("AssignedTasks")
  createdTasks Task[]    @relation("CreatedTasks")

  @@map("users")
}

// ============================================
// 연락처 및 세그먼트
// ============================================

model Contact {
  id        String   @id @default(cuid())
  firstName String
  lastName  String
  phone     String?
  email     String?
  region    String
  optIn     Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  tags      ContactTag[]
  segments  SegmentContact[]
  donations Donation[]

  @@index([region])
  @@index([optIn])
  @@map("contacts")
}

model ContactTag {
  id        String  @id @default(cuid())
  contactId String
  tag       String

  contact   Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@unique([contactId, tag])
  @@index([tag])
  @@map("contact_tags")
}

model Segment {
  id        String   @id @default(cuid())
  name      String
  criteria  Json     // { region?: string | string[], tags?: string[] }
  size      Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  contacts  SegmentContact[]
  campaigns Campaign[]

  @@map("segments")
}

model SegmentContact {
  segmentId String
  contactId String

  segment   Segment @relation(fields: [segmentId], references: [id], onDelete: Cascade)
  contact   Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@id([segmentId, contactId])
  @@map("segment_contacts")
}

// ============================================
// 캠페인 및 메시지
// ============================================

enum CampaignStatus {
  draft
  active
  completed
  paused
}

model Campaign {
  id          String         @id @default(cuid())
  name        String
  description String?
  segmentId   String
  status      CampaignStatus @default(draft)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  // Relations
  segment     Segment   @relation(fields: [segmentId], references: [id])
  messages    Message[]

  @@map("campaigns")
}

enum MessageChannel {
  sms
  kakao
  email
}

enum MessageStatus {
  draft
  scheduled
  sent
  failed
}

enum ABGroup {
  A
  B
}

model Message {
  id          String         @id @default(cuid())
  campaignId  String
  channel     MessageChannel
  templateId  String?
  subject     String?
  body        String
  status      MessageStatus  @default(draft)
  sendAt      DateTime?
  abGroup     ABGroup?

  // 메트릭스 (비정규화)
  metricsSent      Int @default(0)
  metricsDelivered Int @default(0)
  metricsOpened    Int @default(0)
  metricsReplied   Int @default(0)

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relations
  campaign    Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@index([status])
  @@index([sendAt])
  @@map("messages")
}

// ============================================
// 이벤트
// ============================================

enum EventType {
  offline   @map("오프라인")
  online    @map("온라인")
  hybrid    @map("하이브리드")
}

enum EventStatus {
  planning
  scheduled
  completed
  cancelled
}

model Event {
  id             String      @id @default(cuid())
  title          String
  type           EventType
  location       String
  start          DateTime
  end            DateTime
  attendeeTarget Int         @default(0)
  status         EventStatus @default(planning)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  @@index([status])
  @@index([start])
  @@map("events")
}

// ============================================
// 기부금
// ============================================

enum DonationMethod {
  card
  bank
  cash
}

model Donation {
  id        String         @id @default(cuid())
  donorId   String
  amount    Int            // 원화 (KRW)
  method    DonationMethod
  createdAt DateTime       @default(now())

  // Relations
  donor     Contact        @relation(fields: [donorId], references: [id])

  @@index([createdAt])
  @@map("donations")
}

// ============================================
// 태스크
// ============================================

enum TaskStatus {
  todo
  in_progress
  done
}

enum ModuleName {
  Insights
  Studio
  Policy
  Ops
  Hub
}

model Task {
  id         String     @id @default(cuid())
  title      String
  assigneeId String
  creatorId  String
  due        DateTime
  status     TaskStatus @default(todo)
  module     ModuleName
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  // Relations
  assignee   User       @relation("AssignedTasks", fields: [assigneeId], references: [id])
  creator    User       @relation("CreatedTasks", fields: [creatorId], references: [id])

  @@index([status])
  @@index([due])
  @@index([module])
  @@map("tasks")
}

// ============================================
// 미디어 자산
// ============================================

model Asset {
  id        String     @id @default(cuid())
  name      String
  type      String     // MIME type
  url       String
  size      Int?       // bytes
  createdAt DateTime   @default(now())

  // Relations
  tags      AssetTag[]

  @@map("assets")
}

model AssetTag {
  id      String @id @default(cuid())
  assetId String
  tag     String

  asset   Asset  @relation(fields: [assetId], references: [id], onDelete: Cascade)

  @@unique([assetId, tag])
  @@index([tag])
  @@map("asset_tags")
}

// ============================================
// 여론 트렌드
// ============================================

model TrendData {
  id          String   @id @default(cuid())
  date        DateTime @unique @db.Date
  google      Int      // 0-100
  naver       Int      // 0-100
  snsMentions Int
  snsPos      Int
  snsNeg      Int
  createdAt   DateTime @default(now())

  @@index([date])
  @@map("trend_data")
}

// ============================================
// 알림
// ============================================

enum AlertType {
  system
  workflow
}

enum AlertSeverity {
  info
  warning
  error
  success
}

model Alert {
  id        String        @id @default(cuid())
  type      AlertType
  severity  AlertSeverity
  title     String
  message   String
  read      Boolean       @default(false)
  pinned    Boolean       @default(false)
  createdAt DateTime      @default(now())

  @@index([read])
  @@index([createdAt])
  @@map("alerts")
}

// ============================================
// 감사 로그
// ============================================

model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  userName  String   // 비정규화 (빠른 조회용)
  action    String   // create, read, update, delete, send, approve
  module    String   // Insights, Studio, Policy, Ops, Hub, System
  target    String   // "세그먼트: 서울 지지자"
  details   Json?    // 상세 정보 (변경 전/후 값 등)
  createdAt DateTime @default(now())

  // Relations
  user      User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([module])
  @@index([createdAt])
  @@map("audit_logs")
}

// ============================================
// 채널 링크
// ============================================

model ChannelLink {
  key       String   @id
  url       String
  label     String
  visible   Boolean  @default(true)
  updatedAt DateTime @updatedAt

  @@map("channel_links")
}
```

---

### 12.5 마이그레이션 가이드

#### Phase 1: 환경 설정

```bash
# 1. Prisma 설치
npm install prisma @prisma/client
npm install -D prisma

# 2. Prisma 초기화
npx prisma init

# 3. 환경 변수 설정 (.env)
DATABASE_URL="postgresql://user:password@localhost:5432/campone?schema=public"
```

#### Phase 2: 스키마 생성 및 마이그레이션

```bash
# 1. 스키마 파일 생성 (위 12.4 내용을 prisma/schema.prisma에 저장)

# 2. 마이그레이션 생성 및 적용
npx prisma migrate dev --name init

# 3. Prisma Client 생성
npx prisma generate

# 4. (선택) Prisma Studio로 데이터 확인
npx prisma studio
```

#### Phase 3: API Routes 생성

```typescript
// src/app/api/v1/contacts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const contacts = await prisma.contact.findMany({
    include: {
      tags: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return NextResponse.json({
    items: contacts.map(c => ({
      ...c,
      tags: c.tags.map(t => t.tag),
    })),
    total: contacts.length,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const contact = await prisma.contact.create({
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      email: body.email,
      region: body.region,
      optIn: body.optIn ?? false,
      tags: {
        create: (body.tags || []).map((tag: string) => ({ tag })),
      },
    },
    include: {
      tags: true,
    },
  });

  return NextResponse.json(contact, { status: 201 });
}
```

#### Phase 4: Prisma Client 싱글톤

```typescript
// src/lib/prisma.ts

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

#### Phase 5: MSW 제거/분리

```typescript
// src/app/providers.tsx

export function Providers({ children }) {
  // MSW는 테스트 환경에서만 사용하도록 변경
  useEffect(() => {
    // 프로덕션에서는 MSW 비활성화
    if (process.env.NODE_ENV === 'development' && process.env.USE_MOCKS === 'true') {
      import('@/mocks/browser').then(({ startMSW }) => {
        startMSW();
      });
    }
  }, []);

  // ...
}
```

---

### 12.6 시드 데이터 스크립트

```typescript
// prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import contacts from '../src/mocks/data/contacts.json';
import segments from '../src/mocks/data/segments.json';
import donations from '../src/mocks/data/donations.json';
// ... 기타 데이터 import

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. 연락처 시드
  for (const contact of contacts) {
    await prisma.contact.create({
      data: {
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
        email: contact.email,
        region: contact.region,
        optIn: contact.optIn,
        createdAt: new Date(contact.createdAt),
        tags: {
          create: contact.tags.map(tag => ({ tag })),
        },
      },
    });
  }
  console.log(`✓ ${contacts.length} contacts seeded`);

  // 2. 세그먼트 시드
  for (const segment of segments) {
    await prisma.segment.create({
      data: {
        id: segment.id,
        name: segment.name,
        criteria: segment.criteria,
        size: segment.size,
        updatedAt: new Date(segment.updatedAt),
      },
    });
  }
  console.log(`✓ ${segments.length} segments seeded`);

  // 3. 기부금 시드
  for (const donation of donations) {
    await prisma.donation.create({
      data: {
        id: donation.id,
        donorId: donation.donorId,
        amount: donation.amount,
        method: donation.method as any,
        createdAt: new Date(donation.createdAt),
      },
    });
  }
  console.log(`✓ ${donations.length} donations seeded`);

  // ... 기타 데이터

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

```json
// package.json에 추가
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

```bash
# 시드 실행
npx prisma db seed
```

---

### 12.7 체크리스트: Mock → DB 전환

| 단계 | 작업 | 상태 |
|------|------|------|
| 1 | Prisma 및 PostgreSQL 설치 | ⬜ |
| 2 | 환경 변수 설정 (DATABASE_URL) | ⬜ |
| 3 | prisma/schema.prisma 작성 | ⬜ |
| 4 | `npx prisma migrate dev` 실행 | ⬜ |
| 5 | src/lib/prisma.ts 싱글톤 생성 | ⬜ |
| 6 | API Routes 생성 (src/app/api/v1/*) | ⬜ |
| 7 | 시드 데이터 마이그레이션 | ⬜ |
| 8 | MSW를 테스트 환경으로 분리 | ⬜ |
| 9 | 프론트엔드 API 호출 검증 | ⬜ |
| 10 | Cloud SQL 프로덕션 배포 | ⬜ |

---

## 13. 주요 라이브러리

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| **Next.js** | 14.2.0 | 프레임워크 |
| **React** | 18.2.0 | UI 라이브러리 |
| **TypeScript** | 5.3.3 | 타입 시스템 |
| **Tailwind CSS** | 3.4.1 | 스타일링 |
| **Radix UI** | 1.0+ | 접근성 UI 기반 |
| **TanStack Query** | 5.24.0 | 서버 상태 관리 |
| **Zustand** | 4.5.0 | 전역 상태 (준비됨) |
| **react-hook-form** | 7.50.0 | 폼 관리 |
| **zod** | 3.22.4 | 스키마 유효성 검사 |
| **next-auth** | 4.24.13 | 인증 |
| **Framer Motion** | 12.23.26 | 애니메이션 |
| **Recharts** | 2.12.0 | 차트 |
| **MSW** | 2.2.0 | API 모킹 |
| **lucide-react** | 0.344.0 | 아이콘 |

---

## 14. 개발 워크플로우

### 14.1 명령어

```bash
# 개발 서버 (MSW 자동 초기화)
npm run dev

# 프로덕션 빌드
npm run build

# 코드 린팅
npm run lint

# 코드 포맷팅
npm run format
```

### 14.2 개발 환경 흐름

```
npm run dev
    ↓
Next.js 개발 서버 시작
    ↓
브라우저에서 앱 로드
    ↓
Providers 초기화
    ↓
MSW startMSW() 호출
    ↓
Service Worker 등록
    ↓
API 요청 인터셉트 시작
```

---

## 15. 배포 아키텍처

### 15.1 Docker 빌드

```dockerfile
# Dockerfile 핵심 단계
FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

CMD ["node", "server.js"]
```

### 15.2 Google Cloud 배포

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/campone-dashboard', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/campone-dashboard']
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args: ['run', 'deploy', 'campone-dashboard', '--image', '...']
```

---

## 16. 타입 시스템

### 16.1 핵심 타입 정의

```typescript
// src/lib/types.ts

// 연락처
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  region: string;
  tags: string[];
  optIn: boolean;
  createdAt: string;
}

// 메시지
interface Message {
  id: string;
  campaignId: string;
  channel: 'sms' | 'kakao' | 'email';
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  metrics: MessageMetrics;
}

// 여론 지수
interface TrendIndex {
  date: string;
  index: number;      // 합성 지수 (0-100)
  gt_norm: number;    // Google 정규화
  nv_norm: number;    // Naver 정규화
  sns_norm: number;   // SNS 정규화
  sentiment: number;  // 감성 (-100 ~ 100)
}

// 사용자 역할
type UserRole = 'Admin' | 'Manager' | 'Staff' | 'Viewer';

// KPI 상태
type KPIStatus = 'success' | 'warning' | 'danger';
```

---

## 17. 요약

CampOne 관리자 대시보드는 **Next.js 14 App Router** 기반의 정치 캠프 관리 플랫폼입니다.

### 핵심 특징

1. **모듈형 아키텍처**: 5개 핵심 모듈 (Insights, Studio, Policy, Ops, Hub)
2. **타입 안전성**: TypeScript 전면 적용
3. **서버 상태 관리**: TanStack Query로 API 응답 캐싱
4. **접근성**: Radix UI 기반 컴포넌트
5. **권한 시스템**: 4단계 RBAC (Admin, Manager, Staff, Viewer)
6. **Mock 기반 개발**: MSW로 백엔드 없이 개발 가능
7. **컨테이너 배포**: Docker + Google Cloud Run

### 향후 확장 포인트

- 실제 DB 연결 (Prisma + PostgreSQL)
- Zustand 전역 상태 구현
- 커스텀 훅 라이브러리 확장
- 실시간 알림 (WebSocket)
- 다국어 지원 (i18n)
