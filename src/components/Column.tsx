"use client";
import { useDroppable } from "@dnd-kit/core";
import TaskCard from "./TaskCard";
import { ColumnDTO, TaskDTO } from "@/types/data";
import { useTasksInColumn } from "./BoardContext";

/**
 * TODO optimize the number of times it is rendered
 * @param param0 
 * @returns 
 */
export default function Column({ column }: { column: ColumnDTO }) {
  const tasks = useTasksInColumn(column.id);
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', columnId: column.id }
  });
  
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <header className="font-semibold mb-2 flex items-center justify-between">
        <span>{column.name}</span><span className="text-sm text-gray-400">{column.taskIds.length}</span>
      </header>
      <div
        ref={setNodeRef}
        className={`space-y-3 min-h-[40px] p-1 rounded ${isOver ? "ring-2 ring-black/40" : ""
          }`}
      >
        {tasks.map((task: TaskDTO) => (<TaskCard key={task.id} task={task} />))}
      </div>
    </div>
  );
}
