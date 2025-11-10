"use client";
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type TaskPatch = { id: string } & Partial<{
  title: string;
  description: string;
  state: string;
  status: string;
  priority: string | null;
  xp: number;
  estimatedSec: number;
  notes: string;
  startAt: string | null;
  endAt: string | null;
  logHours: number;
}>;

type Listener = (patch: TaskPatch) => void;

type CtxValue = {
  isOpen: boolean;
  task: any | null;
  open: (task: any) => void;
  close: () => void;

  /** NEW: subscribe to task patches emitted by the pane */
  subscribe: (fn: Listener) => () => void;
  /** NEW: notify board/components that a task changed */
  notifyUpdated: (patch: TaskPatch) => void;
};

const Ctx = createContext<CtxValue | null>(null);

export default function TaskPaneProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [task, setTask] = useState<any | null>(null);

  const listenersRef = useRef<Set<Listener>>(new Set());

  const subscribe = useCallback<CtxValue["subscribe"]>((fn) => {
    listenersRef.current.add(fn);
    return () => listenersRef.current.delete(fn);
  }, []);

  const notifyUpdated = useCallback<CtxValue["notifyUpdated"]>((patch) => {
    for (const l of listenersRef.current) l(patch);
  }, []);

  const open = useCallback((t: any) => {
    setTask(t);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  const value = useMemo<CtxValue>(
    () => ({ isOpen, task, open, close, subscribe, notifyUpdated }),
    [isOpen, task, open, close, subscribe, notifyUpdated]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTaskPane() {
  const v = useContext(Ctx);
  if (!v) throw new Error("TaskPaneProvider missing");
  return v;
}
