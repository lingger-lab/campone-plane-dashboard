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
7. [LLM Gateway 연동](#7-llm-gateway-연동)
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
│  [auth-service]       ─── 인증 서버 (토큰 발급/검증)                     │
│  [llm-gateway]        ─── LLM API 중계 + 사용량 추적                     │
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

### 4.2 유형 A: 대시보드 통합

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

### 4.3 유형 B: 개별 앱 직접 접근

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

### 4.4 유형 C & D: CivicHub

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
  
# 데이터베이스
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

## 6. 데이터베이스 격리

### 6.1 격리 원칙

```
┌─────────────────────────────────────────────────────────────────┐
│  [필수] 데이터베이스 물리적 분리                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ 올바른 구조 (물리적 분리)                                    │
│  ─────────────────────────────                                  │
│  camp_a_db: insight_data, policies, voters, ...                │
│  camp_b_db: insight_data, policies, voters, ...                │
│  camp_c_db: insight_data, policies, voters, ...                │
│                                                                 │
│  → 코드 버그가 있어도 다른 캠프 데이터 접근 불가능                │
│                                                                 │
│  ❌ 위험한 구조 (논리적 분리만)                                  │
│  ─────────────────────────────                                  │
│  shared_db:                                                     │
│    insight_data (tenant_id = 'camp_a' | 'camp_b' | ...)        │
│                                                                 │
│  → WHERE 절 실수 하나로 데이터 유출 가능                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 DB 커넥션 관리

**Next.js (Prisma 사용 시):**

```javascript
// lib/db.js

import { PrismaClient } from '@prisma/client';

const prismaClients = new Map();

export function getDbClient(tenantId) {
  if (!prismaClients.has(tenantId)) {
    const config = getTenantDbConfig(tenantId);
    
    const client = new PrismaClient({
      datasources: {
        db: {
          url: config.connectionString
        }
      }
    });
    
    prismaClients.set(tenantId, client);
  }
  
  return prismaClients.get(tenantId);
}

// API Route에서 사용
export default async function handler(req, res) {
  const tenantId = req.headers['x-tenant-id'];
  const db = getDbClient(tenantId);
  
  const data = await db.insightData.findMany();
  res.json(data);
}
```

**FastAPI (asyncpg 사용 시):**

```python
# lib/database.py

from typing import Dict
import asyncpg

class TenantDBPool:
    _pools: Dict[str, asyncpg.Pool] = {}
    
    @classmethod
    async def get_pool(cls, tenant_id: str) -> asyncpg.Pool:
        if tenant_id not in cls._pools:
            config = await load_tenant_config(tenant_id)
            db_config = config["database"]
            
            cls._pools[tenant_id] = await asyncpg.create_pool(
                host=db_config.get("host", "localhost"),
                database=db_config["name"],
                user=db_config.get("user", "campone"),
                password=await get_db_password(tenant_id),
                min_size=2,
                max_size=10
            )
        
        return cls._pools[tenant_id]
```

### 6.3 캐시 키 네이밍 규칙

```javascript
// [필수] 캐시 키에 반드시 tenant_id 포함

// ❌ 잘못된 예
cache.get("insight_result_123")  // 테넌트 구분 없음!

// ✅ 올바른 예
cache.get(`${tenantId}:insight_result:123`)

// 유틸 함수
function cacheKey(tenantId, resource, id) {
  if (!tenantId) {
    throw new Error("tenantId is required for cache key");
  }
  return `${tenantId}:${resource}:${id}`;
}
```

---

## 7. LLM 연동 (테넌트별 API 키)

### 7.1 구조

```
┌─────────────────────────────────────────────────────────────────┐
│  테넌트별 API 키 분리                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  캠프 A → API 키 A → Claude API                                 │
│  캠프 B → API 키 B → Claude API                                 │
│  캠프 C → API 키 C → Claude API                                 │
│                                                                 │
│  장점:                                                          │
│  - Gateway 없이 심플하게 구현                                    │
│  - 테넌트 간 rate limit 격리 (한 캠프 폭주해도 다른 캠프 영향 X) │
│  - Anthropic 대시보드에서 키별 사용량 확인 가능                  │
│  - 문제 캠프 키만 비활성화 가능                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 API 키 관리

**Anthropic Console에서 캠프별 키 생성:**

```
https://console.anthropic.com/settings/keys

[Create Key] → 이름: "camp-c-changwon"
[Create Key] → 이름: "camp-d-sacheon"
...
```

**GCP Secret Manager에 저장 (권장):**

```bash
# 키 저장
echo -n "sk-ant-xxx" | gcloud secrets create anthropic-camp-c --data-file=-
echo -n "sk-ant-yyy" | gcloud secrets create anthropic-camp-d --data-file=-
```

**tenant config에 참조:**

```yaml
# gs://campone-config/tenants/camp-c.yaml
tenant_id: "camp-c"
name: "창원시장 후보 캠프"

llm:
  # Secret Manager 참조 (권장)
  anthropic_api_key_ref: "projects/campone-v2/secrets/anthropic-camp-c/versions/latest"
  
  # 또는 환경변수명 (차선)
  # anthropic_api_key_env: "ANTHROPIC_API_KEY_CAMP_C"
```

### 7.3 LLM 클라이언트 구현

**JavaScript (Next.js):**

```javascript
// lib/llm-client.js

import Anthropic from '@anthropic-ai/sdk';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const secretClient = new SecretManagerServiceClient();
const apiKeyCache = new Map();

// API 키 로드 (캐싱)
async function getApiKey(tenantId) {
  if (apiKeyCache.has(tenantId)) {
    return apiKeyCache.get(tenantId);
  }
  
  const config = await loadTenantConfig(tenantId);
  
  let apiKey;
  if (config.llm?.anthropic_api_key_ref) {
    // Secret Manager에서 로드
    const [version] = await secretClient.accessSecretVersion({
      name: config.llm.anthropic_api_key_ref
    });
    apiKey = version.payload.data.toString();
  } else {
    // 환경변수에서 로드 (개발용)
    apiKey = process.env.ANTHROPIC_API_KEY;
  }
  
  apiKeyCache.set(tenantId, apiKey);
  return apiKey;
}

// LLM 클라이언트
export class TenantLLMClient {
  constructor(tenantId, service) {
    this.tenantId = tenantId;
    this.service = service;
    this.client = null;
  }
  
  async init() {
    const apiKey = await getApiKey(this.tenantId);
    this.client = new Anthropic({ apiKey });
  }
  
  async complete({ messages, system, model, maxTokens }) {
    if (!this.client) await this.init();
    
    const startTime = Date.now();
    
    const response = await this.client.messages.create({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: maxTokens || 1000,
      system,
      messages
    });
    
    // 사용량 기록 (비동기, 실패해도 무시)
    this.recordUsage({
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      latency_ms: Date.now() - startTime
    }).catch(console.error);
    
    return {
      content: response.content,
      usage: response.usage
    };
  }
  
  async recordUsage(usage) {
    // 자체 사용량 DB에 기록 (대시보드용)
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
export async function createLLMClient(tenantId, service) {
  const client = new TenantLLMClient(tenantId, service);
  await client.init();
  return client;
}
```

**Python (FastAPI):**

```python
# lib/llm_client.py

from anthropic import Anthropic
from google.cloud import secretmanager
from datetime import datetime
import httpx

secret_client = secretmanager.SecretManagerServiceClient()
api_key_cache = {}

async def get_api_key(tenant_id: str) -> str:
    """테넌트별 API 키 로드 (캐싱)"""
    if tenant_id in api_key_cache:
        return api_key_cache[tenant_id]
    
    config = await load_tenant_config(tenant_id)
    
    if config.get("llm", {}).get("anthropic_api_key_ref"):
        # Secret Manager에서 로드
        response = secret_client.access_secret_version(
            name=config["llm"]["anthropic_api_key_ref"]
        )
        api_key = response.payload.data.decode("utf-8")
    else:
        # 환경변수 (개발용)
        api_key = os.getenv("ANTHROPIC_API_KEY")
    
    api_key_cache[tenant_id] = api_key
    return api_key


class TenantLLMClient:
    """테넌트별 API 키를 사용하는 LLM 클라이언트"""
    
    def __init__(self, tenant_id: str, service: str):
        self.tenant_id = tenant_id
        self.service = service
        self.client = None
    
    async def init(self):
        api_key = await get_api_key(self.tenant_id)
        self.client = Anthropic(api_key=api_key)
    
    async def complete(
        self,
        messages: list,
        system: str = None,
        model: str = "claude-sonnet-4-20250514",
        max_tokens: int = 1000
    ) -> dict:
        if not self.client:
            await self.init()
        
        start_time = datetime.now()
        
        response = self.client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=messages
        )
        
        latency_ms = (datetime.now() - start_time).total_seconds() * 1000
        
        # 사용량 기록 (비동기)
        asyncio.create_task(self.record_usage(
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            latency_ms=int(latency_ms)
        ))
        
        return {
            "content": [{"type": "text", "text": response.content[0].text}],
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens
            }
        }
    
    async def record_usage(self, input_tokens: int, output_tokens: int, latency_ms: int):
        """자체 사용량 DB에 기록"""
        try:
            async with get_db_connection("campone_shared") as conn:
                await conn.execute("""
                    INSERT INTO llm_usage (tenant_id, service, input_tokens, output_tokens, latency_ms, created_at)
                    VALUES ($1, $2, $3, $4, $5, NOW())
                """, self.tenant_id, self.service, input_tokens, output_tokens, latency_ms)
        except Exception as e:
            print(f"Failed to record usage: {e}")


async def create_llm_client(tenant_id: str, service: str) -> TenantLLMClient:
    client = TenantLLMClient(tenant_id, service)
    await client.init()
    return client
```

### 7.4 사용량 추적 DB

```sql
-- 공용 DB (campone_shared)
CREATE TABLE llm_usage (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    service VARCHAR(50) NOT NULL,  -- insight, policy, ops, studio, civichub
    model VARCHAR(100) DEFAULT 'claude-sonnet-4-20250514',
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    latency_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_llm_usage_tenant_time ON llm_usage (tenant_id, created_at DESC);
CREATE INDEX idx_llm_usage_service ON llm_usage (service, created_at DESC);

-- 일별 집계 뷰
CREATE VIEW v_llm_usage_daily AS
SELECT 
    tenant_id,
    service,
    DATE(created_at) as date,
    COUNT(*) as requests,
    SUM(input_tokens) as input_tokens,
    SUM(output_tokens) as output_tokens,
    SUM(input_tokens + output_tokens) as total_tokens,
    AVG(latency_ms) as avg_latency_ms
FROM llm_usage
GROUP BY tenant_id, service, DATE(created_at);

-- 월별 집계 뷰
CREATE VIEW v_llm_usage_monthly AS
SELECT 
    tenant_id,
    service,
    TO_CHAR(created_at, 'YYYY-MM') as year_month,
    COUNT(*) as requests,
    SUM(input_tokens) as input_tokens,
    SUM(output_tokens) as output_tokens,
    SUM(input_tokens + output_tokens) as total_tokens
FROM llm_usage
GROUP BY tenant_id, service, TO_CHAR(created_at, 'YYYY-MM');
```

### 7.5 사용량 조회 API

```javascript
// pages/api/usage/[tenant].js

export default async function handler(req, res) {
  const { tenant } = req.query;
  const { period = 'month' } = req.query;
  
  // 권한 확인 (해당 테넌트 관리자만)
  const user = await verifyAuth(req);
  if (user.tenant_id !== tenant && !user.is_admin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const db = getSharedDbClient();
  
  let data;
  if (period === 'month') {
    data = await db.query(`
      SELECT * FROM v_llm_usage_monthly 
      WHERE tenant_id = $1 
      ORDER BY year_month DESC 
      LIMIT 12
    `, [tenant]);
  } else {
    data = await db.query(`
      SELECT * FROM v_llm_usage_daily 
      WHERE tenant_id = $1 
      ORDER BY date DESC 
      LIMIT 30
    `, [tenant]);
  }
  
  res.json({ tenant_id: tenant, period, data: data.rows });
}
```

### 7.6 향후 확장: Gateway (선택)

현재 구조에서 나중에 Gateway가 필요해지면:

```javascript
// 클라이언트 코드 수정 없이 환경변수만 변경
USE_LLM_GATEWAY=true
LLM_GATEWAY_URL=http://llm-gateway.internal

// TenantLLMClient에 분기 추가
class TenantLLMClient {
  async complete(params) {
    if (process.env.USE_LLM_GATEWAY === 'true') {
      return this.callViaGateway(params);
    }
    return this.callDirect(params);
  }
}
```

Gateway가 필요한 시점:
- 캠프 10개 이상으로 확장 시
- 세밀한 한도 강제가 필요할 때
- 캐싱으로 비용 절감이 필요할 때

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

---

*이 문서에 대한 질문이나 개선 제안은 아키텍처 담당자에게 문의하세요.*
