-- Composite indexes for cursor-based pagination
-- These indexes optimize the pattern:
--   WHERE userId = ? AND (createdAt < ? OR (createdAt = ? AND id < ?))
--   ORDER BY createdAt DESC, id DESC
--   LIMIT N

-- PostProposal: pagination by (createdAt DESC, id DESC) filtered by userId
CREATE INDEX IF NOT EXISTS "PostProposal_userId_createdAt_id_idx"
  ON "PostProposal"("userId", "createdAt" DESC, "id" DESC);

-- Prospect: pagination by (createdAt DESC, id DESC) filtered by userId
CREATE INDEX IF NOT EXISTS "Prospect_userId_createdAt_id_idx"
  ON "Prospect"("userId", "createdAt" DESC, "id" DESC);

-- AuditLog: pagination by (createdAt DESC, id DESC) filtered by actorId
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_createdAt_id_idx"
  ON "AuditLog"("actorId", "createdAt" DESC, "id" DESC);

-- AuditLog: pagination by (createdAt DESC, id DESC) filtered by action
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_id_idx"
  ON "AuditLog"("action", "createdAt" DESC, "id" DESC);

-- RevenueAttribution: aggregation by userId + attributedAt (already has userId index,
-- add composite for period queries)
CREATE INDEX IF NOT EXISTS "RevenueAttribution_userId_attributedAt_idx"
  ON "RevenueAttribution"("userId", "attributedAt" DESC);

-- EngagementMetric: queries by userId + date range
CREATE INDEX IF NOT EXISTS "EngagementMetric_userId_date_idx"
  ON "EngagementMetric"("userId", "date" DESC);

-- CrmMessage: list by userId ordered by createdAt DESC
CREATE INDEX IF NOT EXISTS "CrmMessage_userId_createdAt_idx"
  ON "CrmMessage"("userId", "createdAt" DESC);

-- CommentReply: list by userId + status (pending)
CREATE INDEX IF NOT EXISTS "CommentReply_userId_status_idx"
  ON "CommentReply"("userId", "status");

-- AgentTask: list by userId + status (todo first)
CREATE INDEX IF NOT EXISTS "AgentTask_userId_status_priority_idx"
  ON "AgentTask"("userId", "status", "priority" DESC);
