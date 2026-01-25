# Civic Hub - Dashboard 통합 계획

> 작성일: 2026-01-23
> 대상: campone-civic-hub 프로젝트
> 참조: INTEGRATION_REQUIREMENTS_FOR_OTHER_SERVICES.md

---

## 1. 현재 상태 분석

### 1.1 Civic Hub 구성

| 항목 | 현재 상태 |
|------|----------|
| **프레임워크** | Next.js 14 (App Router) |
| **인증 방식** | `admin_session` 쿠키 (base64 인코딩) |
| **CORS** | API 라우트에 `Access-Control-Allow-Origin: *` 설정 |
| **X-Frame-Options** | 미설정 (iframe 허용) |
| **배포** | Cloud Run |

### 1.2 관련 파일

| 파일 | 역할 |
|------|------|
| `src/middleware.ts` | 인증 미들웨어 (/admin 경로 보호) |
| `next.config.js` | CORS 헤더 설정 |
| `src/lib/auth/session.ts` | 세션 생성/검증 |
| `src/lib/auth/credentials.ts` | 자격증명 검증 |

### 1.3 통합 시 예상 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Dashboard (메인)                             │
│                    campone-dashboard.run.app                        │
│                              │                                       │
│              ┌───────────────┼───────────────┐                      │
│              │               │               │                      │
│      ┌───────▼───────┐ ┌─────▼─────┐ ┌──────▼──────┐               │
│      │   Insights    │ │ Civic Hub │ │ Policy Lab  │               │
│      │   (iframe)    │ │  (iframe) │ │  (iframe)   │               │
│      └───────────────┘ └───────────┘ └─────────────┘               │
│                              │                                       │
│                    /embed?token=eyJhbGc...                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. 구현 항목

### 2.1 체크리스트

| # | 항목 | 우선순위 | 상태 |
|---|------|---------|------|
| 1 | CORS 설정 강화 | 높음 | ⬜ 대기 |
| 2 | `/embed` 페이지 추가 | 높음 | ⬜ 대기 |
| 3 | `EMBED_JWT_SECRET` 환경변수 설정 | 높음 | ⬜ 대기 |
| 4 | 미들웨어에 embed_session 검사 추가 | 높음 | ⬜ 대기 |
| 5 | 쿠키 SameSite=None 설정 | 높음 | ⬜ 대기 |
| 6 | X-Frame-Options 확인 | 중간 | ⬜ 대기 |
| 7 | postMessage 전송 구현 | 낮음 | ⬜ 대기 |

---

## 3. 구현 상세

### 3.1 CORS 설정 강화

**파일:** `next.config.js`

**현재:**
```javascript
{ key: 'Access-Control-Allow-Origin', value: '*' },
```

**변경:**
```javascript
async headers() {
  const allowedOrigins = [
    'https://campone-dashboard-2qbgm2n2oq-du.a.run.app',
    'https://campone-dashboard-755458598444.asia-northeast3.run.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
        { key: 'Access-Control-Allow-Origin', value: allowedOrigins.join(', ') },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
      ],
    },
    // iframe 임베드 허용
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "frame-ancestors 'self' https://campone-dashboard-*.run.app http://localhost:*"
        },
      ],
    },
  ];
},
```

**또는** 환경변수 기반:
```javascript
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['*'];
```

---

### 3.2 /embed 페이지 추가

**파일:** `src/app/embed/page.tsx` (새로 생성)

```typescript
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';

interface EmbedTokenPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export default async function EmbedPage({
  searchParams,
}: {
  searchParams: { token?: string; redirect?: string };
}) {
  const token = searchParams.token;
  const redirectPath = searchParams.redirect || '/';

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <p className="text-red-500 font-medium">인증 토큰이 없습니다.</p>
          <p className="text-sm text-gray-500 mt-2">Dashboard에서 접근해주세요.</p>
        </div>
      </div>
    );
  }

  try {
    const secret = process.env.EMBED_JWT_SECRET;
    if (!secret) {
      throw new Error('EMBED_JWT_SECRET not configured');
    }

    // JWT 검증
    const decoded = jwt.verify(token, secret) as EmbedTokenPayload;

    // embed_session 쿠키 설정
    const cookieStore = cookies();
    const sessionData = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      source: 'embed',
      expiresAt: decoded.exp * 1000, // ms로 변환
    };

    cookieStore.set('embed_session', Buffer.from(JSON.stringify(sessionData)).toString('base64'), {
      httpOnly: true,
      secure: true,
      sameSite: 'none', // cross-origin iframe 필수
      maxAge: 60 * 60, // 1시간
      path: '/',
    });

    // 리다이렉트
    redirect(redirectPath);
  } catch (error) {
    console.error('Embed token verification failed:', error);
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <p className="text-red-500 font-medium">인증 토큰이 유효하지 않습니다.</p>
          <p className="text-sm text-gray-500 mt-2">토큰이 만료되었거나 손상되었습니다.</p>
        </div>
      </div>
    );
  }
}
```

**의존성 설치:**
```bash
npm install jsonwebtoken
npm install -D @types/jsonwebtoken
```

---

### 3.3 환경변수 설정

**파일:** `.env`, `.env.production`

```bash
# Dashboard 통합 인증
EMBED_JWT_SECRET=campone-shared-embed-secret-change-in-production

# CORS 허용 origin
CORS_ALLOWED_ORIGINS=https://campone-dashboard-755458598444.asia-northeast3.run.app,http://localhost:3000
```

**Cloud Run 배포 시:**
```bash
gcloud secrets create campone-embed-jwt-secret --data-file=-
# 값 입력: campone-shared-embed-secret-change-in-production

gcloud run services update campone-civic-hub \
  --region=asia-northeast3 \
  --set-secrets=EMBED_JWT_SECRET=campone-embed-jwt-secret:latest
```

**중요:** 이 값은 Dashboard와 동일해야 합니다.

---

### 3.4 미들웨어 수정

**파일:** `src/middleware.ts`

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE_NAME = 'admin_session'
const EMBED_SESSION_COOKIE_NAME = 'embed_session'

// 인증이 필요한 경로
const PROTECTED_PATHS = ['/admin']

// 인증 없이 접근 가능한 경로
const PUBLIC_PATHS = ['/admin/login', '/embed']

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(path => pathname.startsWith(path))
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))
}

function isValidSession(sessionData: string | undefined): boolean {
  if (!sessionData) return false

  try {
    const json = Buffer.from(sessionData, 'base64').toString('utf-8')
    const session = JSON.parse(json)

    // 세션 만료 확인
    if (session.expiresAt < Date.now()) {
      return false
    }

    return !!session.adminId || !!session.userId // embed 세션도 허용
  } catch {
    return false
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API 라우트는 각 핸들러에서 처리
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // 보호된 경로가 아니면 통과
  if (!isProtectedPath(pathname)) {
    return NextResponse.next()
  }

  // 공개 경로면 통과 (로그인 페이지, embed 페이지)
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // 세션 확인 (admin_session 또는 embed_session)
  const adminSession = request.cookies.get(SESSION_COOKIE_NAME)
  const embedSession = request.cookies.get(EMBED_SESSION_COOKIE_NAME)

  const isAuthenticated = isValidSession(adminSession?.value) || isValidSession(embedSession?.value)

  if (!isAuthenticated) {
    // 로그인 페이지로 리다이렉트
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/embed',
  ],
}
```

---

### 3.5 쿠키 SameSite 설정 확인

**파일:** `src/lib/auth/session.ts`

기존 세션 생성 코드에서 쿠키 옵션 확인:

```typescript
cookies().set(SESSION_COOKIE_NAME, sessionValue, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'none', // cross-origin iframe 지원을 위해 변경
  maxAge: SESSION_EXPIRY_MS / 1000,
  path: '/',
})
```

**주의:** `sameSite: 'none'`은 `secure: true`가 필수입니다.

---

### 3.6 X-Frame-Options 확인

현재 Cloud Run 기본 설정은 X-Frame-Options 헤더가 없어서 iframe 임베드가 허용됩니다.

**확인 명령:**
```bash
curl -I https://campone-civic-hub-755458598444.asia-northeast3.run.app | grep -i frame
```

헤더가 없으면 OK. 있다면 제거 필요.

---

### 3.7 postMessage 전송 (선택)

Dashboard에 상태 업데이트를 전송할 수 있습니다.

**파일:** `src/lib/dashboard-bridge.ts` (새로 생성)

```typescript
interface DashboardMessage {
  type: 'KPI_UPDATE' | 'NAVIGATION' | 'USER_ACTION' | 'ERROR';
  source: 'civic-hub';
  payload: any;
}

const DASHBOARD_ORIGINS = [
  'https://campone-dashboard-755458598444.asia-northeast3.run.app',
  'http://localhost:3000',
];

export function sendToDashboard(type: DashboardMessage['type'], payload: any) {
  // iframe 내부인지 확인
  if (typeof window === 'undefined' || window.parent === window) {
    return;
  }

  const message: DashboardMessage = {
    type,
    source: 'civic-hub',
    payload,
  };

  // Dashboard에 메시지 전송
  window.parent.postMessage(message, '*');
}

// 사용 예시:
// sendToDashboard('USER_ACTION', { action: 'question_asked', questionId: '123' });
// sendToDashboard('KPI_UPDATE', { totalQuestions: 150, pendingReview: 5 });
```

---

## 4. 구현 순서

### Phase 1: 기본 통합 (필수)

1. **환경변수 추가**
   - `.env`에 `EMBED_JWT_SECRET` 추가
   - Dashboard 팀과 값 공유

2. **`/embed` 페이지 생성**
   - JWT 검증 로직
   - embed_session 쿠키 설정

3. **미들웨어 수정**
   - embed_session 검사 추가
   - /embed 경로 public 처리

4. **쿠키 설정 수정**
   - SameSite=None 적용

5. **테스트**
   - 로컬에서 Dashboard → Civic Hub iframe 테스트

### Phase 2: 배포 (필수)

1. **Secret Manager에 EMBED_JWT_SECRET 추가**
2. **Cloud Run 환경변수 업데이트**
3. **재배포**
4. **프로덕션 테스트**

### Phase 3: 고도화 (선택)

1. **postMessage 구현**
2. **CORS origin 세분화**
3. **에러 핸들링 개선**

---

## 5. 테스트 방법

### 5.1 로컬 테스트

```bash
# 1. Civic Hub 실행
npm run dev  # localhost:3000 또는 다른 포트

# 2. Dashboard 프로젝트에서 실행
npm run dev  # localhost:3001 등

# 3. Dashboard에서 Hub 모듈 페이지 접속
# iframe 로드 및 인증 확인
```

### 5.2 토큰 테스트

Dashboard 없이 직접 테스트:

```bash
# 테스트용 JWT 생성 (Node.js)
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { userId: 'test', email: 'test@test.com', role: 'admin' },
  'campone-shared-embed-secret-change-in-production',
  { expiresIn: '1h' }
);
console.log(token);
"

# 브라우저에서 접속
# http://localhost:3000/embed?token=eyJhbGc...
```

### 5.3 쿠키 확인

브라우저 개발자 도구 > Application > Cookies에서:
- `embed_session` 쿠키 존재 확인
- `SameSite=None`, `Secure=true` 확인

---

## 6. Dashboard 팀 협의 필요 사항

| 항목 | 내용 |
|------|------|
| **EMBED_JWT_SECRET 값** | 동일한 값 사용 필요 |
| **Dashboard URL** | CORS 허용 origin에 추가 |
| **토큰 페이로드** | userId, email, role 외 추가 필드 필요 여부 |
| **postMessage 프로토콜** | 전송할 메시지 타입 정의 |

---

## 7. 참고 자료

- [INTEGRATION_REQUIREMENTS_FOR_OTHER_SERVICES.md](./INTEGRATION_REQUIREMENTS_FOR_OTHER_SERVICES.md)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [jsonwebtoken npm](https://www.npmjs.com/package/jsonwebtoken)

---

*문서 버전*: 1.0
*최종 수정*: 2026-01-23
