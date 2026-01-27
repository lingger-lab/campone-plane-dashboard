# CampOne Dashboard 보안 검토 문서

> 작성일: 2026-01-27
> 상태: 검토 필요 (구현 보류)

---

## 1. 현재 인증 구조

### 1.1 대시보드 인증 (NextAuth.js)

```
사용자 로그인 요청
       ↓
NextAuth CredentialsProvider
       ↓
Prisma로 DB 사용자 조회
       ↓
bcrypt로 비밀번호 검증
       ↓
JWT 토큰 발급 (24시간 유효)
       ↓
클라이언트에 세션 쿠키 저장
```

**현재 구현:**
- 파일: `src/lib/auth.ts`
- 인증 방식: JWT 기반 세션
- 세션 만료: 24시간
- 비밀번호 해싱: bcrypt

### 1.2 임베드 모듈 인증

```
대시보드 세션 확인
       ↓
/api/auth/embed-token 호출
       ↓
별도 JWT 발급 (1시간 유효)
       ↓
iframe URL 쿼리 파라미터로 토큰 전달
       ↓
각 모듈에서 토큰 검증
```

**현재 구현:**
- 파일: `src/app/api/auth/embed-token/route.ts`
- 토큰 유효기간: 1시간
- 자동 갱신: 50분마다 (`src/hooks/useEmbedToken.ts`)
- 시크릿: `EMBED_JWT_SECRET` 환경변수

### 1.3 인증 연관 모듈들

| 모듈 | URL | 인증 방식 |
|-----|-----|----------|
| Insights (Pulse) | campone-v2-frontend-*.run.app | 임베드 토큰 |
| Studio | campone-studio-web-*.run.app | 임베드 토큰 |
| Policy | campone-policy-*.run.app | 임베드 토큰 |
| Ops | campone-ops-*.run.app | 임베드 토큰 |
| Hub | campone-civic-hub-*.run.app | 임베드 토큰 |

---

## 2. 보안 취약점 분석

### 2.1 현재 부재한 보안 기능

| 기능 | 설명 | 위험도 | 비고 |
|-----|------|-------|------|
| 로그인 실패 제한 | 무제한 로그인 시도 가능 | **높음** | 브루트포스 공격 취약 |
| 계정 잠금 | 없음 | **높음** | 위와 연관 |
| Rate Limiting | API 요청 제한 없음 | 중간 | DDoS 취약 |
| 다중 기기 세션 제어 | 동시 로그인 제한 없음 | 낮음 | 정책적 결정 필요 |
| 2FA/MFA | 없음 | 중간 | 관리자 계정에 권장 |
| 로그인 감사 로그 | 기본적인 lastLogin만 기록 | 낮음 | IP, User-Agent 미기록 |

### 2.2 현재 구현된 보안 기능

| 기능 | 설명 | 상태 |
|-----|------|------|
| 비밀번호 해싱 | bcrypt 사용 | ✅ 구현됨 |
| JWT 기반 세션 | 서버 상태 불필요 | ✅ 구현됨 |
| HTTPS | Cloud Run 기본 제공 | ✅ 구현됨 |
| 계정 활성화 상태 | isActive 필드로 비활성화 가능 | ✅ 구현됨 |
| RBAC | 역할 기반 접근 제어 | ✅ 구현됨 |
| 미들웨어 보호 | 인증 필요 경로 보호 | ✅ 구현됨 |

---

## 3. 제안된 보안 강화 방안

### 3.1 로그인 실패 제한 및 계정 잠금

**DB 스키마 변경 필요:**
```prisma
model User {
  // 기존 필드...

  // 보안 관련 필드 추가
  failedAttempts Int       @default(0)        // 로그인 실패 횟수
  lockedUntil    DateTime?                    // 계정 잠금 해제 시간
  lastFailedAt   DateTime?                    // 마지막 실패 시간
}
```

**로직:**
- 5회 연속 실패 시 15분간 계정 잠금
- 30분 경과 시 실패 횟수 자동 리셋
- 성공 시 실패 횟수 초기화

### 3.2 단일 기기 로그인 (논의 필요)

**DB 스키마 변경 필요:**
```prisma
model User {
  // 기존 필드...
  sessionToken   String?   // 현재 유효한 세션 토큰
}
```

**로직:**
- 로그인 시 새 sessionToken 생성 및 DB 저장
- 세션 콜백에서 DB의 sessionToken과 JWT의 sessionToken 비교
- 불일치 시 세션 무효화 (다른 기기에서 로그인됨)

**⚠️ 임베드 모듈 영향:**
```
새 기기 로그인
       ↓
기존 대시보드 세션 무효화
       ↓
임베드 토큰 갱신 시 (최대 50분 후)
       ↓
모든 임베드 모듈 인증 실패
```

**고려사항:**
- 캠프 운영진이 PC + 모바일 동시 사용 시나리오
- 보안 vs 편의성 트레이드오프
- 임베드 모듈 즉시 무효화 vs 점진적 무효화

### 3.3 로그인 감사 로그 강화

**현재 AuditLog 모델 활용:**
```typescript
await prisma.auditLog.create({
  data: {
    userId: user.id,
    userName: user.name,
    action: success ? 'login' : 'login_failed',
    module: 'System',
    target: email,
    details: { success, reason, failedAttempts },
    ipAddress: req.headers['x-forwarded-for'],
    userAgent: req.headers['user-agent'],
  },
});
```

### 3.4 Rate Limiting

**옵션 1: 미들웨어 레벨**
- `src/middleware.ts`에서 IP 기반 요청 제한
- 메모리 또는 Redis 사용

**옵션 2: API Route 레벨**
- 로그인 API에만 적용
- IP당 1분에 10회 제한

**옵션 3: Cloud Run/Load Balancer**
- GCP Cloud Armor 사용
- 인프라 레벨 DDoS 방어

---

## 4. 의사결정 필요 사항

### 4.1 다중 기기 로그인 정책

| 옵션 | 장점 | 단점 |
|-----|------|------|
| 허용 (현재) | 편의성, 임베드 영향 없음 | 세션 탈취 시 감지 어려움 |
| 단일 기기만 | 보안 강화, 세션 관리 용이 | 운영 불편, 임베드 영향 |
| N개 기기 허용 | 적절한 균형 | 구현 복잡도 증가 |

**권장:** 우선 허용 유지, 감사 로그 강화로 모니터링 후 결정

### 4.2 임베드 토큰 즉시 무효화

단일 기기 로그인 구현 시:

| 옵션 | 설명 |
|-----|------|
| 점진적 무효화 | 토큰 갱신 시점(50분 후)에 자연스럽게 실패 |
| 즉시 무효화 | DB에 embedTokenInvalidatedAt 추가, 모듈에서 주기적 확인 |

**권장:** 점진적 무효화 (구현 단순, 임베드 모듈 변경 불필요)

### 4.3 구현 우선순위

| 순위 | 기능 | 이유 |
|-----|------|------|
| 1 | 로그인 실패 제한 + 계정 잠금 | 브루트포스 방어, 필수 |
| 2 | 로그인 감사 로그 강화 | 보안 모니터링, 구현 용이 |
| 3 | Rate Limiting | DDoS 방어, 중요도 중간 |
| 4 | 단일 기기 로그인 | 임베드 영향 검토 필요, 보류 |
| 5 | 2FA/MFA | 별도 인프라 필요, 장기 과제 |

---

## 5. 구현 시 주의사항

### 5.1 Prisma 마이그레이션

새 필드 추가 시:
```bash
# 개발 환경
npx prisma db push

# 프로덕션 (Cloud Run)
# Dockerfile의 CMD에서 자동 실행됨
npx prisma db push --skip-generate --accept-data-loss
```

**주의:** `--accept-data-loss` 플래그는 데이터 손실 가능성 있음. 새 nullable 필드 추가는 안전.

### 5.2 임베드 모듈 통신

테마 변경처럼 보안 상태도 브로드캐스트 가능:
```typescript
// 예: 세션 무효화 알림
broadcastToModules({ type: 'SESSION_INVALIDATED' });
```

단, 각 모듈에서 수신 로직 구현 필요.

### 5.3 테스트 시나리오

구현 전 검증 필요:
1. 로그인 5회 실패 → 계정 잠금 확인
2. 15분 후 잠금 해제 확인
3. (단일 기기 구현 시) PC 로그인 → 모바일 로그인 → PC 세션 무효화 확인
4. 임베드 모듈 토큰 갱신 실패 시 동작 확인

---

## 6. 결론

### 즉시 구현 권장
- 로그인 실패 제한 (5회)
- 계정 잠금 (15분)
- 로그인 감사 로그 (IP, User-Agent)

### 추가 검토 필요
- 단일 기기 로그인: 임베드 모듈 영향도 분석 후 결정
- Rate Limiting: Cloud Armor vs 애플리케이션 레벨 선택

### 장기 과제
- 2FA/MFA 도입
- 비밀번호 정책 강화 (복잡도, 만료)
- 세션 타임아웃 조정

---

## 부록: 구현 코드 (참고용)

<details>
<summary>auth.ts 보안 강화 버전 (롤백됨)</summary>

```typescript
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import type { NextAuthOptions } from 'next-auth';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const FAILED_ATTEMPT_RESET_MINUTES = 30;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: '이메일', type: 'email' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            await logLoginAttempt(credentials.email, false, '사용자 없음', req);
            return null;
          }

          if (!user.isActive) {
            await logLoginAttempt(credentials.email, false, '비활성화 계정', req);
            return null;
          }

          // 계정 잠금 확인
          if (user.lockedUntil && new Date() < user.lockedUntil) {
            const remainingMinutes = Math.ceil(
              (user.lockedUntil.getTime() - Date.now()) / (1000 * 60)
            );
            await logLoginAttempt(credentials.email, false, `계정 잠금`, req);
            throw new Error(`계정이 잠겨있습니다. ${remainingMinutes}분 후에 다시 시도해주세요.`);
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isValidPassword) {
            const newFailedAttempts = user.failedAttempts + 1;
            const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS;

            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedAttempts: newFailedAttempts,
                lastFailedAt: new Date(),
                ...(shouldLock && {
                  lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000),
                }),
              },
            });

            await logLoginAttempt(credentials.email, false, `비밀번호 오류 (${newFailedAttempts}회)`, req);

            if (shouldLock) {
              throw new Error(`비밀번호를 ${MAX_FAILED_ATTEMPTS}회 틀렸습니다. ${LOCKOUT_DURATION_MINUTES}분간 로그인이 제한됩니다.`);
            }

            return null;
          }

          // 로그인 성공
          const sessionToken = crypto.randomUUID();

          await prisma.user.update({
            where: { id: user.id },
            data: {
              lastLogin: new Date(),
              failedAttempts: 0,
              lockedUntil: null,
              lastFailedAt: null,
              sessionToken: sessionToken,
            },
          });

          await logLoginAttempt(credentials.email, true, '로그인 성공', req);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatar: user.avatar,
            sessionToken: sessionToken,
          };
        } catch (error) {
          if (error instanceof Error && error.message.includes('계정')) {
            throw error;
          }
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  // ... callbacks, session config
};

async function logLoginAttempt(
  email: string,
  success: boolean,
  details: string,
  req?: { headers?: { get?: (name: string) => string | null } }
) {
  try {
    const ipAddress = req?.headers?.get?.('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = req?.headers?.get?.('user-agent') || 'unknown';

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });

    if (user) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          userName: user.name,
          action: success ? 'login' : 'login_failed',
          module: 'System',
          target: email,
          details: { success, reason: details },
          ipAddress: ipAddress.substring(0, 45),
          userAgent: userAgent.substring(0, 255),
        },
      });
    }
  } catch (error) {
    console.error('Failed to log login attempt:', error);
  }
}
```

</details>

<details>
<summary>schema.prisma 보안 필드 (롤백됨)</summary>

```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String
  password  String
  role      UserRole  @default(Staff)
  avatar    String?
  isActive  Boolean   @default(true)
  lastLogin DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  // 보안 관련 필드
  failedAttempts Int       @default(0)        // 로그인 실패 횟수
  lockedUntil    DateTime?                    // 계정 잠금 해제 시간
  lastFailedAt   DateTime?                    // 마지막 실패 시간
  sessionToken   String?                      // 현재 유효한 세션 토큰 (단일 기기 로그인용)

  auditLogs  AuditLog[]
  userAlerts UserAlert[]

  @@map("users")
}
```

</details>
