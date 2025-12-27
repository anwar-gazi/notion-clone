// src/app/api/tasks/[id]/import/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export const runtime = "nodejs"; // ensure node runtime for FormData / file parsing


export async function POST(req: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const parent = await prisma.task.findUnique({ where: { id }, select: { id: true, boardId: true, columnId: true } });
  if (!parent) return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });


  // Assumes you already have xlsx in your deps or a util to parse.
  // For simplicity, treat the first column as subtask titles.
  const buf = Buffer.from(await file.arrayBuffer());
  const xlsx = await import("xlsx");
  const wb = xlsx.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  const titles: string[] = rows.flat().filter(Boolean);


  let created = 0;
  for (const title of titles) {
    if (typeof title !== "string" || !title.trim()) continue;
    const child = await prisma.task.create({
      data: {
        title: title.trim(),
        board: { connect: { id: parent.boardId } },
        column: { connect: { id: parent.columnId } },
      },
    });
    await prisma.taskParentLink.create({ data: { parentId: parent.id, childId: child.id } });
    created++;
  }


  return NextResponse.json({ created, skipped: Math.max(0, titles.length - created) });
}
