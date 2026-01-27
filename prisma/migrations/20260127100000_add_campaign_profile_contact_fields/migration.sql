-- AddColumn: campaign_profile contact fields
ALTER TABLE "campaign_profile" ADD COLUMN "address" TEXT;
ALTER TABLE "campaign_profile" ADD COLUMN "phone" TEXT;
ALTER TABLE "campaign_profile" ADD COLUMN "email" TEXT;
ALTER TABLE "campaign_profile" ADD COLUMN "hours" TEXT;
ALTER TABLE "campaign_profile" ADD COLUMN "description" TEXT;
