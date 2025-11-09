import { prisma } from "@/lib/prisma";
import Board from "@/components/Board";
import { auth } from "@/lib/auth";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.email) return <div className="text-center">Please sign in.</div>;

  const email = session.user.email;
  let membership = await prisma.membership.findFirst({
    where: { user: { email } },
    include: { board: true },
  });

  if (!membership) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return <div>Account not found.</div>;
    const created = await prisma.board.create({
      data: {
        name: "My Board",
        ownerId: user.id,
        members: { create: { userId: user.id, role: "OWNER" } },
        columns: { create: [
          { name: "Backlog", position: 0 },
          { name: "To Do", position: 1 },
          { name: "In Progress", position: 2 },
          { name: "Done", position: 3 },
        ]},
      },
    });
    membership = { boardId: created.id } as any;
  }

  const board = await prisma.board.findUnique({
    where: { id: membership.boardId },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: { tasks: { orderBy: { position: "asc" }, include: { assignee: true, subtasks: true } } },
      },
      members: { include: { user: true } },
    },
  });

  return <Board board={board!} />;
}
