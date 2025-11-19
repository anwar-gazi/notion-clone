// src/components/Board.tsx
"use client";

import Column from "./Column";
import { BoardDTO, ColumnDTO } from "@/types/data";
import { BoardProvider } from "./BoardContext";

export default function Board({ board }: { board: BoardDTO }) {
  // function moveTask(taskId: string, fromColId: string, toColId: string) {
  // if (fromColId === toColId) return;

  // setColumns((prev: any[]) => {
  //   const next = prev.map((c) => ({ ...c, tasks: [...(c.tasks ?? [])] }));
  //   const from = next.find((c) => c.id === fromColId);
  //   const to = next.find((c) => c.id === toColId);
  //   if (!from || !to) return prev;

  //   const idx = from.tasks.findIndex((t: any) => t.id === taskId);
  //   if (idx === -1) return prev;

  //   const [task] = from.tasks.splice(idx, 1);
  //   to.tasks.push({ ...task, columnId: toColId });

  //   // Persist
  //   fetch("/api/tasks", {
  //     method: "PATCH",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ id: taskId, columnId: toColId }),
  //   }).catch(() => { });

  //   return next;
  // });
  // }

  return (
    <BoardProvider initial={board}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.values(board.columns).map((col: ColumnDTO) => (
          <Column key={col.id} column={col} />
        ))}
      </div>
    </BoardProvider>
  );
}
