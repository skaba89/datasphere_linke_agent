-- Replay protection must be durable and atomic across application instances.
CREATE TABLE "OAuthConsumedState" (
    "nonceHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OAuthConsumedState_pkey" PRIMARY KEY ("nonceHash")
);
CREATE INDEX "OAuthConsumedState_expiresAt_idx" ON "OAuthConsumedState"("expiresAt");
