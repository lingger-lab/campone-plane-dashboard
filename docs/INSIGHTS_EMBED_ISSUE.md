# Insights (campone-v2) iframe 임베드 문제 설명

> 작성일: 2026-01-23
> 발신: Dashboard 팀
> 수신: Insights (campone-v2) 팀

---

## 1. 현재 상황

Dashboard에서 Insights 모듈을 iframe으로 임베드하려고 하는데 문제가 발생합니다.

### 1.1 Dashboard 측 구현 (완료)

```javascript
// Dashboard가 호출하는 URL
const INSIGHTS_URL = 'https://campone-v2-backend-755458598444.asia-northeast3.run.app';

// 최종 iframe src
const iframeSrc = `${INSIGHTS_URL}/embed?token=${JWT_TOKEN}`;
```

**JWT 토큰 구조:**
```json
{
  "userId": "user001",
  "email": "admin@campone.kr",
  "name": "관리자",
  "role": "admin",
  "source": "dashboard",
  "iat": 1737628800,
  "exp": 1737632400
}
```

**JWT 시크릿:** `embed-jwt-secret` (Secret Manager, campone-v1-0 프로젝트)
- 값: `campone-embed-secret-change-in-production`

### 1.2 발생하는 에러

```
1. React error #418 - Hydration mismatch
2. React error #423 - Hydration failed
3. /api/analyze 422 - Unprocessable Entity
4. React error #31 - Objects are not valid as React children
```

---

## 2. 문제 원인 분석

### 2.1 Backend vs Frontend 분리 구조

Insights는 프론트엔드와 백엔드가 분리되어 있습니다:

| 서비스 | URL | 역할 |
|--------|-----|------|
| Backend | `campone-v2-backend-755458598444...` | API 서버 (FastAPI) |
| Frontend | `campone-v2-frontend-755458598444...` | UI (Next.js) |

### 2.2 현재 흐름 (문제)

```
Dashboard iframe
    ↓
Backend /embed?token=xxx
    ↓
??? (Backend가 HTML UI를 반환하지 않음)
    ↓
에러 발생
```

### 2.3 기대하는 흐름

**옵션 A: Backend에서 처리**
```
Dashboard iframe
    ↓
Backend /embed?token=xxx
    ↓
JWT 검증 → embed_session 쿠키 설정
    ↓
Frontend로 리다이렉트 (302)
    ↓
Frontend가 쿠키로 인증된 상태에서 UI 표시
```

**옵션 B: Frontend에서 처리**
```
Dashboard iframe
    ↓
Frontend /embed?token=xxx
    ↓
Frontend가 Backend API로 토큰 검증 요청
    ↓
쿠키 설정 후 메인 페이지로 이동
    ↓
UI 표시
```

---

## 3. 필요한 구현

### 3.1 옵션 A: Backend /embed 구현 (권장)

**파일:** `backend/app/api/routes.py`

```python
from fastapi import APIRouter, Response, HTTPException
from fastapi.responses import RedirectResponse
from jose import jwt, JWTError
import os

router = APIRouter()

EMBED_JWT_SECRET = os.getenv('EMBED_JWT_SECRET', 'campone-embed-secret-change-in-production')
FRONTEND_URL = 'https://campone-v2-frontend-755458598444.asia-northeast3.run.app'

@router.get("/embed")
async def embed_auth(token: str, response: Response):
    """
    Dashboard에서 전달받은 JWT를 검증하고 쿠키를 설정한 후 Frontend로 리다이렉트
    """
    try:
        # JWT 검증
        payload = jwt.decode(token, EMBED_JWT_SECRET, algorithms=["HS256"])

        # 쿠키와 함께 Frontend로 리다이렉트
        redirect_response = RedirectResponse(
            url=FRONTEND_URL,
            status_code=302
        )

        # embed_session 쿠키 설정 (cross-origin iframe 지원)
        redirect_response.set_cookie(
            key="embed_session",
            value=token,  # 또는 새로운 세션 토큰 발급
            httponly=True,
            secure=True,
            samesite="none",  # cross-origin iframe 필수!
            max_age=3600,
            domain=".asia-northeast3.run.app"  # 서브도메인 공유 (선택)
        )

        return redirect_response

    except JWTError as e:
        raise HTTPException(
            status_code=401,
            detail=f"유효하지 않은 토큰: {str(e)}"
        )
```

### 3.2 쿠키 도메인 문제

Backend와 Frontend가 다른 도메인이면 쿠키 공유가 안 됩니다:

| Backend | Frontend | 쿠키 공유 |
|---------|----------|----------|
| `campone-v2-backend-xxx.run.app` | `campone-v2-frontend-xxx.run.app` | ❌ 안 됨 |

**해결 방법:**

1. **Frontend에서 /embed 구현** (권장)
2. 또는 **동일 도메인 사용** (커스텀 도메인 설정)
3. 또는 **URL 파라미터로 토큰 전달** (보안 취약)

### 3.3 옵션 B: Frontend /embed 구현 (권장)

**파일:** `frontend/src/app/embed/page.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function EmbedPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      console.error('토큰이 없습니다');
      return;
    }

    // Backend에 토큰 검증 요청
    fetch('https://campone-v2-backend-755458598444.asia-northeast3.run.app/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      credentials: 'include',  // 쿠키 포함
    })
      .then(res => {
        if (res.ok) {
          // 쿠키가 설정되었으므로 메인 페이지로 이동
          router.push('/');
        } else {
          console.error('토큰 검증 실패');
        }
      })
      .catch(err => console.error('검증 요청 실패:', err));
  }, [token, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>인증 중...</p>
    </div>
  );
}
```

**Backend 검증 엔드포인트:**

```python
@router.post("/api/auth/verify")
async def verify_embed_token(data: dict, response: Response):
    token = data.get('token')

    try:
        payload = jwt.decode(token, EMBED_JWT_SECRET, algorithms=["HS256"])

        # 쿠키 설정
        response.set_cookie(
            key="embed_session",
            value=token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=3600,
        )

        return {"success": True, "user": payload}

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

---

## 4. Dashboard 측 대응

Insights 팀이 구현 완료하면 Dashboard URL을 업데이트합니다:

**현재 (Backend):**
```javascript
const INSIGHTS_URL = 'https://campone-v2-backend-755458598444.asia-northeast3.run.app';
```

**변경 (Frontend, 옵션 B 선택 시):**
```javascript
const INSIGHTS_URL = 'https://campone-v2-frontend-755458598444.asia-northeast3.run.app';
```

---

## 5. 테스트 방법

### 5.1 토큰 생성 테스트

```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    userId: 'test-user',
    email: 'test@campone.kr',
    role: 'admin',
    source: 'dashboard'
  },
  'campone-embed-secret-change-in-production',
  { expiresIn: '1h' }
);

console.log(token);
```

### 5.2 /embed 테스트

```bash
# 브라우저에서 직접 접속
https://campone-v2-frontend-xxx/embed?token=eyJhbGc...

# 또는 curl로 테스트
curl -v "https://campone-v2-frontend-xxx/embed?token=eyJhbGc..."
```

### 5.3 쿠키 확인

브라우저 개발자 도구 > Application > Cookies에서:
- `embed_session` 쿠키 존재 확인
- `SameSite=None`, `Secure=true` 확인

---

## 6. 요약

| 항목 | 상태 | 담당 |
|------|------|------|
| Dashboard JWT 발급 | ✅ 완료 | Dashboard |
| Dashboard iframe 로드 | ✅ 완료 | Dashboard |
| Insights /embed 구현 | ⏳ 필요 | **Insights** |
| 쿠키 설정 (SameSite=None) | ⏳ 필요 | **Insights** |
| Frontend/Backend 연동 | ⏳ 필요 | **Insights** |

**권장 사항:** Frontend에서 `/embed` 페이지 구현 (옵션 B)

---

## 7. 참고 자료

- [INTEGRATION_REQUIREMENTS_FOR_OTHER_SERVICES.md](./INTEGRATION_REQUIREMENTS_FOR_OTHER_SERVICES.md)
- [INTEGRATION_IMPLEMENTATION_PLAN.md](./INTEGRATION_IMPLEMENTATION_PLAN.md)
- Secret Manager: `embed-jwt-secret` (campone-v1-0 프로젝트)

---

**질문이나 협의 필요 시 연락주세요.**

*문서 버전: 1.0*
*최종 수정: 2026-01-23*