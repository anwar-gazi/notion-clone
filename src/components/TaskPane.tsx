"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import SubtaskList from "./SubtaskList";
import { useBoard } from "./BoardContext";
import { TaskDTO } from "@/types/data";

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

type InlineStatus = {
  state: "idle" | "saving" | "success" | "error";
  message?: string;
  retry?: () => void;
};

export default function TaskPane({ taskId, onClose, onOpenTask }: { taskId: string | null; onClose: () => void; onOpenTask: (id: string) => void }) {
  const board = useBoard();
  const taskFromBoard = taskId && board ? board.board.tasks[taskId] : null;

  const [paneTask, setPaneTask] = useState<TaskDTO | null>(taskFromBoard || null);
  const [fieldStatus, setFieldStatus] = useState<Record<string, InlineStatus>>({});
  const backdropRef = useRef<HTMLDivElement>(null);

  // Import UI state
  const [uploading, setUploading] = useState(false);
  const [importMsg, setImportMsg] = useState<string>("");
  const [subVersion, setSubVersion] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPaneTask(taskFromBoard || null);
    setFieldStatus({});
    setImportMsg("");
    setSubVersion((v) => v + 1);
  }, [taskId, taskFromBoard?.id]);
  const breadcrumbs = useMemo(() => {
    const items: TaskDTO[] = [];
    let current: TaskDTO | null = paneTask;
    const map = board?.board.tasks || {};
    while (current) {
      items.unshift(current);
      if (!current.parentTaskId) break;
      current = map[current.parentTaskId] || null;
    }
    return items;
  }, [paneTask, board?.board.tasks]);

  const markSuccessTimeout = useCallback((key: string) => {
    setTimeout(() => {
      setFieldStatus((prev) => {
        if (prev[key]?.state === "success") {
          const next = { ...prev };
          next[key] = { state: "idle" };
          return next;
        }
        return prev;
      });
    }, 5000);
  }, []);

  const runSave = useCallback(
    async (key: string, patch: Partial<TaskDTO>) => {
      if (!paneTask || !board) return;
      setFieldStatus((prev) => ({ ...prev, [key]: { state: "saving" } }));
      try {
        await board.patchTask(paneTask.id, patch);
        setPaneTask((prev) => (prev ? ({ ...prev, ...patch } as TaskDTO) : prev));
        setFieldStatus((prev) => ({ ...prev, [key]: { state: "success", message: "Saved" } }));
        markSuccessTimeout(key);
      } catch (e: any) {
        const retry = () => runSave(key, patch);
        setFieldStatus((prev) => ({
          ...prev,
          [key]: { state: "error", message: e?.message || "Save failed", retry },
        }));
      }
    },
    [board, paneTask, markSuccessTimeout]
  );

  const commitIfChanged = useCallback(
    (key: keyof TaskDTO | string, next: any) => {
      if (!paneTask) return;
      const current = (paneTask as any)[key];
      const same =
        Array.isArray(current) || Array.isArray(next)
          ? JSON.stringify(current ?? []) === JSON.stringify(next ?? [])
          : (current ?? "") === (next ?? "");
      if (same) return;
      runSave(key as string, { [key]: next } as any);
    },
    [paneTask, runSave]
  );

  async function handleImport(file: File) {
    if (!paneTask) return;
    setUploading(true);
    setImportMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/tasks/${paneTask.id}/import`, { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Import failed");

      const r2 = await fetch(`/api/tasks/${paneTask.id}`);
      const fresh = await r2.json();

      setPaneTask((prev) => (prev ? ({ ...prev, subtasks: fresh.subtasks || [] } as TaskDTO) : prev));
      setSubVersion((v) => v + 1);
      setImportMsg(`Imported ${j.created}${j.skipped ? `, skipped ${j.skipped}` : ""}.`);
    } catch (e: any) {
      setImportMsg(e?.message || "Import error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!taskId || !paneTask) return null;

  // Editable metadata spec
  const meta = [
    { key: "externalId", label: "ID", readOnly: true },
    { key: "state", label: "State", type: "text" },
    { key: "status", label: "Status", type: "combo", options: ["Active", "Open", "Closed"] },
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

  const doneCount = (paneTask.subtasks || []).filter((s: any) => s.completed).length;
  const totalCount = (paneTask.subtasks || []).length;

  return (
    <>
      {/* BACKDROP */}
      <div
        ref={backdropRef}
        onClick={(e) => {
          if (e.target === backdropRef.current) {
            onClose();
          }
        }}
        className="fixed inset-0 bg-black/40 z-40"
        aria-hidden="true"
      />
      {/* PANEL */}
      <aside
        key={paneTask.id}
        role="dialog"
        aria-modal="true"
        className="fixed right-0 top-0 h-full w-full md:w-1/2 bg-white z-50 shadow-2xl flex flex-col"
      >
        {/* Header */}
      <div className="p-4 border-b flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-gray-500 flex items-center gap-1 flex-wrap mb-1">
            {breadcrumbs.map((item, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              const isParent = !isLast && idx === breadcrumbs.length - 2;
              return (
                <span key={item.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    className={`underline ${
                      isLast
                        ? "text-[11px] text-gray-800"
                        : isParent
                        ? "text-[14px] font-bold text-gray-900"
                        : "text-[11px] text-gray-600"
                    }`}
                    onClick={() => onOpenTask(item.id)}
                  >
                    {item.title || "Untitled"}
                  </button>
                  {idx < breadcrumbs.length - 1 && <span className="text-gray-400">›</span>}
                </span>
              );
            })}
          </div>
          <EditableTitle
            title={paneTask.title}
            onSave={(title) => runSave("title", { title })}
            status={fieldStatus["title"]}
          />
            <div className="text-xs text-gray-500 mt-1">
              Created: {dtLabel(paneTask.createdAt)}
              {paneTask.closedAt && <> • Closed: {dtLabel(paneTask.closedAt)}</>}
            </div>
          </div>
          <button
            className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Description */}
          <section>
            <Field label="Description" status={fieldStatus["description"]}>
              <textarea
                className="w-full border rounded-xl p-3"
                rows={6}
                defaultValue={paneTask.description || ""}
                onBlur={(e) => commitIfChanged("description", e.currentTarget.value)}
                placeholder="Describe the task. Markdown supported."
              />
            </Field>
          </section>

          {/* Details grid */}
          <section>
            <h4 className="text-sm font-semibold mb-2">Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {meta.map((m) => (
                <MetaField
                  key={m.key as string}
                  label={m.label}
                  value={m.toView ? m.toView(paneTask[m.key as keyof TaskDTO]) : (paneTask[m.key as keyof TaskDTO] as any)}
                  type={(m as any).type}
                  options={(m as any).options}
                  readOnly={(m as any).readOnly}
                  step={(m as any).step}
                  status={fieldStatus[m.key as string]}
                  onCommit={(val: any) => {
                    if ((m as any).readOnly) return;
                    const v = m.toSend ? m.toSend(val) : val;
                    commitIfChanged(m.key as string, v);
                  }}
                />
              ))}
            </div>
          </section>

          {/* Time tracking */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Start time" status={fieldStatus["startAt"]}>
              <input
                type="datetime-local"
                className="border rounded-xl px-3 py-2 w-full"
                defaultValue={toLocalInput(paneTask.startAt)}
                onBlur={(e) => commitIfChanged("startAt", e.currentTarget.value || null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commitIfChanged("startAt", (e.currentTarget as HTMLInputElement).value || null);
                  }
                }}
              />
            </Field>
            <Field label="End time" status={fieldStatus["endAt"]}>
              <input
                type="datetime-local"
                className="border rounded-xl px-3 py-2 w-full"
                defaultValue={toLocalInput(paneTask.endAt)}
                onBlur={(e) => commitIfChanged("endAt", e.currentTarget.value || null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commitIfChanged("endAt", (e.currentTarget as HTMLInputElement).value || null);
                  }
                }}
              />
            </Field>
            <Field label="Logged hours" status={fieldStatus["logHours"]}>
              <input
                type="number"
                step={0.25}
                className="border rounded-xl px-3 py-2 w-full"
                defaultValue={Number(paneTask.logHours || 0)}
                onBlur={(e) => commitIfChanged("logHours", parseFloat(e.currentTarget.value || "0"))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commitIfChanged("logHours", parseFloat((e.currentTarget as HTMLInputElement).value || "0"));
                  }
                }}
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
                taskId={paneTask.id}
                initial={paneTask.subtasks || []}
                onChange={(items) => setPaneTask((prev) => (prev ? ({ ...prev, subtasks: items } as TaskDTO) : prev))}
                onOpenTask={onOpenTask}
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
            <a className="underline text-sm" href={`/api/tasks/${paneTask.id}/export?format=csv`}>
              Export CSV
            </a>
            <a className="underline text-sm" href={`/api/tasks/${paneTask.id}/export?format=xlsx`}>
              Export Excel
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ————— presentational building blocks ————— */

function EditableTitle({ title, onSave, status }: { title: string; onSave: (v: string) => void; status?: InlineStatus }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(title);

  useEffect(() => setVal(title), [title]);

  if (!editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-lg font-semibold truncate">{title}</h2>
        <button className="text-xs underline" onClick={() => setEditing(true)}>
          Edit
        </button>
        <StatusInline status={status} />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
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
      <StatusInline status={status} />
    </div>
  );
}

function Field({ label, children, status }: { label: string; children: React.ReactNode; status?: InlineStatus }) {
  return (
    <label className="text-xs block">
      <div className="mb-1 text-gray-600 flex items-center gap-2">
        <span>{label}</span>
      </div>
      {children}
      <StatusInline status={status} />
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
  status,
  onCommit,
}: {
  label: string;
  value: any;
  type?: "text" | "number" | "select" | "textarea" | "combo";
  options?: string[];
  readOnly?: boolean;
  step?: number;
  status?: InlineStatus;
  onCommit: (val: any) => void;
}) {
  return (
    <Field label={label} status={status}>
      {readOnly ? (
        <div className="px-3 py-2 bg-gray-50 rounded-xl border">{value || "—"}</div>
      ) : type === "combo" ? (
        <ComboField value={value} options={options || []} onCommit={onCommit} />
      ) : type === "select" ? (
        <select
          className="border rounded-xl px-3 py-2 w-full"
          defaultValue={value || ""}
          onChange={(e) => onCommit(e.currentTarget.value || undefined)}
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
          onBlur={(e) => onCommit(parseFloat(e.currentTarget.value || "0"))}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommit(parseFloat((e.currentTarget as HTMLInputElement).value || "0"));
          }}
        />
      ) : type === "textarea" ? (
        <textarea
          className="border rounded-xl px-3 py-2 w-full"
          rows={3}
          defaultValue={value || ""}
          onBlur={(e) => onCommit(e.currentTarget.value)}
        />
      ) : (
        <input
          className="border rounded-xl px-3 py-2 w-full"
          defaultValue={value || ""}
          onBlur={(e) => onCommit(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommit((e.currentTarget as HTMLInputElement).value);
          }}
        />
      )}
    </Field>
  );
}

function ComboField({ value, options, onCommit }: { value: string; options: string[]; onCommit: (v: string) => void }) {
  const [input, setInput] = useState(value || "");
  const merged = useMemo(() => Array.from(new Set([...(options || []), input || ""])).filter(Boolean), [options, input]);
  return (
    <div className="relative">
      <input
        className="border rounded-xl px-3 py-2 w-full"
        list="status-options"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onBlur={(e) => onCommit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onCommit(input);
          }
        }}
        placeholder="Status"
      />
      <datalist id="status-options">
        {merged.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </div>
  );
}

function StatusInline({ status }: { status?: InlineStatus }) {
  if (!status || status.state === "idle") return null;
  if (status.state === "saving") {
    return (
      <span className="text-[11px] text-gray-600 inline-flex items-center gap-1 mt-1">
        <span className="inline-block h-3 w-3 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" aria-hidden="true" />
        Saving…
      </span>
    );
  }
  if (status.state === "success") {
    return <span className="text-[11px] text-green-600 inline-flex items-center gap-1 mt-1">Saved</span>;
  }
  if (status.state === "error") {
    return (
      <span className="text-[11px] text-red-600 inline-flex items-center gap-2 mt-1">
        <span>{status.message || "Save failed"}</span>
        {status.retry && (
          <button className="underline text-[11px]" type="button" onClick={status.retry}>
            Retry
          </button>
        )}
      </span>
    );
  }
  return null;
}
