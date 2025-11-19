-- 1) Move Subtask rows into Task, linking to the parent via parentTaskId
-- Assumes old Subtask schema has: id, taskId, title, completed, createdAt, updatedAt
-- If Subtask has description, include it (COALESCE lines already handle NULLs gracefully).

BEGIN;

-- Insert only those Subtask ids that don't already exist in Task
INSERT INTO "Task" (
  "id",
  "title",
  "description",
  "position",
  "externalId",
  "state",
  "status",
  "priority",
  "estimatedSec",
  "xp",
  "notes",
  "dependencyExternalIds",
  "boardId",
  "columnId",
  "assigneeId",
  "parentTaskId",
  "createdAt",
  "updatedAt",
  "closedAt",
  "startAt",
  "endAt",
  "logHours"
)
SELECT
  s."id",
  s."title",
  /* if Subtask has its own description column, use it; otherwise NULL */
  COALESCE(s."description", NULL),
  /* put subtasks right after parent by adding a tiny offset ordered by createdAt */
  (COALESCE(p."position", 0)::float)
    + (ROW_NUMBER() OVER (PARTITION BY s."taskId" ORDER BY s."createdAt" NULLS LAST) * 0.001)::float,
  NULL,                    -- externalId
  ''   ,                   -- state
  NULL,                    -- status (set below for completed)
  NULL,                    -- priority
  NULL,                    -- estimatedSec
  0    ,                   -- xp
  NULL,                    -- notes
  '{}'::text[],            -- dependencyExternalIds
  p."boardId",
  p."columnId",
  NULL,                    -- assigneeId
  p."id"                   -- parentTaskId
  ,
  COALESCE(s."createdAt", NOW()),
  COALESCE(s."updatedAt", NOW()),
  NULL,                    -- closedAt (set below for completed)
  NULL,                    -- startAt
  NULL,                    -- endAt
  0                        -- logHours
FROM "Subtask" s
JOIN "Task" p ON p."id" = s."taskId"
LEFT JOIN "Task" t ON t."id" = s."id"
WHERE t."id" IS NULL;

-- 2) If a subtask was completed, reflect that. Adjust to your semantics.
UPDATE "Task" t
SET
  "closedAt" = COALESCE(t."closedAt", NOW()),
  "status"   = COALESCE(t."status", 'DONE')
FROM "Subtask" s
WHERE t."id" = s."id"
  AND s."completed" = TRUE;

-- 3) (Optional) If you want unfinished subtasks explicitly marked:
-- UPDATE "Task" t
-- SET "status" = COALESCE(t."status", 'TODO')
-- FROM "Subtask" s
-- WHERE t."id" = s."id" AND s."completed" = FALSE;

COMMIT;
