// src/app/api/tasks/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toTaskDTO } from "@/lib/serialize";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parent = url.searchParams.get("parent"); // "null" for top-level
  const where = parent === "null" ? { parentTaskId: null } : {};


  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ createdAt: "asc" }],
    include: { subtasks: true },
  });


  return NextResponse.json(tasks.map((t) => toTaskDTO(t)));
}

// Create top-level task or subtask (if parentTaskId provided)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.title) return NextResponse.json({ error: "title required" }, { status: 400 });
    if (!body?.columnId) return NextResponse.json({ error: "columnId required" }, { status: 400 });
    if (!body?.boardId) return NextResponse.json({ error: "boardId required" }, { status: 400 });

    const task = await prisma.task.create({
      data: {
        title: String(body.title),
        description: body.description ?? null,
        column: { connect: { id: String(body.columnId) } },
        board: { connect: { id: String(body.boardId) } },
        ...(body.parentTaskId
          ? { parent: { connect: { id: String(body.parentTaskId) } } }
          : {}),

        externalId: body.externalId ?? null,
        state: body.state ?? "",
        status: body.status ?? null,
        priority: body.priority ?? null,
        xp: typeof body.xp === "number" ? body.xp : 0,
        estimatedSec: typeof body.estimatedSec === "number" ? body.estimatedSec : 0,
        notes: body.notes ?? null,
        dependencyExternalIds: Array.isArray(body.dependencyExternalIds)
          ? body.dependencyExternalIds
          : [],
        startAt: body.startAt ? new Date(body.startAt) : null,
        endAt: body.endAt ? new Date(body.endAt) : null,
        logHours: typeof body.logHours === "number" ? body.logHours : 0,
        closedAt: body.closedAt ? new Date(body.closedAt) : null,
      },
      include: { subtasks: true },
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
      "parentTaskId",
      "externalId",
      "state",
      "status",
      "priority",
      "xp",
      "estimatedSec",
      "notes",
      "dependencyExternalIds",
      "logHours",
    ];
    for (const k of pass) if (k in body) data[k] = body[k];

    if ("startAt" in body) data.startAt = body.startAt ? new Date(body.startAt) : null;
    if ("endAt" in body) data.endAt = body.endAt ? new Date(body.endAt) : null;
    if ("closedAt" in body) data.closedAt = body.closedAt ? new Date(body.closedAt) : null;
    
    if (body.completed) data.closedAt = new Date();


    const updated = await prisma.task.update({ where: { id: body.id }, data, include: { subtasks: true } });
    return NextResponse.json(toTaskDTO(updated));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Update failed" }, { status: 400 });
  }
}
