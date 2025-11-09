"use client";
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useState, useMemo } from "react";
import Column from "./Column";

export default function Board({ board }: { board: any }) {
  const [columns, setColumns] = useState(board.columns);

  // 👇 Require movement (8px) before drag starts; avoid drag on simple clicks
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } })
  );

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const activeData = (active.data.current || {}) as any; // we inject {task, fromColumnId} from TaskCard
    const fromColId = String(activeData.fromColumnId || activeData.columnId || "");
    const toColId = String((over.data.current as any)?.columnId ?? over.id);

    // ✅ If nothing actually changed (same column), do nothing
    if (!fromColId || toColId === fromColId) return;

    const toCol = columns.find((c: any) => c.id === toColId);
    const newPos = ((toCol?.tasks?.length ?? 0) + 1);

    // Persist
    await fetch("/api/tasks/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, columnId: toColId, position: newPos }),
    });

    // Optimistic UI — IMPORTANT: use the functional state (`cols`), not the outer `columns`
    setColumns((cols: any[]) => {
      const fromId = fromColId;
      return cols.map((c: any) => {
        if (c.id === fromId) {
          return { ...c, tasks: c.tasks.filter((t: any) => t.id !== taskId) };
        }
        if (c.id === toColId) {
          // Add the task with updated column/position
          const base = activeData.task || activeData; // in case we passed the whole task
          return {
            ...c,
            tasks: [
              ...c.tasks,
              { ...base, id: taskId, columnId: toColId, position: newPos },
            ],
          };
        }
        return c;
      });
    });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map((col: any) => (
          <Column key={col.id} column={col} />
        ))}
      </div>
    </DndContext>
  );
}
