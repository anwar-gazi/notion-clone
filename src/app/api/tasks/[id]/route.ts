// src/app/api/tasks/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toTaskDTO } from "@/lib/serialize";


export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const task = await prisma.task.findUnique({ where: { id }, include: { subtasks: true } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(toTaskDTO(task));
}


export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}