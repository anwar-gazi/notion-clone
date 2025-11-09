"use client";
import { useDraggable } from "@dnd-kit/core";
import { useState } from "react";
import SubtaskList from "./SubtaskList";
import { useTaskPane } from "./TaskPaneProvider";

export default function TaskCard({ task }: { task: any }) {
  const { openPane } = useTaskPane();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    data: { task: { ...task }, fromColumnId: task.columnId },
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  const [expanded, setExpanded] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="border rounded-xl p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
      onClick={(e) => { e.stopPropagation(); openPane(task); }}
      title="Click to open details"
    >
      {/* keep your existing header/badge; you can remove inline details if you prefer all in pane */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{task.title}</h4>
        {/* ... your subtasks badge, etc. ... */}
      </div>
      {/* (Optional) remove inline Details section since pane replaces it */}
    </div>
  );
}
