import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { loadXlsx } from "@/lib/excel";
import { genExternalId } from "@/lib/ids";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: tsx scripts/import-excel.ts <file.xlsx> [more.xlsx]");
    process.exit(1);
  }

  // Choose a board and a default column (e.g., "To Do")
  const board = await prisma.board.findFirst({ include: { columns: true } });
  if (!board) throw new Error("No board found; create one via app first.");
  const todo = board.columns.find(c => c.name.toLowerCase().includes("to do")) || board.columns[0];

  for (const file of args) {
    const buf = fs.readFileSync(file);
    const sheets = loadXlsx(buf, path.basename(file));

    for (const sh of sheets) {
      // Create main task
      const task = await prisma.task.create({
        data: {
          title: sh.mainTaskTitle,
          boardId: board.id,
          columnId: todo.id,
          externalId: genExternalId("T")
        }
      });

      // Rows -> subtasks
      let created = 0, skipped = 0;
      for (const row of sh.rows) {
        if (!row.title) { skipped++; continue; }

        const pr = (() => {
          const s = (row.priority || "").toUpperCase();
          if (["LOW","L"].includes(s)) return "LOW";
          if (["MEDIUM","MID","M"].includes(s)) return "MEDIUM";
          if (["HIGH","H"].includes(s)) return "HIGH";
          if (["CRITICAL","URGENT","P1"].includes(s)) return "CRITICAL";
          return undefined;
        })();

        // ensure unique externalId
        let externalId = row.externalId || genExternalId("ST");
        if (externalId) {
          const exists = await prisma.subtask.findUnique({ where: { externalId } });
          if (exists) externalId = genExternalId("ST");
        }

        await prisma.subtask.create({
          data: {
            taskId: task.id,
            title: row.title,
            description: row.description,
            externalId: row.externalId || genExternalId("ST"),
            state: row.state ?? "",
            status: row.status,
            priority: pr as any,
            estimatedSec: row.estimatedSec,
            xp: row.xp,
            notes: row.notes,
            dependencyExternalIds: row.dependencyExternalIds ?? []
          }
        });
        created++;
      }
      console.log(`Imported file=${path.basename(file)} sheet="${sh.mainTaskTitle}" -> task=${task.title} subtasks=${created} skipped=${skipped}`);
    }
  }
}

main().finally(()=>prisma.$disconnect());
