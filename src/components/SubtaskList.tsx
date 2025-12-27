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
  const [fieldValues, setFieldValues] = useState<Record<string, { startAt: string; endAt: string; logHours: string }>>({});
  const [fieldStatus, setFieldStatus] = useState<Record<string, { state: "idle" | "saving" | "success" | "error"; message?: string }>>({});
  const [skipBlurSave, setSkipBlurSave] = useState<Record<string, boolean>>({});

  const toLocalInput = (value: any) => {
    if (!value) return "";
    const d = typeof value === "string" ? new Date(value) : value;
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60000);
    return local.toISOString().slice(0, 16);
  };

  // notify parent once on mount (so the initial badge is correct)
  useEffect(() => {
    onChange?.(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map: Record<string, { startAt: string; endAt: string; logHours: string }> = {};
    for (const s of items) {
      map[s.id] = {
        startAt: toLocalInput(s.startAt),
        endAt: toLocalInput(s.endAt),
        logHours: s.logHours != null ? String(s.logHours) : "",
      };
    }
    setFieldValues(map);
  }, [items]);

  const resetFieldValues = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setFieldValues((prev) => ({
      ...prev,
      [id]: {
        startAt: toLocalInput(item.startAt),
        endAt: toLocalInput(item.endAt),
        logHours: item.logHours != null ? String(item.logHours) : "",
      },
    }));
  };

  const setStatus = (id: string, state: "idle" | "saving" | "success" | "error", message?: string) => {
    setFieldStatus((prev) => ({ ...prev, [id]: { state, message } }));
    if (state === "success") {
      setTimeout(() => {
        setFieldStatus((prev2) => ({ ...prev2, [id]: { state: "idle" } }));
      }, 5000);
    }
  };

  async function saveFields(id: string) {
    if (fieldStatus[id]?.state === "saving") return;
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const pending = fieldValues[id] || { startAt: "", endAt: "", logHours: "" };

    const changed =
      toLocalInput(item.startAt) !== pending.startAt ||
      toLocalInput(item.endAt) !== pending.endAt ||
      (item.logHours != null ? String(item.logHours) : "") !== pending.logHours;
    if (!changed) return;

    const ok = window.confirm("Save time changes to this subtask?");
    if (!ok) {
      resetFieldValues(id);
      return;
    }

    setStatus(id, "saving");
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          startAt: pending.startAt || null,
          endAt: pending.endAt || null,
          logHours: pending.logHours ? parseFloat(pending.logHours) : 0,
        }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated?.error || "Save failed");
      const next = items.map((i) => (i.id === id ? updated : i));
      setItems(next);
      onChange?.(next);
      setStatus(id, "success", "Saved");
    } catch (e: any) {
      setStatus(id, "error", e?.message || "Save failed");
    }
  }

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
      body: JSON.stringify({
        id,
        completed,
        closedAt: completed ? undefined : null,
        startAt: fieldValues[id]?.startAt || null,
        endAt: fieldValues[id]?.endAt || null,
        logHours: fieldValues[id]?.logHours ? parseFloat(fieldValues[id].logHours) : 0,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "Unable to update subtask");
      return;
    }
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
            className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-50"
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
              className={`px-2 py-1 rounded ${s.closedAt ? "line-through text-gray-400" : "text-gray-900 underline decoration-transparent hover:decoration-current"} cursor-pointer`}
              title={`view this subtask (${s.id}: ${s.title || "Untitled"})`}
              onClick={(e) => { e.stopPropagation(); onOpenTask?.(s.id); }}
            >
              {s.title}
            </span>
            <div className={`ml-auto flex items-center gap-3 text-[11px] text-gray-700 ${s.closedAt ? "opacity-60" : ""}`}>
                <label className="flex items-center gap-1">
                  <span>Start</span>
                  <input
                    type="datetime-local"
                    className="border rounded px-2 py-1"
                    value={fieldValues[s.id]?.startAt || ""}
                    disabled={Boolean(s.closedAt)}
                    onChange={(e) => {
                      if (s.closedAt) return;
                      setFieldValues((prev) => ({ ...prev, [s.id]: { ...prev[s.id], startAt: e.target.value } }));
                    }}
                    onBlur={() => {
                      if (skipBlurSave[s.id]) {
                        setSkipBlurSave((prev) => ({ ...prev, [s.id]: false }));
                        return;
                      }
                      saveFields(s.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    readOnly={Boolean(s.closedAt)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setSkipBlurSave((prev) => ({ ...prev, [s.id]: true }));
                        saveFields(s.id);
                      }
                    }}
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span>End</span>
                  <input
                    type="datetime-local"
                    className="border rounded px-2 py-1"
                    value={fieldValues[s.id]?.endAt || ""}
                    disabled={Boolean(s.closedAt)}
                    onChange={(e) => {
                      if (s.closedAt) return;
                      setFieldValues((prev) => ({ ...prev, [s.id]: { ...prev[s.id], endAt: e.target.value } }));
                    }}
                    onBlur={() => {
                      if (skipBlurSave[s.id]) {
                        setSkipBlurSave((prev) => ({ ...prev, [s.id]: false }));
                        return;
                      }
                      saveFields(s.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    readOnly={Boolean(s.closedAt)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setSkipBlurSave((prev) => ({ ...prev, [s.id]: true }));
                        saveFields(s.id);
                      }
                    }}
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span>Hours</span>
                  <input
                    type="number"
                    step="0.25"
                    className="border rounded px-2 py-1 w-20"
                    value={fieldValues[s.id]?.logHours ?? ""}
                    placeholder="0"
                    disabled={Boolean(s.closedAt)}
                    onChange={(e) => {
                      if (s.closedAt) return;
                      setFieldValues((prev) => ({ ...prev, [s.id]: { ...prev[s.id], logHours: e.target.value } }));
                    }}
                    onBlur={() => {
                      if (skipBlurSave[s.id]) {
                        setSkipBlurSave((prev) => ({ ...prev, [s.id]: false }));
                        return;
                      }
                      saveFields(s.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    readOnly={Boolean(s.closedAt)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setSkipBlurSave((prev) => ({ ...prev, [s.id]: true }));
                        saveFields(s.id);
                      }
                    }}
                  />
                </label>
              {!s.closedAt && (
                <div className="text-[11px]">
                  {fieldStatus[s.id]?.state === "saving" && <span className="text-gray-600">Saving…</span>}
                  {fieldStatus[s.id]?.state === "success" && <span className="text-green-600">{fieldStatus[s.id]?.message}</span>}
                  {fieldStatus[s.id]?.state === "error" && (
                    <span className="text-red-600">{fieldStatus[s.id]?.message || "Save failed"}</span>
                  )}
                </div>
              )}
            </div>
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
