// src/app/api/tasks/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toTaskDTO } from "@/lib/serialize";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parent = url.searchParams.get("parent"); // "null" for top-level
  const where =
    parent === "null"
      ? { parentLinks: { none: {} } }
      : parent
      ? { parentLinks: { some: { parentId: parent } } }
      : {};


  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ createdAt: "asc" }],
    include: {
      closureLogs: { orderBy: { closedAt: "desc" } },
      parentLinks: true,
      childLinks: {
        include: { child: { include: { closureLogs: { orderBy: { closedAt: "desc" } }, parentLinks: true } } },
      },
    },
  });


  return NextResponse.json(tasks.map((t) => toTaskDTO(t)));
}

// Create top-level task or subtask (if parentTaskIds provided)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.title) return NextResponse.json({ error: "title required" }, { status: 400 });
    if (!body?.columnId) return NextResponse.json({ error: "columnId required" }, { status: 400 });
    if (!body?.boardId) return NextResponse.json({ error: "boardId required" }, { status: 400 });
    const parentIds: string[] = Array.from(new Set(Array.isArray(body.parentTaskIds) ? body.parentTaskIds.filter(Boolean) : []));
    const primaryParentId: string | null = body.primaryParentId ? String(body.primaryParentId) : null;
    if (primaryParentId && !parentIds.includes(primaryParentId)) parentIds.push(primaryParentId);

    const task = await prisma.task.create({
      data: {
        title: String(body.title),
        description: body.description ?? null,
        column: { connect: { id: String(body.columnId) } },
        board: { connect: { id: String(body.boardId) } },
        ...(parentIds.length
          ? {
              parentLinks: {
                create: parentIds.map((pid) => ({ parent: { connect: { id: String(pid) } } })),
              },
            }
          : {}),
        ...(primaryParentId ? { primaryParent: { connect: { id: primaryParentId } } } : {}),

        externalId: body.externalId ?? null,
        state: body.state ?? "",
        status: body.status ?? null,
        priority: body.priority ?? null,
        xp: typeof body.xp === "number" ? body.xp : 0,
        estimatedSec: typeof body.estimatedSec === "number" ? body.estimatedSec : 0,
        dependencyExternalIds: Array.isArray(body.dependencyExternalIds)
          ? body.dependencyExternalIds
          : [],
        startAt: body.startAt ? new Date(body.startAt) : null,
        endAt: body.endAt ? new Date(body.endAt) : null,
        logHours: typeof body.logHours === "number" ? body.logHours : 0,
        closedAt: body.closedAt ? new Date(body.closedAt) : null,
      },
      include: {
        closureLogs: { orderBy: { closedAt: "desc" } },
        parentLinks: true,
        childLinks: {
          include: { child: { include: { closureLogs: { orderBy: { closedAt: "desc" } }, parentLinks: true } } },
        },
      },
    });
    return NextResponse.json(toTaskDTO(task));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Create failed" }, { status: 400 });
  }
}


// Update any task (including subtasks)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    console.log(body);
    if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });


    const data: any = {};
    const pass = [
      "title",
      "description",
      "columnId",
      "externalId",
      "state",
      "status",
      "priority",
      "xp",
      "estimatedSec",
      "dependencyExternalIds",
      "logHours",
    ];
    for (const k of pass) if (k in body) data[k] = body[k];

    if ("startAt" in body) data.startAt = body.startAt ? new Date(body.startAt) : null;
    if ("endAt" in body) data.endAt = body.endAt ? new Date(body.endAt) : null;
    if ("closedAt" in body) data.closedAt = body.closedAt ? new Date(body.closedAt) : null;
    
    if (body.completed) data.closedAt = new Date();


    const parentIds: string[] | undefined = Array.isArray(body.parentTaskIds)
      ? Array.from(new Set(body.parentTaskIds.filter(Boolean)))
      : undefined;
    const primaryParentId = "primaryParentId" in body ? (body.primaryParentId ? String(body.primaryParentId) : null) : undefined;

    if (parentIds) {
      const existing = await prisma.taskParentLink.findMany({ where: { childId: body.id } });
      const existingIds = existing.map((l) => l.parentId);
      const toAdd = parentIds.filter((pid) => !existingIds.includes(pid));
      const toRemove = existingIds.filter((pid) => !parentIds.includes(pid));
      await prisma.$transaction([
        prisma.taskParentLink.deleteMany({ where: { childId: body.id, parentId: { in: toRemove } } }),
        prisma.taskParentLink.createMany({
          data: toAdd.map((pid) => ({ parentId: pid, childId: body.id })),
          skipDuplicates: true,
        }),
      ]);
    }
    if (primaryParentId !== undefined) {
      // ensure link exists
      if (primaryParentId && !(parentIds || []).includes(primaryParentId)) {
        await prisma.taskParentLink.create({
          data: { parentId: primaryParentId, childId: body.id },
          // skipDuplicates not available on single create
        }).catch(() => {});
      }
      data.primaryParentId = primaryParentId;
    }

    const updated = await prisma.task.update({
      where: { id: body.id },
      data,
      include: {
        closureLogs: { orderBy: { closedAt: "desc" } },
        parentLinks: true,
        childLinks: {
          include: { child: { include: { closureLogs: { orderBy: { closedAt: "desc" } }, parentLinks: true } } },
        },
      }
    });
    return NextResponse.json(toTaskDTO(updated));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Update failed" }, { status: 400 });
  }
}
