import { prisma } from "@/lib/prisma";
import Board from "@/components/Board";
import { auth } from "@/lib/auth";
import { toPlain } from "@/lib/serialize";

export default async function Page() {
  const session = await auth();
  // Middleware ensures user is signed in, but auth() is still useful for identity
  const email = session?.user?.email!;
  // Find or create personal board
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
        columns: {
          create: [
            { name: "Backlog", position: 0 },
            { name: "To Do", position: 1 },
            { name: "In Progress", position: 2 },
            { name: "Done", position: 3 },
          ],
        },
      },
    });
    membership = { boardId: created.id } as any;
  }

  const boardRaw = await prisma.board.findUnique({
    where: { id: membership.boardId },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: {
          tasks: {
            orderBy: { position: "asc" },
            include: { assignee: true, subtasks: true },
          },
        },
      },
      members: { include: { user: true } },
    },
  });

  const board = toPlain(boardRaw);   // 🔑 make it serializable

  return <Board board={board!} />;
}
