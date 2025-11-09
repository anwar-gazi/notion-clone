import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { boardId, columnId, title, description, assigneeId, position, startAt, endAt, logHours } = body;
  const task = await prisma.task.create({
    data: {
      title, description, boardId, columnId, assigneeId,
      position: position ?? 0,
      startAt: startAt ? new Date(startAt) : undefined,
      endAt: endAt ? new Date(endAt) : undefined,
      logHours,
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
  const task = await prisma.task.update({ where: { id }, data: { ...data, ...closedAtPatch } });
  return NextResponse.json(task);
}
