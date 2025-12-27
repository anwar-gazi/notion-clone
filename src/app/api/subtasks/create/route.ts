import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toTaskDTO } from "@/lib/serialize";

/**
 * create a subtask
 * @param req 
 */
export async function POST(req: Request) {
    try {
        const body: { parentTaskId: string, title: string } = await req.json();
        if (!body.parentTaskId || !body.title) {
            return NextResponse.json({ error: "parentTaskId and title required" }, { status: 400 });
        }

        const parent = await prisma.task.findUnique({ where: { id: body.parentTaskId } });
        if (!parent) {
            return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
        }

        const sub = await prisma.task.create({
            data: {
                title: body.title,
                board: { connect: { id: parent.boardId } },
                column: { connect: { id: parent.columnId } },
                parentLinks: { create: { parent: { connect: { id: parent.id } } } },
            },
            include: {
                parentLinks: true,
                closureLogs: { orderBy: { closedAt: "desc" } },
            },
        });

        return NextResponse.json(toTaskDTO(sub));
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Create failed" }, { status: 400 });
    }
}
