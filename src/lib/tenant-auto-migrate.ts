/**
 * 테넌트 DB 자동 마이그레이션
 *
 * prisma/tenant/migrations/ 폴더의 SQL 파일을 읽어서 pg.Client로 실행.
 * Prisma 호환 _prisma_migrations 테이블로 적용 이력 관리.
 * advisory lock으로 동시 실행 방지.
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { reportError } from '@/lib/error-reporter';

const migratedTenants = new Set<string>();

const MIGRATIONS_DIR = path.join(process.cwd(), 'prisma/tenant/migrations');
const LOCK_ID = 8675309; // advisory lock 고정 ID

interface Migration {
  name: string;
  sql: string;
  checksum: string;
}

/**
 * 테넌트 DB에 미적용 마이그레이션을 순차 실행
 */
export async function ensureTenantTables(
  connectionString: string,
  tenantId: string
): Promise<void> {
  if (migratedTenants.has(tenantId)) return;

  const dbMatch = connectionString.match(/\/([^/?]+)(\?|$)/);
  const dbName = dbMatch?.[1] || 'unknown';

  const client = new pg.Client({
    connectionString,
    ssl: connectionString.includes('/cloudsql/') ? false : { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    // advisory lock 획득 (동시 인스턴스 보호)
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);

    // _prisma_migrations 테이블 보장
    await ensureMigrationsTable(client);

    // 이미 적용된 마이그레이션 조회
    const applied = await getAppliedMigrations(client);

    // 디스크의 마이그레이션 스캔 → 미적용 필터
    const pending = getPendingMigrations(applied);

    if (pending.length === 0) {
      console.log(`[tenant:${tenantId}] All migrations applied in ${dbName}, skip`);
      migratedTenants.add(tenantId);
      return;
    }

    console.log(`[tenant:${tenantId}] ${pending.length} pending migration(s) in ${dbName}`);

    for (const migration of pending) {
      await applyMigration(client, migration, tenantId);
    }

    console.log(`[tenant:${tenantId}] Migration complete in ${dbName}`);
    migratedTenants.add(tenantId);
  } catch (error) {
    console.error(`[tenant:${tenantId}] Auto-migration FAILED for ${dbName}:`, error);
    reportError({
      service: 'dashboard',
      tenantId,
      level: 'error',
      message: `Auto-migration FAILED for ${dbName}`,
      stack: error instanceof Error ? error.stack : undefined,
    });
    // 마이그레이션 실패를 전파하여 깨진 클라이언트가 캐시되는 것을 방지
    // getTenantPrisma에서 catch → 다음 요청 시 재시도
    throw error;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
    await client.end().catch(() => {});
  }
}

/** Prisma 호환 _prisma_migrations 테이블 생성 */
async function ensureMigrationsTable(client: pg.Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) NOT NULL DEFAULT gen_random_uuid()::text,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
    )
  `);
}

/** 이미 적용된 마이그레이션 이름 Set (완료된 것만) */
async function getAppliedMigrations(client: pg.Client): Promise<Set<string>> {
  // finished_at IS NOT NULL: 실패한 마이그레이션은 제외해야 재시도 가능
  const { rows } = await client.query(
    `SELECT "migration_name" FROM "_prisma_migrations"
     WHERE "rolled_back_at" IS NULL AND "finished_at" IS NOT NULL`
  );
  return new Set(rows.map((r: { migration_name: string }) => r.migration_name));
}

/** 디스크에서 마이그레이션 디렉토리 스캔, 미적용만 반환 (정렬순) */
function getPendingMigrations(applied: Set<string>): Migration[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.warn(`[migrate] migrations dir not found: ${MIGRATIONS_DIR}`);
    return [];
  }

  const dirs = fs.readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  const pending: Migration[] = [];

  for (const dirName of dirs) {
    if (applied.has(dirName)) continue;

    const sqlPath = path.join(MIGRATIONS_DIR, dirName, 'migration.sql');
    if (!fs.existsSync(sqlPath)) continue;

    const sql = fs.readFileSync(sqlPath, 'utf-8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');

    pending.push({ name: dirName, sql, checksum });
  }

  return pending;
}

/** 단일 마이그레이션 적용 */
async function applyMigration(
  client: pg.Client,
  migration: Migration,
  tenantId: string
): Promise<void> {
  console.log(`[tenant:${tenantId}] Applying: ${migration.name}`);

  // 이전 실패 레코드 정리 (재시도 시 중복 방지)
  await client.query(
    `DELETE FROM "_prisma_migrations"
     WHERE "migration_name" = $1 AND "finished_at" IS NULL AND "rolled_back_at" IS NULL`,
    [migration.name]
  );

  // 시작 레코드 삽입
  const { rows } = await client.query(
    `INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "started_at", "applied_steps_count")
     VALUES (gen_random_uuid()::text, $1, $2, now(), 0)
     RETURNING "id"`,
    [migration.checksum, migration.name]
  );
  const migrationId = rows[0].id;

  try {
    await client.query(migration.sql);

    // 완료 업데이트
    await client.query(
      `UPDATE "_prisma_migrations"
       SET "finished_at" = now(), "applied_steps_count" = 1
       WHERE "id" = $1`,
      [migrationId]
    );

    console.log(`[tenant:${tenantId}] Applied: ${migration.name}`);
  } catch (error) {
    // 실패 로그 기록
    const errMsg = error instanceof Error ? error.message : String(error);
    await client.query(
      `UPDATE "_prisma_migrations" SET "logs" = $1 WHERE "id" = $2`,
      [errMsg, migrationId]
    ).catch(() => {});

    throw error;
  }
}
