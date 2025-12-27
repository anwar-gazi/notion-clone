-- Add primaryParentId for tasks to mark a preferred parent
ALTER TABLE "Task" ADD COLUMN "primaryParentId" TEXT;

-- Backfill: choose the earliest parent link as the primary
WITH ranked AS (
  SELECT "childId", "parentId",
         ROW_NUMBER() OVER (PARTITION BY "childId" ORDER BY "createdAt" ASC) AS rn
  FROM "TaskParentLink"
)
UPDATE "Task" t
SET "primaryParentId" = r."parentId"
FROM ranked r
WHERE t.id = r."childId" AND r.rn = 1;

ALTER TABLE "Task" ADD CONSTRAINT "Task_primaryParentId_fkey" FOREIGN KEY ("primaryParentId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Task_primaryParentId_idx" ON "Task"("primaryParentId");
