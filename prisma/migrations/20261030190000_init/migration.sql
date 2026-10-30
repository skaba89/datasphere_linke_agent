-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "trialEndsAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeSubscriptionStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkedInAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "pictureUrl" TEXT,
    "headline" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkedInAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartPosterSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "maxPostsPerDay" INTEGER NOT NULL DEFAULT 3,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "scheduleHourStart" INTEGER NOT NULL DEFAULT 7,
    "scheduleHourEnd" INTEGER NOT NULL DEFAULT 8,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "autoApprove" BOOLEAN NOT NULL DEFAULT false,
    "topics" TEXT NOT NULL DEFAULT 'IA, tech, marketing digital, entrepreneurship',
    "tone" TEXT NOT NULL DEFAULT 'professionnel mais accessible',
    "language" TEXT NOT NULL DEFAULT 'fr',
    "targetAudience" TEXT NOT NULL DEFAULT 'entrepreneurs, CTO, managers tech',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmartPosterSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostProposal" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "hashtags" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "qualityScore" DOUBLE PRECISION NOT NULL,
    "optimalTime" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "engagementEst" TEXT NOT NULL,
    "linkedinPostId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "date" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngagementMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_plan_idx" ON "User"("plan");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "LinkedInAccount_userId_idx" ON "LinkedInAccount"("userId");

-- CreateIndex
CREATE INDEX "LinkedInAccount_status_idx" ON "LinkedInAccount"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LinkedInAccount_userId_organizationId_key" ON "LinkedInAccount"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "SmartPosterSettings_userId_key" ON "SmartPosterSettings"("userId");

-- CreateIndex
CREATE INDEX "PostProposal_userId_idx" ON "PostProposal"("userId");

-- CreateIndex
CREATE INDEX "PostProposal_status_idx" ON "PostProposal"("status");

-- CreateIndex
CREATE INDEX "PostProposal_createdAt_idx" ON "PostProposal"("createdAt");

-- CreateIndex
CREATE INDEX "EngagementMetric_userId_idx" ON "EngagementMetric"("userId");

-- CreateIndex
CREATE INDEX "EngagementMetric_date_idx" ON "EngagementMetric"("date");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkedInAccount" ADD CONSTRAINT "LinkedInAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartPosterSettings" ADD CONSTRAINT "SmartPosterSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostProposal" ADD CONSTRAINT "PostProposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

