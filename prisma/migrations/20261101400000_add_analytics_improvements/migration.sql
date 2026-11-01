-- ============================================================
-- Analytics improvements migration
--
-- 1. Per-post engagement columns on PostProposal
--    (fixes Bug #9: no per-post metrics)
-- 2. wonAt/lostAt timestamps on Prospect
--    (fixes conversion tracking)
-- 3. dataSource field on EngagementMetric
--    (fixes Bug #7: silent zeros for unavailable metrics)
-- ============================================================

-- 1. PostProposal: per-post real engagement metrics
ALTER TABLE "PostProposal" ADD COLUMN "likes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PostProposal" ADD COLUMN "comments_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PostProposal" ADD COLUMN "shares" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PostProposal" ADD COLUMN "views" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PostProposal" ADD COLUMN "clicks" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PostProposal" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- Index for finding posts that need syncing (published, has linkedinPostId, not synced recently)
CREATE INDEX IF NOT EXISTS "PostProposal_sync_idx"
  ON "PostProposal"("status", "linkedinPostId", "lastSyncedAt");

-- 2. Prospect: conversion timestamps
ALTER TABLE "Prospect" ADD COLUMN "wonAt" TIMESTAMP(3);
ALTER TABLE "Prospect" ADD COLUMN "lostAt" TIMESTAMP(3);

-- 3. EngagementMetric: data source tracking
-- 'actual' = real data from LinkedIn API
-- 'estimated' = computed from proxies (e.g., estViews = (likes+comments)*50)
-- 'unavailable' = LinkedIn doesn't provide this metric
ALTER TABLE "EngagementMetric" ADD COLUMN "dataSource" TEXT NOT NULL DEFAULT 'actual';
