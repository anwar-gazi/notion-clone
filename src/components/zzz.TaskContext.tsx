// src/components/TaskContext.tsx
import React, { createContext, useContext, useMemo } from "react";
import { useBoard, useTaskById } from "./BoardContext";

const TaskIdContext = createContext<string | null>(null);

export function TaskProvider({ id, children }: { id: string; children: React.ReactNode }) {
    return <TaskIdContext.Provider value={id}>{children}</TaskIdContext.Provider>;
}

export function useTaskScope() {
    const id = useContext(TaskIdContext);
    if (!id) throw new Error("useTaskScope must be used within <TaskProvider>");
    const { saveTask, patchTask } = useBoard();
    const task = useTaskById(id);
    const actions = useMemo(
        () => ({
            patch: (p: Partial<typeof task>) => patchTask(id, p),
            save: (p: Partial<typeof task>) => saveTask(id, p),
            complete: () => saveTask(id, { closedAt: new Date().toISOString() as any }),
            reopen: () => saveTask(id, { closedAt: null as any }),
        }),
        [id, patchTask, saveTask]
    );
    return { id, task, ...actions };
}
