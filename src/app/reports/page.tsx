import { prisma } from "@/lib/prisma";
import { toPlain } from "@/lib/serialize";

function hoursBetween(start?: Date | null, end?: Date | null) {
  if (!start || !end) return 0;
  return Math.max(0, (end.getTime() - start.getTime()) / 36e5);
}

export default async function Reports() {
  const tasksRaw = await prisma.task.findMany({
    include: { assignee: true, subtasks: true, column: true, board: true },
  });

  const tasks = toPlain(tasksRaw);   // 🔑 avoid Decimal warnings


  const rows = tasks.map((t) => {
    // @ts-ignore Decimal → number
    const logged =
      Number(t.logHours) + t.subtasks.reduce((sum, s) => sum + Number(s.logHours), 0);
    const duration = hoursBetween(t.startAt, t.endAt);
    const doneCount = t.subtasks.filter((s) => s.completed).length;
    return {
      id: t.id,
      title: t.title,
      board: t.board.name,
      column: t.column.name,
      assignee: t.assignee?.email ?? "",
      start: t.startAt?.toISOString() ?? "",
      end: t.endAt?.toISOString() ?? "",
      durationHours: duration.toFixed(2),
      loggedHours: logged.toFixed(2),
      subtasks: `${doneCount}/${t.subtasks.length}`,
    };
  });

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Reports</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              {"Title,Board,Column,Assignee,Start,End,Duration (h),Logged (h),Subtasks"
                .split(",")
                .map((h) => (
                  <th key={h} className="py-2 pr-6">
                    {h}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-2 pr-6">{r.title}</td>
                <td className="pr-6">{r.board}</td>
                <td className="pr-6">{r.column}</td>
                <td className="pr-6">{r.assignee}</td>
                <td className="pr-6">{r.start}</td>
                <td className="pr-6">{r.end}</td>
                <td className="pr-6">{r.durationHours}</td>
                <td className="pr-6">{r.loggedHours}</td>
                <td className="pr-6">{r.subtasks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
