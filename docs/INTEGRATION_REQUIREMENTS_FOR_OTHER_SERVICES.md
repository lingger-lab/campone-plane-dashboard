# 타 서비스 통합 요구사항 문서

> 작성일: 2026-01-23
> 작성자: Dashboard 프로젝트
> 대상: campone-v2-backend, campone-civic-hub, campone-policy 프로젝트

---

## 1. 현재 상황 요약

### 1.1 아키텍처 개요

CampOne 플랫폼은 **Dashboard**를 메인 엔트리 포인트로 하여 여러 마이크로서비스를 통합하는 구조로 전환 중입니다.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         사용자 브라우저                               │
│                              │                                       │
│                    ┌─────────▼─────────┐                            │
│                    │  Dashboard (메인)  │ ← 로그인 진입점             │
│                    │  localhost:3000    │                            │
│                    │  또는 배포 URL      │                            │
│                    └─────────┬─────────┘                            │
│                              │                                       │
│              ┌───────────────┼───────────────┐                      │
│              │               │               │                      │
│      ┌───────▼───────┐ ┌─────▼─────┐ ┌──────▼──────┐               │
│      │   Insights    │ │ Civic Hub │ │ Policy Lab  │               │
│      │   (iframe)    │ │  (iframe) │ │  (iframe)   │               │
│      └───────────────┘ └───────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 현재 구현 상태

- **Dashboard**: NextAuth 기반 인증 구현 완료
- **모듈 페이지**: iframe으로 각 서비스 임베드 완료
  - `/pulse` → `https://campone-v2-frontend-2qbgm2n2oq-du.a.run.app`
  - `/hub` → `https://campone-civic-hub-2qbgm2n2oq-du.a.run.app`
  - `/policy` → `https://campone-policy-2qbgm2n2oq-du.a.run.app`

### 1.3 발견된 문제점

1. **CORS 에러**: v2-frontend가 v2-backend API 호출 시 차단됨
2. **인증 격리**: 각 서비스가 독립적 인증을 사용하여 사용자가 여러 번 로그인해야 함
3. **통신 불가**: iframe 내부와 Dashboard 간 데이터 교환 메커니즘 없음

---

## 2. CORS 설정 요구사항

### 2.1 대상 서비스

| 서비스 | 역할 | 수정 필요 |
|--------|------|----------|
| campone-v2-backend | Insights API 서버 | **예** |
| campone-civic-hub | Civic Hub 풀스택 | 확인 필요 |
| campone-policy | Policy Lab 풀스택 | 확인 필요 |

### 2.2 campone-v2-backend (FastAPI) CORS 설정

**현재 문제**:
```
Access to fetch at 'https://campone-v2-backend-xxx.a.run.app/api/...'
from origin 'https://campone-v2-frontend-xxx.a.run.app'
has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present
```

**필요한 수정** (FastAPI 기준):

```python
# main.py 또는 app.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS 미들웨어 추가 - 다른 미들웨어보다 먼저 등록
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # 프론트엔드 서비스들
        "https://campone-v2-frontend-2qbgm2n2oq-du.a.run.app",
        "https://campone-civic-hub-2qbgm2n2oq-du.a.run.app",
        "https://campone-policy-2qbgm2n2oq-du.a.run.app",
        # Dashboard (메인)
        "https://campone-dashboard-2qbgm2n2oq-du.a.run.app",
        # 로컬 개발 환경
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",  # Vite 기본 포트
        "http://localhost:8080",
    ],
    allow_credentials=True,  # 쿠키/인증 헤더 허용
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],  # 또는 필요한 헤더만 명시
    expose_headers=["*"],  # 클라이언트에서 접근 가능한 응답 헤더
)
```

**환경변수 기반 설정** (권장):

```python
import os

ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
# 환경변수: CORS_ALLOWED_ORIGINS=https://frontend1.com,https://frontend2.com

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS[0] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2.3 campone-civic-hub / campone-policy CORS 확인

각 서비스가 자체 API를 제공하는 경우 동일한 CORS 설정 필요. Next.js 기반이라면:

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' }, // 또는 특정 origin
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};
```

---

## 3. 통합 인증 요구사항

### 3.1 목표

사용자가 **Dashboard에서 한 번 로그인**하면, iframe으로 임베드된 모든 서비스에서 **자동으로 인증된 상태**가 되어야 함.

### 3.2 권장 방식: JWT 토큰 기반 인증

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. 사용자가 Dashboard에 로그인                                      │
│     POST /api/auth/callback/credentials                             │
│     → NextAuth 세션 생성                                            │
├─────────────────────────────────────────────────────────────────────┤
│  2. Dashboard가 임베드 토큰 생성                                     │
│     GET /api/auth/embed-token                                       │
│     → JWT 반환: { userId, email, role, exp: 1시간 }                 │
├─────────────────────────────────────────────────────────────────────┤
│  3. iframe URL에 토큰 포함                                          │
│     <iframe src="https://service.../embed?token=eyJhbGc..." />      │
├─────────────────────────────────────────────────────────────────────┤
│  4. 각 서비스가 토큰 검증 후 내부 세션 생성                           │
│     /embed 라우트에서 JWT 검증 → 자체 세션/쿠키 발급                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 각 서비스에 필요한 구현

#### 3.3.1 환경변수 추가

모든 서비스에 동일한 JWT 시크릿 설정:

```bash
# .env 또는 Cloud Run 환경변수
EMBED_JWT_SECRET=campone-shared-embed-secret-change-in-production
```

**중요**: 이 값은 모든 서비스에서 **동일**해야 합니다.

#### 3.3.2 /embed 라우트 구현 (각 서비스)

**Next.js 기반 서비스** (civic-hub, policy):

```typescript
// src/app/embed/page.tsx (또는 pages/embed.tsx)

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
  searchParams: { token?: string };
}) {
  const token = searchParams.token;

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">인증 토큰이 없습니다. Dashboard에서 접근해주세요.</p>
      </div>
    );
  }

  try {
    // JWT 검증
    const decoded = jwt.verify(
      token,
      process.env.EMBED_JWT_SECRET!
    ) as EmbedTokenPayload;

    // 검증 성공 시 내부 세션 생성
    // 방법 1: 쿠키 설정 후 메인 페이지로 리다이렉트
    // 방법 2: 서버 세션 생성 후 리다이렉트

    // 예시: 쿠키 설정 (서버 액션 또는 API 라우트에서)
    // cookies().set('embed_session', JSON.stringify({
    //   userId: decoded.userId,
    //   email: decoded.email,
    //   role: decoded.role,
    // }), {
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: 'none', // cross-origin iframe에서 필요
    //   maxAge: 60 * 60, // 1시간
    // });

    // 메인 페이지로 리다이렉트
    redirect('/');
  } catch (error) {
    console.error('토큰 검증 실패:', error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 font-medium">인증 토큰이 유효하지 않습니다.</p>
          <p className="text-sm text-gray-500 mt-2">토큰이 만료되었거나 손상되었습니다.</p>
        </div>
      </div>
    );
  }
}
```

**FastAPI 기반 서비스** (v2-backend, 프론트엔드가 별도인 경우):

```python
# routers/embed.py

from fastapi import APIRouter, HTTPException, Response
from jose import jwt, JWTError
import os

router = APIRouter()

EMBED_JWT_SECRET = os.getenv("EMBED_JWT_SECRET")

@router.get("/embed")
async def embed_auth(token: str, response: Response):
    """
    Dashboard에서 전달받은 토큰을 검증하고 세션을 생성합니다.
    """
    if not token:
        raise HTTPException(status_code=401, detail="토큰이 필요합니다")

    try:
        payload = jwt.decode(token, EMBED_JWT_SECRET, algorithms=["HS256"])

        # 세션 쿠키 설정
        response.set_cookie(
            key="embed_session",
            value=jwt.encode(payload, EMBED_JWT_SECRET, algorithm="HS256"),
            httponly=True,
            secure=True,
            samesite="none",  # cross-origin iframe 필수
            max_age=3600,
        )

        # 메인 페이지로 리다이렉트
        response.status_code = 302
        response.headers["Location"] = "/"
        return response

    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"토큰 검증 실패: {str(e)}")
```

#### 3.3.3 인증 미들웨어 수정

기존 인증 로직에 `embed_session` 쿠키 검사 추가:

```typescript
// middleware.ts (Next.js)

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 기존 세션 체크
  const session = request.cookies.get('session');

  // 임베드 세션 체크 (추가)
  const embedSession = request.cookies.get('embed_session');

  // 둘 중 하나라도 있으면 인증됨
  if (session || embedSession) {
    return NextResponse.next();
  }

  // /embed 경로는 인증 없이 접근 허용 (토큰 검증은 페이지에서)
  if (request.nextUrl.pathname === '/embed') {
    return NextResponse.next();
  }

  // 미인증 시 로그인 페이지로 (또는 에러 표시)
  return NextResponse.redirect(new URL('/login', request.url));
}
```

---

## 4. postMessage 통신 구현 (선택사항)

iframe과 부모 창(Dashboard) 간 실시간 데이터 교환이 필요한 경우.

### 4.1 프로토콜 정의

```typescript
// 메시지 타입 정의 (공통)
interface EmbedMessage {
  type: 'KPI_UPDATE' | 'NAVIGATION' | 'USER_ACTION' | 'ERROR';
  source: 'insights' | 'civic-hub' | 'policy';
  payload: any;
}

// 예시
{
  type: 'KPI_UPDATE',
  source: 'insights',
  payload: {
    trendIndex: 75,
    spikes: 3,
    lastUpdated: '2026-01-23T10:00:00Z'
  }
}
```

### 4.2 각 서비스에서 메시지 전송

```typescript
// 각 서비스의 적절한 위치에 추가

function sendToDashboard(type: string, payload: any) {
  // Dashboard origin 확인
  const dashboardOrigins = [
    'https://campone-dashboard-2qbgm2n2oq-du.a.run.app',
    'http://localhost:3000',
  ];

  // iframe 내부인지 확인
  if (window.parent !== window) {
    window.parent.postMessage(
      {
        type,
        source: 'insights', // 서비스별로 변경
        payload,
      },
      '*' // 또는 특정 origin
    );
  }
}

// 사용 예시
sendToDashboard('KPI_UPDATE', { trendIndex: 75, spikes: 3 });
```

### 4.3 Dashboard에서 메시지 수신

이미 Dashboard에 구현되어 있으나, 각 서비스에서 전송해야 동작함.

---

## 5. X-Frame-Options 확인

iframe 임베드를 허용하려면 각 서비스에서 `X-Frame-Options` 헤더가 `DENY`로 설정되어 있지 않아야 함.

### 5.1 확인 방법

```bash
curl -I https://campone-v2-frontend-2qbgm2n2oq-du.a.run.app | grep -i frame
curl -I https://campone-civic-hub-2qbgm2n2oq-du.a.run.app | grep -i frame
curl -I https://campone-policy-2qbgm2n2oq-du.a.run.app | grep -i frame
```

### 5.2 필요한 설정

```
X-Frame-Options: SAMEORIGIN
```
또는 헤더 제거 (Cloud Run 기본값은 헤더 없음으로 iframe 허용됨).

CSP 헤더 사용 시:
```
Content-Security-Policy: frame-ancestors 'self' https://campone-dashboard-*.a.run.app
```

---

## 6. 쿠키 SameSite 설정

cross-origin iframe에서 쿠키가 전송되려면 `SameSite=None; Secure` 설정 필요.

### 6.1 Next.js (NextAuth 등)

```typescript
// next.config.js 또는 auth 설정
cookies: {
  sessionToken: {
    name: `__Secure-next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: 'none',  // cross-origin iframe
      secure: true,      // SameSite=None은 Secure 필수
      path: '/',
    },
  },
}
```

### 6.2 FastAPI

```python
response.set_cookie(
    key="session",
    value=session_token,
    httponly=True,
    secure=True,
    samesite="none",  # 소문자
)
```

---

## 7. 체크리스트 요약

### campone-v2-backend (FastAPI)
- [ ] CORS 미들웨어 추가 (섹션 2.2 참조)
- [ ] `/embed` 엔드포인트 추가 (섹션 3.3.2 참조)
- [ ] `EMBED_JWT_SECRET` 환경변수 설정
- [ ] 쿠키 SameSite=None 설정 확인

### campone-civic-hub (Next.js 추정)
- [ ] CORS 헤더 확인/추가 (필요 시)
- [ ] `/embed` 페이지 추가 (섹션 3.3.2 참조)
- [ ] `EMBED_JWT_SECRET` 환경변수 설정
- [ ] 인증 미들웨어에 embed_session 검사 추가
- [ ] 쿠키 SameSite=None 설정 확인
- [ ] (선택) postMessage 전송 구현

### campone-policy (Next.js 추정)
- [ ] CORS 헤더 확인/추가 (필요 시)
- [ ] `/embed` 페이지 추가 (섹션 3.3.2 참조)
- [ ] `EMBED_JWT_SECRET` 환경변수 설정
- [ ] 인증 미들웨어에 embed_session 검사 추가
- [ ] 쿠키 SameSite=None 설정 확인
- [ ] (선택) postMessage 전송 구현

---

## 8. 테스트 방법

### 8.1 로컬 테스트

1. Dashboard 실행: `npm run dev` (localhost:3000)
2. 각 서비스 실행 (해당 프로젝트에서)
3. Dashboard 로그인 후 각 모듈 페이지 접속
4. 브라우저 개발자 도구 Console/Network 탭에서 에러 확인

### 8.2 배포 테스트

1. 각 서비스 Cloud Run 재배포
2. Dashboard 배포 버전에서 테스트
3. CORS, 쿠키, 인증 순서로 확인

### 8.3 디버깅 포인트

- **CORS 에러**: Network 탭에서 preflight OPTIONS 요청 확인
- **쿠키 미전송**: Application > Cookies에서 SameSite 속성 확인
- **인증 실패**: Console에서 토큰 관련 에러 메시지 확인

---

## 9. 연락처

문의사항이나 추가 논의 필요 시:
- Dashboard 프로젝트 담당자에게 연락
- 이 문서 업데이트 요청

---

**문서 버전**: 1.0
**최종 수정**: 2026-01-23