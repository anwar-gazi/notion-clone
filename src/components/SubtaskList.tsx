"use client";
import { useState } from "react";
export default function SubtaskList({ taskId, initial }: { taskId: string; initial: any[] }) {
  const [items, setItems] = useState(initial);
  const [title, setTitle] = useState("");
  async function add() {
    if (!title.trim()) return;
    const res = await fetch("/api/subtasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId, title }) });
    const st = await res.json(); setItems([...items, st]); setTitle("");
  }
  async function toggle(id: string, completed: boolean) {
    const res = await fetch("/api/subtasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, completed }) });
    const updated = await res.json(); setItems(items.map(i => (i.id === id ? updated : i)));
  }
  return (
    <div className="mt-2">
      <div className="space-y-2">
        {items.map((s) => (
          <label key={s.id} className="flex items-center gap-2">
            <input type="checkbox" checked={s.completed} onChange={e => toggle(s.id, e.target.checked)} />
            <span className={s.completed ? "line-through" : ""}>{s.title}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Add subtask" className="border rounded px-2 py-1 flex-1" />
        <button onClick={add} className="px-3 py-1 rounded bg-black text-white">Add</button>
      </div>
    </div>
  );
}
