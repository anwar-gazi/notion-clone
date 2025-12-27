import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { boardId: string } }) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const member = await prisma.membership.findFirst({
    where: { boardId: params.boardId, user: { email: session.user.email } },
  });
  if (!member) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const board = await prisma.board.findUnique({
    where: { id: params.boardId },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: {
          tasks: {
            orderBy: { position: "asc" },
            include: {
              assignee: true,
              parentLinks: true,
              childLinks: { include: { child: { include: { parentLinks: true } } } },
            },
          },
        },
      },
      members: { include: { user: true } },
    },
  });

  return NextResponse.json(board);
}
