import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { genExternalId } from "@/lib/ids";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();

  // accept new metadata fields
  let {
    boardId, columnId, title, description, assigneeId, position,
    startAt, endAt, logHours,
    externalId, state, status, priority, estimatedSec, xp, notes, dependencyExternalIds
  } = body;

  if (!externalId) externalId = genExternalId("T");

  const task = await prisma.task.create({
    data: {
      title, description, boardId, columnId, assigneeId,
      position: position ?? 0,
      startAt: startAt ? new Date(startAt) : undefined,
      endAt: endAt ? new Date(endAt) : undefined,
      logHours,
      externalId, state: state ?? "", status, priority,
      estimatedSec, xp, notes,
      dependencyExternalIds
    },
  });
  return NextResponse.json(task);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, ...data } = body as any;

  const closedAtPatch: any = {};
  if (data.columnId) {
    const col = await prisma.column.findUnique({ where: { id: data.columnId } });
    if (col?.name.toLowerCase() === "done") closedAtPatch.closedAt = new Date();
    else closedAtPatch.closedAt = null;
  }

  if (data.externalId === null || data.externalId === "") {
    data.externalId = genExternalId("T");
  }

  const task = await prisma.task.update({ where: { id }, data: { ...data, ...closedAtPatch } });
  return NextResponse.json(task);
}
