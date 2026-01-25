# campone-policy 인증 구조 마이그레이션 계획

> 작성일: 2026-01-23
> 대상: Dashboard 프로젝트 담당자
> 상태: 진행 중

---

## 1. 현재 상태

### 1.1 기존 인증 방식 (제거 예정)
```
클라이언트 → API 요청 시 userId를 직접 전달
- X-User-Id 헤더
- ?userId=xxx 쿼리 파라미터
- DEFAULT_USER_ID 환경변수 (개발용)
```

**문제점:**
- 보안 취약 (userId 조작 가능)
- Dashboard 통합 인증과 연동 불가
- iframe 환경에서 사용자 식별 불가

### 1.2 변경 후 인증 방식
```
Dashboard 로그인 → JWT 토큰 발급 → /embed?token=xxx → embed_session 쿠키 발급
```

---

## 2. 마이그레이션 작업 목록

### 2.1 campone-policy 측 작업 (이 프로젝트)

| 순서 | 작업 | 상태 | 설명 |
|------|------|------|------|
| 1 | `/embed` 페이지 구현 | ✅ 완료 | JWT 토큰 검증 후 embed_session 쿠키 발급 |
| 2 | `requireUserId()` 헬퍼 수정 | 🔄 진행중 | embed_session 쿠키에서 userId 추출 |
| 3 | `useUserId` 훅 수정 | ⏳ 대기 | 클라이언트에서 쿠키 기반으로 변경 |
| 4 | `appendUserIdParam` 제거 | ⏳ 대기 | 클라이언트 코드에서 userId 파라미터 제거 |
| 5 | 미들웨어 추가 | ⏳ 대기 | 인증 안 된 요청 차단 (/embed 제외) |
| 6 | 환경변수 설정 | ⏳ 대기 | EMBED_JWT_SECRET 추가 |
| 7 | 빌드 및 배포 | ⏳ 대기 | Cloud Run 재배포 |

### 2.2 Dashboard 측 필요 작업

| 순서 | 작업 | 설명 |
|------|------|------|
| 1 | JWT 토큰 발급 API | `/api/auth/embed-token` 엔드포인트 |
| 2 | iframe URL 변경 | `/policy` → `https://campone-policy.../embed?token=xxx` |
| 3 | 환경변수 설정 | `EMBED_JWT_SECRET` (campone-policy와 동일 값) |

---

## 3. 기술 상세

### 3.1 JWT 토큰 페이로드 (Dashboard → campone-policy)

```typescript
interface EmbedTokenPayload {
  userId: string;    // 사용자 고유 ID (필수)
  email: string;     // 이메일 (선택)
  role: string;      // 역할: "user" | "admin" | "manager"
  iat: number;       // 발급 시간
  exp: number;       // 만료 시간 (권장: 1시간)
}
```

### 3.2 embed_session 쿠키

```typescript
// 쿠키에 저장되는 JSON
{
  "userId": "user-123",
  "email": "user@example.com",
  "role": "user"
}

// 쿠키 옵션
{
  httpOnly: true,
  secure: true,           // HTTPS 필수
  sameSite: "none",       // cross-origin iframe 필수
  maxAge: 3600,           // 1시간
  path: "/"
}
```

### 3.3 /embed 페이지 흐름

```
1. Dashboard에서 iframe src 설정
   <iframe src="https://campone-policy.../embed?token=eyJhbGc..." />

2. /embed 페이지에서 토큰 검증
   jwt.verify(token, EMBED_JWT_SECRET)

3. 검증 성공 시 쿠키 발급 후 리다이렉트
   cookies.set("embed_session", {...})
   redirect("/strategy")

4. 이후 모든 API 요청은 쿠키에서 userId 추출
   const userId = cookies.get("embed_session").userId
```

---

## 4. 환경변수

### 4.1 공유 시크릿 (양쪽 동일해야 함)

```bash
# Dashboard .env
EMBED_JWT_SECRET=campone-shared-embed-secret-change-in-production

# campone-policy .env
EMBED_JWT_SECRET=campone-shared-embed-secret-change-in-production
```

**주의:** 프로덕션에서는 강력한 랜덤 문자열 사용

### 4.2 Cloud Run 환경변수 설정

```bash
# campone-policy
gcloud run services update campone-policy \
  --set-env-vars="EMBED_JWT_SECRET=your-secret-here" \
  --region=asia-northeast3
```

---

## 5. 테스트 방법

### 5.1 토큰 생성 (Dashboard 측 테스트용)

```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  {
    userId: 'test-user-123',
    email: 'test@example.com',
    role: 'user'
  },
  'campone-shared-embed-secret-change-in-production',
  { expiresIn: '1h' }
);

console.log(token);
```

### 5.2 campone-policy 테스트

```bash
# 1. 토큰으로 /embed 접근
curl -v "https://campone-policy.../embed?token=eyJhbGc..."

# 2. Set-Cookie 헤더 확인
# 3. 쿠키와 함께 API 호출
curl -v "https://campone-policy.../api/strategy/me" \
  -H "Cookie: embed_session={...}"
```

---

## 6. 롤백 계획

문제 발생 시 기존 방식으로 롤백:

1. `auth-helper.ts`에서 X-User-Id 헤더 체크 복원
2. 클라이언트에서 `appendUserIdParam` 복원
3. DEFAULT_USER_ID 환경변수 다시 설정

---

## 7. 일정

| 단계 | 예상 |
|------|------|
| campone-policy 코드 수정 | 오늘 |
| 로컬 테스트 | 오늘 |
| Dashboard 연동 작업 | Dashboard 담당자와 협의 |
| 통합 테스트 | 연동 후 |
| 프로덕션 배포 | 테스트 완료 후 |

---

## 8. 연락처

- campone-policy: (이 문서 작성자)
- Dashboard: (담당자 추가 필요)

---

**문서 버전:** 1.0
**최종 수정:** 2026-01-23
