// src/components/Board.tsx
"use client";

import { useState } from "react";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import Column from "./Column";
import { BoardData } from "@/types/data";

export default function Board({ board }: { board: BoardData }) {
  const [columns, setColumns] = useState(board.columns);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function moveTask(taskId: string, fromColId: string, toColId: string) {
    if (fromColId === toColId) return;

    setColumns((prev: any[]) => {
      const next = prev.map((c) => ({ ...c, tasks: [...(c.tasks ?? [])] }));
      const from = next.find((c) => c.id === fromColId);
      const to = next.find((c) => c.id === toColId);
      if (!from || !to) return prev;

      const idx = from.tasks.findIndex((t: any) => t.id === taskId);
      if (idx === -1) return prev;

      const [task] = from.tasks.splice(idx, 1);
      to.tasks.push({ ...task, columnId: toColId });

      // Persist
      fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, columnId: toColId }),
      }).catch(() => {});

      return next;
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;

    const taskId = String(active.id);
    const fromColId = active.data.current?.columnId as string | undefined;
    const toColId =
      (over.data.current?.columnId as string | undefined) ?? String(over.id);

    if (fromColId && toColId) moveTask(taskId, fromColId, toColId);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={onDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map((col: any) => (
          <Column key={col.id} column={col} />
        ))}
      </div>
    </DndContext>
  );
}
