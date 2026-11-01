-- Add prospect scoring fields
ALTER TABLE "Prospect" ADD COLUMN "score" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Prospect" ADD COLUMN "scoredAt" TIMESTAMP(3);

-- Index for scoring queries (e.g., "show top scored prospects")
CREATE INDEX IF NOT EXISTS "Prospect_userId_score_idx" ON "Prospect"("userId", "score" DESC);

-- Add prospectId to AgentTask (nullable FK — links a task to a specific prospect)
ALTER TABLE "AgentTask" ADD COLUMN "prospectId" TEXT;

-- Index for querying tasks by prospect
CREATE INDEX IF NOT EXISTS "AgentTask_prospectId_idx" ON "AgentTask"("prospectId");

-- AddForeignKey: AgentTask.prospectId → Prospect.id (SET NULL on delete)
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_prospectId_fkey"
  FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE SET NULL ON UPDATE CASCADE;
