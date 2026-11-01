-- CreateTable: RevenueAttribution
-- Tracks revenue linked to a client or a prospect (won deal)
CREATE TABLE "RevenueAttribution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "prospectId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "source" TEXT NOT NULL DEFAULT 'manual', -- manual | stripe | import
    "description" TEXT,
    "attributedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RevenueAttribution_userId_idx" ON "RevenueAttribution"("userId");

-- CreateIndex
CREATE INDEX "RevenueAttribution_clientId_idx" ON "RevenueAttribution"("clientId");

-- CreateIndex
CREATE INDEX "RevenueAttribution_prospectId_idx" ON "RevenueAttribution"("prospectId");

-- CreateIndex
CREATE INDEX "RevenueAttribution_attributedAt_idx" ON "RevenueAttribution"("attributedAt");

-- AddForeignKey
ALTER TABLE "RevenueAttribution" ADD CONSTRAINT "RevenueAttribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueAttribution" ADD CONSTRAINT "RevenueAttribution_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueAttribution" ADD CONSTRAINT "RevenueAttribution_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE SET NULL ON UPDATE CASCADE;
