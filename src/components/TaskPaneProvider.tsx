"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type TaskPaneCtx = {
  open: boolean;
  task: any | null;
  openPane: (task: any) => void;
  closePane: () => void;
  updateInPane: (patch: Partial<any>) => void;
};

const Ctx = createContext<TaskPaneCtx | null>(null);

export function useTaskPane() {
  const v = useContext(Ctx);
  if (!v) throw new Error("TaskPaneProvider missing");
  return v;
}

export default function TaskPaneProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [task, setTask] = useState<any | null>(null);

  function openPane(t: any) {
    setTask(t);
    setOpen(true);
  }
  function closePane() {
    setOpen(false);
  }
  function updateInPane(patch: Partial<any>) {
    setTask((t: any) => (t ? { ...t, ...patch } : t));
  }

  const value = useMemo(() => ({ open, task, openPane, closePane, updateInPane }), [open, task]);

  // Close on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
