import { PrismaClient as SystemPrismaClient } from "@prisma/client";
import { PrismaClient as TenantPrismaClient } from "@prisma/client-tenant";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// ============================================
// v1.4 2계층 DB 구조
// - systemDb: campone_system (인증, 감사, 사용량)
// - tenantDb: camp_{tenant}_db (업무 데이터)
// ============================================

const globalForPrisma = globalThis as unknown as {
  systemClient: SystemPrismaClient | undefined;
  tenantClients: Map<string, TenantPrismaClient> | undefined;
};

/**
 * Cloud SQL 소켓 연결 여부 판별
 * ?host=/cloudsql/... 형태면 Unix 소켓 → SSL 불필요
 */
function isCloudSqlSocket(url?: string): boolean {
  return !!url && url.includes("/cloudsql/");
}

/**
 * 시스템 DB 클라이언트 생성
 */
function createSystemClient(): SystemPrismaClient {
  const connectionString =
    process.env.SYSTEM_DATABASE_URL || process.env.DATABASE_URL;

  const pool = new pg.Pool({
    connectionString,
    ssl: isCloudSqlSocket(connectionString) ? false : { rejectUnauthorized: false },
    max: 10,
  });

  const adapter = new PrismaPg(pool);

  return new SystemPrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

/**
 * 테넌트 DB 클라이언트 생성
 */
function createTenantClient(connectionString: string): TenantPrismaClient {
  const pool = new pg.Pool({
    connectionString,
    ssl: isCloudSqlSocket(connectionString) ? false : { rejectUnauthorized: false },
    max: 10,
  });

  const adapter = new PrismaPg(pool);

  return new TenantPrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

// ============================================
// 시스템 DB (campone_system)
// ============================================

const systemClient =
  globalForPrisma.systemClient ?? createSystemClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.systemClient = systemClient;
}

/**
 * 시스템 DB Prisma 클라이언트 (users, user_tenants, tenants, audit_logs, llm_usage)
 */
export function getSystemPrisma(): SystemPrismaClient {
  return systemClient;
}

// 하위 호환용 export
export const prisma = systemClient;

// ============================================
// 테넌트 DB (camp_{tenant}_db)
// ============================================

const tenantClients =
  globalForPrisma.tenantClients ?? new Map<string, TenantPrismaClient>();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.tenantClients = tenantClients;
}

/**
 * 테넌트별 Prisma 클라이언트 가져오기
 *
 * - 개발 환경(USE_SINGLE_DB=true): TENANT_DATABASE_URL 또는 DATABASE_URL 사용
 * - 프로덕션: 시스템 DB의 tenants.db_name으로 URL 조합
 */
export async function getTenantPrisma(
  tenantId: string
): Promise<TenantPrismaClient> {
  // 캐시 확인
  const cached = tenantClients.get(tenantId);
  if (cached) {
    return cached;
  }

  let connectionString: string;

  if (
    process.env.NODE_ENV === "development" ||
    process.env.USE_SINGLE_DB === "true"
  ) {
    // 개발 환경: TENANT_DATABASE_URL 또는 DATABASE_URL 사용
    connectionString =
      process.env.TENANT_DATABASE_URL || process.env.DATABASE_URL!;
  } else {
    // 프로덕션: 시스템 DB에서 테넌트 정보 조회
    const tenant = await systemClient.tenant.findUnique({
      where: { tenantId },
      select: { dbName: true, isActive: true },
    });

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    if (!tenant.isActive) {
      throw new Error(`Tenant is inactive: ${tenantId}`);
    }

    // DATABASE_URL에서 DB명만 교체
    // e.g., .../campone_system?host=... → .../camp_dev_db?host=...
    const baseUrl = process.env.DATABASE_URL!;
    connectionString = baseUrl.replace(/\/([^/?]+)(\?|$)/, `/${tenant.dbName}$2`);
  }

  const client = createTenantClient(connectionString);
  tenantClients.set(tenantId, client);

  return client;
}

/**
 * 모든 연결 종료 (graceful shutdown)
 */
export async function disconnectAll(): Promise<void> {
  await systemClient.$disconnect();

  const disconnectPromises = Array.from(tenantClients.values()).map((client) =>
    client.$disconnect()
  );
  await Promise.all(disconnectPromises);
  tenantClients.clear();
}

export default prisma;
