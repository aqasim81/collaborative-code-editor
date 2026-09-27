-- CreateTable
CREATE TABLE "RoomPurge" (
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,

    CONSTRAINT "RoomPurge_pkey" PRIMARY KEY ("roomId")
);

-- CreateIndex
CREATE INDEX "RoomPurge_nextAttemptAt_idx" ON "RoomPurge"("nextAttemptAt");
