-- CreateTable
CREATE TABLE "TaskClosureLog" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL,
    "reopenedAt" TIMESTAMP(3),
    "reopenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskClosureLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskClosureLog_taskId_idx" ON "TaskClosureLog"("taskId");

-- AddForeignKey
ALTER TABLE "TaskClosureLog" ADD CONSTRAINT "TaskClosureLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
