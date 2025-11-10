"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

// Adjust to your real Task shape
export type Task = {
  id: string;
  title: string;
  description?: string;
  createdAt?: string | Date;
  closedAt?: string | Date;
  startAt?: string | Date | null;
  endAt?: string | Date | null;
  logHours?: number;
  externalId?: string;
  state?: string;
  status?: string;
  priority?: "" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  estimatedSec?: number;
  notes?: string;
  dependencyExternalIds?: string[]; 
  subtasks?: Array<{ id: string; title: string; completed?: boolean }>;
};

export type PanePatch = Partial<Task> & { id?: string };

type CtxValue = {
  task: Task | null;
  openPane: (task: Task) => void;
  closePane: () => void;

  /** Merge fields into the currently opened task (local, optimistic). */
  updateInPane: (patch: PanePatch) => void;

  /** Broadcast a change so the board (and others) can sync. */
  notifyUpdated: (patch: PanePatch) => void;

  /** Subscribe to broadcasts; returns an unsubscribe. */
  subscribe: (fn: (patch: PanePatch) => void) => () => void;
};

const Ctx = createContext<CtxValue | null>(null);

export default function TaskPaneProvider({ children }: { children: React.ReactNode }) {
  const [task, setTask] = useState<Task | null>(null);
  const subs = useRef(new Set<(p: PanePatch) => void>());

  const openPane = useCallback((t: Task) => {
    setTask(t);
  }, []);

  const closePane = useCallback(() => {
    setTask(null);
  }, []);

  const updateInPane = useCallback((patch: PanePatch) => {
    setTask((prev) => (prev ? ({ ...prev, ...patch } as Task) : prev));
  }, []);

  const notifyUpdated = useCallback((patch: PanePatch) => {
    subs.current.forEach((fn) => fn(patch));
  }, []);

  const subscribe = useCallback((fn: (patch: PanePatch) => void) => {
    subs.current.add(fn);
    return () => subs.current.delete(fn);
  }, []);

  const value = useMemo<CtxValue>(
    () => ({
      task,
      openPane,
      closePane,
      updateInPane,
      notifyUpdated,
      subscribe,
    }),
    [task, openPane, closePane, updateInPane, notifyUpdated, subscribe]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTaskPane() {
  const v = useContext(Ctx);
  if (!v) throw new Error("TaskPaneProvider missing");
  return v;
}
