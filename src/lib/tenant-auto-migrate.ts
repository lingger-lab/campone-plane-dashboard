/**
 * 테넌트 DB 자동 마이그레이션
 *
 * 테넌트 최초 접속 시 public 스키마에 테이블이 없으면 자동 생성.
 * DDL은 pg Pool로 직접 실행 (PrismaPg 어댑터의 implicit transaction 회피).
 * prisma/tenant/schema.prisma 와 동기화 유지할 것.
 */

import pg from 'pg';

const migratedTenants = new Set<string>();

/**
 * 테넌트 DB에 테이블이 존재하는지 확인하고, 없으면 생성
 */
export async function ensureTenantTables(
  connectionString: string,
  tenantId: string
): Promise<void> {
  if (migratedTenants.has(tenantId)) return;

  const client = new pg.Client({
    connectionString,
    ssl: connectionString.includes('/cloudsql/') ? false : { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    // 핵심 테이블 존재 여부 확인
    const { rows } = await client.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'campaign_profile'
      ) as exists`
    );

    if (rows[0]?.exists) {
      migratedTenants.add(tenantId);
      return;
    }

    console.log(`[tenant:${tenantId}] Tables missing, running auto-migration...`);
    await runMigration(client);
    console.log(`[tenant:${tenantId}] Auto-migration completed`);
    migratedTenants.add(tenantId);
  } catch (error) {
    console.error(`[tenant:${tenantId}] Auto-migration failed:`, error);
    migratedTenants.add(tenantId); // 재시도 방지
  } finally {
    await client.end().catch(() => {});
  }
}

async function runMigration(client: pg.Client): Promise<void> {
  // Enums
  await client.query(`DO $$ BEGIN CREATE TYPE "AlertType" AS ENUM ('system', 'workflow'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await client.query(`DO $$ BEGIN CREATE TYPE "AlertSeverity" AS ENUM ('info', 'warning', 'error', 'success'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
  await client.query(`DO $$ BEGIN CREATE TYPE "QuickButtonCategory" AS ENUM ('video', 'blog', 'primary', 'default'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

  // alerts
  await client.query(`
    CREATE TABLE IF NOT EXISTS "alerts" (
      "id" TEXT NOT NULL,
      "type" "AlertType" NOT NULL,
      "severity" "AlertSeverity" NOT NULL,
      "title" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "source" TEXT,
      "source_id" TEXT,
      "pinned" BOOLEAN NOT NULL DEFAULT false,
      "expires_at" TIMESTAMP(3),
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
    )
  `);

  // user_alerts
  await client.query(`
    CREATE TABLE IF NOT EXISTS "user_alerts" (
      "user_id" TEXT NOT NULL,
      "alert_id" TEXT NOT NULL,
      "read" BOOLEAN NOT NULL DEFAULT false,
      "read_at" TIMESTAMP(3),
      CONSTRAINT "user_alerts_pkey" PRIMARY KEY ("user_id", "alert_id"),
      CONSTRAINT "user_alerts_alert_id_fkey" FOREIGN KEY ("alert_id")
        REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);

  // channel_links
  await client.query(`
    CREATE TABLE IF NOT EXISTS "channel_links" (
      "key" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "icon" TEXT,
      "visible" BOOLEAN NOT NULL DEFAULT true,
      "order" INTEGER NOT NULL DEFAULT 0,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "channel_links_pkey" PRIMARY KEY ("key")
    )
  `);

  // kpi_cache
  await client.query(`
    CREATE TABLE IF NOT EXISTS "kpi_cache" (
      "key" TEXT NOT NULL,
      "value" JSONB NOT NULL,
      "expires_at" TIMESTAMP(3) NOT NULL,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "kpi_cache_pkey" PRIMARY KEY ("key")
    )
  `);

  // campaign_profile
  await client.query(`
    CREATE TABLE IF NOT EXISTS "campaign_profile" (
      "id" TEXT NOT NULL DEFAULT 'main',
      "candidate_name" TEXT NOT NULL DEFAULT '후보자명',
      "candidate_title" TEXT NOT NULL DEFAULT 'OO시장 후보',
      "org_name" TEXT NOT NULL DEFAULT '선거대책본부',
      "photo_url" TEXT,
      "module_images" JSONB NOT NULL DEFAULT '{}',
      "careers" JSONB NOT NULL DEFAULT '[]',
      "slogans" JSONB NOT NULL DEFAULT '[]',
      "address" TEXT,
      "phone" TEXT,
      "email" TEXT,
      "hours" TEXT,
      "description" TEXT,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "campaign_profile_pkey" PRIMARY KEY ("id")
    )
  `);

  // quick_buttons
  await client.query(`
    CREATE TABLE IF NOT EXISTS "quick_buttons" (
      "id" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "icon" TEXT,
      "category" "QuickButtonCategory" NOT NULL DEFAULT 'default',
      "order" INTEGER NOT NULL DEFAULT 0,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "quick_buttons_pkey" PRIMARY KEY ("id")
    )
  `);

  // tenant_preferences
  await client.query(`
    CREATE TABLE IF NOT EXISTS "tenant_preferences" (
      "key" TEXT NOT NULL,
      "value" JSONB NOT NULL,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "tenant_preferences_pkey" PRIMARY KEY ("key")
    )
  `);

  // Indexes
  await client.query(`CREATE INDEX IF NOT EXISTS "alerts_created_at_idx" ON "alerts"("created_at")`);
  await client.query(`CREATE INDEX IF NOT EXISTS "alerts_type_idx" ON "alerts"("type")`);
  await client.query(`CREATE INDEX IF NOT EXISTS "quick_buttons_order_idx" ON "quick_buttons"("order")`);
  await client.query(`CREATE INDEX IF NOT EXISTS "quick_buttons_category_idx" ON "quick_buttons"("category")`);
}
