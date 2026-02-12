# CampOne 인증 규약 (Auth Convention)

> 대상: 전 서비스 (dashboard, ops, policy, civichub, insight)
> 작성일: 2026-02-10
> 목적: 서비스별 독립 구현은 허용하되, 인증 형식과 규칙을 통일

---

## 1. 인증 모드 2가지

모든 서비스는 아래 두 가지 인증 경로를 지원한다.

### 모드 A: 독립 로그인 (Standalone)

사용자가 서비스에 직접 접속하여 email+password로 로그인.

```
사용자 → 서비스 /login
  → POST /api/auth/login (email + password)
  → 시스템 DB: users + user_tenants 조회
  → 서비스 자체 JWT 발급 (서비스별 시크릿)
  → httpOnly 쿠키 설정
```

### 모드 B: 임베드 (Embed)

대시보드 iframe 안에서 서비스가 로드될 때.

```
Dashboard → embed-token 발급 (EMBED_JWT_SECRET)
  → iframe src="서비스/embed?token=xxx&tenant=camp-dev&theme=light"
  → 서비스: EMBED_JWT_SECRET으로 토큰 검증
  → httpOnly 쿠키 설정
  → 리다이렉트
```

---

## 2. JWT 시크릿 규칙

### 원칙

```
1. 독립 로그인용 시크릿과 임베드용 시크릿은 반드시 분리한다
2. 서비스 간 독립 로그인 시크릿을 공유하지 않는다
3. 임베드 시크릿은 전 서비스가 동일한 값을 공유한다
```

### 시크릿 목록

| 환경변수명 | Secret Manager 이름 | 용도 | 사용 서비스 |
|---|---|---|---|
| `JWT_SECRET` | `campone-ops-jwt-secret` | Ops 독립 로그인 | ops |
| `JWT_SECRET` | `campone-policy-jwt-secret` | Policy 독립 로그인 | policy |
| `JWT_SECRET` | `campone-civichub-jwt-secret` | CivicHub 독립 로그인 | civichub |
| `JWT_SECRET` | `campone-insight-jwt-secret` | Insight 독립 로그인 | insight-backend |
| `NEXTAUTH_SECRET` | `dashboard-nextauth-secret` | Dashboard NextAuth | dashboard |
| `NEXTAUTH_SECRET` | `control-nextauth-secret` | Control NextAuth | control |
| `EMBED_JWT_SECRET` | `campone-embed-jwt-secret` | 임베드 토큰 (공유) | 전체 |

### 금지 사항

- EMBED_JWT_SECRET으로 독립 로그인 토큰을 발급하지 않는다
- 서비스 A의 JWT_SECRET을 서비스 B와 공유하지 않는다
- 시크릿 값에 예측 가능한 문자열을 사용하지 않는다 (서비스명, 연도 등)

### 시크릿 값 생성 기준

```bash
# 최소 32바이트 랜덤 base64
openssl rand -base64 32
```

---

## 3. JWT Payload 표준

### 독립 로그인 토큰 (Standalone)

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@campone.kr",
  "name": "홍길동",
  "tenant_id": "camp-dev",
  "role": "admin",
  "service": "ops",
  "iat": 1707500000,
  "exp": 1707586400
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `sub` | string (UUID) | O | 시스템 DB users.id |
| `email` | string | O | 사용자 이메일 |
| `name` | string | O | 사용자 이름 |
| `tenant_id` | string | O | 테넌트 ID (snake_case 고정) |
| `role` | string | O | user_tenants.role 값 |
| `service` | string | O | 발급 서비스 식별자 |
| `iat` | number | O | 발급 시각 (Unix timestamp) |
| `exp` | number | O | 만료 시각 (발급 후 24시간) |

**`service` 값 목록:** `dashboard`, `ops`, `policy`, `civichub`, `insight`

**검증 시:** `service` 필드가 자기 서비스와 일치하는지 반드시 체크.
다른 서비스가 발급한 토큰은 거부한다.

### 임베드 토큰 (Dashboard 발급)

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@campone.kr",
  "name": "홍길동",
  "role": "admin",
  "tenantId": "camp-dev",
  "source": "dashboard",
  "iat": 1707500000,
  "exp": 1707503600
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `userId` | string (UUID) | O | 시스템 DB users.id |
| `email` | string | O | 사용자 이메일 |
| `name` | string | O | 사용자 이름 |
| `role` | string | O | user_tenants.role 값 |
| `tenantId` | string | O | 테넌트 ID (camelCase, Dashboard 호환) |
| `source` | string | O | 항상 `"dashboard"` |
| `iat` | number | O | 발급 시각 |
| `exp` | number | O | 만료 시각 (발급 후 1시간) |

**검증 시:** `source === "dashboard"` 필수 확인.

> 참고: standalone은 `tenant_id` (snake_case), embed는 `tenantId` (camelCase).
> 수신 서비스는 양쪽 다 처리할 수 있어야 한다: `payload.tenant_id || payload.tenantId`

---

## 4. 쿠키 규약

### 쿠키명

| 용도 | 쿠키명 | 설정 주체 |
|---|---|---|
| 독립 로그인 세션 | `campone_session` | 각 서비스 `/api/auth/login` |
| 임베드 세션 | `campone_embed_session` | 각 서비스 `/embed` 핸들러 |

### 쿠키 속성

```
httpOnly: true          (필수 — JavaScript 접근 차단)
secure:   true          (프로덕션 필수 — HTTPS만)
sameSite: "lax"         (독립 로그인)
sameSite: "none"        (임베드 — cross-origin iframe 필요)
path:     "/"
maxAge:   86400         (독립: 24시간)
maxAge:   3600          (임베드: 1시간)
```

### 금지 사항

- **localStorage에 토큰 저장 금지** — XSS 공격에 취약
- 쿠키에 `httpOnly: false` 설정 금지
- 프로덕션에서 `secure: false` 금지

---

## 5. 임베드 엔드포인트 표준

### 수신 엔드포인트

```
GET /embed?token={JWT}&tenant={tenantId}&theme={light|dark}
```

| 파라미터 | 필수 | 설명 |
|---|---|---|
| `token` | O | Dashboard가 발급한 임베드 JWT |
| `tenant` | O | 테넌트 ID |
| `theme` | X | 대시보드 테마 (light/dark) |

### 처리 흐름

```
1. token 파라미터에서 JWT 추출
2. EMBED_JWT_SECRET으로 서명 검증
3. source === "dashboard" 확인
4. 만료 시간 확인
5. campone_embed_session 쿠키 설정 (httpOnly, sameSite=none, secure)
6. 리다이렉트 (테마 파라미터 유지)
```

### 에러 처리

| 상황 | 응답 |
|---|---|
| token 없음 | `/embed/error?reason=no_token` 리다이렉트 |
| 서명 불일치 | `/embed/error?reason=invalid_token` 리다이렉트 |
| 만료됨 | `/embed/error?reason=expired_token` 리다이렉트 |
| EMBED_JWT_SECRET 미설정 | `/embed/error?reason=config_error` 리다이렉트 |

---

## 6. 독립 로그인 엔드포인트 표준

### 로그인

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@campone.kr",
  "password": "password123",
  "tenant_id": "camp-dev"          // 선택 (멀티테넌트 사용자용)
}
```

### 응답 (성공 — 단일 테넌트)

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@campone.kr",
    "name": "홍길동",
    "role": "admin",
    "tenant_id": "camp-dev"
  }
}
```
+ `Set-Cookie: campone_session=JWT; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`

### 응답 (테넌트 선택 필요)

```json
{
  "success": true,
  "requires_tenant_selection": true,
  "available_tenants": [
    { "tenant_id": "camp-dev", "name": "개발 캠프", "role": "admin" },
    { "tenant_id": "camp-test", "name": "테스트 캠프", "role": "analyst" }
  ]
}
```

### 테넌트 선택

```
POST /api/auth/select-tenant
Content-Type: application/json

{ "tenant_id": "camp-dev" }
```

### 검증

```
GET /api/auth/me
Cookie: campone_session=JWT

→ 200: { "id", "email", "name", "role", "tenant_id" }
→ 401: { "error": "Unauthorized" }
```

### 로그아웃

```
POST /api/auth/logout
→ Set-Cookie: campone_session=; Max-Age=0
→ 200: { "success": true }
```

---

## 7. 시스템 DB 인증 쿼리 표준

### 로그인 시 사용자 조회

```sql
SELECT id, email, name, password_hash, is_active, is_system_admin
FROM users
WHERE email = $1 AND is_active = true;
```

### 비밀번호 검증

```
bcrypt.compare(입력, password_hash)
```

- TypeScript: `bcryptjs` 패키지
- Python: `passlib` 또는 `bcrypt` 패키지

### 테넌트 멤버십 조회

```sql
SELECT tenant_id, role, is_default
FROM user_tenants
WHERE user_id = $1;
```

- 결과 1개: 해당 테넌트로 바로 로그인
- 결과 2개 이상 + tenant_id 미지정: `requires_tenant_selection` 반환
- 결과 2개 이상 + tenant_id 지정: 해당 테넌트로 로그인
- 결과 0개: 로그인 거부

---

## 8. Role 값 표준

```
admin             관리자 (전체 CRUD + 승인)
analyst           분석가 (Insight, Policy)
operator          운영 담당 (Ops, Campaign)
content_manager   콘텐츠 담당 (Studio)
civichub_admin    CivicHub 관리
member            일반 멤버 (읽기 전용)
```

> `user_tenants.role` 컬럼에 위 값 중 하나가 저장됨.
> 대시보드 RBAC의 `Admin/Manager/Staff/Viewer`와는 별개 (대시보드 내부용).

---

## 9. 현재 상태 vs 규약 (서비스별 TODO)

### Ops

| 항목 | 현재 | 규약 | 액션 |
|---|---|---|---|
| JWT 시크릿 | `campone-standalone-jwt-secret` (policy와 공유) | `campone-ops-jwt-secret` (단독) | 시크릿 분리 |
| JWT payload | `service` 필드 없음 | `service: "ops"` 필수 | 코드 수정 |
| 토큰 저장 | localStorage | httpOnly 쿠키 | 코드 수정 |
| 쿠키명 | - | `campone_session` | 코드 수정 |
| 임베드 수신 | postMessage | `GET /embed?token=xxx` | 코드 수정 |

### Policy

| 항목 | 현재 | 규약 | 액션 |
|---|---|---|---|
| JWT 시크릿 | `campone-standalone-jwt-secret` (ops와 공유) | `campone-policy-jwt-secret` (단독) | 시크릿 분리 |
| JWT payload | `service` 필드 없음 | `service: "policy"` 필수 | 코드 수정 |
| 쿠키명 | `campone_token` | `campone_session` | 코드 수정 |
| 임베드 쿠키명 | `campone_token` (재발급) | `campone_embed_session` | 코드 수정 |

### CivicHub

| 항목 | 현재 | 규약 | 액션 |
|---|---|---|---|
| JWT 시크릿 | `civichub-jwt-secret` (값 취약) | `campone-civichub-jwt-secret` (랜덤 값) | 시크릿 교체 + 이름 변경 |
| JWT payload | `service` 필드 없음 | `service: "civichub"` 필수 | 코드 수정 |
| 쿠키명 (standalone) | `civichub_admin_token` | `campone_session` | 코드 수정 |
| 쿠키명 (embed) | `embed_session` | `campone_embed_session` | 코드 수정 |
| 임베드 엔드포인트 | `/api/embed/auth?token=xxx` | `/embed?token=xxx` | 코드 수정 |

### Insight

| 항목 | 현재 | 규약 | 액션 |
|---|---|---|---|
| JWT 시크릿 | `EMBED_JWT_SECRET` 겸용 (위험) | `campone-insight-jwt-secret` (단독) | 시크릿 신규 + 코드 수정 |
| JWT payload | `service` 필드 없음 | `service: "insight"` 필수 | 코드 수정 |
| 쿠키명 (standalone) | `standalone_session` | `campone_session` | 코드 수정 |
| 쿠키명 (embed) | `embed_session` | `campone_embed_session` | 코드 수정 |
| 프론트엔드 토큰 | localStorage `standalone_token` | httpOnly 쿠키만 | 코드 수정 |

### Dashboard

| 항목 | 현재 | 규약 | 액션 |
|---|---|---|---|
| 임베드 토큰 발급 | 구현 완료 | 규약과 일치 | 없음 |
| `source: "dashboard"` | 포함됨 | 규약과 일치 | 없음 |

---

## 10. 시크릿 변경 계획

```
신규 생성 (4개):
  campone-ops-jwt-secret
  campone-policy-jwt-secret
  campone-civichub-jwt-secret
  campone-insight-jwt-secret

삭제 (2개):
  campone-standalone-jwt-secret   → ops/policy 분리로 대체
  civichub-jwt-secret             → campone-civichub-jwt-secret로 대체

변경 없음:
  campone-embed-jwt-secret        (그대로 유지)
  dashboard-nextauth-secret       (그대로 유지)
  control-nextauth-secret         (그대로 유지)

결과: 17개 → 19개
```

---

## 참고 문서

- [DB_MIGRATION_GUIDE.md](./DB_MIGRATION_GUIDE.md) — DB 접속, 스키마, 환경변수
- [INFRA_CHANGE_NOTICE_20260210.md](./INFRA_CHANGE_NOTICE_20260210.md) — Secret Manager 변경 이력
