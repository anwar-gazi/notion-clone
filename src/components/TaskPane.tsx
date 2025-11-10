"use client";

import { useRef, useState } from "react";
import { useTaskPane } from "./TaskPaneProvider";
import SubtaskList from "./SubtaskList";

/* ————— helpers ————— */
function toLocalInput(value: any) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  // convert to local yyyy-MM-ddTHH:mm (no seconds)
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

function dtLabel(value: any) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString();
}

export default function TaskPane() {
  const { open, task, closePane, updateInPane, notifyUpdated } = useTaskPane();
  const backdropRef = useRef<HTMLDivElement>(null);

  // Import UI state
  const [uploading, setUploading] = useState(false);
  const [importMsg, setImportMsg] = useState<string>("");
  const [subVersion, setSubVersion] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open || !task) return null;

  async function patchTask(data: any) {
    const res = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, ...data }),
    });
    updateInPane(data);

    if (!res.ok) return;

    notifyUpdated({ id: task.id, title: data.title });
  }

  async function handleImport(file: File) {
    setUploading(true);
    setImportMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/tasks/${task.id}/import`, { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Import failed");

      const r2 = await fetch(`/api/tasks/${task.id}`);
      const fresh = await r2.json();

      updateInPane({ subtasks: fresh.subtasks || [] });
      setSubVersion((v) => v + 1);
      setImportMsg(`Imported ${j.created}${j.skipped ? `, skipped ${j.skipped}` : ""}.`);
    } catch (e: any) {
      setImportMsg(e?.message || "Import error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // Editable metadata spec
  const meta = [
    { key: "externalId", label: "ID", readOnly: true },
    { key: "state", label: "State", type: "text" },
    { key: "status", label: "Status", type: "text" },
    { key: "priority", label: "Priority", type: "select", options: ["", "LOW", "MEDIUM", "HIGH", "CRITICAL"] },
    { key: "xp", label: "XP", type: "number", step: 1 },
    {
      key: "estimatedSec",
      label: "Est. (hours)",
      type: "number",
      step: 0.25,
      toView: (v: any) => (v ? v / 3600 : 0),
      toSend: (v: number) => Math.round((v || 0) * 3600),
    },
    { key: "notes", label: "Notes", type: "textarea" },
    {
      key: "dependencyExternalIds",
      label: "Dependencies (IDs)",
      type: "text",
      toView: (v: any) => (Array.isArray(v) ? v.join(", ") : v || ""),
      toSend: (v: string) => v.split(/[ ,;]+/).filter(Boolean),
    },
  ] as const;

  const doneCount = (task.subtasks || []).filter((s: any) => s.completed).length;
  const totalCount = (task.subtasks || []).length;

  return (
    <>
      {/* BACKDROP */}
      <div
        ref={backdropRef}
        onClick={(e) => {
          if (e.target === backdropRef.current) closePane();
        }}
        className="fixed inset-0 bg-black/40 z-40"
        aria-hidden="true"
      />
      {/* PANEL */}
      <aside
        role="dialog"
        aria-modal="true"
        className="fixed right-0 top-0 h-full w-full max-w-xl bg-white z-50 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b flex items-start justify-between gap-3">
          <div className="min-w-0">
            <EditableTitle title={task.title} onSave={(title) => patchTask({ title })} />
            <div className="text-xs text-gray-500 mt-1">
              Created: {dtLabel(task.createdAt)}
              {task.closedAt && <> • Closed: {dtLabel(task.closedAt)}</>}
            </div>
          </div>
          <button
            className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-100"
            onClick={closePane}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Description */}
          <section>
            <label className="block text-xs mb-1 text-gray-600">Description</label>
            <textarea
              className="w-full border rounded-xl p-3"
              rows={6}
              defaultValue={task.description || ""}
              onBlur={(e) => patchTask({ description: e.currentTarget.value })}
              placeholder="Describe the task. Markdown supported."
            />
          </section>

          {/* Details grid */}
          <section>
            <h4 className="text-sm font-semibold mb-2">Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {meta.map((m) => (
                <MetaField
                  key={m.key as string}
                  label={m.label}
                  value={m.toView ? m.toView(task[m.key as keyof typeof task]) : (task[m.key as keyof typeof task] as any)}
                  type={(m as any).type}
                  options={(m as any).options}
                  readOnly={(m as any).readOnly}
                  step={(m as any).step}
                  onBlur={(val: any) => {
                    if ((m as any).readOnly) return;
                    const v = m.toSend ? m.toSend(val) : val;
                    patchTask({ [m.key]: v });
                  }}
                />
              ))}
            </div>
          </section>

          {/* Time tracking */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Start time">
              <input
                type="datetime-local"
                className="border rounded-xl px-3 py-2 w-full"
                defaultValue={toLocalInput(task.startAt)}
                onBlur={(e) => patchTask({ startAt: e.currentTarget.value || null })}
              />
            </Field>
            <Field label="End time">
              <input
                type="datetime-local"
                className="border rounded-xl px-3 py-2 w-full"
                defaultValue={toLocalInput(task.endAt)}
                onBlur={(e) => patchTask({ endAt: e.currentTarget.value || null })}
              />
            </Field>
            <Field label="Logged hours">
              <input
                type="number"
                step={0.25}
                className="border rounded-xl px-3 py-2 w-full"
                defaultValue={Number(task.logHours || 0)}
                onBlur={(e) => patchTask({ logHours: parseFloat(e.currentTarget.value || "0") })}
              />
            </Field>
          </section>

          {/* Subtasks */}
          <section>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Subtasks</h4>
              <div className="text-xs text-gray-500">
                {doneCount}/{totalCount}
              </div>
            </div>
            <div className="mt-2">
              <SubtaskList
                key={subVersion} // re-mount after import
                taskId={task.id}
                initial={task.subtasks || []}
                onChange={(items) => updateInPane({ subtasks: items })}
              />
            </div>
          </section>
        </div>

        {/* Footer: Import + Export */}
        <div className="p-4 border-t flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files && handleImport(e.target.files[0])}
          />
          <button
            className="px-3 py-2 rounded-xl bg-black text-white text-sm hover:opacity-90 disabled:opacity-50"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            title="Sheet name is the main task; each row becomes a subtask"
          >
            {uploading ? "Importing…" : "Import Subtasks (Excel)"}
          </button>

          {importMsg && <span className="text-xs text-gray-600">{importMsg}</span>}

          <div className="ml-auto flex items-center gap-3">
            <a className="underline text-sm" href={`/api/tasks/${task.id}/export?format=csv`}>
              Export CSV
            </a>
            <a className="underline text-sm" href={`/api/tasks/${task.id}/export?format=xlsx`}>
              Export Excel
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ————— presentational building blocks ————— */

function EditableTitle({ title, onSave }: { title: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(title);
  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold truncate">{title}</h2>
        <button className="text-xs underline" onClick={() => setEditing(true)}>
          Edit
        </button>
      </div>
    );
  }
  return (
    <input
      className="text-lg font-semibold border-b border-gray-300 focus:border-black outline-none w-full"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (val !== title) onSave(val);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      autoFocus
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs block">
      <div className="mb-1 text-gray-600">{label}</div>
      {children}
    </label>
  );
}

function MetaField({
  label,
  value,
  type,
  options,
  readOnly,
  step,
  onBlur,
}: {
  label: string;
  value: any;
  type?: "text" | "number" | "select" | "textarea";
  options?: string[];
  readOnly?: boolean;
  step?: number;
  onBlur: (val: any) => void;
}) {
  return (
    <Field label={label}>
      {readOnly ? (
        <div className="px-3 py-2 bg-gray-50 rounded-xl border">{value || "—"}</div>
      ) : type === "select" ? (
        <select
          className="border rounded-xl px-3 py-2 w-full"
          defaultValue={value || ""}
          onChange={(e) => onBlur(e.currentTarget.value || undefined)}
        >
          {options?.map((o) => (
            <option key={o} value={o}>
              {o || "(none)"}
            </option>
          ))}
        </select>
      ) : type === "number" ? (
        <input
          type="number"
          step={step || 1}
          className="border rounded-xl px-3 py-2 w-full"
          defaultValue={value ?? 0}
          onBlur={(e) => onBlur(parseFloat(e.currentTarget.value || "0"))}
        />
      ) : type === "textarea" ? (
        <textarea
          className="border rounded-xl px-3 py-2 w-full"
          rows={3}
          defaultValue={value || ""}
          onBlur={(e) => onBlur(e.currentTarget.value)}
        />
      ) : (
        <input
          className="border rounded-xl px-3 py-2 w-full"
          defaultValue={value || ""}
          onBlur={(e) => onBlur(e.currentTarget.value)}
        />
      )}
    </Field>
  );
}
