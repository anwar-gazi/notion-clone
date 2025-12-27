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

  // Restore from URL on load
  useEffect(() => {
    if (!searchParams) return;
    const sub = searchParams.get("subtask");
    const task = searchParams.get("task");
    const id = sub || task;
    if (id && board.tasks[id]) {
      setActiveTaskId(id);
    }
  }, [searchParams, board.tasks]);

  // Persist open task (localStorage) and sync URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeTaskId) {
      window.localStorage.setItem("openTaskId", activeTaskId);
    } else {
      window.localStorage.removeItem("openTaskId");
    }
  }, [activeTaskId]);

  useEffect(() => {
    if (!router || !pathname) return;
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (activeTaskId) {
      const t = board.tasks[activeTaskId];
      if (t?.parentTaskId) {
        params.set("task", t.parentTaskId);
        params.set("subtask", activeTaskId);
      } else {
        params.set("task", activeTaskId);
        params.delete("subtask");
      }
    } else {
      params.delete("task");
      params.delete("subtask");
    }
    const qs = params.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    router.replace(href, { scroll: false });
  }, [activeTaskId, board.tasks, pathname, router, searchParams]);

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
