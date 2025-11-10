"use client";

import React, { useEffect, useState } from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import Column from "./Column";
import { useTaskPane } from "./TaskPaneProvider";

type AnyTask = {
  id: string;
  title: string;
  columnId?: string;
  position?: number;
  // Allow any extra fields your app attaches (subtasks, status, etc.)
  [key: string]: any;
};

type AnyColumn = {
  id: string;
  name: string;
  tasks: AnyTask[];
  [key: string]: any;
};

type BoardData = {
  columns: AnyColumn[];
  [key: string]: any;
};

export default function Board({ board }: { board: BoardData }) {
  // Render from local state so we can update immediately (optimistic/UI-first)
  const [data, setData] = useState<BoardData>(board);
  const { subscribe } = useTaskPane();

  // If the prop changes wholesale (server revalidation, etc.) keep in sync
  useEffect(() => setData(board), [board]);

  // Listen for TaskPane updates (e.g., title rename) and patch the matching card
  useEffect(() => {
    const off = subscribe((patch) => {
      if (!patch?.id) return;
      setData((prev) => ({
        ...prev,
        columns: prev.columns.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) => (t.id === patch.id ? { ...t, ...patch } : t)),
        })),
      }));
    });
    return off;
  }, [subscribe]);

  // Keep DnD handler present; keep it safe/no-op for unmatched cases.
  async function handleDragEnd(evt: DragEndEvent) {
    const { active, over } = evt;
    if (!active?.id || !over?.id) return;

    const taskId = String(active.id);
    const destColumnId = String(over.id);

    // Find the source/target columns
    const srcColIdx = data.columns.findIndex((c) => c.tasks.some((t) => t.id === taskId));
    const dstColIdx = data.columns.findIndex((c) => c.id === destColumnId);

    if (srcColIdx < 0 || dstColIdx < 0) return;
    if (srcColIdx === dstColIdx) return; // same column: leave to Column’s own sortable logic

    // Move task in UI immediately (append to end of destination)
    setData((prev) => {
      const cols = prev.columns.map((c) => ({ ...c, tasks: [...c.tasks] }));
      const srcTasks = cols[srcColIdx].tasks;
      const dstTasks = cols[dstColIdx].tasks;

      const idx = srcTasks.findIndex((t) => t.id === taskId);
      if (idx < 0) return prev;

      const [moved] = srcTasks.splice(idx, 1);
      dstTasks.push({ ...moved, columnId: cols[dstColIdx].id });

      return { ...prev, columns: cols };
    });

    // Persist (best effort; ignore any errors for now)
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: taskId, columnId: destColumnId }),
      });
    } catch {
      // Optionally: revert or toast
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {data.columns.map((col) => (
          <Column key={col.id} column={col} />
        ))}
      </div>
    </DndContext>
  );
}
