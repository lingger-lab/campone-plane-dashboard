# CampOne — 테넌트 DB 자동 마이그레이션 구현 가이드

> **각 서비스 담당자 필수 구현 사항**: 테넌트 DB 최초 접속 시 자기 스키마에 테이블을 자동 생성하는 로직을 반드시 넣어야 합니다.

---

## 1. 왜 필요한가

Control에서 테넌트를 생성하면 **빈 스키마까지만** 만들어줍니다:

```
1. CREATE DATABASE {dbName}       (예: camp_dev_db)
2. CREATE SCHEMA insight
3. CREATE SCHEMA studio
4. CREATE SCHEMA policy
5. CREATE SCHEMA ops
6. CREATE SCHEMA hub
```

**스키마 안의 테이블은 생성하지 않습니다.** Control은 각 서비스의 테이블 구조를 모르기 때문입니다.

따라서 **각 서비스가 테넌트 DB에 처음 접속할 때, 자기 스키마에 테이블을 자동으로 생성/마이그레이션해야 합니다.** 이것이 없으면 새 테넌트 추가 시 수동으로 테이블을 만들어야 하고, 서비스 장애로 이어집니다.

---

## 2. 구현 요구사항

모든 서비스는 아래 조건을 **반드시** 충족해야 합니다:

| 항목 | 요구사항 |
|------|----------|
| **자동 마이그레이션** | 서비스 기동 시 또는 테넌트 최초 접속 시 테이블을 자동 생성할 것 |
| **스키마 지정** | 반드시 자기 스키마(`insight`, `studio`, `policy`, `ops`, `hub`)를 사용할 것. `public` 스키마는 Dashboard 전용 |
| **멱등성** | 이미 테이블이 존재할 때 에러 없이 넘어갈 것 (`CREATE TABLE IF NOT EXISTS` 또는 `prisma db push`) |
| **새 테넌트 대응** | 운영 중 새 테넌트가 추가되었을 때 별도 수동 작업 없이 자동 처리될 것 |

---

## 3. 구현 방법

### A. Prisma 사용 시

```typescript
// 서비스 기동 시 또는 테넌트 최초 접속 시
import { execSync } from 'child_process';

function migrateTenantDb(tenantDbUrl: string, schemaFile: string) {
  // Prisma 7.x: --skip-generate 플래그 없음 (제거됨)
  execSync(`DATABASE_URL="${tenantDbUrl}" npx prisma db push --schema=${schemaFile} --accept-data-loss`, {
    stdio: 'inherit',
  });
}
```

또는 프로덕션 환경에서는 `prisma migrate deploy`를 사용:

```typescript
execSync(`DATABASE_URL="${tenantDbUrl}" npx prisma migrate deploy --schema=${schemaFile}`);
```

> **주의**: Prisma 7.x부터 `--skip-generate` 플래그가 제거되었습니다. 사용하면 에러가 발생합니다.

### B. Drizzle 사용 시

```typescript
import { migrate } from 'drizzle-orm/node-postgres/migrator';

await migrate(db, { migrationsFolder: './drizzle/migrations' });
```

### C. Raw SQL 사용 시

```typescript
await pool.query(`
  CREATE TABLE IF NOT EXISTS insight.reports (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    ...
  );
`);
```

### D. 권장 패턴: 최초 접속 시 lazy 마이그레이션

```typescript
const migratedTenants = new Set<string>();

async function ensureTenantSchema(tenantId: string, dbUrl: string) {
  if (migratedTenants.has(tenantId)) return;

  // 테이블 존재 여부 체크 (빠른 경로)
  const exists = await checkTableExists(dbUrl, 'YOUR_SCHEMA', 'YOUR_MAIN_TABLE');
  if (exists) {
    migratedTenants.add(tenantId);
    return;
  }

  // 없으면 마이그레이션 실행
  await migrateTenantDb(dbUrl, './prisma/your-schema.prisma');
  migratedTenants.add(tenantId);
}
```

---

## 4. 테넌트 DB 접속 정보

### DB명 확인 방법

DB명은 시스템 DB `tenants` 테이블에서 조회합니다 (직접 조합하지 마세요):

```sql
SELECT db_name FROM tenants WHERE tenant_id = $1 AND is_active = true;
```

현재 등록된 테넌트:

| tenant_id | db_name | 상태 |
|-----------|---------|------|
| camp-dev | camp_dev_db | active |
| camp-test | camp_test_db | active |

### 접속 URL 구성

```
기본: postgresql://{user}:{password}@{host}/{dbName}?{params}

스키마: 각 서비스명과 동일 (insight, studio, policy, ops, hub)
  Prisma: schema.prisma에서 schemas = ["insight"]
  Raw SQL: SET search_path TO insight,public;
```

### Cloud SQL 환경 (프로덕션)

```
# Unix socket (Cloud Run 내부)
postgresql://{user}:{password}@/{dbName}?host=/cloudsql/campone-plane:asia-northeast3:free-trial-first-project

# TCP (로컬/외부 접속)
postgresql://{user}:{password}@34.50.60.30:5432/{dbName}
```

호스트 부분과 인증 정보는 시스템 DB URL과 동일하고, DB명만 다릅니다.
동적 테넌트 라우팅 구현 상세는 [INFRA_CHANGE_NOTICE_20260210.md](./INFRA_CHANGE_NOTICE_20260210.md) 섹션 6 참조.

---

## 5. 스키마별 담당 서비스

```
camp_{tenant}_db/
├── public    ← Dashboard 전용 (다른 서비스는 읽기만 가능, 쓰기는 Dashboard API 호출)
├── insight   ← Insight 서비스
├── studio    ← Studio 서비스
├── policy    ← Policy 서비스
├── ops       ← Ops 서비스
└── hub       ← CivicHub 서비스
```

- **자기 스키마**: 읽기/쓰기 자유
- **`public` 스키마**: 읽기만 (쓰기는 Dashboard API 호출)
- **다른 서비스 스키마**: 직접 접근 금지 (해당 서비스 API 호출)

---

## 6. 참고

- 테넌트 생성 시 Control이 빈 스키마까지만 만들어줍니다
- 테이블 구조는 각 서비스가 소유하고, 각 서비스가 책임지고 마이그레이션합니다
- 이 방식이 서비스 간 결합도를 낮추고, 각 서비스가 독립적으로 스키마를 발전시킬 수 있게 합니다
- 동적 테넌트 라우팅 표준 패턴: [INFRA_CHANGE_NOTICE_20260210.md](./INFRA_CHANGE_NOTICE_20260210.md) 섹션 6
- DB 아키텍처 상세: [CAMPONE_V2_ARCHITECTURE_v1.4.md](./CAMPONE_V2_ARCHITECTURE_v1.4.md)
