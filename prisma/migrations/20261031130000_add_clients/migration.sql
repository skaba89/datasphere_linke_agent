-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "linkedinAccountId" TEXT,
    "monthlyGoal" INTEGER NOT NULL DEFAULT 20,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT NOT NULL DEFAULT '#10b981',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Client_userId_idx" ON "Client"("userId");
CREATE INDEX "Client_active_idx" ON "Client"("active");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddColumn to PostProposal
ALTER TABLE "PostProposal" ADD COLUMN "clientId" TEXT;
ALTER TABLE "PostProposal" ADD COLUMN "scheduledFor" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PostProposal_clientId_idx" ON "PostProposal"("clientId");
CREATE INDEX "PostProposal_scheduledFor_idx" ON "PostProposal"("scheduledFor");

-- AddForeignKey
ALTER TABLE "PostProposal" ADD CONSTRAINT "PostProposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
