-- CreateTable
CREATE TABLE "AudioMeta" (
    "id" TEXT NOT NULL,
    "poetryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "durationMs" INTEGER NOT NULL,
    "lineTimings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudioMeta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AudioMeta_poetryId_key" ON "AudioMeta"("poetryId");

-- CreateIndex
CREATE INDEX "AudioMeta_status_idx" ON "AudioMeta"("status");

-- AddForeignKey
ALTER TABLE "AudioMeta" ADD CONSTRAINT "AudioMeta_poetryId_fkey" FOREIGN KEY ("poetryId") REFERENCES "Poetry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
