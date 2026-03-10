-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_alerts_user_id_read_idx" ON "user_alerts"("user_id", "read");
