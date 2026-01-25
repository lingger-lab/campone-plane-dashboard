# CampOne V2 통합 구현 계획서

> 작성일: 2026-01-23
> 대상: campone-v2-backend, campone-v2-frontend
> 참조: INTEGRATION_REQUIREMENTS_FOR_OTHER_SERVICES.md

---

## 1. 현재 상태 분석

### 1.1 campone-v2 인증 현황

| 항목 | 상태 | 비고 |
|------|------|------|
| JWT 인증 | ❌ 없음 | 라이브러리 미설치 |
| 세션 관리 | ❌ 없음 | 쿠키/세션 미구현 |
| User 테이블 | ❌ 없음 | 데이터베이스에 사용자 모델 없음 |
| /embed 라우트 | ❌ 없음 | 구현 필요 |
| CORS 설정 | ✅ 완료 | iframe origin 추가됨 |
| X-Frame-Options | ✅ 허용 | Cloud Run 기본값 |

### 1.2 필요한 패키지 (미설치)

```
python-jose[cryptography]  # JWT 처리
passlib[bcrypt]            # 비밀번호 해싱 (향후 필요시)
```

---

## 2. 구현 범위 결정

### 2.1 Phase 1: 최소 구현 (MVP) - 권장

Dashboard에서 임베드 토큰을 받아 검증만 하는 수준

| 작업 | 복잡도 | 필수 |
|------|--------|------|
| JWT 검증 미들웨어 | 낮음 | ✅ |
| /embed 라우트 | 낮음 | ✅ |
| 환경변수 추가 | 낮음 | ✅ |
| 쿠키 SameSite 설정 | 낮음 | ✅ |

### 2.2 Phase 2: 확장 구현 (선택)

자체 사용자 관리 및 권한 제어

| 작업 | 복잡도 | 필수 |
|------|--------|------|
| User 테이블 추가 | 중간 | ⬜ |
| 로그인/로그아웃 API | 중간 | ⬜ |
| 권한 기반 접근 제어 | 높음 | ⬜ |
| Frontend 인증 UI | 높음 | ⬜ |

---

## 3. Phase 1 구현 계획 (상세)

### 3.1 Backend 수정사항

#### 3.1.1 패키지 설치

**파일:** `backend/requirements.txt`

```diff
+ python-jose[cryptography]==3.3.0
```

#### 3.1.2 환경변수 추가

**파일:** `backend/app/config.py`

```python
class Settings(BaseSettings):
    # 기존 설정...

    # 임베드 인증 (추가)
    embed_jwt_secret: str = "campone-shared-embed-secret-change-in-production"
    embed_token_ttl: int = 3600  # 1시간
```

**Cloud Run 환경변수 (Secret Manager):**
```
EMBED_JWT_SECRET=<Dashboard와 동일한 값>
```

#### 3.1.3 JWT 검증 유틸리티

**파일:** `backend/app/utils/jwt_utils.py` (신규)

```python
"""JWT utilities for embed authentication."""
from typing import Optional
from jose import jwt, JWTError
from pydantic import BaseModel
from ..config import get_settings


class EmbedTokenPayload(BaseModel):
    """Dashboard에서 발급하는 임베드 토큰 페이로드."""
    userId: str
    email: str
    role: str
    iat: int
    exp: int


def verify_embed_token(token: str) -> Optional[EmbedTokenPayload]:
    """
    Dashboard에서 발급한 임베드 토큰을 검증합니다.

    Args:
        token: JWT 토큰 문자열

    Returns:
        검증 성공 시 EmbedTokenPayload, 실패 시 None
    """
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.embed_jwt_secret,
            algorithms=["HS256"]
        )
        return EmbedTokenPayload(**payload)
    except JWTError:
        return None
```

#### 3.1.4 /embed 라우트 추가

**파일:** `backend/app/api/routes.py` (수정)

```python
from fastapi.responses import RedirectResponse
from ..utils.jwt_utils import verify_embed_token

# 기존 라우터에 추가

@router.get("/embed")
async def embed_auth(
    token: str,
    response: Response
):
    """
    Dashboard에서 전달받은 토큰을 검증하고 세션 쿠키를 설정합니다.

    Flow:
    1. Dashboard에서 /embed?token=xxx 로 리다이렉트
    2. 토큰 검증 후 embed_session 쿠키 발급
    3. 프론트엔드로 리다이렉트 (쿠키와 함께)
    """
    payload = verify_embed_token(token)

    if not payload:
        raise HTTPException(
            status_code=401,
            detail="유효하지 않은 토큰입니다. Dashboard에서 다시 접근해주세요."
        )

    # 세션 쿠키 설정 (cross-origin iframe 지원)
    response = RedirectResponse(url="/", status_code=302)
    response.set_cookie(
        key="embed_session",
        value=token,  # 또는 새로운 세션 토큰 발급
        httponly=True,
        secure=True,
        samesite="none",  # cross-origin iframe 필수
        max_age=3600,
    )

    return response


@router.get("/embed/verify")
async def verify_embed_session(
    request: Request
):
    """현재 임베드 세션이 유효한지 확인합니다."""
    token = request.cookies.get("embed_session")

    if not token:
        return {"valid": False, "reason": "no_session"}

    payload = verify_embed_token(token)

    if not payload:
        return {"valid": False, "reason": "invalid_token"}

    return {
        "valid": True,
        "user": {
            "userId": payload.userId,
            "email": payload.email,
            "role": payload.role
        }
    }
```

#### 3.1.5 선택적 인증 미들웨어 (API 보호용)

**파일:** `backend/app/api/dependencies.py` (신규)

```python
"""API dependencies for authentication."""
from typing import Optional
from fastapi import Request, HTTPException, Depends
from ..utils.jwt_utils import verify_embed_token, EmbedTokenPayload


async def get_current_user_optional(
    request: Request
) -> Optional[EmbedTokenPayload]:
    """
    현재 사용자를 반환합니다. 인증되지 않아도 None 반환.
    공개 API에 사용.
    """
    token = request.cookies.get("embed_session")
    if not token:
        return None
    return verify_embed_token(token)


async def get_current_user_required(
    request: Request
) -> EmbedTokenPayload:
    """
    현재 사용자를 반환합니다. 인증 필수.
    보호된 API에 사용.
    """
    user = await get_current_user_optional(request)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="인증이 필요합니다. Dashboard에서 접근해주세요."
        )
    return user
```

**사용 예시:**
```python
@router.post("/analyze")
async def start_analysis(
    request: AnalysisRequest,
    user: EmbedTokenPayload = Depends(get_current_user_required),  # 인증 필수
    db: AsyncSession = Depends(get_db)
):
    # user.userId, user.email 등 사용 가능
    ...
```

### 3.2 Frontend 수정사항

#### 3.2.1 임베드 세션 확인 훅

**파일:** `frontend/src/hooks/useEmbedAuth.ts` (신규)

```typescript
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface EmbedUser {
  userId: string;
  email: string;
  role: string;
}

interface EmbedAuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: EmbedUser | null;
  error: string | null;
}

export function useEmbedAuth(): EmbedAuthState {
  const [state, setState] = useState<EmbedAuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    error: null,
  });

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await api.get('/api/embed/verify');

        if (response.data.valid) {
          setState({
            isLoading: false,
            isAuthenticated: true,
            user: response.data.user,
            error: null,
          });
        } else {
          setState({
            isLoading: false,
            isAuthenticated: false,
            user: null,
            error: response.data.reason,
          });
        }
      } catch (error) {
        setState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          error: 'verification_failed',
        });
      }
    }

    checkAuth();
  }, []);

  return state;
}
```

#### 3.2.2 임베드 모드 레이아웃 (선택)

iframe으로 임베드될 때 사이드바/헤더 숨기기

**파일:** `frontend/src/app/layout.tsx` (수정)

```typescript
// URL 파라미터로 임베드 모드 감지
// ?embed=true 또는 embed_session 쿠키 존재 시

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // 서버 컴포넌트에서는 쿠키 확인
  // const isEmbed = cookies().has('embed_session');

  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <div className="flex h-screen bg-background">
            {/* 임베드 모드가 아닐 때만 사이드바 표시 */}
            {!isEmbed && <Sidebar />}
            <div className="flex-1 flex flex-col overflow-hidden">
              {!isEmbed && <Header />}
              <main className="flex-1 overflow-y-auto p-6">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
```

### 3.3 Cloud Run 배포 설정

#### 3.3.1 Secret Manager에 시크릿 추가

```bash
# Dashboard와 동일한 값으로 설정
echo -n "campone-shared-embed-secret-PRODUCTION" | \
  gcloud secrets create embed-jwt-secret \
    --data-file=- \
    --project=campone-v1-0

# 또는 기존 시크릿 업데이트
echo -n "campone-shared-embed-secret-PRODUCTION" | \
  gcloud secrets versions add embed-jwt-secret \
    --data-file=- \
    --project=campone-v1-0
```

#### 3.3.2 cloudbuild.yaml 수정

**파일:** `cloudbuild.yaml`

```yaml
# deploy-backend 단계의 --set-secrets에 추가
- '--set-secrets'
- 'DB_USER=db-user:latest,DB_PASSWORD=db-password:latest,CLAUDE_API_KEY=claude-api-key:latest,GOOGLE_API_KEY=google-api-key:latest,NAVER_API_CLIENT_ID=naver-client-id:latest,NAVER_API_CLIENT_SECRET=naver-client-secret:latest,KAKAO_REST_API_KEY=kakao-api-key:latest,EMBED_JWT_SECRET=embed-jwt-secret:latest'
```

---

## 4. 파일 변경 요약

### 4.1 신규 파일

| 파일 | 설명 |
|------|------|
| `backend/app/utils/__init__.py` | utils 패키지 초기화 |
| `backend/app/utils/jwt_utils.py` | JWT 검증 유틸리티 |
| `backend/app/api/dependencies.py` | 인증 의존성 |
| `frontend/src/hooks/useEmbedAuth.ts` | 임베드 인증 훅 |

### 4.2 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `backend/requirements.txt` | python-jose 추가 |
| `backend/app/config.py` | embed_jwt_secret, embed_token_ttl 추가 |
| `backend/app/api/routes.py` | /embed, /embed/verify 라우트 추가 |
| `cloudbuild.yaml` | EMBED_JWT_SECRET 시크릿 연결 |
| `frontend/src/app/layout.tsx` | 임베드 모드 레이아웃 (선택) |

---

## 5. 테스트 계획

### 5.1 로컬 테스트

```bash
# 1. Backend 테스트
cd backend
pip install python-jose[cryptography]

# 테스트용 토큰 생성 (Dashboard와 동일한 방식)
python -c "
from jose import jwt
from datetime import datetime, timedelta

secret = 'campone-shared-embed-secret-change-in-production'
payload = {
    'userId': 'test-user-123',
    'email': 'test@example.com',
    'role': 'admin',
    'iat': int(datetime.now().timestamp()),
    'exp': int((datetime.now() + timedelta(hours=1)).timestamp())
}
token = jwt.encode(payload, secret, algorithm='HS256')
print(f'Test token: {token}')
"

# 2. /embed 엔드포인트 테스트
curl -v "http://localhost:8000/api/embed?token=<위에서_생성한_토큰>"

# 3. 쿠키 확인 후 /embed/verify 테스트
curl -v "http://localhost:8000/api/embed/verify" \
  --cookie "embed_session=<토큰>"
```

### 5.2 통합 테스트

1. Dashboard 로그인
2. Insights 탭 클릭 (iframe 로드)
3. iframe 내에서 API 호출 확인
4. 브라우저 개발자 도구에서:
   - Network 탭: CORS 에러 없음 확인
   - Application > Cookies: embed_session 쿠키 확인
   - Console: 에러 없음 확인

---

## 6. 보안 고려사항

### 6.1 필수 조치

- [ ] `EMBED_JWT_SECRET`은 프로덕션에서 강력한 랜덤 값 사용
- [ ] 모든 서비스에서 동일한 시크릿 값 사용
- [ ] HTTPS 필수 (SameSite=None은 Secure 필수)
- [ ] 토큰 만료 시간 적절히 설정 (1시간 권장)

### 6.2 권장 조치

- [ ] 토큰에 audience(aud) 클레임 추가하여 서비스별 검증
- [ ] IP 바인딩 또는 fingerprint 추가 검토
- [ ] 토큰 재사용 방지 (nonce 또는 jti 사용)

---

## 7. 구현 순서

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Backend 패키지 설치 및 유틸리티 작성              │
│          - requirements.txt 수정                           │
│          - jwt_utils.py 작성                               │
│          - config.py 수정                                  │
├─────────────────────────────────────────────────────────────┤
│  Step 2: /embed 라우트 구현                                │
│          - routes.py에 /embed, /embed/verify 추가         │
│          - 로컬 테스트                                     │
├─────────────────────────────────────────────────────────────┤
│  Step 3: Cloud Run 시크릿 설정                             │
│          - Secret Manager에 EMBED_JWT_SECRET 추가          │
│          - cloudbuild.yaml 수정                            │
├─────────────────────────────────────────────────────────────┤
│  Step 4: 배포 및 통합 테스트                               │
│          - Cloud Build 실행                                │
│          - Dashboard에서 테스트                            │
├─────────────────────────────────────────────────────────────┤
│  Step 5 (선택): Frontend 임베드 모드                       │
│          - useEmbedAuth 훅 작성                            │
│          - 레이아웃 조건부 렌더링                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. 예상 소요 시간

| 작업 | 예상 시간 |
|------|----------|
| Step 1: 패키지 및 유틸리티 | 30분 |
| Step 2: /embed 라우트 | 1시간 |
| Step 3: Cloud 설정 | 30분 |
| Step 4: 배포 및 테스트 | 1시간 |
| Step 5: Frontend (선택) | 1시간 |
| **총합 (필수만)** | **3시간** |
| **총합 (전체)** | **4시간** |

---

## 9. 체크리스트

### Backend

- [ ] `python-jose[cryptography]` 설치
- [ ] `config.py`에 `embed_jwt_secret` 추가
- [ ] `utils/jwt_utils.py` 작성
- [ ] `api/dependencies.py` 작성
- [ ] `/embed` 라우트 추가
- [ ] `/embed/verify` 라우트 추가
- [ ] 로컬 테스트 완료

### Cloud Run

- [ ] Secret Manager에 `embed-jwt-secret` 생성
- [ ] `cloudbuild.yaml`에 시크릿 연결 추가
- [ ] 배포 완료
- [ ] 배포 후 테스트 완료

### Frontend (선택)

- [ ] `useEmbedAuth.ts` 훅 작성
- [ ] 레이아웃 임베드 모드 지원
- [ ] 테스트 완료

### 통합 테스트

- [ ] Dashboard → Insights 탭 → API 정상 로드
- [ ] CORS 에러 없음
- [ ] 쿠키 정상 전송
- [ ] 인증 상태 유지

---

*문서 버전: 1.0*
*최종 수정: 2026-01-23*
