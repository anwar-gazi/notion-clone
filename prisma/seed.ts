import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: { email: "demo@example.com", name: "Demo User" },
  });
  const board = await prisma.board.create({
    data: {
      name: "Demo Board",
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
    include: { columns: true },
  });
  const todo = board.columns.find(c => c.name === "To Do")!;
  const parent = await prisma.task.create({
    data: {
      title: "Try the Kanban",
      description: "Drag me around ➜ add subtasks ➜ mark done",
      boardId: board.id,
      columnId: todo.id,
      assigneeId: user.id,
    },
  });
  const seeds = ["Create a task", "Add a subtask", "Mark subtask complete"];
  for (const title of seeds) {
    await prisma.task.create({
      data: {
        title,
        boardId: board.id,
        columnId: todo.id,
        parentLinks: { create: { parent: { connect: { id: parent.id } } } },
      },
    });
  }
  console.log("Seeded ✔");
}
main().finally(() => prisma.$disconnect());
