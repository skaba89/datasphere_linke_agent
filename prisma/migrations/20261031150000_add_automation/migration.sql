CREATE TABLE "CommentReply" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postProposalId" TEXT,
    "linkedinPostId" TEXT,
    "commenterName" TEXT NOT NULL,
    "commenterText" TEXT NOT NULL,
    "generatedReply" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "editedReply" TEXT,
    "sentiment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repliedAt" TIMESTAMP(3),
    CONSTRAINT "CommentReply_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CommentReply_userId_idx" ON "CommentReply"("userId");
CREATE INDEX "CommentReply_status_idx" ON "CommentReply"("status");
CREATE INDEX "CommentReply_createdAt_idx" ON "CommentReply"("createdAt");
ALTER TABLE "CommentReply" ADD CONSTRAINT "CommentReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AutomationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AutomationLog_userId_idx" ON "AutomationLog"("userId");
CREATE INDEX "AutomationLog_type_idx" ON "AutomationLog"("type");
CREATE INDEX "AutomationLog_createdAt_idx" ON "AutomationLog"("createdAt");
ALTER TABLE "AutomationLog" ADD CONSTRAINT "AutomationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
