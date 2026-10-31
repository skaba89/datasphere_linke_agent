-- CreateTable: Prospect
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "linkedinUrl" TEXT,
    "email" TEXT,
    "company" TEXT,
    "title" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "tags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Prospect_userId_idx" ON "Prospect"("userId");
CREATE INDEX "Prospect_stage_idx" ON "Prospect"("stage");
CREATE INDEX "Prospect_company_idx" ON "Prospect"("company");
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: CrmSequence
CREATE TABLE "CrmSequence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "steps" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CrmSequence_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CrmSequence_userId_idx" ON "CrmSequence"("userId");
CREATE INDEX "CrmSequence_active_idx" ON "CrmSequence"("active");
ALTER TABLE "CrmSequence" ADD CONSTRAINT "CrmSequence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: CrmMessage
CREATE TABLE "CrmMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "sequenceId" TEXT,
    "stepIndex" INTEGER,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sentAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CrmMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CrmMessage_userId_idx" ON "CrmMessage"("userId");
CREATE INDEX "CrmMessage_prospectId_idx" ON "CrmMessage"("prospectId");
CREATE INDEX "CrmMessage_status_idx" ON "CrmMessage"("status");
ALTER TABLE "CrmMessage" ADD CONSTRAINT "CrmMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmMessage" ADD CONSTRAINT "CrmMessage_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmMessage" ADD CONSTRAINT "CrmMessage_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "CrmSequence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
