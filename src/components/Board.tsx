// src/components/Board.tsx
"use client";

import { useState } from "react";
import Column from "./Column";
import { BoardDTO, ColumnDTO } from "@/types/data";
import { BoardProvider } from "./BoardContext";
import TaskPane from "./TaskPane";

export default function Board({ board }: { board: BoardDTO }) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  return (
    <BoardProvider initial={board}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.values(board.columns).map((col: ColumnDTO) => (
          <Column key={col.id} column={col} onOpenTask={setActiveTaskId} />
        ))}
      </div>
      <TaskPane taskId={activeTaskId} onClose={() => setActiveTaskId(null)} />
    </BoardProvider>
  );
}
