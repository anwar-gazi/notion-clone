// src/components/SubtaskList.tsx
"use client";
import { useEffect, useState } from "react";

export default function SubtaskList({
  taskId,
  initial,
  onChange,
  onOpenTask,
}: {
  taskId: string;
  initial: any[];
  onChange?: (items: any[]) => void;
  onOpenTask?: (id: string) => void;
}) {
  const [items, setItems] = useState(initial || []);
  const [title, setTitle] = useState("");

  // notify parent once on mount (so the initial badge is correct)
  useEffect(() => {
    onChange?.(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add() {
    if (!title.trim()) return;
    const res = await fetch("/api/subtasks/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentTaskId: taskId, title }),
    });
    const st = await res.json();
    const next = [...items, st];
    setItems(next);
    onChange?.(next);
    setTitle("");
  }

  async function toggle(id: string, completed: boolean) {
    const res = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, completed }),
    });
    const updated = await res.json();
    const next = items.map((i) => (i.id === id ? updated : i));
    setItems(next);
    onChange?.(next);
  }

  async function patch(id: string, data: any) {
    const res = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    const updated = await res.json();
    const next = items.map((i) => (i.id === id ? updated : i));
    setItems(next);
    onChange?.(next);
  }

  return (
    <div className="mt-2">
      <div className="space-y-2">
        {items.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-50 cursor-pointer"
            onClick={() => onOpenTask?.(s.id)}
          >
            <input
              type="checkbox"
              checked={s.completed || Boolean(s.closedAt)}
              disabled={Boolean(s.closedAt)}
              title={s.completed || s.closedAt ? "" : "mark as closed"}
              className={`h-4 w-4 rounded border-gray-400 ${!s.completed && !s.closedAt ? "transition transform hover:scale-110 hover:border-red-500 hover:ring-2 hover:ring-red-200 hover:cursor-[url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='black' d='M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z'/></svg>\")_12_12,auto]" : ""}`}
              onChange={(e) => {
                e.stopPropagation();
                if (s.closedAt) return;
                toggle(s.id, e.target.checked);
              }}
            />
            <span
              className={`flex-1 px-2 py-1 rounded ${s.closedAt ? "line-through text-gray-400" : ""}`}
              title={`view this subtask (${s.id}: ${s.title || "Untitled"})`}
              onClick={(e) => { e.stopPropagation(); onOpenTask?.(s.id); }}
            >
              {s.title}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add subtask"
          className="border rounded px-2 py-1 flex-1"
        />
        <button onClick={add} className="px-3 py-1 rounded bg-black text-white">
          Add
        </button>
      </div>
    </div>
  );
}
