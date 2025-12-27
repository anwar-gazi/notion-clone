-- Migrate single-parent Task to multi-parent via explicit join table

-- New join table
CREATE TABLE "TaskParentLink" (
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskParentLink_pkey" PRIMARY KEY ("parentId","childId")
);

-- Copy existing parent relationships into the new table
INSERT INTO "TaskParentLink" ("parentId", "childId")
SELECT "parentTaskId", "id" FROM "Task" WHERE "parentTaskId" IS NOT NULL;

-- Add FKs + index after data copy to avoid ordering issues on some engines
ALTER TABLE "TaskParentLink" ADD CONSTRAINT "TaskParentLink_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskParentLink" ADD CONSTRAINT "TaskParentLink_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "TaskParentLink_childId_idx" ON "TaskParentLink"("childId");

-- Drop legacy single-parent column
ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_parentTaskId_fkey";
DROP INDEX IF EXISTS "Task_parentTaskId_idx";
ALTER TABLE "Task" DROP COLUMN IF EXISTS "parentTaskId";
