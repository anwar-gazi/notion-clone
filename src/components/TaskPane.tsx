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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [parentQuery, setParentQuery] = useState("");
  const [parentOpen, setParentOpen] = useState(false);
  const [depsQuery, setDepsQuery] = useState("");
  const [depsOpen, setDepsOpen] = useState(false);
  const [enterAnim, setEnterAnim] = useState(false);
  const [exitAnim, setExitAnim] = useState(false);

  useEffect(() => {
    setPaneTask(taskFromBoard || null);
    setFieldStatus({});
    setImportMsg("");
    setSubVersion((v) => v + 1);
    setShowReopenModal(false);
    setReopenReason("");
    setParentQuery("");
    setParentOpen(false);
    setDepsQuery("");
    setDepsOpen(false);
    setExitAnim(false);
    requestAnimationFrame(() => setEnterAnim(true));
  }, [taskId, taskFromBoard]);

  // Always hydrate latest task (with closure logs) when pane opens
  useEffect(() => {
    const load = async () => {
      if (!taskId) return;
      try {
        const res = await fetch(`/api/tasks/${taskId}`);
        if (!res.ok) return;
        const fresh: TaskDTO = await res.json();
        setPaneTask(fresh);
      } catch {
        // ignore fetch errors for now
      }
    };
    load();
  }, [taskId]);
  // restore scroll position per task
  useEffect(() => {
    if (!taskId || typeof window === "undefined") return;
    const key = `taskpane-scroll-${taskId}`;
    const restore = () => {
      const y = Number(window.localStorage.getItem(key) || "0");
      if (scrollRef.current) {
        scrollRef.current.scrollTop = y;
      }
    };
    // run twice to handle late content height changes
    requestAnimationFrame(restore);
    setTimeout(restore, 50);
  }, [taskId, paneTask, subVersion]);
  const breadcrumbs = useMemo(() => {
    const items: TaskDTO[] = [];
    let current: TaskDTO | null = paneTask;
    const map = board?.board.tasks || {};
    const seen = new Set<string>();
    while (current && !seen.has(current.id)) {
      items.unshift(current);
      seen.add(current.id);
      const nextId = current.primaryParentId || current.parentTaskIds?.[0];
      if (!nextId) break;
      current = map[nextId] || null;
    }
    return items;
  }, [paneTask, board?.board.tasks]);
  const closureLogs = useMemo(
    () =>
      (paneTask?.closureLogs || []).slice().sort((a, b) => {
        return new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime();
      }),
    [paneTask?.closureLogs]
  );
  const parentTaskIds = paneTask?.parentTaskIds || [];
  const primaryParentId = paneTask?.primaryParentId || null;
  const parentTasks = parentTaskIds
    .map((id) => board?.board.tasks[id])
    .filter(Boolean) as TaskDTO[];
  const searchTasks = useCallback(
    (term: string) => {
      const needle = term.toLowerCase().trim();
      const list = Object.values(board?.board.tasks || {}).filter((t) => t.id !== paneTask?.id);
      if (!needle) return list.slice(0, 8);
      return list
        .filter((t) => t.title.toLowerCase().includes(needle) || t.id.toLowerCase().includes(needle))
        .slice(0, 8);
    },
    [board?.board.tasks, paneTask?.id]
  );

  const parentOptions = useMemo(() => searchTasks(parentQuery), [parentQuery, searchTasks]);
  const dependencies = paneTask?.dependencyExternalIds || [];
  const depOptions = useMemo(() => searchTasks(depsQuery), [depsQuery, searchTasks]);

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
      if (!paneTask || !board || paneTask.closedAt) return;
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

  const handleClose = useCallback(() => {
    if (exitAnim) return;
    setExitAnim(true);
    setEnterAnim(false);
    setTimeout(onClose, 250);
  }, [exitAnim, onClose]);

  const commitIfChanged = useCallback(
    (key: keyof TaskDTO | string, next: any) => {
      if (!paneTask || paneTask.closedAt) return;
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

  const confirmAndSetParents = useCallback(
    async (nextIds: string[]) => {
      if (!paneTask || paneTask.closedAt) return;
      const current = paneTask.parentTaskIds || [];
      const same =
        current.length === nextIds.length &&
        current.every((id) => nextIds.includes(id));
      if (same) return;
      const ok = window.confirm(`Update parents to ${nextIds.length ? nextIds.join(", ") : "(none)"}?`);
      if (!ok) {
        setParentOpen(false);
        return;
      }
      await runSave("parentTaskIds", { parentTaskIds: nextIds });
      if (paneTask.primaryParentId && !nextIds.includes(paneTask.primaryParentId)) {
        await runSave("primaryParentId", { primaryParentId: null });
      }
      setParentOpen(false);
      setParentQuery("");
    },
    [paneTask, runSave]
  );

  const confirmAndSetPrimary = useCallback(
    async (nextId: string | null) => {
      if (!paneTask || paneTask.closedAt) return;
      if (nextId && !paneTask.parentTaskIds.includes(nextId)) {
        const ok = window.confirm("Set as primary and add to parents?");
        if (!ok) return;
        await runSave("parentTaskIds", { parentTaskIds: Array.from(new Set([...paneTask.parentTaskIds, nextId])) });
      }
      await runSave("primaryParentId", { primaryParentId: nextId });
    },
    [paneTask, runSave]
  );

  const confirmAndSetDeps = useCallback(
    async (nextIds: string[]) => {
      if (!paneTask || paneTask.closedAt) return;
      const ok = window.confirm(`Update dependencies to ${nextIds.join(", ") || "(none)" } ?`);
      if (!ok) return;
      await runSave("dependencyExternalIds", { dependencyExternalIds: nextIds });
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
  const isClosed = Boolean(paneTask.closedAt);

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
  ] as const;

  const doneCount = (paneTask.subtasks || []).filter((s: any) => s.completed).length;
  const totalCount = (paneTask.subtasks || []).length;

  return (
    <>
      {/* BACKDROP */}
      <div
        ref={backdropRef}
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${enterAnim ? "opacity-100" : "opacity-0"}`}
        aria-hidden="true"
      />
      {/* PANEL */}
      <aside
        key={paneTask.id}
        role="dialog"
        aria-modal="true"
        className={`fixed right-0 top-0 h-full w-full md:w-[70%] bg-white z-50 shadow-2xl flex flex-col transform transition-all duration-300 ${
          exitAnim ? "opacity-0 translate-x-6" : enterAnim ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"
        }`}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
          }
        }}
        onClick={(e) => e.stopPropagation()}
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
            disabled={isClosed}
          />
          <div className="text-xs text-gray-500 mt-1 space-y-2">
            <div>Created: {dtLabel(paneTask.createdAt)}</div>
            {closureLogs.length > 0 && (
              <div className="space-y-1">
                {closureLogs.map((log, idx) => (
                  <div key={log.id} className="flex flex-col text-[11px] text-gray-700 border rounded px-2 py-1 bg-gray-50">
                    <div>{idx === 0 ? "Closed" : "Closed again"}: {dtLabel(log.closedAt)}</div>
                    {log.reopenedAt && <div>Reopened: {dtLabel(log.reopenedAt)}</div>}
                    {log.reopenReason && <div className="text-gray-800">Reason: {log.reopenReason}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
          <button
            className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-100"
            onClick={handleClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-6"
          onScroll={(e) => {
            if (!paneTask || typeof window === "undefined") return;
            const key = `taskpane-scroll-${paneTask.id}`;
            window.localStorage.setItem(key, String((e.currentTarget as HTMLDivElement).scrollTop));
          }}
        >
          {/* Description */}
          <section>
            <Field label="Description" status={fieldStatus["description"]} disabled={isClosed}>
              <textarea
                className="w-full border rounded-xl p-3"
                rows={6}
                defaultValue={paneTask.description || ""}
                onBlur={(e) => commitIfChanged("description", e.currentTarget.value)}
                disabled={isClosed}
                placeholder="Describe the task. Markdown supported."
              />
            </Field>
          </section>

          {/* Details grid */}
          <section>
            <h4 className="text-sm font-semibold mb-2">Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Parent tasks" status={fieldStatus["parentTaskIds"]} disabled={isClosed}>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {parentTasks.length === 0 && <span className="text-gray-500">None</span>}
                    {parentTasks.map((pt) => (
                      <span
                        key={pt.id}
                        className={`inline-flex items-center gap-2 px-2 py-1 rounded-full border ${pt.id === primaryParentId ? "bg-yellow-50 border-yellow-300" : "bg-gray-100"}`}
                      >
                        {!isClosed && (
                          <button
                            type="button"
                            className={`text-[11px] ${pt.id === primaryParentId ? "text-yellow-600" : "text-gray-400"} hover:text-yellow-700`}
                            title={pt.id === primaryParentId ? "Primary parent" : "Set as primary"}
                            onClick={() => confirmAndSetPrimary(pt.id)}
                          >
                            ★
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-gray-800 underline"
                          onClick={() => onOpenTask(pt.id)}
                        >
                          {pt.title || pt.id}
                        </button>
                        {!isClosed && (
                          <button
                            type="button"
                            className="text-[11px] text-gray-500 hover:text-red-600"
                            onClick={() => confirmAndSetParents(parentTaskIds.filter((id) => id !== pt.id))}
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <input
                      className="border rounded-xl px-3 py-2 w-full pr-16"
                      value={parentQuery}
                      placeholder="Search tasks by title or ID"
                      onChange={(e) => {
                        setParentQuery(e.target.value);
                        setParentOpen(true);
                      }}
                      onFocus={() => setParentOpen(true)}
                      onBlur={() => setTimeout(() => setParentOpen(false), 150)}
                      disabled={isClosed}
                    />
                    {parentTaskIds.length > 0 && !isClosed && (
                      <div className="absolute inset-y-0 right-2 flex items-center gap-2 pr-1">
                        <button
                          type="button"
                          className="text-[11px] text-gray-500 hover:text-gray-800"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => confirmAndSetParents([])}
                        >
                          Clear all
                        </button>
                        <button
                          type="button"
                          className="text-[11px] text-gray-500 hover:text-yellow-700"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => confirmAndSetPrimary(null)}
                          title="Clear primary"
                        >
                          ★
                        </button>
                      </div>
                    )}
                    {parentOpen && !isClosed && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow max-h-60 overflow-y-auto">
                        {parentOptions.filter((t) => !parentTaskIds.includes(t.id)).length === 0 && (
                          <div className="px-3 py-2 text-xs text-gray-500">No matches</div>
                        )}
                        {parentOptions
                          .filter((t) => !parentTaskIds.includes(t.id))
                          .map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => confirmAndSetParents(Array.from(new Set([...parentTaskIds, t.id])))}
                            >
                              <div className="font-medium text-gray-800">{t.title || "Untitled"}</div>
                              <div className="text-[11px] text-gray-500">{t.id}</div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </Field>
              {meta.map((m) => (
                <MetaField
                  key={m.key as string}
                  label={m.label}
                  value={m.toView ? m.toView(paneTask[m.key as keyof TaskDTO]) : (paneTask[m.key as keyof TaskDTO] as any)}
                  type={(m as any).type}
                  options={(m as any).options}
                  readOnly={(m as any).readOnly || isClosed}
                  step={(m as any).step}
                  status={fieldStatus[m.key as string]}
                  onCommit={(val: any) => {
                    if ((m as any).readOnly || isClosed) return;
                    const v = m.toSend ? m.toSend(val) : val;
                    commitIfChanged(m.key as string, v);
                  }}
                  disabled={isClosed}
                />
              ))}
              {/* Dependencies picker */}
              <Field label="Dependencies (IDs)" status={fieldStatus["dependencyExternalIds"]} disabled={isClosed}>
                <div className="space-y-2">
                  {dependencies.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {dependencies.map((d) => (
                        <a
                          key={d}
                          href={`/task/${d}`}
                          className="px-2 py-1 rounded-full bg-gray-100 border text-gray-700 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {board?.board.tasks[d]?.title || d}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <input
                      className="border rounded-xl px-3 py-2 w-full pr-16"
                    value={depsQuery}
                    onChange={(e) => {
                      setDepsQuery(e.target.value);
                      setDepsOpen(true);
                    }}
                    onFocus={() => setDepsOpen(true)}
                    onBlur={() => setTimeout(() => setDepsOpen(false), 150)}
                    placeholder="Search tasks by title or ID"
                    disabled={isClosed}
                  />
                  {dependencies.length > 0 && !isClosed && (
                    <button
                        type="button"
                        className="absolute inset-y-0 right-2 text-xs text-gray-500 hover:text-gray-800"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => confirmAndSetDeps([])}
                      >
                        Clear
                      </button>
                    )}
                    {depsOpen && !isClosed && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow max-h-60 overflow-y-auto">
                        {depOptions.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-gray-500">No matches</div>
                        ) : (
                          depOptions.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                const next = Array.from(new Set([...dependencies, t.id]));
                                confirmAndSetDeps(next);
                              }}
                            >
                              <div className="font-medium text-gray-800">{t.title || "Untitled"}</div>
                              <div className="text-[11px] text-gray-500">{t.id}</div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Field>
            </div>
          </section>

          {/* Time tracking */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Start time" status={fieldStatus["startAt"]} disabled={isClosed}>
              <input
                type="datetime-local"
                className="border rounded-xl px-3 py-2 w-full"
                defaultValue={toLocalInput(paneTask.startAt)}
                readOnly={isClosed}
                onBlur={(e) => commitIfChanged("startAt", e.currentTarget.value || null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commitIfChanged("startAt", (e.currentTarget as HTMLInputElement).value || null);
                  }
                }}
              />
            </Field>
            <Field label="End time" status={fieldStatus["endAt"]} disabled={isClosed}>
              <input
                type="datetime-local"
                className="border rounded-xl px-3 py-2 w-full"
                defaultValue={toLocalInput(paneTask.endAt)}
                readOnly={isClosed}
                onBlur={(e) => commitIfChanged("endAt", e.currentTarget.value || null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commitIfChanged("endAt", (e.currentTarget as HTMLInputElement).value || null);
                  }
                }}
              />
            </Field>
            <Field label="Logged hours" status={fieldStatus["logHours"]} disabled={isClosed}>
              <div className="flex items-center gap-2">
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
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  Subtasks: {Number((paneTask.subtasks || []).reduce((sum, s) => sum + Number(s.logHours || 0), 0)).toFixed(2)} h
                </span>
                <span className="text-xs text-gray-700 whitespace-nowrap font-semibold">
                  Total: {Number(Number(paneTask.logHours || 0) + (paneTask.subtasks || []).reduce((sum, s) => sum + Number(s.logHours || 0), 0)).toFixed(2)} h
                </span>
              </div>
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

        {/* Footer: Import + Export + Close/Reopen */}
        <div className="p-4 border-t flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
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
            <a className="underline text-sm" href={`/api/tasks/${paneTask.id}/export?format=csv`}>
              Export CSV
            </a>
            <a className="underline text-sm" href={`/api/tasks/${paneTask.id}/export?format=xlsx`}>
              Export Excel
            </a>
            {importMsg && <span className="text-xs text-gray-600">{importMsg}</span>}
          </div>

          <div className="ml-auto flex items-center gap-3">
            {!isClosed ? (
              <button
                type="button"
                className="text-sm text-red-600 flex items-center gap-1 hover:underline"
                onClick={async () => {
                  if (!paneTask) return;
                  const ok = window.confirm("Archive this task? This will mark it closed.");
                  if (!ok) return;
                  try {
                    await board?.deleteTask(paneTask.id);
                    handleClose();
                  } catch (e: any) {
                    alert(e?.message || "Failed to delete task");
                  }
                }}
                aria-label="Close task"
                title="Close task"
              >
                ✕ Close task
              </button>
            ) : (
              <button
                type="button"
                className="text-sm text-blue-700 flex items-center gap-1 hover:underline"
                onClick={() => setShowReopenModal(true)}
                aria-label="Reopen task"
                title="Reopen task"
              >
                ↺ Reopen
              </button>
            )}
          </div>
        </div>
      </aside>

      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowReopenModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-sm font-semibold">Reopen task</h3>
            <p className="text-sm text-gray-600">Provide a reason for reopening. It will be logged with the task.</p>
            <textarea
              className="w-full border rounded-lg px-3 py-2"
              rows={3}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Reason for reopening"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                onClick={() => setShowReopenModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white disabled:opacity-50"
                disabled={!reopenReason.trim()}
                onClick={async () => {
                  if (!paneTask || !reopenReason.trim()) return;
                  try {
                    const updated = await board?.reopenTask(paneTask.id, reopenReason.trim());
                    if (updated) setPaneTask(updated);
                    setShowReopenModal(false);
                    setReopenReason("");
                  } catch (e: any) {
                    alert(e?.message || "Failed to reopen");
                  }
                }}
              >
                Confirm reopen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ————— presentational building blocks ————— */

function EditableTitle({ title, onSave, status, disabled }: { title: string; onSave: (v: string) => void; status?: InlineStatus; disabled?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(title);

  useEffect(() => setVal(title), [title]);

  if (!editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-lg font-semibold truncate">{title}</h2>
        {!disabled && (
          <button className="text-xs underline" onClick={() => setEditing(true)}>
          Edit
        </button>
        )}
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

function Field({ label, children, status, disabled }: { label: string; children: React.ReactNode; status?: InlineStatus; disabled?: boolean }) {
  return (
    <label className="text-xs block">
      <div className="mb-1 text-gray-600 flex items-center gap-2">
        <span>{label}</span>
      </div>
      <div className={disabled ? "opacity-60 pointer-events-none" : ""}>{children}</div>
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
  disabled,
}: {
  label: string;
  value: any;
  type?: "text" | "number" | "select" | "textarea" | "combo";
  options?: string[];
  readOnly?: boolean;
  step?: number;
  status?: InlineStatus;
  onCommit: (val: any) => void;
  disabled?: boolean;
}) {
  return (
    <Field label={label} status={status} disabled={disabled}>
      {readOnly ? (
        <div className="px-3 py-2 bg-gray-50 rounded-xl border">{value || "—"}</div>
      ) : type === "combo" ? (
        <ComboField value={value} options={options || []} onCommit={onCommit} disabled={disabled} />
      ) : type === "select" ? (
        <select
          className="border rounded-xl px-3 py-2 w-full"
          defaultValue={value || ""}
          disabled={disabled}
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
          disabled={disabled}
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
          disabled={disabled}
          onBlur={(e) => onCommit(e.currentTarget.value)}
        />
      ) : (
        <input
          className="border rounded-xl px-3 py-2 w-full"
          defaultValue={value || ""}
          disabled={disabled}
          onBlur={(e) => onCommit(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommit((e.currentTarget as HTMLInputElement).value);
          }}
        />
      )}
    </Field>
  );
}

function ComboField({ value, options, onCommit, disabled }: { value: string; options: string[]; onCommit: (v: string) => void; disabled?: boolean }) {
  const [input, setInput] = useState(value || "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setInput(value || "");
  }, [value]);

  const merged = useMemo(
    () => Array.from(new Set([...(options || []), input || value || ""])).filter(Boolean),
    [options, input, value]
  );

  const filtered = useMemo(() => {
    const term = input.toLowerCase();
    if (!term) return merged;
    return merged.filter((o) => o.toLowerCase().includes(term));
  }, [merged, input]);

  const commit = (val: string) => {
    setInput(val);
    onCommit(val);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        className="border rounded-xl px-3 py-2 w-full pr-8"
        disabled={disabled}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit(input);
          }
        }}
        placeholder="Status"
      />
      <button
        type="button"
        className="absolute inset-y-0 right-1 px-2 text-gray-500 hover:text-gray-800"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => !disabled && setOpen((v) => !v)}
        aria-label="Toggle status options"
        disabled={disabled}
      >
        ▾
      </button>
      {open && !disabled && (
        <div className="absolute mt-1 z-10 w-full rounded-lg border bg-white shadow">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No options</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(o)}
              >
                {o}
              </button>
            ))
          )}
        </div>
      )}
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
