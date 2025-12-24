// src/components/Board.tsx
"use client";

import Column from "./Column";
import { BoardDTO, ColumnDTO } from "@/types/data";
import { BoardProvider } from "./BoardContext";
import { useSession } from "next-auth/react";

export default function Board({ board }: { board: BoardDTO }) {
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
