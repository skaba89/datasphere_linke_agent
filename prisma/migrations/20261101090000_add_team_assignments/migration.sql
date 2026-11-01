-- CreateTable: ClientAssignment (assign Clients to TeamMembers with permission level)
CREATE TABLE "ClientAssignment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'view', -- view | edit | manage
    "assignedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientAssignment_clientId_teamMemberId_key" ON "ClientAssignment"("clientId", "teamMemberId");

-- CreateIndex
CREATE INDEX "ClientAssignment_clientId_idx" ON "ClientAssignment"("clientId");

-- CreateIndex
CREATE INDEX "ClientAssignment_teamMemberId_idx" ON "ClientAssignment"("teamMemberId");

-- AddForeignKey
ALTER TABLE "ClientAssignment" ADD CONSTRAINT "ClientAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: assignedBy references User
ALTER TABLE "ClientAssignment" ADD CONSTRAINT "ClientAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Note: teamMemberId FK to TeamMember added below
ALTER TABLE "ClientAssignment" ADD CONSTRAINT "ClientAssignment_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
