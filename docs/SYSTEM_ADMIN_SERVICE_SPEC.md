# CampOne 시스템 관리 서비스 명세서

> 버전: v0.1 (Draft)
> 작성일: 2026-02-06
> 상태: 설계 단계 (미구현)

---

## 1. 개요

### 1.1 목적
CampOne 플랫폼 전체를 관리하는 시스템 관리자 전용 서비스. 개별 캠프(테넌트)가 아닌 **플랫폼 레벨**의 운영을 담당한다.

### 1.2 현재 상태
- **구현**: CLI/스크립트 기반 (`scripts/seed.ts`, `gcloud` 명령어)
- **계획**: 고객 수 증가 시 별도 서비스로 분리

### 1.3 서비스 위치
```
campone-admin (신규 서비스)
├── 플랫폼 레벨 관리
├── 테넌트 생명주기
├── 전체 사용자 관리
└── 빌링/모니터링

campone-dashboard (기존)
├── 테넌트 내부 운영
├── 캠프별 설정
└── 캠프별 사용자/역할 관리
```

---

## 2. 기능 명세

### 2.1 테넌트(캠프) 관리

#### 2.1.1 테넌트 생성
새로운 캠프를 플랫폼에 추가한다.

**입력 정보:**
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| tenantId | string | O | 고유 식별자 (URL에 사용, 영문-숫자-하이픈) |
| name | string | O | 캠프 표시명 (예: "김민주 캠프") |
| plan | enum | O | 요금제 (free, basic, pro, enterprise) |
| features | string[] | O | 활성화할 모듈 (insight, studio, policy, ops, hub) |
| adminEmail | string | O | 초기 관리자 이메일 |
| adminName | string | O | 초기 관리자 이름 |

**처리 절차:**
1. `tenantId` 중복 검사 (campone_system.tenants)
2. 테넌트 DB 생성 (`camp_{tenantId}_db`)
3. 테넌트 DB에 스키마 적용 (prisma db push)
4. campone_system.tenants에 레코드 삽입
5. 테넌트 설정 파일 생성 (`src/config/tenants/{tenantId}.yaml`)
6. 초기 관리자 계정 생성 + user_tenants 매핑
7. (선택) 초기 관리자에게 이메일 발송

**산출물:**
- 새 테넌트 DB (camp_{tenantId}_db)
- tenants 테이블 레코드
- 테넌트 설정 YAML
- 초기 관리자 계정

#### 2.1.2 테넌트 설정 변경
기존 캠프의 설정을 변경한다.

**변경 가능 항목:**
| 항목 | 설명 | 영향 범위 |
|------|------|-----------|
| name | 표시명 변경 | UI 표시 |
| plan | 요금제 변경 | 기능 제한, 빌링 |
| features | 모듈 활성화/비활성화 | 사이드바 메뉴, API 접근 |
| isActive | 활성/비활성 | 전체 접근 차단 |
| config | 테넌트별 상세 설정 | YAML 파일 |

**features 변경 시 동작:**
- 비활성화된 모듈의 메뉴 숨김
- 비활성화된 모듈의 API 403 응답
- 기존 데이터는 유지 (삭제하지 않음)

#### 2.1.3 테넌트 비활성화
캠프를 일시적으로 비활성화한다. 데이터는 보존된다.

**동작:**
- tenants.is_active = false
- 해당 캠프 사용자 로그인 불가
- 해당 캠프 API 전체 403 응답
- 데이터 및 DB 유지

**복구:**
- is_active = true로 변경 시 즉시 복구

#### 2.1.4 테넌트 삭제
캠프를 완전히 삭제한다. **복구 불가능**.

**처리 절차:**
1. 삭제 확인 (tenantId 재입력 등)
2. user_tenants에서 해당 테넌트 매핑 삭제
3. audit_logs에서 해당 테넌트 로그 삭제 (또는 익명화)
4. llm_usage에서 해당 테넌트 기록 삭제 (또는 익명화)
5. 테넌트 DB 삭제 (DROP DATABASE)
6. tenants 테이블에서 레코드 삭제
7. 설정 YAML 파일 삭제

**보존 옵션:**
- 삭제 전 데이터 내보내기 제공
- 30일 소프트 삭제 후 영구 삭제 (선택적)

---

### 2.2 전체 사용자 관리

#### 2.2.1 사용자 생성
새로운 사용자를 플랫폼에 추가한다.

**입력 정보:**
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| email | string | O | 이메일 (로그인 ID) |
| name | string | O | 이름 |
| password | string | O | 초기 비밀번호 |
| isSystemAdmin | boolean | X | 시스템 관리자 여부 (기본: false) |
| tenantMappings | array | X | 초기 테넌트 매핑 |

**tenantMappings 구조:**
```
{
  tenantId: string,
  role: string,      // admin, analyst, operator, content_manager, civichub_admin, member
  isDefault: boolean // 로그인 시 기본 진입 캠프
}
```

**처리 절차:**
1. 이메일 중복 검사
2. 비밀번호 해시 생성 (bcrypt)
3. users 테이블에 삽입
4. (있으면) user_tenants에 매핑 삽입
5. (선택) 환영 이메일 발송

#### 2.2.2 사용자 검색/조회
전체 사용자를 조회한다.

**검색 조건:**
| 조건 | 설명 |
|------|------|
| email | 이메일 부분 일치 |
| name | 이름 부분 일치 |
| tenantId | 특정 테넌트 소속 사용자 |
| isActive | 활성/비활성 상태 |
| isSystemAdmin | 시스템 관리자만 |

**조회 결과:**
- 기본 정보 (id, email, name, isActive, isSystemAdmin)
- 소속 테넌트 목록 (tenantId, role, isDefault)
- 최근 로그인 시간 (updatedAt)

#### 2.2.3 사용자-테넌트 매핑 관리
사용자의 테넌트 소속 및 역할을 관리한다.

**가능한 작업:**
| 작업 | 설명 |
|------|------|
| 매핑 추가 | 사용자를 새 테넌트에 추가 |
| 역할 변경 | 기존 매핑의 역할 변경 |
| 기본 테넌트 변경 | is_default 변경 |
| 매핑 삭제 | 테넌트에서 사용자 제거 |

**제약 조건:**
- 사용자는 최소 1개 테넌트에 소속되어야 함 (또는 is_system_admin)
- is_default는 사용자당 1개만 가능
- 테넌트에 최소 1명의 admin 필요 (마지막 admin 삭제 불가)

#### 2.2.4 비밀번호 초기화
사용자 비밀번호를 강제로 초기화한다.

**옵션:**
1. 임시 비밀번호 생성 → 이메일 발송
2. 비밀번호 재설정 링크 발송 (권장)
3. 관리자가 직접 새 비밀번호 설정

#### 2.2.5 사용자 비활성화/삭제
**비활성화:**
- users.is_active = false
- 로그인 불가
- 데이터 및 매핑 유지

**삭제:**
- 소프트 삭제 권장 (is_active = false + deleted_at)
- 영구 삭제 시 관련 데이터 처리 필요

---

### 2.3 빌링/구독 관리

#### 2.3.1 요금제 정의
| 플랜 | 사용자 수 | 모듈 | LLM 토큰/월 | 스토리지 |
|------|----------|------|-------------|----------|
| free | 3명 | insight만 | 10,000 | 100MB |
| basic | 10명 | insight, studio | 100,000 | 1GB |
| pro | 50명 | 전체 | 1,000,000 | 10GB |
| enterprise | 무제한 | 전체 + 커스텀 | 무제한 | 무제한 |

#### 2.3.2 사용량 집계
**집계 대상:**
| 항목 | 출처 | 집계 주기 |
|------|------|-----------|
| LLM 토큰 | llm_usage 테이블 | 실시간 / 일별 |
| 스토리지 | 테넌트 DB 크기 + GCS | 일별 |
| API 호출 | (별도 로깅 필요) | 실시간 / 일별 |
| 활성 사용자 | users.updated_at | 일별 / 월별 |

**알림:**
- 사용량 80% 도달 시 경고
- 사용량 100% 도달 시 제한 또는 추가 과금

#### 2.3.3 결제 관리
**결제 정보:**
- 결제 수단 등록 (카드, 계좌이체)
- 청구 주소
- 세금계산서 정보

**결제 이력:**
- 월별 청구서 발행
- 결제 성공/실패 내역
- 환불 처리

---

### 2.4 플랫폼 모니터링

#### 2.4.1 서비스 상태
**모니터링 대상:**
| 서비스 | 헬스체크 방식 |
|--------|--------------|
| campone-dashboard | /api/health |
| campone-insight | /api/health |
| campone-studio | /api/health |
| Cloud SQL | 연결 테스트 |
| GCS | 버킷 접근 테스트 |

**알림 조건:**
- 서비스 다운 (3회 연속 실패)
- 응답 지연 (p95 > 3초)
- 에러율 급증 (> 5%)

#### 2.4.2 테넌트별 통계
| 지표 | 설명 |
|------|------|
| 활성 사용자 수 | 최근 7일 내 로그인 |
| 일별 API 호출량 | 테넌트별 집계 |
| LLM 사용량 | 토큰 소비량 |
| 스토리지 사용량 | DB + 파일 |

#### 2.4.3 LLM 사용량 대시보드
**llm_usage 테이블 기반:**
```
집계 축:
- 테넌트별
- 서비스별 (insight, studio, policy, ops, hub)
- 모델별 (claude-3-5-sonnet, gpt-4, gemini-pro 등)
- 일별/주별/월별

표시 항목:
- 입력 토큰 합계
- 출력 토큰 합계
- 예상 비용 (단가 × 토큰)
- 평균 지연 시간
```

---

### 2.5 감사/컴플라이언스

#### 2.5.1 전체 감사 로그 조회
campone_system.audit_logs 기반으로 전체 플랫폼 활동을 조회한다.

**검색 조건:**
| 조건 | 설명 |
|------|------|
| tenantId | 특정 테넌트 |
| actorId | 특정 사용자 |
| action | 특정 액션 (login, create, update, delete 등) |
| resource | 특정 리소스 타입 |
| dateRange | 기간 |

**내보내기:**
- CSV 다운로드
- JSON 다운로드

#### 2.5.2 데이터 내보내기 요청
GDPR 등 규정 준수를 위한 데이터 포터빌리티.

**대상:**
- 특정 사용자의 모든 데이터
- 특정 테넌트의 모든 데이터

**형식:**
- JSON (기본)
- CSV (테이블별)

**절차:**
1. 요청 접수 (요청자 신원 확인)
2. 데이터 수집 (모든 테이블에서 해당 ID 조회)
3. 패키지 생성 (암호화된 ZIP)
4. 다운로드 링크 제공 (유효기간 7일)

#### 2.5.3 데이터 삭제 요청 (잊힐 권리)
**처리 대상:**
- users 테이블 (익명화 또는 삭제)
- user_tenants 테이블
- audit_logs (actor_id 익명화)
- 테넌트 DB 내 사용자 생성 데이터

**익명화 방식:**
```
email: user_12345@deleted.campone.kr
name: 삭제된 사용자
password_hash: (무효화)
```

---

## 3. 접근 권한

### 3.1 시스템 관리자 (isSystemAdmin = true)
- 모든 기능 접근 가능
- 모든 테넌트 조회 가능
- 빌링/모니터링 접근 가능

### 3.2 일반 사용자
- 시스템 관리 서비스 접근 불가
- 자신이 속한 테넌트의 대시보드만 접근

### 3.3 인증 방식
- 대시보드와 동일한 NextAuth 기반
- isSystemAdmin 체크 후 접근 허용
- 추가 2FA 권장 (시스템 관리자)

---

## 4. 기술 스택 (권장)

### 4.1 프론트엔드
- Next.js 14 (대시보드와 동일)
- 별도 앱 또는 대시보드 내 `/admin` 경로

### 4.2 백엔드
- 대시보드와 동일한 API 라우트 패턴
- campone_system DB 직접 접근
- 테넌트 DB 생성/삭제는 gcloud CLI 또는 Cloud SQL Admin API

### 4.3 인프라
```
campone-admin (Cloud Run)
├── campone_system (Cloud SQL) ← 직접 접근
├── camp_*_db (Cloud SQL) ← 관리 작업만
└── Secret Manager ← DB 비밀번호 등
```

---

## 5. 구현 우선순위

### Phase 1: CLI 기반 (현재)
- [x] 테넌트 시드 스크립트 (`prisma/seed.ts`)
- [x] 스키마 Push 스크립트 (`scripts/push-schema-remote.sh`)
- [ ] 테넌트 생성 CLI (`scripts/create-tenant.ts`)
- [ ] 사용자 생성 CLI (`scripts/create-user.ts`)

### Phase 2: 기본 UI
- [ ] `/admin/tenants` - 테넌트 목록/생성/수정
- [ ] `/admin/users` - 사용자 목록/생성/수정
- [ ] `/admin/audit` - 감사 로그 조회

### Phase 3: 빌링/모니터링
- [ ] 요금제 관리
- [ ] 사용량 대시보드
- [ ] 결제 연동

### Phase 4: 고급 기능
- [ ] 데이터 내보내기/삭제 요청
- [ ] 서비스 상태 모니터링
- [ ] 알림 설정

---

## 6. 현재 아키텍처와의 관계

### 6.1 DB 구조
```
campone_system (시스템 관리 서비스가 주로 사용)
├── tenants        ← 테넌트 CRUD
├── users          ← 사용자 CRUD
├── user_tenants   ← 매핑 관리
├── audit_logs     ← 전체 조회
└── llm_usage      ← 사용량 집계

camp_{tenant}_db (테넌트별 - 관리 작업 시에만 접근)
├── 생성/삭제/백업
└── 스키마 마이그레이션
```

### 6.2 대시보드와의 역할 분담
| 기능 | 시스템 관리 서비스 | 대시보드 |
|------|-------------------|----------|
| 테넌트 생성/삭제 | O | X |
| 테넌트 설정 변경 | O | 일부 (features 등) |
| 전체 사용자 조회 | O | X |
| 테넌트 내 사용자 관리 | X | O |
| 역할 관리 | X | O |
| 빌링 | O | X |
| 감사 로그 (전체) | O | X |
| 감사 로그 (테넌트별) | X | O |

### 6.3 인증 공유
- 동일한 `campone_system.users` 테이블 사용
- `isSystemAdmin` 플래그로 접근 구분
- JWT 토큰 공유 가능 (동일 도메인 시)

---

## 7. 보안 고려사항

### 7.1 접근 제어
- 시스템 관리자만 접근 가능
- IP 화이트리스트 권장
- 모든 작업 감사 로그 기록

### 7.2 민감 작업 보호
- 테넌트 삭제: 2단계 확인 (tenantId 재입력)
- 시스템 관리자 권한 부여: 기존 시스템 관리자 승인
- 비밀번호 초기화: 이메일 인증

### 7.3 데이터 보호
- DB 비밀번호 Secret Manager 저장
- 로그에 민감 정보 마스킹
- 내보내기 파일 암호화

---

## 부록: 관련 문서

- [DB 마이그레이션 가이드](./DB_MIGRATION_GUIDE.md)
- [v1.4 아키텍처 문서](./CAMPONE_V2_ARCHITECTURE_v1.4.md)
- [테넌트 설정 YAML 예시](../src/config/tenants/camp-dev.yaml)
