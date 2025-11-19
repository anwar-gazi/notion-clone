"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { TaskDTO } from "@/types/data";

export type PanePatch = Partial<TaskDTO> & { id?: string };

type CtxValue = {
  task: TaskDTO | null;
  openPane: (task: TaskDTO) => void;
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
  const [task, setTask] = useState<TaskDTO | null>(null);
  const subs = useRef(new Set<(p: PanePatch) => void>());

  const openPane = useCallback((t: TaskDTO) => {
    setTask(t);
  }, []);

  const closePane = useCallback(() => {
    setTask(null);
  }, []);

  const updateInPane = useCallback((patch: PanePatch) => {
    setTask((prev) => (prev ? ({ ...prev, ...patch } as TaskDTO) : prev));
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
