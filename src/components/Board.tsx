// src/components/Board.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Column from "./Column";
import { BoardDTO, ColumnDTO } from "@/types/data";
import { BoardProvider } from "./BoardContext";
import TaskPane from "./TaskPane";

export default function Board({ board }: { board: BoardDTO }) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Restore from URL on load (/task/:id)
  useEffect(() => {
    if (!pathname) return;
    const parts = pathname.split("/").filter(Boolean);
    const taskIdx = parts.indexOf("task");
    if (taskIdx !== -1 && parts[taskIdx + 1]) {
      const id = parts[taskIdx + 1];
      if (board.tasks[id]) {
        setActiveTaskId(id);
      }
    }
  }, [pathname, board.tasks]);

  // Sync URL with active task
  useEffect(() => {
    if (!router || !pathname) return;
    if (activeTaskId) {
      router.replace(`/task/${activeTaskId}`, { scroll: false });
    } else {
      router.replace(pathname.split("/task")[0] || "/", { scroll: false });
    }
  }, [activeTaskId, pathname, router]);

  return (
    <BoardProvider initial={board}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.values(board.columns).map((col: ColumnDTO) => (
          <Column key={col.id} column={col} onOpenTask={setActiveTaskId} />
        ))}
      </div>
      <TaskPane taskId={activeTaskId} onClose={() => setActiveTaskId(null)} onOpenTask={setActiveTaskId} />
    </BoardProvider>
  );
}
