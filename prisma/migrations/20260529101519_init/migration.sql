-- CreateTable
CREATE TABLE "Poetry" (
    "id" TEXT NOT NULL,
    "sourceId" INTEGER,
    "title" TEXT NOT NULL,
    "titleOriginal" TEXT,
    "author" TEXT NOT NULL,
    "authorOriginal" TEXT,
    "dynasty" TEXT NOT NULL,
    "lines" JSONB NOT NULL,
    "tags" JSONB NOT NULL,
    "themes" JSONB NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "imageKey" TEXT,
    "imageStatus" TEXT NOT NULL DEFAULT 'placeholder',
    "translation" TEXT,
    "pinyin" JSONB,
    "aiExplanation" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Poetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageAsset" (
    "id" TEXT NOT NULL,
    "poetryId" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'placeholder',
    "promptVersion" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "thumbPath" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImageAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPoetry" (
    "date" TEXT NOT NULL,
    "poetryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyPoetry_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "LearningRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "poetryId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "poetryId" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "promptLineIndex" INTEGER,
    "userAnswer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "poetryId" TEXT NOT NULL,
    "mastery" INTEGER NOT NULL DEFAULT 0,
    "reviewStage" INTEGER NOT NULL DEFAULT 0,
    "currentIntervalDays" INTEGER NOT NULL DEFAULT 1,
    "lastReviewedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "consecutiveWrongCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "poetryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Poetry_author_idx" ON "Poetry"("author");

-- CreateIndex
CREATE INDEX "Poetry_imageStatus_idx" ON "Poetry"("imageStatus");

-- CreateIndex
CREATE INDEX "ImageAsset_status_idx" ON "ImageAsset"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ImageAsset_poetryId_style_promptVersion_key" ON "ImageAsset"("poetryId", "style", "promptVersion");

-- CreateIndex
CREATE INDEX "DailyPoetry_poetryId_idx" ON "DailyPoetry"("poetryId");

-- CreateIndex
CREATE INDEX "LearningRecord_userId_createdAt_idx" ON "LearningRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LearningRecord_poetryId_createdAt_idx" ON "LearningRecord"("poetryId", "createdAt");

-- CreateIndex
CREATE INDEX "LearningRecord_userId_poetryId_idx" ON "LearningRecord"("userId", "poetryId");

-- CreateIndex
CREATE INDEX "ChallengeAttempt_userId_createdAt_idx" ON "ChallengeAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ChallengeAttempt_poetryId_createdAt_idx" ON "ChallengeAttempt"("poetryId", "createdAt");

-- CreateIndex
CREATE INDEX "ChallengeAttempt_userId_poetryId_questionType_idx" ON "ChallengeAttempt"("userId", "poetryId", "questionType");

-- CreateIndex
CREATE INDEX "ReviewState_userId_nextReviewAt_idx" ON "ReviewState"("userId", "nextReviewAt");

-- CreateIndex
CREATE INDEX "ReviewState_poetryId_idx" ON "ReviewState"("poetryId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewState_userId_poetryId_key" ON "ReviewState"("userId", "poetryId");

-- CreateIndex
CREATE INDEX "Favorite_userId_createdAt_idx" ON "Favorite"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_poetryId_key" ON "Favorite"("userId", "poetryId");

-- AddForeignKey
ALTER TABLE "ImageAsset" ADD CONSTRAINT "ImageAsset_poetryId_fkey" FOREIGN KEY ("poetryId") REFERENCES "Poetry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPoetry" ADD CONSTRAINT "DailyPoetry_poetryId_fkey" FOREIGN KEY ("poetryId") REFERENCES "Poetry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRecord" ADD CONSTRAINT "LearningRecord_poetryId_fkey" FOREIGN KEY ("poetryId") REFERENCES "Poetry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeAttempt" ADD CONSTRAINT "ChallengeAttempt_poetryId_fkey" FOREIGN KEY ("poetryId") REFERENCES "Poetry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewState" ADD CONSTRAINT "ReviewState_poetryId_fkey" FOREIGN KEY ("poetryId") REFERENCES "Poetry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_poetryId_fkey" FOREIGN KEY ("poetryId") REFERENCES "Poetry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
