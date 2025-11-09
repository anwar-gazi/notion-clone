import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
export const runtime = "nodejs";
function toCSV(rows: any[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0] ?? {});
  const escape = (v: any) => { if (v == null) return ""; const s = String(v).replaceAll('"','""'); return /[",\n]/.test(s) ? `"${s}"` : s; };
  return [headers.join(","), ...rows.map(r => headers.map(h => escape(r[h])).join(","))].join("\n");
}
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const task = await prisma.task.findUnique({ where: { id: params.id }, include: { subtasks: true, assignee: true, column: true, board: true } });
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
  const query = new URL(req.url).searchParams;
  const format = (query.get("format") || "csv").toLowerCase();
  const taskRow = {
    id: task.id, title: task.title, description: task.description ?? "", board: task.board.name, column: task.column.name,
    assignee: task.assignee?.email ?? "", createdAt: task.createdAt.toISOString(), closedAt: task.closedAt?.toISOString() ?? "",
    startAt: task.startAt?.toISOString() ?? "", endAt: task.endAt?.toISOString() ?? "", logHours: task.logHours.toString(),
  };
  const subRows = task.subtasks.map(s => ({
    id: s.id, taskId: task.id, title: s.title, completed: s.completed,
    createdAt: s.createdAt.toISOString(), closedAt: s.closedAt?.toISOString() ?? "",
    startAt: s.startAt?.toISOString() ?? "", endAt: s.endAt?.toISOString() ?? "", logHours: s.logHours.toString(),
  }));
  if (format === "xlsx" || format === "excel") {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([taskRow]), "Task");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(subRows), "Subtasks");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=task-${task.id}.xlsx` } });
  }
  const csv = `Task\n${toCSV([taskRow])}\n\nSubtasks\n${subRows.length ? toCSV(subRows) : "id,taskId,title,completed,createdAt,closedAt,startAt,endAt,logHours"}`;
  return new NextResponse(csv, { headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename=task-${task.id}.csv` } });
}
