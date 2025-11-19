import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toTaskDTO } from "@/lib/serialize";

/**
 * create a subtask
 * @param req 
 */
export async function POST(req: Request) {
    const body: { parentTaskId: string, title: string } = await req.json();
    const sub = await prisma.task.create({
        data: {
            parentTaskId: body.parentTaskId,
            title: body.title
        }
    });

    return NextResponse.json(toTaskDTO(sub));
}