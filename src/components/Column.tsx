"use client";
import { useDroppable } from "@dnd-kit/core";
import TaskCard from "./TaskCard";
import { TaskData } from "@/types/data";

export default function Column({ column }: { column: { id: string, name: string, tasks: TaskData[] } }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', columnId: column.id }
  });
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <header className="font-semibold mb-2 flex items-center justify-between">
        <span>{column.name}</span><span className="text-sm text-gray-400">{column.tasks.length}</span>
      </header>
      <div
        ref={setNodeRef}
        className={`space-y-3 min-h-[40px] p-1 rounded ${isOver ? "ring-2 ring-black/40" : ""
          }`}
      >
        {column.tasks.map((t: any) => (<TaskCard key={t.id} task={t} />))}
      </div>
    </div>
  );
}
