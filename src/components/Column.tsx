"use client";
import { useDroppable } from "@dnd-kit/core";
import { useState, useMemo, type FormEvent } from "react";
import TaskCard from "./TaskCard";
import { ColumnDTO, TaskDTO } from "@/types/data";
import { useBoard, useTasksInColumn } from "./BoardContext";

/**
 * TODO optimize the number of times it is rendered
 * @param param0 
 * @returns 
 */
export default function Column({ column, onOpenTask }: { column: ColumnDTO; onOpenTask: (id: string) => void }) {
  const tasks = useTasksInColumn(column.id).filter(t => !(t.parentTaskIds && t.parentTaskIds.length));
  const boardCtx = useBoard();
  const [showModal, setShowModal] = useState(false);
  const [animateModal, setAnimateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    state: "",
    status: "",
    priority: "",
    xp: "",
    estimatedHours: "",
    dependencies: "",
    startAt: "",
    endAt: "",
    logHours: "",
    externalId: "",
  });

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', columnId: column.id }
  });

  const priorityOptions = useMemo(() => ["", "LOW", "MEDIUM", "HIGH", "CRITICAL"], []);

  if (!boardCtx) return null;

  // modal animation helpers
  const openModal = () => {
    setShowModal(true);
    requestAnimationFrame(() => setAnimateModal(true));
  };

  const closeModal = (opts?: { reset?: boolean }) => {
    setAnimateModal(false);
    setTimeout(() => {
      setShowModal(false);
      if (opts?.reset !== false) resetForm();
    }, 220);
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      state: "",
      status: "",
      priority: "",
      xp: "",
      estimatedHours: "",
      dependencies: "",
      startAt: "",
      endAt: "",
      logHours: "",
      externalId: "",
    });
    setError(null);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!boardCtx) return;
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description || undefined,
        state: form.state || undefined,
        status: form.status || undefined,
        priority: form.priority || undefined,
        xp: form.xp ? parseInt(form.xp, 10) || 0 : 0,
        estimatedSec: form.estimatedHours ? Math.round(parseFloat(form.estimatedHours) * 3600) : 0,
        dependencyExternalIds: form.dependencies
          ? form.dependencies.split(/[ ,;]+/).filter(Boolean)
          : [],
        startAt: form.startAt || undefined,
        endAt: form.endAt || undefined,
        logHours: form.logHours ? parseFloat(form.logHours) : 0,
        externalId: form.externalId || undefined,
        columnId: column.id,
        boardId: boardCtx.board.id,
        parentTaskIds: [],
      };
      await boardCtx.createTask(payload as any);
      resetForm();
      closeModal({ reset: false });
    } catch (err: any) {
      setError(err?.message || "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-4 flex flex-col h-full">
      <header className="font-semibold mb-2 flex items-center justify-between">
        <span>{column.name}</span><span className="text-sm text-gray-400">{tasks.length}</span>
      </header>
      <div
        ref={setNodeRef}
        className={`space-y-3 min-h-[40px] p-1 rounded flex-1 ${isOver ? "ring-2 ring-black/40" : ""
          }`}
      >
        {tasks.map((task: TaskDTO) => (<TaskCard key={task.id} task={task} onOpen={onOpenTask} />))}
      </div>
      <footer className="mt-3 pt-3 border-t border-dashed border-gray-200">
        <button
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-dashed border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100 text-sm font-medium hover:border-black hover:text-black transition"
          onClick={openModal}
        >
          <span className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-black text-white">+</span>
            Add task
          </span>
          <span className="text-xs text-gray-500">Quick capture</span>
        </button>
      </footer>

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4 py-6 overflow-y-auto">
          <div
            className="absolute inset-0 bg-black/40 transition-opacity duration-200 ease-out"
            style={{ opacity: animateModal ? 1 : 0 }}
            onClick={() => closeModal()}
          />
          <div
            className={`relative z-50 w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ease-out transform max-h-[90vh] flex flex-col ${animateModal ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-white via-gray-50 to-white">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">New Task</p>
                <p className="text-sm text-gray-600">in {column.name}</p>
              </div>
              <button
                className="text-sm text-gray-500 hover:text-black"
                onClick={() => closeModal()}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Title *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/70"
                    placeholder="Write a clear, concise task name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 min-h-[90px] focus:outline-none focus:ring-2 focus:ring-black/70"
                    placeholder="Details, context, acceptance criteria..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">State</label>
                  <input
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g. backlog"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Status</label>
                  <input
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g. open"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                  >
                    {priorityOptions.map((p) => (
                      <option key={p || "none"} value={p}>{p || "None"}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">External ID</label>
                  <input
                    value={form.externalId}
                    onChange={(e) => setForm({ ...form, externalId: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Jira/GitHub/etc."
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">XP</label>
                  <input
                    type="number"
                    value={form.xp}
                    onChange={(e) => setForm({ ...form, xp: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Estimated hours</label>
                  <input
                    type="number"
                    step="0.25"
                    value={form.estimatedHours}
                    onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g. 4"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start at</label>
                  <input
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End at</label>
                  <input
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Logged hours</label>
                  <input
                    type="number"
                    step="0.25"
                    value={form.logHours}
                    onChange={(e) => setForm({ ...form, logHours: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Dependencies</label>
                  <input
                    value={form.dependencies}
                    onChange={(e) => setForm({ ...form, dependencies: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="IDs separated by commas"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="text-sm px-3 py-2 rounded-lg border hover:bg-gray-50"
                  onClick={() => closeModal()}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="text-sm px-4 py-2 rounded-lg bg-black text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Creating…" : "Create task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
