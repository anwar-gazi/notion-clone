// src/components/ColumnContext.tsx
import React, { createContext, useContext, useMemo } from "react";
import { useColumnById, useTasksInColumn } from "./BoardContext";

const ColumnIdContext = createContext<string | null>(null);

export function ColumnProvider({ id, children }: { id: string; children: React.ReactNode }) {
    return <ColumnIdContext.Provider value={id}>{children}</ColumnIdContext.Provider>;
}

export function useColumnScope() {
    const id = useContext(ColumnIdContext);
    if (!id) throw new Error("useColumnScope must be used within <ColumnProvider>");
    const column = useColumnById(id);
    const tasks = useTasksInColumn(id);
    return useMemo(() => ({ id, column, tasks }), [id, column, tasks]);
}
