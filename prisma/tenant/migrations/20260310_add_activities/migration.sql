-- CreateTable
CREATE TABLE IF NOT EXISTS "activities" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "user_id" TEXT,
  "user_name" TEXT,
  "action" TEXT NOT NULL,
  "module" TEXT,
  "target" TEXT,
  "detail" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "activities_created_at_idx" ON "activities"("created_at");
