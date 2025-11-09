"use client";
import { useDroppable } from "@dnd-kit/core";
import TaskCard from "./TaskCard";

export default function Column({ column }: { column: any }) {
  const { setNodeRef } = useDroppable({ id: column.id });
  return (
    <div ref={setNodeRef} className="bg-white rounded-2xl shadow p-4">
      <header className="font-semibold mb-2 flex items-center justify-between">
        <span>{column.name}</span><span className="text-sm text-gray-400">{column.tasks.length}</span>
      </header>
      <div className="space-y-3">
        {column.tasks.map((t: any) => (<TaskCard key={t.id} task={t} />))}
      </div>
    </div>
  );
}
