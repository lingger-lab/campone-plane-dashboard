import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { getTenantConfig } from "./tenant/config-loader";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
  tenantClients: Map<string, PrismaClient> | undefined;
  tenantPools: Map<string, pg.Pool> | undefined;
};

/**
 * Prisma 클라이언트 생성
 */
function createPrismaClient(connectionString?: string): PrismaClient {
  const pool = new pg.Pool({
    connectionString: connectionString || process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10, // 커넥션 풀 크기
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

// 기본 Prisma 클라이언트 (마이그레이션, 시드 등에 사용)
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// 테넌트별 클라이언트 캐시
const tenantClients = globalForPrisma.tenantClients ?? new Map<string, PrismaClient>();
const tenantPools = globalForPrisma.tenantPools ?? new Map<string, pg.Pool>();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.tenantClients = tenantClients;
  globalForPrisma.tenantPools = tenantPools;
}

/**
 * 테넌트별 Prisma 클라이언트 가져오기
 *
 * - 개발 환경: 기본 prisma 클라이언트 반환 (단일 DB)
 * - 프로덕션: 테넌트별 DB 연결
 *
 * @param tenantId 테넌트 ID
 * @returns Prisma 클라이언트
 */
export async function getTenantPrisma(tenantId: string): Promise<PrismaClient> {
  // 개발 환경: 기본 클라이언트 사용
  if (process.env.NODE_ENV === "development" || process.env.USE_SINGLE_DB === "true") {
    return prisma;
  }

  // 캐시 확인
  const cached = tenantClients.get(tenantId);
  if (cached) {
    return cached;
  }

  // 테넌트 설정 로드
  const config = await getTenantConfig(tenantId);
  if (!config) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  // DB 연결 문자열 생성
  // 프로덕션에서는 Secret Manager에서 자격증명 로드
  let connectionString: string;

  if (config.database.credentials === "local") {
    // 로컬/개발: 기본 연결 사용
    connectionString = process.env.DATABASE_URL!;
  } else {
    // 프로덕션: 테넌트별 DB
    // TODO: Secret Manager에서 자격증명 로드
    // const creds = await getSecretValue(config.database.credentials);
    // connectionString = `postgresql://${creds.user}:${creds.password}@${config.database.host}:${config.database.port}/${config.database.name}`;
    connectionString = process.env.DATABASE_URL!; // 임시: 기본 연결 사용
  }

  // 클라이언트 생성 및 캐시
  const client = createPrismaClient(connectionString);
  tenantClients.set(tenantId, client);

  return client;
}

/**
 * 모든 테넌트 연결 종료 (graceful shutdown)
 */
export async function disconnectAllTenants(): Promise<void> {
  const disconnectPromises = Array.from(tenantClients.values()).map((client) =>
    client.$disconnect()
  );
  await Promise.all(disconnectPromises);

  const poolEndPromises = Array.from(tenantPools.values()).map((pool) =>
    pool.end()
  );
  await Promise.all(poolEndPromises);

  tenantClients.clear();
  tenantPools.clear();
}

export default prisma;
