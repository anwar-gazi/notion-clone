"use client";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { useState } from "react";
import Column from "./Column";

export default function Board({ board }: { board: any }) {
  const [columns, setColumns] = useState(board.columns);

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const taskId = String(active.id);
    const toColId = String(over.data.current?.columnId ?? over.id);
    const to: any = columns.find((c: any) => c.id === toColId);
    const newPos = (to?.tasks?.length ?? 0) + 1;
    await fetch("/api/tasks/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, columnId: toColId, position: newPos }),
    });
    setColumns((cols: any[]) => {
      const fromId = columns.find((c: any) => c.tasks.some((t: any) => t.id === taskId))?.id;
      return cols.map((c: any) => {
        if (c.id === fromId) return { ...c, tasks: c.tasks.filter((t: any) => t.id !== taskId) };
        if (c.id === toColId) return { ...c, tasks: [...c.tasks, { ...active.data.current, id: taskId, columnId: toColId, position: newPos }] };
        return c;
      });
    });
  }

  return (
    <DndContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map((col: any) => (<Column key={col.id} column={col} />))}
      </div>
    </DndContext>
  );
}
