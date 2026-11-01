-- Add publish error tracking fields to PostProposal
-- errorMessage: stores the last error message when publish fails
-- lastPublishAttemptAt: timestamp of the last publish attempt
ALTER TABLE "PostProposal" ADD COLUMN "errorMessage" TEXT;
ALTER TABLE "PostProposal" ADD COLUMN "lastPublishAttemptAt" TIMESTAMP(3);

-- Index for the stuck-publishing recovery cron
-- (find proposals with status='publishing' and updatedAt < threshold)
CREATE INDEX IF NOT EXISTS "PostProposal_status_updatedAt_idx"
  ON "PostProposal"("status", "updatedAt");
