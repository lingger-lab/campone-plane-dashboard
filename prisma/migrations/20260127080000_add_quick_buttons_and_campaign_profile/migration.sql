-- CreateEnum
CREATE TYPE "QuickButtonCategory" AS ENUM ('video', 'blog', 'primary', 'default');

-- CreateTable
CREATE TABLE "campaign_profile" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "candidateName" TEXT NOT NULL DEFAULT '후보자명',
    "candidateTitle" TEXT NOT NULL DEFAULT 'OO시장 후보',
    "orgName" TEXT NOT NULL DEFAULT '선거대책본부',
    "photoUrl" TEXT,
    "careers" JSONB NOT NULL DEFAULT '[]',
    "slogans" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_buttons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quick_buttons_order_idx" ON "quick_buttons"("order");

-- CreateIndex
CREATE INDEX "quick_buttons_category_idx" ON "quick_buttons"("category");
