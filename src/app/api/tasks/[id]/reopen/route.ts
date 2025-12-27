import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toTaskDTO } from "@/lib/serialize";

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    const { id } = ctx.params;
    const body = await req.json();
    const reason = body?.reason;
    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json({ error: "Reopen reason is required" }, { status: 400 });
    }

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Some IDEs may not pick up generated delegates; cast for safety
    const closureLog = (prisma as any).taskClosureLog;

    // Update latest closure log
    const log = await closureLog.findFirst({
      where: { taskId: id, reopenedAt: null },
      orderBy: { closedAt: "desc" },
    });
    if (log) {
      await closureLog.update({
        where: { id: log.id },
        data: { reopenedAt: new Date(), reopenReason: reason },
      });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: { closedAt: null },
      include: {
        closureLogs: { orderBy: { closedAt: "desc" } },
        subtasks: { include: { closureLogs: { orderBy: { closedAt: "desc" } } } },
      },
    });

    return NextResponse.json(toTaskDTO(updated));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Reopen failed" }, { status: 400 });
  }
}
