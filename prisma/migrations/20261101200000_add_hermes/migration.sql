-- CreateTable: HermesConfig (per-user config for Hermes automation agent)
CREATE TABLE "HermesConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "scheduleCron" TEXT NOT NULL DEFAULT '0 9 * * *',
    "maxTasksPerRun" INTEGER NOT NULL DEFAULT 5,
    "workflowSteps" JSONB NOT NULL,
    "notifyOnDone" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnError" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "lastRunStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HermesConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique userId (1:1 with User)
CREATE UNIQUE INDEX "HermesConfig_userId_key" ON "HermesConfig"("userId");

-- CreateIndex
CREATE INDEX "HermesConfig_enabled_idx" ON "HermesConfig"("enabled");

-- AddForeignKey
ALTER TABLE "HermesConfig" ADD CONSTRAINT "HermesConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: AgentRun (one row per Hermes execution — append-only history)
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'cron',
    "status" TEXT NOT NULL DEFAULT 'running',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "stepsTotal" INTEGER NOT NULL DEFAULT 0,
    "stepsSuccess" INTEGER NOT NULL DEFAULT 0,
    "stepsFailed" INTEGER NOT NULL DEFAULT 0,
    "stepsJson" JSONB NOT NULL,
    "summary" TEXT,
    "totalsJson" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentRun_userId_createdAt_idx" ON "AgentRun"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AgentRun_status_idx" ON "AgentRun"("status");

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
