import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  const { id, columnId, position } = await req.json();
  const task = await prisma.task.update({ where: { id }, data: { columnId, position } });
  return NextResponse.json(task);
}
