import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { genExternalId } from "@/lib/ids";

export async function POST(req: Request) {
  const body = await req.json();
  let { taskId, title, position, externalId, state, status, priority,
        estimatedSec, xp, notes, dependencyExternalIds, description } = body;

  if (!externalId) externalId = genExternalId("ST");

  const st = await prisma.subtask.create({
    data: {
      taskId, title,
      position: position ?? 0,
      externalId, state: state ?? "", status, priority,
      estimatedSec, xp, notes, dependencyExternalIds, description
    }
  });
  return NextResponse.json(st);
}

export async function PATCH(req: Request) {
  const { id, ...data } = await req.json();
  if (typeof data.completed === "boolean") {
    data.closedAt = data.completed ? new Date() : null;
  }
  if (data.externalId === null || data.externalId === "") {
    data.externalId = genExternalId("ST");
  }
  const st = await prisma.subtask.update({ where: { id }, data });
  return NextResponse.json(st);
}
