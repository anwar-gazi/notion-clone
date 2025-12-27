// src/app/api/tasks/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toTaskDTO } from "@/lib/serialize";


export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      closureLogs: { orderBy: { closedAt: "desc" } },
      parentLinks: true,
      childLinks: {
        include: { child: { include: { closureLogs: { orderBy: { closedAt: "desc" } }, parentLinks: true } } },
      },
    }
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(toTaskDTO(task));
}


export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const now = new Date();
  const task = await prisma.task.update({
    where: { id },
    data: {
      closedAt: now,
      closureLogs: { create: { closedAt: now } },
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
}
