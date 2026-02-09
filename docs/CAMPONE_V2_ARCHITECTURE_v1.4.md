# CampOne v2 멀티테넌트 아키텍처 가이드

> 이 문서는 기존 개별 서비스를 멀티테넌트 구조로 전환할 때 참고하는 아키텍처 명세서입니다.
> 각 서비스 개발 시 이 문서의 패턴과 규칙을 따라야 합니다.

---

## 목차

1. [핵심 원칙](#1-핵심-원칙)
2. [전체 시스템 구조](#2-전체-시스템-구조)
3. [테넌트 식별 및 격리](#3-테넌트-식별-및-격리)
4. [접근 방식별 인증 흐름](#4-접근-방식별-인증-흐름)
5. [설정 로드 패턴](#5-설정-로드-패턴)
6. [데이터베이스 격리](#6-데이터베이스-격리)
7. [LLM 연동 (멀티 프로바이더)](#7-llm-연동-멀티-프로바이더)
8. [프론트엔드 구현 패턴](#8-프론트엔드-구현-패턴)
9. [백엔드 구현 패턴](#9-백엔드-구현-패턴)
10. [커스터마이징 지원](#10-커스터마이징-지원)
11. [보안 체크리스트](#11-보안-체크리스트)
12. [마이그레이션 가이드](#12-마이그레이션-가이드)

---

## 1. 핵심 원칙

```
코드는 공유, 데이터는 격리, 설정으로 분기
```

| 원칙 | 설명 |
|------|------|
| **단일 코드베이스** | 웹앱당 Cloud Run 1개, 모든 캠프가 공유 |
| **물리적 데이터 격리** | 캠프별 DB 분리, 혼용 원천 차단 |
| **설정 기반 분기** | 기능 on/off, UI, 분석 파라미터는 tenant config로 제어 |
| **코어 패치 전체 적용** | 1회 배포로 모든 캠프에 업데이트 |

---

## 2. 전체 시스템 구조

### 2.1 앱 목록

| 앱 | 설명 | 비고 |
|----|------|------|
| **insight** | 여론/감성 분석 | 핵심 분석 앱 |
| **policy** | 정책 분석/비교 | |
| **ops** | 캠프 운영 도구 | |
| **studio** | 콘텐츠 제작 | |
| **civichub** | 유권자 공개 페이지 + 관리자 | 공개/관리 영역 분리 |
| **dashboard** | 통합 대시보드 | 선택적 (iframe으로 앱 통합) |

### 2.2 Cloud Run 서비스 구성

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Cloud Run Services                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [insight-app]        ─┐                                                │
│  [policy-app]          │                                                │
│  [ops-app]             ├── 핵심 웹앱 (각각 프론트 + API 포함)            │
│  [studio-app]          │                                                │
│  [civichub-app]       ─┘                                                │
│                                                                         │
│  [dashboard-app]      ─── 통합 대시보드 (선택적, iframe으로 웹앱 임베드) │
│                                                                         │
│  ※ 인증은 별도 서비스 없이 shared/auth 모듈로 각 앱에서 처리             │
│  ※ 사용자 데이터는 campone_system DB에서 중앙 관리                       │
│                                                                         │
│  [llm-gateway]        ─── (선택) LLM API 중계, 규모 확장 시 도입         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 서비스 제공 방식

```
┌─────────────────────────────────────────────────────────────────────────┐
│  방식 A: 대시보드 통합                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  캠프가 통합 대시보드를 원하는 경우:                                      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────┐           │
│  │              dashboard-app                               │           │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │           │
│  │  │ insight │  │ policy  │  │  ops    │  │ studio  │    │           │
│  │  │ (iframe)│  │ (iframe)│  │ (iframe)│  │ (iframe)│    │           │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │           │
│  └─────────────────────────────────────────────────────────┘           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  방식 B: 개별 앱 제공                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  캠프가 특정 앱만 원하는 경우:                                           │
│                                                                         │
│  [insight-app] ← 캠프 D는 이것만 사용                                   │
│  [policy-app]  ← 캠프 E는 이것만 사용                                   │
│                                                                         │
│  각 앱이 독립적으로 동작, 대시보드 통합 없음                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.4 도메인 구조

```
캠프 관계자용 (인증 필요)
────────────────────────
app.campone.ai/{tenant_id}/{app_name}
예: app.campone.ai/camp-c/insight
예: app.campone.ai/camp-c/dashboard
예: app.campone.ai/camp-d/policy  (개별 앱만 사용하는 캠프)

CivicHub - 유권자 공개용
────────────────────────
civichub.kr/{public_slug}
예: civichub.kr/changwon-mayor

커스텀 도메인 (선택)
────────────────────────
{custom_domain}
예: kim-candidate.kr → civichub-app (tenant: camp-c)
```

### 2.5 인프라 구성도

```
                    ┌─────────────────────────────────────┐
                    │        Cloud Load Balancer          │
                    └─────────────────────────────────────┘
                                     │
                 ┌───────────────────┼───────────────────┐
                 │                   │                   │
                 ▼                   ▼                   ▼
        ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
        │ app.campone  │    │ civichub.kr  │    │ 커스텀 도메인 │
        │    .ai/*     │    │     /*       │    │              │
        └──────────────┘    └──────────────┘    └──────────────┘
                 │                   │                   │
                 └───────────────────┼───────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────────┐
                    │         Cloud Run Services          │
                    └─────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
              [camp_a_db]      [camp_b_db]      [camp_c_db]
                        (물리적 분리)
```

---

## 3. 테넌트 식별 및 격리

### 3.1 테넌트 식별 방법

요청에서 tenant_id를 추출하는 우선순위:

```python
def extract_tenant_id(request) -> str:
    """
    테넌트 식별 우선순위:
    1. JWT 토큰의 tenant_id (인증된 요청)
    2. URL 경로 (app.campone.ai/{tenant_id}/...)
    3. 커스텀 도메인 매핑 (kim-candidate.kr → camp-c)
    4. CivicHub 슬러그 (civichub.kr/{slug} → tenant_id)
    """
    
    # 1. JWT에서 추출 (가장 신뢰할 수 있음)
    token = extract_token(request)
    if token:
        payload = verify_jwt(token)
        if payload and "tenant_id" in payload:
            return payload["tenant_id"]
    
    # 2. URL 경로에서 추출
    path_parts = get_path_parts(request)
    if len(path_parts) >= 1 and path_parts[0].startswith("camp-"):
        return path_parts[0]
    
    # 3. 커스텀 도메인 매핑
    host = get_host(request)
    tenant = get_tenant_by_custom_domain(host)
    if tenant:
        return tenant.id
    
    # 4. CivicHub 슬러그
    if "civichub" in host:
        slug = path_parts[0] if path_parts else None
        if slug and slug != "admin":
            tenant = get_tenant_by_public_slug(slug)
            if tenant:
                return tenant.id
    
    raise Error("Unable to identify tenant")
```

### 3.2 테넌트 컨텍스트

모든 요청에서 사용하는 테넌트 컨텍스트:

```typescript
// TypeScript/Next.js 버전
interface TenantContext {
  tenantId: string;
  config: TenantConfig | null;
  db: DatabaseConnection | null;
}

// 미들웨어에서 설정
export async function tenantMiddleware(req, res, next) {
  const tenantId = extractTenantId(req);
  req.tenant = {
    tenantId,
    config: null,  // lazy load
    db: null       // lazy load
  };
  next();
}
```

```python
# Python/FastAPI 버전
@dataclass
class TenantContext:
    tenant_id: str
    _config: Optional[TenantConfig] = None
    _db: Optional[Connection] = None
    
    async def get_config(self) -> TenantConfig:
        if self._config is None:
            self._config = await load_tenant_config(self.tenant_id)
        return self._config
    
    def get_db(self) -> Connection:
        if self._db is None:
            self._db = get_db_connection_for_tenant(self.tenant_id)
        return self._db
```

---

## 4. 접근 방식별 인증 흐름

### 4.1 접근 방식 유형

| 유형 | 사용자 | URL 패턴 | 인증 방식 |
|------|--------|----------|-----------|
| A. 대시보드 통합 | 캠프 관계자 | `app.campone.ai/{tenant}/dashboard` | JWT (대시보드에서 iframe으로 전달) |
| B. 개별 앱 직접 접근 | 캠프 관계자 | `app.campone.ai/{tenant}/{app}` | JWT (자체 로그인) |
| C. CivicHub 공개 | 유권자 | `civichub.kr/{slug}` | 없음 |
| D. CivicHub 관리 | 캠프 관계자 | `civichub.kr/admin/{slug}` | JWT (관리자 권한) |

### 4.2 인증 공통 원칙

```
┌─────────────────────────────────────────────────────────────────┐
│  모든 인증은 시스템 DB (campone_system) 경유                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 이메일/비밀번호 → 시스템 DB (users 테이블) 조회              │
│  2. user_tenants 조회 → 소속 캠프 확인                           │
│  3. JWT 발급 (user_id, tenant_id, role 포함)                    │
│  4. 이후 API 호출 시 JWT로 인증 + 테넌트 DB 연결                │
│                                                                 │
│  Embed / Standalone 모두 같은 인증 경로                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**JWT 구조:**
```json
{
  "sub": "user-uuid-123",
  "tenant_id": "camp-c",
  "role": "admin",
  "email": "user@camp.com",
  "name": "홍길동",
  "iat": 1738000000,
  "exp": 1738086400
}
```

### 4.3 유형 A: 대시보드 통합

```
┌─────────────────────────────────────────────────────────────────┐
│  흐름                                                           │
├─────────────────────────────────────────────────────────────────┤
│  1. 사용자 → dashboard-app 접속                                 │
│  2. 토큰 없음 → 로그인 페이지로 리다이렉트                       │
│  3. 로그인 완료 → JWT 발급 → localStorage/cookie 저장           │
│  4. 대시보드 렌더링 → iframe으로 각 앱 로드                     │
│  5. postMessage로 JWT를 각 iframe에 전달                        │
│  6. 각 앱은 전달받은 JWT로 API 호출                             │
└─────────────────────────────────────────────────────────────────┘
```

**대시보드 측 코드:**

```jsx
// dashboard-app/components/EmbeddedApp.jsx

import { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

export function EmbeddedApp({ appName, tenantId }) {
  const { token } = useAuth();
  const iframeRef = useRef(null);
  const appUrl = `https://${appName}-app.campone.ai/embed`;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !token) return;

    const handleLoad = () => {
      // postMessage로 인증 정보 전달
      iframe.contentWindow.postMessage(
        {
          type: 'CAMPONE_AUTH_INIT',
          payload: { token, tenantId }
        },
        new URL(appUrl).origin
      );
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [token, tenantId, appUrl]);

  return (
    <iframe
      ref={iframeRef}
      src={appUrl}
      className="w-full h-full border-0"
    />
  );
}
```

**웹앱 측 코드 (iframe 내부):**

```jsx
// insight-app/pages/embed.jsx (Next.js)

import { useEffect, useState } from 'react';
import { setAuthToken } from '../lib/auth';

export default function EmbedPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleMessage = async (event) => {
      // 출처 검증
      const allowedOrigins = [
        'https://app.campone.ai',
        'https://dashboard-app.campone.ai'
      ];
      if (!allowedOrigins.includes(event.origin)) {
        return;
      }

      if (event.data?.type === 'CAMPONE_AUTH_INIT') {
        const { token, tenantId } = event.data.payload;
        
        try {
          // 토큰 설정
          setAuthToken(token);
          setReady(true);
        } catch (err) {
          setError(err.message);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (error) return <div>인증 실패: {error}</div>;
  if (!ready) return <div>로딩 중...</div>;

  return <InsightApp />;
}
```

### 4.4 유형 B: 개별 앱 직접 접근

```
┌─────────────────────────────────────────────────────────────────┐
│  흐름                                                           │
├─────────────────────────────────────────────────────────────────┤
│  1. 사용자 → app.campone.ai/camp-d/insight 직접 접속            │
│  2. URL에서 tenant_id 추출 (camp-d)                             │
│  3. 저장된 토큰 확인 (localStorage/cookie)                      │
│     → 없으면: 로그인 페이지로 리다이렉트                         │
│     → 있으면: 토큰 검증                                         │
│  4. 토큰의 tenant_id와 URL의 tenant_id 일치 확인                │
│     → 불일치: 접근 거부                                         │
│     → 일치: 앱 로드                                             │
└─────────────────────────────────────────────────────────────────┘
```

**프론트엔드 코드 (Next.js):**

```jsx
// insight-app/pages/[tenant]/index.jsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getStoredToken, verifyToken, isTokenValid } from '../lib/auth';

export default function InsightPage() {
  const router = useRouter();
  const { tenant: tenantId } = router.query;
  const [authState, setAuthState] = useState({ loading: true, error: null });

  useEffect(() => {
    if (!tenantId) return;

    async function checkAuth() {
      // 1. 저장된 토큰 확인
      const token = getStoredToken();

      if (!token || !isTokenValid(token)) {
        // 토큰 없거나 만료됨 → 로그인 페이지로
        const returnUrl = encodeURIComponent(window.location.href);
        router.push(`/login?tenant=${tenantId}&return=${returnUrl}`);
        return;
      }

      try {
        // 2. 토큰 검증
        const payload = await verifyToken(token);

        // 3. 테넌트 일치 확인 (중요!)
        if (payload.tenant_id !== tenantId) {
          setAuthState({
            loading: false,
            error: '해당 캠프에 대한 접근 권한이 없습니다.'
          });
          return;
        }

        setAuthState({ loading: false, error: null });

      } catch (err) {
        // 토큰 검증 실패
        const returnUrl = encodeURIComponent(window.location.href);
        router.push(`/login?tenant=${tenantId}&return=${returnUrl}`);
      }
    }

    checkAuth();
  }, [tenantId, router]);

  if (authState.loading) return <Loading />;
  if (authState.error) return <Error message={authState.error} />;

  return <InsightApp tenantId={tenantId} />;
}
```

**로그인 페이지:**

```jsx
// insight-app/pages/login.jsx

import { useState } from 'react';
import { useRouter } from 'next/router';
import { login, setStoredToken } from '../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { tenant, return: returnUrl } = router.query;
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    
    try {
      // 로그인 API 호출
      const { token } = await login({
        ...credentials,
        tenant_id: tenant
      });

      // 토큰 저장 (localStorage 또는 httpOnly cookie)
      setStoredToken(token);

      // 원래 페이지로 리다이렉트
      if (returnUrl) {
        window.location.href = decodeURIComponent(returnUrl);
      } else {
        router.push(`/${tenant}`);
      }
    } catch (err) {
      setError('로그인 실패: ' + err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>{tenant} 캠프 로그인</h1>
      {error && <div className="error">{error}</div>}
      <input
        type="email"
        placeholder="이메일"
        value={credentials.email}
        onChange={e => setCredentials(c => ({ ...c, email: e.target.value }))}
      />
      <input
        type="password"
        placeholder="비밀번호"
        value={credentials.password}
        onChange={e => setCredentials(c => ({ ...c, password: e.target.value }))}
      />
      <button type="submit">로그인</button>
    </form>
  );
}
```

**토큰 저장/관리:**

```javascript
// insight-app/lib/auth.js

const TOKEN_KEY = 'campone_token';

export function setStoredToken(token) {
  // 옵션 1: localStorage (간단, XSS 취약)
  localStorage.setItem(TOKEN_KEY, token);
  
  // 옵션 2: httpOnly cookie (서버에서 설정, 더 안전)
  // → login API 응답에서 Set-Cookie 헤더로 처리
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function removeStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isTokenValid(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export async function verifyToken(token) {
  const response = await fetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  
  if (!response.ok) {
    throw new Error('Token verification failed');
  }
  
  return response.json();
}

export async function login(credentials) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  
  if (!response.ok) {
    throw new Error('Login failed');
  }
  
  return response.json();
}
```

**백엔드 로그인 API (시스템 DB 경유):**

```javascript
// pages/api/auth/login.js

import { getSystemDb } from '../../../lib/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  const { email, password, tenant_id } = req.body;
  
  const db = getSystemDb();
  
  // 1. 시스템 DB에서 사용자 조회
  const user = await db.users.findUnique({ where: { email } });
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // 2. 비밀번호 검증
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // 3. 소속 캠프 조회
  const memberships = await db.user_tenants.findMany({
    where: { user_id: user.id }
  });
  
  if (memberships.length === 0) {
    return res.status(403).json({ error: 'No camp assigned' });
  }
  
  // 4. 캠프 결정
  let membership;
  
  if (tenant_id) {
    // 명시적 지정 (URL에서 tenant_id 전달된 경우)
    membership = memberships.find(m => m.tenant_id === tenant_id);
    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this camp' });
    }
  } else if (memberships.length === 1) {
    // 1개면 자동 선택
    membership = memberships[0];
  } else {
    // 여러 캠프 소속 → 선택 필요
    return res.json({
      requires_tenant_selection: true,
      available_tenants: memberships.map(m => ({
        tenant_id: m.tenant_id,
        role: m.role
      }))
    });
  }
  
  // 5. JWT 발급
  const token = jwt.sign(
    {
      sub: user.id,
      tenant_id: membership.tenant_id,
      role: membership.role,
      email: user.email,
      name: user.name
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({ token });
}
```

**FastAPI 버전:**

```python
# api/auth.py

from fastapi import APIRouter, HTTPException
from lib.database import DatabaseManager
import bcrypt
import jwt

router = APIRouter()

@router.post("/auth/login")
async def login(email: str, password: str, tenant_id: str = None):
    pool = await DatabaseManager.get_system_pool()
    
    # 1. 사용자 조회 (시스템 DB)
    user = await pool.fetchrow(
        "SELECT * FROM users WHERE email = $1 AND is_active = true", email
    )
    if not user:
        raise HTTPException(401, "Invalid credentials")
    
    # 2. 비밀번호 검증
    if not bcrypt.checkpw(password.encode(), user["password_hash"].encode()):
        raise HTTPException(401, "Invalid credentials")
    
    # 3. 소속 캠프 조회
    memberships = await pool.fetch(
        "SELECT * FROM user_tenants WHERE user_id = $1", user["id"]
    )
    
    if not memberships:
        raise HTTPException(403, "No camp assigned")
    
    # 4. 캠프 결정
    if tenant_id:
        membership = next((m for m in memberships if m["tenant_id"] == tenant_id), None)
        if not membership:
            raise HTTPException(403, "Not a member of this camp")
    elif len(memberships) == 1:
        membership = memberships[0]
    else:
        return {
            "requires_tenant_selection": True,
            "available_tenants": [
                {"tenant_id": m["tenant_id"], "role": m["role"]}
                for m in memberships
            ]
        }
    
    # 5. JWT 발급
    token = jwt.encode({
        "sub": str(user["id"]),
        "tenant_id": membership["tenant_id"],
        "role": membership["role"],
        "email": user["email"],
        "name": user["name"]
    }, JWT_SECRET, algorithm="HS256")
    
    return {"token": token}
```

### 4.5 유형 C & D: CivicHub

```
┌─────────────────────────────────────────────────────────────────┐
│  CivicHub 접근 분기                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  civichub.kr/changwon-mayor        → 공개 (인증 없음)           │
│  civichub.kr/admin/changwon-mayor  → 관리자 (JWT 필수)          │
│  kim-candidate.kr                  → 공개 (커스텀 도메인)        │
│  kim-candidate.kr/admin            → 관리자 (JWT 필수)          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**CivicHub 미들웨어 (Next.js):**

```javascript
// civichub-app/middleware.js

import { NextResponse } from 'next/server';
import { verifyJWT } from './lib/auth';

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host');

  // 테넌트 식별
  const tenant = await identifyTenant(host, pathname);
  if (!tenant) {
    return NextResponse.redirect(new URL('/404', request.url));
  }

  // 관리자 영역 체크
  if (pathname.includes('/admin')) {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const payload = await verifyJWT(token);
      
      // 테넌트 일치 확인
      if (payload.tenant_id !== tenant.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      
      // 관리자 권한 확인
      if (!payload.roles?.includes('civichub_admin')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 테넌트 정보를 헤더에 추가
  const response = NextResponse.next();
  response.headers.set('x-tenant-id', tenant.id);
  return response;
}

async function identifyTenant(host, pathname) {
  // 1. 커스텀 도메인 체크
  let tenant = await getTenantByCustomDomain(host);
  if (tenant) return tenant;

  // 2. civichub.kr/{slug} 체크
  if (host.includes('civichub')) {
    const parts = pathname.split('/').filter(Boolean);
    const slug = parts[0] === 'admin' ? parts[1] : parts[0];
    if (slug) {
      tenant = await getTenantByPublicSlug(slug);
    }
  }

  return tenant;
}
```

---

## 5. 설정 로드 패턴

### 5.1 Tenant Config 구조

```yaml
# gs://campone-config/tenants/camp-c.yaml

# 기본 정보
tenant_id: "camp-c"
name: "창원시장 후보 캠프"
created_at: "2025-01-15T00:00:00Z"

# 서비스 제공 방식
service_mode: "dashboard"  # "dashboard" | "individual"

# 활성화된 앱 목록
enabled_apps:
  - "insight"
  - "policy"
  - "ops"
  - "studio"
  - "civichub"
  - "dashboard"

# 인증 설정
auth:
  session_duration_hours: 24
  
# 데이터베이스 (업무 데이터 전용, users는 시스템 DB)
database:
  instance: "campone-v2:asia-northeast3:campone-sql"
  name: "camp_c_db"

# 분석 설정
analysis:
  insight:
    default_period_days: 30
    min_frequency: 5
    custom_keywords:
      - "창원특례시"
      - "지역현안키워드"
    regional_sources:
      - "경남일보"
      - "창원시정소식"
  
  policy:
    comparison_targets: []
    focus_areas:
      - "지역개발"
      - "교육정책"

# CivicHub 설정
civichub:
  enabled: true
  public_slug: "changwon-mayor"
  custom_domain: null
  display_name: "창원시장 후보 홍길동"
  
  public_features:
    - "candidate_profile"
    - "policy_comparison"
    - "public_sentiment"
  
  theme:
    primary_color: "#1a56db"
    secondary_color: "#60a5fa"
    font_family: "Pretendard"
    logo_url: "https://storage.googleapis.com/campone-assets/camp-c/logo.png"
  
  layout:
    hero_style: "full_image"
    sections_order:
      - "candidate_profile"
      - "policy_comparison"
      - "public_sentiment"
      - "news_feed"
    hidden_sections: []

# UI 공통 설정
ui:
  theme: "light"
  primary_color: "#1a56db"
  logo_url: "https://storage.googleapis.com/campone-assets/camp-c/logo.png"
  
# LLM 사용량 제한
limits:
  llm_tokens_monthly: 500000
  llm_tokens_daily: 50000
  api_requests_per_minute: 60

# 데이터 생명주기
lifecycle:
  election_date: "2026-06-01"
  data_retention_days: 90
  export_before_deletion: true
```

### 5.2 설정 로드 함수

**Next.js (API Route):**

```javascript
// lib/tenant-config.js

import { Storage } from '@google-cloud/storage';
import yaml from 'js-yaml';
import Redis from 'ioredis';

const storage = new Storage();
const redis = new Redis(process.env.REDIS_URL);
const CONFIG_BUCKET = 'campone-config';
const CACHE_TTL = 300; // 5분

export async function loadTenantConfig(tenantId) {
  const cacheKey = `tenant_config:${tenantId}`;
  
  // 1. 캐시 확인
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. GCS에서 로드
  const bucket = storage.bucket(CONFIG_BUCKET);
  const file = bucket.file(`tenants/${tenantId}.yaml`);
  
  const [exists] = await file.exists();
  if (!exists) {
    throw new Error(`Tenant config not found: ${tenantId}`);
  }

  const [content] = await file.download();
  const config = yaml.load(content.toString());

  // 3. 캐시에 저장
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(config));

  return config;
}

export async function invalidateTenantConfigCache(tenantId) {
  await redis.del(`tenant_config:${tenantId}`);
}
```

**FastAPI:**

```python
# lib/tenant_config.py

import yaml
import json
from google.cloud import storage
import redis.asyncio as redis

redis_client = redis.from_url(os.getenv("REDIS_URL"))
storage_client = storage.Client()
CONFIG_BUCKET = "campone-config"
CACHE_TTL = 300

async def load_tenant_config(tenant_id: str) -> dict:
    cache_key = f"tenant_config:{tenant_id}"
    
    # 1. 캐시 확인
    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # 2. GCS에서 로드
    bucket = storage_client.bucket(CONFIG_BUCKET)
    blob = bucket.blob(f"tenants/{tenant_id}.yaml")
    
    if not blob.exists():
        raise ValueError(f"Tenant config not found: {tenant_id}")
    
    content = blob.download_as_text()
    config = yaml.safe_load(content)
    
    # 3. 캐시에 저장
    await redis_client.setex(cache_key, CACHE_TTL, json.dumps(config))
    
    return config
```

### 5.3 프론트엔드에서 설정 사용

```jsx
// hooks/useTenantConfig.js

import { createContext, useContext, useState, useEffect } from 'react';

const TenantConfigContext = createContext(null);

export function TenantConfigProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch('/api/config');
        const data = await response.json();
        setConfig(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  // 테마 CSS 변수 적용
  useEffect(() => {
    if (config?.ui) {
      const root = document.documentElement;
      root.style.setProperty('--color-primary', config.ui.primary_color || '#1a56db');
      root.style.setProperty('--color-secondary', config.ui.secondary_color || '#60a5fa');
    }
  }, [config]);

  return (
    <TenantConfigContext.Provider value={{ config, loading, error }}>
      {children}
    </TenantConfigContext.Provider>
  );
}

export function useTenantConfig() {
  const context = useContext(TenantConfigContext);
  if (!context) {
    throw new Error('useTenantConfig must be used within TenantConfigProvider');
  }
  return context;
}
```

---

## 6. 데이터베이스 구조

### 6.1 2계층 DB 구조

```
┌─────────────────────────────────────────────────────────────────┐
│  campone_system (공용 시스템 DB)                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  users              ← 전체 사용자 (tenant_id로 소속 구분 아님)   │
│  user_tenants       ← 사용자-캠프 매핑 (N:N)                    │
│  tenants            ← 테넌트 메타 정보                           │
│  llm_usage          ← LLM 사용량 추적                           │
│  audit_logs         ← 감사 로그                                 │
│                                                                 │
│  → 인증, 과금, 관리 데이터                                       │
│  → 모든 앱이 공통으로 접근                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  camp_{tenant}_db (캠프별 업무 DB) - 물리적 분리                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  camp_c_db:                                                     │
│    public.*    ← 대시보드 공통 (alerts, channel_links, kpi 등)  │
│    insight.*   ← Insight 서비스 (trends, analyses, ...)         │
│    studio.*    ← Studio 서비스 (contents, banners, ...)         │
│    policy.*    ← Policy 서비스 (policies, comparisons, ...)     │
│    ops.*       ← Ops 서비스 (tasks, schedules, ...)             │
│    hub.*       ← CivicHub 서비스 (contacts, segments, ...)      │
│                                                                 │
│  → 서비스별 PostgreSQL 스키마로 네임스페이스 격리                 │
│  → 물리적 분리로 cross-tenant 접근 원천 차단                     │
│  → users 없음!                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**왜 이렇게 나누는가:**

| 데이터 | 위치 | 이유 |
|--------|------|------|
| **사용자/인증** | 시스템 DB | 로그인 시 tenant_id 모르는 상태에서 조회 필요 |
| **사용량/과금** | 시스템 DB | 테넌트 간 비교, 전체 집계 필요 |
| **감사 로그** | 시스템 DB | 관리자 접근 기록 통합 관리 |
| **업무 데이터** | 테넌트 DB | 물리적 격리 필수, cross-tenant 차단 |

### 6.2 시스템 DB 스키마

```sql
-- campone_system

-- 사용자
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_system_admin BOOLEAN DEFAULT false,  -- CampOne 운영자
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자-테넌트 매핑 (N:N, 한 사용자가 여러 캠프 소속 가능)
CREATE TABLE user_tenants (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    is_default BOOLEAN DEFAULT false,  -- 로그인 시 기본 캠프
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, tenant_id)
);

CREATE INDEX idx_user_tenants_tenant ON user_tenants(tenant_id);

-- 테넌트 메타
CREATE TABLE tenants (
    tenant_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    db_name VARCHAR(100) NOT NULL,  -- 테넌트 DB명 (각 서비스가 이걸로 DB URL 조합)
    is_active BOOLEAN DEFAULT true,
    config_path VARCHAR(500),  -- 테넌트 설정 YAML 경로
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LLM 사용량
CREATE TABLE llm_usage (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    service VARCHAR(50) NOT NULL,
    provider VARCHAR(20) NOT NULL,
    model VARCHAR(100) NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
    latency_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_llm_usage_tenant_time ON llm_usage (tenant_id, created_at DESC);
CREATE INDEX idx_llm_usage_provider ON llm_usage (provider, created_at DESC);

-- 감사 로그
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id UUID REFERENCES users(id),
    tenant_id VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(200),
    detail JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_id, created_at DESC);
```

**역할 예시:**

| role | 설명 | 접근 가능 앱 |
|------|------|-------------|
| `admin` | 캠프 관리자 | 전체 |
| `analyst` | 분석가 | insight, policy |
| `operator` | 운영 담당 | ops |
| `content_manager` | 콘텐츠 담당 | studio |
| `civichub_admin` | CivicHub 관리 | civichub |

### 6.3 업무 DB 격리 원칙

```
┌─────────────────────────────────────────────────────────────────┐
│  [필수] 업무 데이터베이스 물리적 분리                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ 올바른 구조 (물리적 분리)                                    │
│  ─────────────────────────────                                  │
│  camp_c_db: candidates, analyses, policies, ...                │
│  camp_d_db: candidates, analyses, policies, ...                │
│                                                                 │
│  → 코드 버그가 있어도 다른 캠프 업무 데이터 접근 불가능           │
│                                                                 │
│  ❌ 위험한 구조 (논리적 분리만)                                  │
│  ─────────────────────────────                                  │
│  shared_db:                                                     │
│    analyses (tenant_id = 'camp_c' | 'camp_d' | ...)            │
│                                                                 │
│  → WHERE 절 실수 하나로 업무 데이터 유출 가능                    │
│                                                                 │
│  ⚠️ 시스템 DB는 논리적 분리 (허용)                               │
│  ─────────────────────────────                                  │
│  campone_system:                                                │
│    users, user_tenants, llm_usage, ...                          │
│                                                                 │
│  → 인증/관리 데이터는 중앙 관리가 자연스러움                     │
│  → user_tenants.tenant_id로 소속 구분                            │
│  → 업무 데이터가 아니므로 물리 분리 불필요                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 서비스별 PostgreSQL 스키마 격리

하나의 테넌트 DB 안에서 서비스별로 **PostgreSQL 스키마**를 사용하여 네임스페이스를 격리한다.

```
camp_dev_db/
├── public          ← 대시보드 공통 테이블 (alerts, channel_links, kpi_cache, ...)
├── insight         ← Insight 서비스 테이블 (trends, sentiment_analyses, ...)
├── studio          ← Studio 서비스 테이블 (contents, banners, templates, ...)
├── policy          ← Policy 서비스 테이블 (policies, comparisons, ...)
├── ops             ← Ops 서비스 테이블 (tasks, schedules, events, ...)
└── hub             ← CivicHub 서비스 테이블 (contacts, segments, messages, ...)
```

**규칙:**

| 규칙 | 설명 |
|------|------|
| 스키마 이름 = 서비스 이름 | insight, studio, policy, ops, hub |
| 대시보드 = public | 공유 참조 데이터 (campaign_profiles, channel_links 등) |
| 자기 스키마만 쓰기 | 각 서비스는 자기 스키마에만 INSERT/UPDATE/DELETE |
| public은 읽기만 | 다른 서비스는 `public.*` 직접 읽기 OK, 쓰기는 대시보드 API 호출 |
| 서비스 간 DB 참조 금지 | `insight.trends`에서 `studio.contents` 직접 JOIN 금지 |
| 다른 서비스 데이터 = API | 다른 서비스의 데이터가 필요하면 해당 서비스 API 호출 |

**서비스 간 데이터 접근 원칙:**

```
┌─────────────────────────────────────────────────────────────────┐
│  camp_dev_db 내 데이터 접근 규칙                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ 허용                                                        │
│  ─────────                                                      │
│  Insight → insight.*          (자기 스키마 읽기/쓰기)            │
│  Insight → public.*           (공유 데이터 읽기만)               │
│  Insight → Dashboard API      (alerts 생성, KPI 갱신 등)        │
│  Insight → Studio API         (Studio 데이터 필요 시)            │
│                                                                 │
│  ❌ 금지                                                        │
│  ─────────                                                      │
│  Insight → public.*           (직접 INSERT/UPDATE 금지)          │
│  Insight → studio.*           (다른 서비스 스키마 직접 접근 금지) │
│  Insight → ops.*              (다른 서비스 스키마 직접 접근 금지) │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**서비스가 스키마를 사용하는 방법:**

```sql
-- 스키마 생성 (서비스 최초 배포 시)
CREATE SCHEMA IF NOT EXISTS insight;

-- 테이블 생성
CREATE TABLE insight.trends (
    id BIGSERIAL PRIMARY KEY,
    keyword VARCHAR(200) NOT NULL,
    score NUMERIC(5,2),
    collected_at TIMESTAMPTZ DEFAULT NOW()
);

-- 서비스 접속 시 search_path 설정
SET search_path TO insight, public;
-- → insight.trends도, public.alerts도 스키마 없이 접근 가능
```

**Prisma에서 멀티 스키마 사용:**

```prisma
// insight 서비스의 schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  schemas  = ["insight", "public"]
}

model TrendData {
  id         Int      @id @default(autoincrement())
  keyword    String
  score      Decimal
  collectedAt DateTime @default(now()) @map("collected_at")

  @@schema("insight")
  @@map("trends")
}

// public 스키마의 공통 테이블 읽기 가능 (쓰기는 대시보드 API 호출)
model CampaignProfile {
  id            String @id
  candidateName String @map("candidate_name")
  candidateTitle String @map("candidate_title")

  @@schema("public")
  @@map("campaign_profiles")
}
```

**FastAPI에서 멀티 스키마 사용:**

```python
# SQLAlchemy: 테이블 정의 시 schema 지정
class TrendData(Base):
    __tablename__ = "trends"
    __table_args__ = {"schema": "insight"}

    id = Column(BigInteger, primary_key=True)
    keyword = Column(String(200), nullable=False)
    score = Column(Numeric(5, 2))

# 또는 연결 시 search_path 설정
engine = create_async_engine(
    tenant_db_url,
    connect_args={"options": "-c search_path=insight,public"}
)
```

**장점:**
- 서비스 간 테이블명 충돌 방지 (각 서비스가 `items` 테이블을 가져도 OK)
- 하나의 DB 연결로 자기 스키마 + public 모두 접근
- 서비스별 백업/마이그레이션 가능
- 권한 분리 가능 (필요시 서비스별 DB 유저에 스키마 단위 GRANT)

### 6.5 DB 커넥션 관리

```javascript
// lib/db.js

import { PrismaClient } from '@prisma/client';

// 시스템 DB: 항상 1개 (인증, 사용량, 감사 로그)
const systemDb = new PrismaClient({
  datasources: { db: { url: process.env.SYSTEM_DATABASE_URL } }
});

// 테넌트 DB: 캠프별 동적 생성 (업무 데이터)
const tenantClients = new Map();

export function getSystemDb() {
  return systemDb;
}

export async function getTenantDb(tenantId) {
  if (!tenantClients.has(tenantId)) {
    // 시스템 DB에서 테넌트 DB명 조회
    const tenant = await systemDb.tenants.findUnique({
      where: { tenant_id: tenantId },
      select: { db_name: true, is_active: true }
    });

    if (!tenant || !tenant.is_active) {
      throw new Error(`Tenant not found or inactive: ${tenantId}`);
    }

    // DATABASE_URL에서 DB명만 교체
    const baseUrl = process.env.DATABASE_URL;
    const tenantUrl = baseUrl.replace(/\/([^/?]+)(\?|$)/, `/${tenant.db_name}$2`);

    const client = new PrismaClient({
      datasources: { db: { url: tenantUrl } }
    });

    tenantClients.set(tenantId, client);
  }

  return tenantClients.get(tenantId);
}

// API Route에서 사용
export default async function handler(req, res) {
  const tenantId = req.headers['x-tenant-id'];
  
  // 인증 데이터 → 시스템 DB
  const user = await getSystemDb().users.findUnique({ 
    where: { id: req.userId } 
  });
  
  // 업무 데이터 → 테넌트 DB
  const analyses = await getTenantDb(tenantId).analyses.findMany();
  
  res.json({ user: user.name, analyses });
}
```

**FastAPI:**

```python
# lib/database.py

from typing import Dict
import asyncpg

class DatabaseManager:
    """시스템 DB + 테넌트 DB 관리"""
    
    _system_pool: asyncpg.Pool = None
    _tenant_pools: Dict[str, asyncpg.Pool] = {}
    
    @classmethod
    async def get_system_pool(cls) -> asyncpg.Pool:
        """시스템 DB (인증, 사용량, 감사 로그)"""
        if cls._system_pool is None:
            cls._system_pool = await asyncpg.create_pool(
                dsn=os.getenv("SYSTEM_DATABASE_URL"),
                min_size=5,
                max_size=20
            )
        return cls._system_pool
    
    @classmethod
    async def get_tenant_pool(cls, tenant_id: str) -> asyncpg.Pool:
        """테넌트 DB (업무 데이터) - 시스템 DB에서 db_name 조회"""
        if tenant_id not in cls._tenant_pools:
            # 시스템 DB에서 테넌트 DB명 조회
            system_pool = await cls.get_system_pool()
            row = await system_pool.fetchrow(
                "SELECT db_name, is_active FROM tenants WHERE tenant_id = $1",
                tenant_id
            )
            if not row or not row["is_active"]:
                raise ValueError(f"Tenant not found or inactive: {tenant_id}")

            # DATABASE_URL에서 DB명만 교체
            base_url = os.getenv("DATABASE_URL")
            tenant_url = re.sub(r'/([^/?]+)(\?|$)', f'/{row["db_name"]}\\2', base_url)

            cls._tenant_pools[tenant_id] = await asyncpg.create_pool(
                dsn=tenant_url,
                min_size=2,
                max_size=8,
                # 서비스별 스키마 사용 시 search_path 설정
                # server_settings={"search_path": "insight,public"}
            )

        return cls._tenant_pools[tenant_id]
```

### 6.5 캐시 키 네이밍 규칙

```javascript
// [필수] 캐시 키에 반드시 tenant_id 포함 (업무 데이터)

// ❌ 잘못된 예
cache.get("insight_result_123")  // 테넌트 구분 없음!

// ✅ 올바른 예
cache.get(`${tenantId}:insight_result:123`)

// 시스템 데이터는 tenant_id 불필요
cache.get("user:uuid-123")  // OK (시스템 DB)

// 유틸 함수
function cacheKey(tenantId, resource, id) {
  if (!tenantId) {
    throw new Error("tenantId is required for cache key");
  }
  return `${tenantId}:${resource}:${id}`;
}
```

---


## 7. LLM 연동 (멀티 프로바이더)

### 7.1 구조

```
┌─────────────────────────────────────────────────────────────────┐
│  테넌트별 API 키 분리 + 멀티 LLM 지원                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  캠프 A ─┬→ Anthropic 키 A → Claude API                         │
│         ├→ OpenAI 키 A    → GPT API                             │
│         └→ Google 키 A    → Gemini API                          │
│                                                                 │
│  캠프 B ─┬→ Anthropic 키 B → Claude API                         │
│         └→ OpenAI 키 B    → GPT API                             │
│                                                                 │
│  장점:                                                          │
│  - Gateway 불필요 (추가 인프라/개발 없음)                        │
│  - 테넌트 격리 (한 캠프 폭주해도 다른 캠프 영향 없음)            │
│  - 각 제공자 대시보드에서 키별 사용량 확인 가능                  │
│  - 제공자별 강점 활용 (분석=Claude, 이미지=GPT 등)              │
│  - 특정 제공자 장애 시 다른 제공자로 폴백 가능                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 지원 제공자

| 제공자 | 주요 모델 | 용도 예시 |
|--------|----------|-----------|
| **Anthropic** | Claude Sonnet, Opus, Haiku | 분석, 추론, 긴 문서 |
| **OpenAI** | GPT-4o, GPT-4o-mini | 범용, 이미지 분석 |
| **Google** | Gemini 1.5 Pro/Flash | 긴 컨텍스트, 비용 절감 |

### 7.3 API 키 관리

**각 제공자 Console에서 캠프별 키 생성:**

```
# Anthropic
https://console.anthropic.com/settings/keys
→ "camp-c-anthropic", "camp-d-anthropic", ...

# OpenAI
https://platform.openai.com/api-keys
→ "camp-c-openai", "camp-d-openai", ...

# Google AI
https://aistudio.google.com/apikey
→ "camp-c-google", "camp-d-google", ...
```

**GCP Secret Manager에 저장:**

```bash
# Anthropic 키
echo -n "sk-ant-xxx" | gcloud secrets create anthropic-camp-c --data-file=-

# OpenAI 키
echo -n "sk-openai-xxx" | gcloud secrets create openai-camp-c --data-file=-

# Google 키
echo -n "AIza-xxx" | gcloud secrets create google-camp-c --data-file=-
```

### 7.4 tenant config 구조

```yaml
# gs://campone-config/tenants/camp-c.yaml
tenant_id: "camp-c"
name: "창원시장 후보 캠프"

llm:
  # 기본 제공자
  default_provider: "anthropic"
  
  # 제공자별 설정
  providers:
    anthropic:
      enabled: true
      api_key_secret: "projects/campone-v2/secrets/anthropic-camp-c/versions/latest"
      default_model: "claude-sonnet-4-20250514"
      # 모델 옵션
      models:
        fast: "claude-haiku-4-20250414"
        balanced: "claude-sonnet-4-20250514"
        powerful: "claude-opus-4-20250514"
    
    openai:
      enabled: true
      api_key_secret: "projects/campone-v2/secrets/openai-camp-c/versions/latest"
      default_model: "gpt-4o"
      models:
        fast: "gpt-4o-mini"
        balanced: "gpt-4o"
        vision: "gpt-4o"  # 이미지 분석용
    
    google:
      enabled: false  # 이 캠프는 Google 미사용
      # api_key_secret: "..."
  
  # 서비스별 기본 제공자 (선택)
  service_defaults:
    insight: "anthropic"    # 분석은 Claude
    policy: "anthropic"
    studio: "openai"        # 콘텐츠 생성은 GPT (이미지 지원)
    ops: "anthropic"
    civichub: "anthropic"
```

### 7.5 LLM 클라이언트 구현 (JavaScript)

```javascript
// lib/llm-client.js

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const secretClient = new SecretManagerServiceClient();
const clientCache = new Map();

// Secret Manager에서 API 키 로드
async function getApiKey(secretPath) {
  if (clientCache.has(secretPath)) {
    return clientCache.get(secretPath);
  }
  
  const [version] = await secretClient.accessSecretVersion({ name: secretPath });
  const apiKey = version.payload.data.toString();
  clientCache.set(secretPath, apiKey);
  return apiKey;
}

// 통합 LLM 클라이언트
export class UnifiedLLMClient {
  constructor(tenantId, service) {
    this.tenantId = tenantId;
    this.service = service;
    this.config = null;
    this.clients = {};
  }
  
  async init() {
    this.config = await loadTenantConfig(this.tenantId);
  }
  
  // 제공자 결정: 명시 > 서비스별 > 기본
  resolveProvider(explicitProvider) {
    return (
      explicitProvider ||
      this.config.llm?.service_defaults?.[this.service] ||
      this.config.llm?.default_provider ||
      'anthropic'
    );
  }
  
  async getClient(provider) {
    const cacheKey = `${this.tenantId}:${provider}`;
    
    if (!this.clients[cacheKey]) {
      const providerConfig = this.config.llm?.providers?.[provider];
      if (!providerConfig?.enabled) {
        throw new Error(`Provider ${provider} not enabled for tenant ${this.tenantId}`);
      }
      
      const apiKey = await getApiKey(providerConfig.api_key_secret);
      
      switch (provider) {
        case 'anthropic':
          this.clients[cacheKey] = new Anthropic({ apiKey });
          break;
        case 'openai':
          this.clients[cacheKey] = new OpenAI({ apiKey });
          break;
        case 'google':
          this.clients[cacheKey] = new GoogleGenerativeAI(apiKey);
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    }
    
    return this.clients[cacheKey];
  }
  
  async complete({
    messages,
    system,
    model,
    maxTokens = 1000,
    provider,  // 명시적 제공자 지정 (선택)
    tier       // 'fast' | 'balanced' | 'powerful' (선택)
  }) {
    if (!this.config) await this.init();
    
    const resolvedProvider = this.resolveProvider(provider);
    const providerConfig = this.config.llm?.providers?.[resolvedProvider];
    
    // 모델 결정: 명시 > tier > 기본
    const resolvedModel = model || 
      (tier && providerConfig.models?.[tier]) || 
      providerConfig.default_model;
    
    const startTime = Date.now();
    let response;
    
    switch (resolvedProvider) {
      case 'anthropic':
        response = await this.callAnthropic({ messages, system, model: resolvedModel, maxTokens });
        break;
      case 'openai':
        response = await this.callOpenAI({ messages, system, model: resolvedModel, maxTokens });
        break;
      case 'google':
        response = await this.callGoogle({ messages, system, model: resolvedModel, maxTokens });
        break;
    }
    
    // 사용량 기록
    this.recordUsage({
      provider: resolvedProvider,
      model: resolvedModel,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      latency_ms: Date.now() - startTime
    }).catch(console.error);
    
    return response;
  }
  
  async callAnthropic({ messages, system, model, maxTokens }) {
    const client = await this.getClient('anthropic');
    
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages
    });
    
    return {
      content: response.content[0].text,
      provider: 'anthropic',
      model: response.model,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      }
    };
  }
  
  async callOpenAI({ messages, system, model, maxTokens }) {
    const client = await this.getClient('openai');
    
    const systemMessage = system ? [{ role: 'system', content: system }] : [];
    
    const response = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [...systemMessage, ...messages]
    });
    
    return {
      content: response.choices[0].message.content,
      provider: 'openai',
      model: response.model,
      usage: {
        input_tokens: response.usage.prompt_tokens,
        output_tokens: response.usage.completion_tokens
      }
    };
  }
  
  async callGoogle({ messages, system, model, maxTokens }) {
    const client = await this.getClient('google');
    const genModel = client.getGenerativeModel({ 
      model,
      generationConfig: { maxOutputTokens: maxTokens }
    });
    
    // Gemini 형식으로 변환
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    
    const chat = genModel.startChat({ 
      history,
      systemInstruction: system ? { parts: [{ text: system }] } : undefined
    });
    
    const lastMessage = messages[messages.length - 1].content;
    const response = await chat.sendMessage(lastMessage);
    const result = response.response;
    
    return {
      content: result.text(),
      provider: 'google',
      model,
      usage: {
        input_tokens: result.usageMetadata?.promptTokenCount || 0,
        output_tokens: result.usageMetadata?.candidatesTokenCount || 0
      }
    };
  }
  
  async recordUsage(usage) {
    await fetch('/api/internal/usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: this.tenantId,
        service: this.service,
        ...usage,
        timestamp: new Date().toISOString()
      })
    });
  }
}

// 팩토리 함수
export function createLLMClient(tenantId, service) {
  return new UnifiedLLMClient(tenantId, service);
}
```

### 7.6 LLM 클라이언트 구현 (Python)

```python
# lib/llm_client.py

from anthropic import Anthropic
from openai import OpenAI
import google.generativeai as genai
from google.cloud import secretmanager
from functools import lru_cache
import time
import os

secret_client = secretmanager.SecretManagerServiceClient()

@lru_cache(maxsize=100)
def get_api_key(secret_path: str) -> str:
    """Secret Manager에서 API 키 로드"""
    response = secret_client.access_secret_version(name=secret_path)
    return response.payload.data.decode("utf-8")


class UnifiedLLMClient:
    def __init__(self, tenant_id: str, service: str):
        self.tenant_id = tenant_id
        self.service = service
        self.config = None
        self.clients = {}
    
    async def init(self):
        self.config = await load_tenant_config(self.tenant_id)
    
    def resolve_provider(self, explicit_provider: str = None) -> str:
        return (
            explicit_provider or
            self.config.get("llm", {}).get("service_defaults", {}).get(self.service) or
            self.config.get("llm", {}).get("default_provider") or
            "anthropic"
        )
    
    def get_client(self, provider: str):
        cache_key = f"{self.tenant_id}:{provider}"
        
        if cache_key not in self.clients:
            provider_config = self.config.get("llm", {}).get("providers", {}).get(provider, {})
            if not provider_config.get("enabled", False):
                raise ValueError(f"Provider {provider} not enabled")
            
            api_key = get_api_key(provider_config["api_key_secret"])
            
            if provider == "anthropic":
                self.clients[cache_key] = Anthropic(api_key=api_key)
            elif provider == "openai":
                self.clients[cache_key] = OpenAI(api_key=api_key)
            elif provider == "google":
                genai.configure(api_key=api_key)
                self.clients[cache_key] = genai
        
        return self.clients[cache_key]
    
    async def complete(
        self,
        messages: list,
        system: str = None,
        model: str = None,
        max_tokens: int = 1000,
        provider: str = None,
        tier: str = None  # 'fast' | 'balanced' | 'powerful'
    ) -> dict:
        if not self.config:
            await self.init()
        
        resolved_provider = self.resolve_provider(provider)
        provider_config = self.config["llm"]["providers"][resolved_provider]
        
        # 모델 결정
        resolved_model = (
            model or
            (tier and provider_config.get("models", {}).get(tier)) or
            provider_config["default_model"]
        )
        
        start_time = time.time()
        
        if resolved_provider == "anthropic":
            response = await self._call_anthropic(messages, system, resolved_model, max_tokens)
        elif resolved_provider == "openai":
            response = await self._call_openai(messages, system, resolved_model, max_tokens)
        elif resolved_provider == "google":
            response = await self._call_google(messages, system, resolved_model, max_tokens)
        
        # 사용량 기록
        await self._record_usage(
            provider=resolved_provider,
            model=resolved_model,
            input_tokens=response["usage"]["input_tokens"],
            output_tokens=response["usage"]["output_tokens"],
            latency_ms=int((time.time() - start_time) * 1000)
        )
        
        return response
    
    async def _call_anthropic(self, messages, system, model, max_tokens):
        client = self.get_client("anthropic")
        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=messages
        )
        return {
            "content": response.content[0].text,
            "provider": "anthropic",
            "model": response.model,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens
            }
        }
    
    async def _call_openai(self, messages, system, model, max_tokens):
        client = self.get_client("openai")
        system_msg = [{"role": "system", "content": system}] if system else []
        response = client.chat.completions.create(
            model=model,
            max_tokens=max_tokens,
            messages=system_msg + messages
        )
        return {
            "content": response.choices[0].message.content,
            "provider": "openai",
            "model": response.model,
            "usage": {
                "input_tokens": response.usage.prompt_tokens,
                "output_tokens": response.usage.completion_tokens
            }
        }
    
    async def _call_google(self, messages, system, model, max_tokens):
        client = self.get_client("google")
        gen_model = client.GenerativeModel(
            model,
            generation_config={"max_output_tokens": max_tokens},
            system_instruction=system
        )
        
        history = [
            {"role": "model" if m["role"] == "assistant" else "user", 
             "parts": [m["content"]]}
            for m in messages[:-1]
        ]
        
        chat = gen_model.start_chat(history=history)
        response = chat.send_message(messages[-1]["content"])
        
        return {
            "content": response.text,
            "provider": "google",
            "model": model,
            "usage": {
                "input_tokens": response.usage_metadata.prompt_token_count or 0,
                "output_tokens": response.usage_metadata.candidates_token_count or 0
            }
        }
    
    async def _record_usage(self, **usage):
        # 구현: DB 또는 API 호출
        pass


def create_llm_client(tenant_id: str, service: str) -> UnifiedLLMClient:
    return UnifiedLLMClient(tenant_id, service)
```

### 7.7 사용 예시

```javascript
// 기본 사용 (tenant config의 service_defaults 또는 default_provider)
const client = createLLMClient('camp-c', 'insight');
const result = await client.complete({
  messages: [{ role: 'user', content: '여론 분석해줘' }],
  system: '정치 여론 분석 전문가입니다.'
});

// 제공자 명시적 지정
const result2 = await client.complete({
  messages: [{ role: 'user', content: '이미지 설명해줘' }],
  provider: 'openai',
  model: 'gpt-4o'
});

// tier로 모델 선택 (fast/balanced/powerful)
const quickResult = await client.complete({
  messages: [{ role: 'user', content: '간단한 질문' }],
  tier: 'fast'  // claude-haiku 또는 gpt-4o-mini
});

const deepResult = await client.complete({
  messages: [{ role: 'user', content: '복잡한 분석' }],
  tier: 'powerful'  // claude-opus
});
```

### 7.8 사용량 기록 DB

```sql
-- 공용 시스템 DB
CREATE TABLE llm_usage (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    service VARCHAR(50) NOT NULL,
    provider VARCHAR(20) NOT NULL,  -- anthropic, openai, google
    model VARCHAR(100) NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
    latency_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_llm_usage_tenant_time ON llm_usage (tenant_id, created_at DESC);
CREATE INDEX idx_llm_usage_provider ON llm_usage (provider, created_at DESC);

-- 제공자별 일별 집계 뷰
CREATE VIEW v_llm_usage_by_provider AS
SELECT 
    tenant_id,
    provider,
    DATE(created_at) as date,
    COUNT(*) as requests,
    SUM(total_tokens) as total_tokens,
    AVG(latency_ms) as avg_latency_ms
FROM llm_usage
GROUP BY tenant_id, provider, DATE(created_at);

-- 서비스별 월별 집계 뷰
CREATE VIEW v_llm_usage_monthly AS
SELECT 
    tenant_id,
    service,
    provider,
    TO_CHAR(created_at, 'YYYY-MM') as year_month,
    COUNT(*) as requests,
    SUM(input_tokens) as input_tokens,
    SUM(output_tokens) as output_tokens,
    SUM(total_tokens) as total_tokens
FROM llm_usage
GROUP BY tenant_id, service, provider, TO_CHAR(created_at, 'YYYY-MM');
```

### 7.9 사용량 조회 API

```javascript
// pages/api/usage/summary.js

export default async function handler(req, res) {
  const tenantId = req.headers['x-tenant-id'];
  const { period = 'month' } = req.query;
  
  const db = getSystemDbClient();
  
  // 제공자별 사용량
  const byProvider = await db.$queryRaw`
    SELECT provider, SUM(total_tokens) as tokens, COUNT(*) as requests
    FROM llm_usage
    WHERE tenant_id = ${tenantId}
      AND created_at >= ${getStartDate(period)}
    GROUP BY provider
  `;
  
  // 서비스별 사용량
  const byService = await db.$queryRaw`
    SELECT service, provider, SUM(total_tokens) as tokens
    FROM llm_usage
    WHERE tenant_id = ${tenantId}
      AND created_at >= ${getStartDate(period)}
    GROUP BY service, provider
  `;
  
  res.json({
    tenant_id: tenantId,
    period,
    by_provider: byProvider,
    by_service: byService
  });
}
```

### 7.10 (선택) Gateway 확장

나중에 Gateway가 필요해지면:

```javascript
// 환경변수로 분기
export function createLLMClient(tenantId, service) {
  if (process.env.USE_LLM_GATEWAY === 'true') {
    return new GatewayLLMClient(tenantId, service);
  }
  return new UnifiedLLMClient(tenantId, service);
}
```

**Gateway가 필요한 시점:**
- 캠프 10개 이상으로 확장 시
- 캐싱으로 비용 절감이 필요할 때
- 요청 큐잉/우선순위가 필요할 때
- 세밀한 한도 강제가 필요할 때

---
## 8. 프론트엔드 구현 패턴

### 8.1 프로젝트 구조 (Next.js)

```
{app}-app/
├── pages/
│   ├── _app.jsx              # 앱 래퍼
│   ├── [tenant]/
│   │   ├── index.jsx         # 메인 페이지
│   │   └── [...slug].jsx     # 하위 페이지
│   ├── embed.jsx             # iframe 임베드용
│   ├── login.jsx             # 로그인 페이지
│   └── api/
│       ├── config.js         # 설정 API
│       ├── auth/
│       │   ├── login.js
│       │   └── verify.js
│       └── [feature]/        # 기능별 API
│
├── components/
│   ├── common/
│   └── features/
│
├── hooks/
│   ├── useAuth.js
│   └── useTenantConfig.js
│
├── lib/
│   ├── auth.js               # 인증 유틸
│   ├── db.js                 # DB 클라이언트
│   ├── llm-client.js         # LLM 클라이언트
│   └── tenant-config.js      # 설정 로더
│
├── middleware.js             # Next.js 미들웨어
├── next.config.js
└── package.json
```

### 8.2 미들웨어 (Next.js)

```javascript
// middleware.js

import { NextResponse } from 'next/server';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 정적 파일, API 제외
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/login' ||
    pathname === '/embed'
  ) {
    return NextResponse.next();
  }

  // tenant_id 추출
  const pathParts = pathname.split('/').filter(Boolean);
  const tenantId = pathParts[0];

  if (!tenantId || !tenantId.startsWith('camp-')) {
    return NextResponse.redirect(new URL('/404', request.url));
  }

  // 테넌트 정보를 헤더에 추가 (API Route에서 사용)
  const response = NextResponse.next();
  response.headers.set('x-tenant-id', tenantId);

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
```

### 8.3 API 클라이언트

```javascript
// lib/api-client.js

class ApiClient {
  constructor(tenantId, token) {
    this.tenantId = tenantId;
    this.token = token;
  }

  async request(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.token ? `Bearer ${this.token}` : undefined,
        'X-Tenant-ID': this.tenantId,
        ...options.headers
      }
    });

    if (response.status === 401) {
      // 토큰 만료 처리
      window.location.href = `/login?return=${encodeURIComponent(window.location.href)}`;
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  get(path) {
    return this.request(path);
  }

  post(path, data) {
    return this.request(path, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

// 사용
const api = new ApiClient(tenantId, token);
const data = await api.get('/api/insight/recent');
```

---

## 9. 백엔드 구현 패턴

### 9.1 Next.js API Routes

```javascript
// pages/api/insight/analyze.js

import { createLLMClient } from '../../../lib/llm-client';
import { getDbClient } from '../../../lib/db';
import { loadTenantConfig } from '../../../lib/tenant-config';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID required' });
  }

  try {
    // 설정 로드
    const config = await loadTenantConfig(tenantId);
    
    // 기능 활성화 확인
    if (!config.enabled_apps.includes('insight')) {
      return res.status(403).json({ error: 'Feature not enabled' });
    }

    const { text } = req.body;

    // LLM 분석
    const llmClient = createLLMClient(tenantId, 'insight');
    const analysisConfig = config.analysis?.insight || {};
    
    const result = await llmClient.complete({
      messages: [{ role: 'user', content: `분석: ${text}` }],
      system: buildSystemPrompt(analysisConfig),
      maxTokens: 500,
      cacheTtl: 1800
    });

    // 결과 저장
    const db = getDbClient(tenantId);
    await db.insightData.create({
      data: {
        query: text,
        result: result.content[0].text,
        tokens_used: result.usage.input_tokens + result.usage.output_tokens
      }
    });

    res.json({
      result: result.content[0].text,
      cached: result.cached
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
}

function buildSystemPrompt(config) {
  let prompt = '당신은 한국어 텍스트 분석 전문가입니다.';
  
  if (config.custom_keywords?.length) {
    prompt += `\n\n특히 다음 키워드에 주목하세요: ${config.custom_keywords.join(', ')}`;
  }
  
  return prompt;
}
```

### 9.2 FastAPI 구조

```python
# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.middleware.tenant import TenantMiddleware
from app.api.routes import config, insight, health

app = FastAPI(title="Insight App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.campone.ai"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(TenantMiddleware)

app.include_router(health.router)
app.include_router(config.router, prefix="/api")
app.include_router(insight.router, prefix="/api/insight")
```

```python
# app/api/routes/insight.py

from fastapi import APIRouter, Request, HTTPException
from app.lib.llm_client import create_llm_client
from app.lib.database import get_db_connection
from app.lib.tenant_config import load_tenant_config

router = APIRouter()

@router.post("/analyze")
async def analyze(request: Request, payload: AnalyzeRequest):
    tenant_id = request.state.tenant_id
    
    # 설정 로드
    config = await load_tenant_config(tenant_id)
    
    # 기능 확인
    if "insight" not in config.get("enabled_apps", []):
        raise HTTPException(403, "Feature not enabled")
    
    # LLM 분석
    llm_client = create_llm_client(tenant_id, "insight")
    analysis_config = config.get("analysis", {}).get("insight", {})
    
    result = await llm_client.complete(
        messages=[{"role": "user", "content": f"분석: {payload.text}"}],
        system=build_system_prompt(analysis_config),
        max_tokens=500,
        cache_ttl=1800
    )
    
    # 결과 저장
    async with get_db_connection(tenant_id) as conn:
        await conn.execute(
            "INSERT INTO insight_data (query, result) VALUES ($1, $2)",
            payload.text,
            result["content"][0]["text"]
        )
    
    return {
        "result": result["content"][0]["text"],
        "cached": result.get("cached", False)
    }
```

---

## 10. 커스터마이징 지원

### 10.1 커스터마이징 레벨

```
┌─────────────────────────────────────────────────────────────────┐
│                    커스터마이징 레벨                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Level 1: 설정 (tenant config)                                  │
│  ─────────────────────────────                                  │
│  - 기능 on/off                                                  │
│  - UI 테마, 색상, 로고                                          │
│  - 분석 파라미터 (기간, 키워드 등)                               │
│  - 레이아웃 순서, 섹션 표시/숨김                                 │
│  → 코드 수정 불필요, 설정만 변경                                 │
│                                                                 │
│  Level 2: 코드 분기 (범용화 가능한 경우)                         │
│  ──────────────────────────────────────                         │
│  - 다른 캠프에도 유용할 기능                                     │
│  - 옵션으로 추가하여 코어에 반영                                 │
│  → 전체 배포, 설정으로 활성화                                    │
│                                                                 │
│  Level 3: 전용 Fork (별도 계약)                                 │
│  ────────────────────────────                                   │
│  - 완전히 특수한 요구                                           │
│  - 해당 캠프만 사용                                              │
│  → 별도 Cloud Run 배포, 코어 머지 수동                          │
│                                                                 │
│  Level 4: 거절                                                  │
│  ───────────                                                    │
│  - 구조적 불가능                                                 │
│  - ROI 안 맞음                                                  │
│  - 윤리적 문제 (결과 조작 등)                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 UI 커스터마이징 (Level 1)

```yaml
# tenant config
civichub:
  theme:
    primary_color: "#1a56db"
    font_family: "Pretendard"
    logo_url: "https://..."
  
  layout:
    hero_style: "full_image"
    sections_order:
      - "candidate_profile"
      - "policy_comparison"
      - "public_sentiment"
    hidden_sections:
      - "news_feed"
```

```jsx
// CivicHub 페이지
function CivicHubPage({ config }) {
  const sections = {
    candidate_profile: <CandidateProfile />,
    policy_comparison: <PolicyComparison />,
    public_sentiment: <PublicSentiment />,
    news_feed: <NewsFeed />
  };

  const visibleSections = config.layout.sections_order
    .filter(s => !config.layout.hidden_sections.includes(s));

  return (
    <div style={{ '--primary': config.theme.primary_color }}>
      {visibleSections.map(section => (
        <div key={section}>{sections[section]}</div>
      ))}
    </div>
  );
}
```

### 10.3 분석 커스터마이징 (Level 1)

```yaml
# tenant config
analysis:
  insight:
    default_period_days: 30
    custom_keywords:
      - "창원특례시"
      - "지역현안"
    regional_sources:
      - "경남일보"
```

```javascript
// 분석 서비스에서 설정 적용
async function analyzeInsight(tenantId, text) {
  const config = await loadTenantConfig(tenantId);
  const insightConfig = config.analysis?.insight || {};

  // 커스텀 키워드 포함
  const keywords = insightConfig.custom_keywords || [];
  
  const systemPrompt = keywords.length > 0
    ? `분석 시 다음 키워드에 주목하세요: ${keywords.join(', ')}`
    : '일반적인 분석을 수행하세요.';

  // LLM 호출
  const result = await llmClient.complete({
    messages: [{ role: 'user', content: text }],
    system: systemPrompt
  });

  return result;
}
```

---

## 11. 보안 체크리스트

### 11.1 필수 보안 항목

```
┌─────────────────────────────────────────────────────────────────┐
│  [필수] 모든 서비스에 적용해야 하는 보안 항목                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  □ 테넌트 식별 미들웨어 적용                                    │
│  □ JWT 토큰 검증 (tenant_id 일치 확인)                          │
│  □ DB 물리적 분리 (테넌트별 별도 DB)                            │
│  □ 캐시 키에 tenant_id 포함                                     │
│  □ 감사 로그 기록 (민감한 작업)                                  │
│  □ CORS 허용 도메인 제한                                        │
│  □ Rate limiting 적용                                           │
│  □ 입력 검증                                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 11.2 Cross-Tenant 접근 방지

```javascript
// 모든 API에서 테넌트 일치 확인
async function validateTenantAccess(req) {
  const tokenTenantId = req.user?.tenant_id;
  const requestTenantId = req.headers['x-tenant-id'];

  if (tokenTenantId && tokenTenantId !== requestTenantId) {
    console.warn(`Cross-tenant access attempt: ${tokenTenantId} → ${requestTenantId}`);
    throw new Error('Access denied');
  }
}
```

### 11.3 감사 로그

```javascript
// lib/audit.js

async function auditLog(tenantId, userId, action, resource, details = {}) {
  await db.auditLogs.create({
    data: {
      tenant_id: tenantId,
      user_id: userId,
      action,
      resource,
      details: JSON.stringify(details),
      timestamp: new Date()
    }
  });
}

// 사용 예
await auditLog(tenantId, user.id, 'DELETE', `data:${dataId}`, { reason });
```

---

## 12. 마이그레이션 가이드

### 12.1 전환 단계

```
Phase 1: 준비
─────────────
- LLM Gateway 개발 및 배포 (선행 필수)
- shared 모듈 구현
- 테스트 환경 구축

Phase 2: 파일럿
───────────────
- 단일 앱 (예: insight-app) v2로 전환
- 기존 캠프 중 하나로 파일럿 테스트
- 문제점 발견 및 수정

Phase 3: 확장
─────────────
- 나머지 웹앱 v2로 전환
- 신규 캠프는 v2로 온보딩
- Dashboard, CivicHub 통합

Phase 4: 완료
─────────────
- 기존 캠프 선택적 마이그레이션
- 기존 시스템 종료
```

### 12.2 앱 전환 체크리스트

```
□ 환경 설정
  □ USE_LLM_GATEWAY 환경변수 추가
  □ 테넌트 설정 경로 설정

□ 인증
  □ 토큰 저장/로드 로직 구현
  □ 로그인 페이지 구현
  □ 테넌트 일치 검증 추가

□ 테넌트 격리
  □ 미들웨어에서 테넌트 식별
  □ DB 커넥션을 테넌트별로 분리
  □ 캐시 키에 tenant_id 포함

□ LLM 연동
  □ LLM 클라이언트 폴백 모드 구현
  □ 서비스명 헤더 추가

□ 설정 로드
  □ tenant config 로드 구현
  □ 설정 기반 기능 분기

□ 테스트
  □ 멀티테넌트 테스트 케이스
  □ Cross-tenant 접근 테스트
```

---

## 부록: 환경변수 요약

```bash
# 공통
NODE_ENV=production
REDIS_URL=redis://redis:6379

# 인증
JWT_SECRET=your-secret

# 테넌트 설정
CONFIG_BUCKET=campone-config

# LLM (개발)
USE_LLM_GATEWAY=false
ANTHROPIC_API_KEY=sk-ant-xxx

# LLM (프로덕션)
USE_LLM_GATEWAY=true
LLM_GATEWAY_URL=http://llm-gateway.internal
GATEWAY_SERVICE_TOKEN=xxx
```

---

## 문서 버전

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0.0 | 2025-02-03 | 초기 작성 |
| 1.1.0 | 2025-02-03 | 피드백 반영 (앱 목록, 인증 흐름, Gateway 폴백) |
| 1.2.0 | 2025-02-03 | 테넌트별 API 키 방식으로 변경 |
| 1.3.0 | 2025-02-03 | 멀티 LLM 프로바이더 지원 |
| 1.4.0 | 2025-02-05 | 시스템 DB 도입, users 중앙 관리, 인증 흐름 통일 |

---

*이 문서에 대한 질문이나 개선 제안은 아키텍처 담당자에게 문의하세요.*
