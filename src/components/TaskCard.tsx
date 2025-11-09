"use client";
import { useDraggable } from "@dnd-kit/core";
import { useState } from "react";
import SubtaskList from "./SubtaskList";

export default function TaskCard({ task }: { task: any }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id, data: task });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const [expanded, setExpanded] = useState(false);
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="border rounded-xl p-3 bg-gray-50">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{task.title}</h4>
        <button className="text-sm underline" onClick={() => setExpanded(v => !v)}>{expanded ? "Hide" : "Details"}</button>
      </div>
      {expanded && (
        <div className="mt-2 space-y-2 text-sm">
          {task.description && <p className="text-gray-600">{task.description}</p>}
          <div className="flex gap-2 text-xs text-gray-500">
            <span>Created: {new Date(task.createdAt).toLocaleString()}</span>
            {task.closedAt && <span>Closed: {new Date(task.closedAt).toLocaleString()}</span>}
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs">Start</label>
            <input type="datetime-local" defaultValue={task.startAt?.slice?.(0,16)} onChange={e => update(task.id, { startAt: e.target.value })} className="border rounded px-2 py-1"/>
            <label className="text-xs">End</label>
            <input type="datetime-local" defaultValue={task.endAt?.slice?.(0,16)} onChange={e => update(task.id, { endAt: e.target.value })} className="border rounded px-2 py-1"/>
            <label className="text-xs">Logged (h)</label>
            <input type="number" step="0.25" defaultValue={task.logHours} onBlur={e => update(task.id, { logHours: parseFloat(e.target.value || "0") })} className="border rounded px-2 py-1 w-24"/>
            <a className="ml-auto underline" href={`/api/tasks/${task.id}/export?format=csv`}>Export CSV</a>
            <a className="underline" href={`/api/tasks/${task.id}/export?format=xlsx`}>Export Excel</a>
          </div>
          <SubtaskList taskId={task.id} initial={task.subtasks} />
        </div>
      )}
    </div>
  );
}
async function update(id: string, data: any) {
  await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...data }) });
}
