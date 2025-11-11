"use client";
import { useDraggable } from "@dnd-kit/core";
import { useState } from "react";
import SubtaskList from "./SubtaskList";
import React from "react";
import { useTaskPane } from "./TaskPaneProvider";
import { TaskData } from "@/types/data";

export default function TaskCard({ task }: { task: TaskData }) {
  const { openPane } = useTaskPane();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    data: { type: 'task', columnId: task.columnId },
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  const [expanded, setExpanded] = useState(false);

  // ✅ compute counts from subtasks (fallback to precomputed fields if present)
  const total =
    Array.isArray(task.subtasks) ? task.subtasks.length :
    (typeof task.subtaskCount === "number" ? task.subtaskCount : 0);

  const done =
    Array.isArray(task.subtasks) ? task.subtasks.filter((s: any) => s.completed).length :
    (typeof task.subtasksDone === "number" ? task.subtasksDone : 0);

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
      onClick={() => openPane(task)}
      onKeyDown={(e) => e.key === "Enter" && openPane(task)}
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
