import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadXlsx } from "@/lib/excel";
import { genExternalId } from "@/lib/ids";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const form = await req.formData();
  const f = form.get("file");
  if (!f || typeof f === "string") return NextResponse.json({ error: "no file" }, { status: 400 });
  const buf = Buffer.from(await f.arrayBuffer());
  const sheets = loadXlsx(buf, (f as File).name || "import.xlsx");

  // Create subtasks under the specified Task (kanban card). If workbook contains multiple sheets,
  // we still attach rows as subtasks to THIS task (per your requirement: "import subtasks for a task from GUI").
  let created = 0, skipped = 0;

  for (const sh of sheets) {
    for (const row of sh.rows) {
      if (!row.title) { skipped++; continue; }

      // priority normalization
      const pr = (() => {
        const s = (row.priority || "").toUpperCase();
        if (["LOW","L"].includes(s)) return "LOW";
        if (["MEDIUM","MID","M"].includes(s)) return "MEDIUM";
        if (["HIGH","H"].includes(s)) return "HIGH";
        if (["CRITICAL","URGENT","P1"].includes(s)) return "CRITICAL";
        return undefined;
      })();

      // keep given externalId or generate
      const externalId = row.externalId || genExternalId("ST");

      await prisma.subtask.create({
        data: {
          taskId: params.id,
          title: row.title,
          description: row.description,
          externalId,
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
  }

  return NextResponse.json({ created, skipped });
}
