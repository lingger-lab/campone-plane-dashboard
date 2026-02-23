# 임베드 인증 연동 가이드 (서비스용)

> 대상: Insights, Policy, Ops, CivicHub, Studio
> 작성일: 2026-02-23
> 목적: 대시보드 iframe 임베드 시 인증 문제 해결 (서드파티 쿠키 차단 대응)

---

## 1. 문제 배경

대시보드가 iframe으로 서비스를 로드할 때, 서비스가 설정하는 쿠키는 **서드파티 쿠키**로 분류됩니다.
Chrome/Safari/Firefox 모두 서드파티 쿠키를 기본 차단하므로, 첫 로드 시 인증이 실패합니다.

```
대시보드 (campone-dashboard.run.app)
  └── iframe (insight-frontend.run.app)
        └── Set-Cookie → 브라우저가 차단 (서드파티)
        └── GET /api/auth/me → 쿠키 없음 → 401
```

---

## 2. 대시보드가 하는 일 (이미 구현됨)

### 2-1. URL 파라미터로 토큰 전달

```
iframe src="https://서비스/embed?token={JWT}&tenant={tenantId}&theme={theme}"
```

### 2-2. postMessage로 토큰 재전달 (NEW)

iframe `onLoad` 후 300ms 뒤에 `AUTH_TOKEN` 메시지를 전송합니다.
이것은 URL 파라미터의 쿠키 설정이 실패했을 때의 **fallback** 입니다.

```typescript
// 대시보드 → 서비스 (iframe)
{
  type: 'AUTH_TOKEN',
  source: 'Dashboard',
  timestamp: 1708700000000,
  payload: {
    token: 'eyJhbGciOiJIUzI1NiI...',   // EMBED_JWT_SECRET으로 서명된 JWT
    tenantId: 'camp-dev',
    theme: 'light'
  }
}
```

### 2-3. READY 메시지 대기 + 자동 재시도

- 대시보드는 서비스가 `READY` postMessage를 보낼 때까지 로딩 상태를 유지합니다.
- **10초** 내에 `READY`가 안 오면 iframe + 토큰을 자동으로 1회 재시도합니다.
- `AUTH_REQUIRED` 메시지를 받으면 `AUTH_TOKEN`을 재전송합니다.

---

## 3. 서비스가 해야 할 일

### 3-1. `/embed` 엔드포인트 (기존)

```
GET /embed?token={JWT}&tenant={tenantId}&theme={theme}

1. token 파라미터에서 JWT 추출
2. EMBED_JWT_SECRET으로 서명 검증
3. source === "dashboard" 확인
4. 만료 시간 확인
5. 쿠키 설정 시도 (sameSite=none, secure=true)
6. 리다이렉트
```

### 3-2. postMessage 수신 핸들러 추가 (NEW — 핵심)

서비스의 클라이언트 코드에 `AUTH_TOKEN` 메시지 수신 로직을 추가해야 합니다.
쿠키 설정이 차단되었을 때, 이 메시지로 인증을 완료합니다.

```typescript
// 서비스의 embed 진입점 (예: /embed/page.tsx 또는 app layout)
useEffect(() => {
  const DASHBOARD_ORIGIN = 'https://campone-dashboard-i2syevvyaq-du.a.run.app';

  const handleMessage = (event: MessageEvent) => {
    // origin 확인 (필수!)
    if (event.origin !== DASHBOARD_ORIGIN) return;

    const data = event.data;
    if (!data || data.type !== 'AUTH_TOKEN') return;

    const { token, tenantId, theme } = data.payload;

    // 방법 A: 서버에 토큰 전달하여 세션 설정 시도
    fetch('/api/auth/embed-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, tenantId }),
      credentials: 'include',  // 쿠키 설정을 위해
    }).then(res => {
      if (res.ok) {
        // 인증 성공 → READY 전송
        sendReady();
      }
    });

    // 방법 B: 토큰을 메모리에 저장하고 API 호출 시 헤더로 전달
    // (쿠키가 완전히 차단된 환경에서의 최종 fallback)
    sessionStorage.setItem('embed_token', token);
    if (tenantId) sessionStorage.setItem('embed_tenant', tenantId);
    if (theme) document.documentElement.setAttribute('data-theme', theme);
  };

  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);
```

### 3-3. READY 메시지 전송 (필수)

인증이 완료되고 서비스가 사용 가능한 상태가 되면 **반드시** `READY` 메시지를 보내야 합니다.
이 메시지가 없으면 대시보드는 로딩 상태를 유지하다가 자동 재시도합니다.

```typescript
function sendReady() {
  if (window.parent === window) return; // iframe이 아니면 무시

  window.parent.postMessage({
    type: 'READY',
    source: 'Insights',  // 서비스 이름: 'Insights' | 'Studio' | 'Policy' | 'Ops' | 'Hub'
    timestamp: Date.now(),
    payload: { version: '1.0.0' }
  }, '*');
}
```

**호출 시점:**
- `/embed` 페이지 로드 완료 후
- 또는 `AUTH_TOKEN` postMessage로 인증 완료 후
- 페이지가 사용자에게 보여줄 준비가 된 시점

### 3-4. AUTH_REQUIRED 메시지 (선택)

서비스가 인증이 필요한데 쿠키/토큰이 없는 상태라면, 대시보드에 토큰 재전송을 요청할 수 있습니다.

```typescript
function requestAuth() {
  if (window.parent === window) return;

  window.parent.postMessage({
    type: 'AUTH_REQUIRED',
    source: 'Insights',
    timestamp: Date.now(),
    payload: {}
  }, '*');
}
```

대시보드는 이 메시지를 받으면 `AUTH_TOKEN`을 즉시 재전송합니다.

---

## 4. 권장 인증 전략 (우선순위)

서비스는 다음 순서로 인증을 시도해야 합니다:

```
1순위: URL 파라미터 token → 서버에서 JWT 검증 → 쿠키 설정 → 리다이렉트
2순위: 쿠키 기반 세션 확인 (GET /api/auth/me)
3순위: postMessage AUTH_TOKEN 수신 → 토큰으로 인증
4순위: AUTH_REQUIRED 메시지 전송 → 대시보드에서 AUTH_TOKEN 재전송 대기
```

### API 호출 시 인증 헤더 패턴

쿠키가 차단된 환경에서도 동작하려면, API 호출 시 fallback으로 토큰 헤더를 포함합니다:

```typescript
// 서비스의 API 클라이언트 (fetch wrapper)
async function apiFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);

  // 쿠키 전송 (가능한 경우)
  options.credentials = 'include';

  // fallback: 메모리/sessionStorage의 토큰을 헤더로 전달
  const embedToken = sessionStorage.getItem('embed_token');
  if (embedToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${embedToken}`);
  }

  return fetch(url, { ...options, headers });
}
```

### 서버 측 미들웨어 패턴

```typescript
// 서비스의 인증 미들웨어
function getAuthToken(request: Request): string | null {
  // 1순위: 쿠키
  const cookie = getCookie(request, 'campone_embed_session')
                || getCookie(request, 'campone_session');
  if (cookie) return cookie;

  // 2순위: Authorization 헤더 (postMessage fallback)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}
```

---

## 5. 전체 시퀀스 다이어그램

### 정상 플로우 (쿠키 설정 성공)

```
대시보드                    서비스 (iframe)
  │                           │
  │──── iframe src ──────────▶│  /embed?token=JWT&tenant=camp-dev
  │                           │  → JWT 검증
  │                           │  → Set-Cookie (성공)
  │                           │  → 리다이렉트
  │                           │
  │◀──── READY ──────────────│  postMessage
  │  로딩 완료               │
```

### 쿠키 차단 시 플로우

```
대시보드                    서비스 (iframe)
  │                           │
  │──── iframe src ──────────▶│  /embed?token=JWT&tenant=camp-dev
  │                           │  → JWT 검증
  │                           │  → Set-Cookie (차단됨!)
  │                           │  → 리다이렉트 (쿠키 없이)
  │                           │
  │  onLoad (300ms 후)        │
  │──── AUTH_TOKEN ──────────▶│  postMessage
  │                           │  → token을 sessionStorage에 저장
  │                           │  → /api/auth/embed-verify (헤더로 토큰 전달)
  │                           │  → 인증 성공
  │                           │
  │◀──── READY ──────────────│  postMessage
  │  로딩 완료               │
```

### 타임아웃 + 자동 재시도 플로우

```
대시보드                    서비스 (iframe)
  │                           │
  │──── iframe src ──────────▶│  (서비스 콜드스타트 등으로 응답 느림)
  │                           │
  │  10초 경과, READY 없음     │
  │  토큰 재발급              │
  │──── iframe src (재로드) ──▶│  새 토큰으로 재시도
  │                           │
  │◀──── READY ──────────────│
  │  로딩 완료               │
```

---

## 6. 메시지 타입 요약

### 대시보드 → 서비스

| 타입 | 설명 | payload |
|------|------|---------|
| `AUTH_TOKEN` | 인증 토큰 전달 | `{ token, tenantId, theme }` |
| `THEME_CHANGE` | 테마 변경 알림 | `{ theme: 'light' \| 'dark' }` |

### 서비스 → 대시보드

| 타입 | 설명 | payload |
|------|------|---------|
| `READY` | 로드 완료 | `{ version? }` |
| `AUTH_REQUIRED` | 토큰 재전송 요청 | `{}` |
| `ACTIVITY` | 활동 기록 | `{ action, target?, details? }` |
| `ALERT` | 알림 생성 | `{ severity, title, message }` |
| `KPI_UPDATE` | KPI 업데이트 | `{ key, value, unit?, change? }` |
| `ERROR` | 에러 보고 | `{ code, message, stack? }` |

---

## 7. 체크리스트 (서비스별)

- [ ] `EMBED_JWT_SECRET` 환경변수가 대시보드와 동일한 값으로 설정됨
- [ ] `GET /embed?token=xxx&tenant=xxx&theme=xxx` 엔드포인트 구현
- [ ] `postMessage` 리스너로 `AUTH_TOKEN` 메시지 수신 처리
- [ ] 인증 완료 후 `READY` postMessage를 대시보드로 전송
- [ ] API 호출 시 쿠키 + Authorization 헤더 fallback 지원
- [ ] 서버 미들웨어에서 쿠키 + Bearer 토큰 둘 다 확인
- [ ] `sameSite: 'none'`, `secure: true`로 임베드 쿠키 설정

---

## 8. 환경변수

| 변수 | 값 | 비고 |
|------|-----|------|
| `EMBED_JWT_SECRET` | Secret Manager: `campone-embed-jwt-secret` | 전 서비스 동일 |
| 대시보드 origin | `https://campone-dashboard-i2syevvyaq-du.a.run.app` | postMessage origin 확인용 |

---

## 참고 문서

- [AUTH_CONVENTION.md](./AUTH_CONVENTION.md) — 전체 인증 규약
- [MODULE_INTEGRATION_GUIDE.md](./MODULE_INTEGRATION_GUIDE.md) — 모듈 통합 가이드
- [DASHBOARD_SERVICE_API_GUIDE.md](./DASHBOARD_SERVICE_API_GUIDE.md) — 대시보드 API 가이드
