// src/lib/serialize.ts

import type { Task as DbTask, Priority, TaskClosureLog, TaskParentLink } from "@prisma/client";
import { TaskDTO, BoardDTO, TaskClosureDTO } from "@/types/data";

/**
 * Recursively convert Prisma Decimal/Date/BigInt into JSON-serializable primitives.
 * - Decimal: detect by duck-typing (toNumber/toString or ctor name === 'Decimal')
 * - Date: ISO string
 * - BigInt: Number (or String if you need >2^53)
 */
export function toPlain<T>(data: T): T {
  const isDecimal = (v: any) =>
    v &&
    typeof v === "object" &&
    (typeof v.toNumber === "function" ||
      typeof v.toString === "function" && v.constructor?.name === "Decimal");

  const walk = (v: any): any => {
    if (v === null || v === undefined) return v;

    const t = typeof v;
    if (t === "number" || t === "string" || t === "boolean") return v;
    if (t === "bigint") {
      // If you store huge BigInts, switch to v.toString() instead.
      const n = Number(v);
      return Number.isNaN(n) ? v.toString() : n;
    }

    if (v instanceof Date) return v.toISOString();

    if (isDecimal(v)) {
      // Prefer toNumber if available; fallback to Number(toString())
      try {
        if (typeof v.toNumber === "function") return v.toNumber();
        const n = Number(v.toString());
        return Number.isNaN(n) ? v.toString() : n;
      } catch {
        return v.toString?.() ?? v;
      }
    }

    if (Array.isArray(v)) return v.map(walk);

    if (t === "object") {
      const out: any = {};
      for (const k in v) out[k] = walk(v[k]);
      return out;
    }

    return v;
  };

  return walk(data) as T;
}



// Map a DB task + included subtasks -> API DTO (one level of nesting is enough for current UI)
export function toTaskDTO(
  t: (DbTask & {
    childLinks?: (TaskParentLink & { child: DbTask & { closureLogs?: TaskClosureLog[] } })[];
    parentLinks?: TaskParentLink[];
    subtasks?: DbTask[];
    closureLogs?: TaskClosureLog[];
  }) | null
): TaskDTO | null {
  if (!t) return null;
  const logs: TaskClosureDTO[] = (t.closureLogs || []).map((l) => ({
    id: l.id,
    closedAt: new Date(l.closedAt).toISOString(),
    reopenedAt: l.reopenedAt ? new Date(l.reopenedAt).toISOString() : null,
    reopenReason: l.reopenReason ?? null,
  }));
  const parents = (t.parentLinks || []).map((l) => l.parentId);
  const childTasks: (DbTask & { closureLogs?: TaskClosureLog[] })[] = (t.childLinks || []).map((l) => l.child);
  const subtasks = childTasks.length ? childTasks : (t.subtasks as any as (DbTask & { closureLogs?: TaskClosureLog[] })[]) || [];
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? "",
    columnId: t.columnId ?? "",
    parentTaskIds: parents,
    completed: Boolean(t.closedAt),


    externalId: t.externalId ?? null,
    state: t.state ?? null,
    status: t.status ?? null,
    priority: (t as DbTask).priority ?? null,
    xp: t.xp,
    estimatedSec: t.estimatedSec,
    dependencyExternalIds: t.dependencyExternalIds ?? [],


    startAt: t.startAt ? new Date(t.startAt).toISOString() : null,
    endAt: t.endAt ? new Date(t.endAt).toISOString() : null,
    logHours: t.logHours,
    createdAt: new Date(t.createdAt).toISOString(),
    closedAt: t.closedAt ? new Date(t.closedAt).toISOString() : null,
    closureLogs: logs,


    subtasks: (subtasks || []).map((s) => {
      const subLogs: TaskClosureDTO[] = ((s as any).closureLogs || []).map((l: any) => ({
        id: l.id,
        closedAt: new Date(l.closedAt).toISOString(),
        reopenedAt: l.reopenedAt ? new Date(l.reopenedAt).toISOString() : null,
        reopenReason: l.reopenReason ?? null,
      }));
      return {
        id: s.id,
        title: s.title,
        description: s.description ?? null,
        columnId: s.columnId ?? null,
        parentTaskIds: (s as any).parentLinks ? (s as any).parentLinks.map((l: any) => l.parentId) : [],
        completed: Boolean((s as any).closedAt),


        externalId: s.externalId ?? null,
        state: s.state ?? null,
      status: s.status ?? null,
      priority: (s as DbTask).priority ?? null,
      xp: s.xp,
      estimatedSec: s.estimatedSec,
      dependencyExternalIds: s.dependencyExternalIds ?? [],


        startAt: s.startAt ? new Date(s.startAt).toISOString() : null,
        endAt: s.endAt ? new Date(s.endAt).toISOString() : null,
        logHours: s.logHours,
        createdAt: new Date(s.createdAt).toISOString(),
        closedAt: s.closedAt ? new Date(s.closedAt).toISOString() : null,
        closureLogs: subLogs,


        subtasks: [],
      };
    }),
  };
}


// Optional helper: group tasks into columns for the board if you fetch all top-level tasks.
export function toBoardDTO(tasks: DbTask[]): BoardDTO {
  const buckets = new Map<string, TaskDTO[]>();
  for (const t of tasks) {
    const key = t.columnId || "default";
    if (!buckets.has(key)) buckets.set(key, []);
    const dto = toTaskDTO({ ...t, subtasks: [] })!;
    buckets.get(key)!.push(dto);
  }
  const columns = Array.from(buckets.entries()).map(([id, items]) => ({ id, name: pretty(id), tasks: items }));
  return { columns };
}


function pretty(id: string) {
  if (!id || id === "default") return "To Do";
  return id
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}
