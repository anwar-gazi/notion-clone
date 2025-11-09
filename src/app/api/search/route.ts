import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() || "";
  if (!q) return NextResponse.json([]);
  const tasks = await prisma.task.findMany({
    where: { OR: [{ title: { contains: q, mode: "insensitive" } }, { externalId: { contains: q } }] },
    take: 10, select: { id: true, title: true, externalId: true }
  });
  const subs = await prisma.subtask.findMany({
    where: { OR: [{ title: { contains: q, mode: "insensitive" } }, { externalId: { contains: q } }] },
    take: 10, select: { id: true, title: true, externalId: true }
  });
  return NextResponse.json({ tasks, subtasks: subs });
}
