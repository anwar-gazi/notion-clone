import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { taskId, title, position } = await req.json();
  const st = await prisma.subtask.create({ data: { taskId, title, position: position ?? 0 } });
  return NextResponse.json(st);
}
export async function PATCH(req: Request) {
  const { id, ...data } = await req.json();
  if (typeof data.completed === "boolean") data.closedAt = data.completed ? new Date() : null;
  const st = await prisma.subtask.update({ where: { id }, data });
  return NextResponse.json(st);
}
