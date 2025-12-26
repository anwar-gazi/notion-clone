"use client";
import { useDraggable } from "@dnd-kit/core";
//import SubtaskList from "./SubtaskList";
import React from "react";
import { TaskDTO } from "@/types/data";
//import { TaskData } from "@/types/data";

/**
 * 
 * @param param0 
 * @returns 
 * @requires BoardProvider gets data from the board context provider
 */
export default function TaskCard({ task, onOpen }: { task: TaskDTO; onOpen: (taskId: string) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    data: { type: 'task', columnId: task.columnId },
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  // ✅ compute counts from subtasks (fallback to precomputed fields if present)
  const total = task.subtasks.length;

  const done = task.subtasks.filter((s: any) => s.completed).length;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="border rounded-xl p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
      role="button"
      tabIndex={0}
      style={style}
      title="Click to open details"
      onClick={() => onOpen(task.id)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(task.id)}
      aria-describedby=""
      aria-disabled="false"
      aria-roledescription="draggable"
    >
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{task.title}</h4>

        {/* ✅ subtasks badge */}
        {total > 0 && (
          <span
            aria-label="subtasks-count"
            className="text-xs px-2 py-0.5 rounded-full bg-gray-200"
          >
            {done}/{total}
          </span>
        )}
      </div>
      {/* ...rest of card... */}
    </div>
  );
}
