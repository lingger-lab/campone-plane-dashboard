-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('system', 'workflow');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('info', 'warning', 'error', 'success');

-- CreateEnum
CREATE TYPE "QuickButtonCategory" AS ENUM ('video', 'blog', 'primary', 'default');

-- CreateTable
CREATE TABLE "alerts" (
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
);

-- CreateTable
CREATE TABLE "user_alerts" (
    "user_id" TEXT NOT NULL,
    "alert_id" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "user_alerts_pkey" PRIMARY KEY ("user_id","alert_id")
);

-- CreateTable
CREATE TABLE "channel_links" (
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_links_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "kpi_cache" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_cache_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "campaign_profile" (
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_buttons" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "icon" TEXT,
    "category" "QuickButtonCategory" NOT NULL DEFAULT 'default',
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_buttons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_preferences" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_preferences_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "alerts_created_at_idx" ON "alerts"("created_at");

-- CreateIndex
CREATE INDEX "alerts_type_idx" ON "alerts"("type");

-- CreateIndex
CREATE INDEX "quick_buttons_order_idx" ON "quick_buttons"("order");

-- CreateIndex
CREATE INDEX "quick_buttons_category_idx" ON "quick_buttons"("category");

-- AddForeignKey
ALTER TABLE "user_alerts" ADD CONSTRAINT "user_alerts_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
