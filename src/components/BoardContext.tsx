"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { JSX } from "react";
import { useReducer, useCallback } from "react";
import { TaskDTO, ColumnDTO, BoardDTO, Actions, BoardContextDTO } from "@/types/data";

import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

type Id = string;

function reducer(state: BoardDTO, action: Actions): BoardDTO {
    switch (action.type) {
        case "HYDRATE":
            return action.data;

        case "ADD_TASK": {
            const task = action.task;
            const col = state.columns[task.columnId || ""];
            if (!col) return state;
            return {
                ...state,
                tasks: { ...state.tasks, [task.id]: task },
                columns: {
                    ...state.columns,
                    [col.id]: { ...col, taskIds: [...col.taskIds, task.id] },
                },
            };
        }

        case "PATCH_TASK": {
            const t = state.tasks[action.id];
            if (!t) return state;
            const nextTasks = { ...state.tasks, [action.id]: { ...t, ...action.patch } };

            // If column changed, update membership arrays
            if (action.patch.columnId && action.patch.columnId !== t.columnId) {
                const from = state.columns[t.columnId!];
                const to = state.columns[action.patch.columnId];
                if (!from || !to) return { ...state, tasks: nextTasks };

                const fromIds = from.taskIds.filter((x) => x !== t.id);
                const toIds = [...to.taskIds, t.id];

                return {
                    ...state,
                    tasks: nextTasks,
                    columns: {
                        ...state.columns,
                        [from.id]: { ...from, taskIds: fromIds },
                        [to.id]: { ...to, taskIds: toIds },
                    },
                };
            }
            return { ...state, tasks: nextTasks };
        }

        // move from one column to another, returns BoardDTO
        case "MOVE_TASK": {
            const task = state.tasks[action.id];
            if (!task) return state;

            const from = state.columns[task.columnId!];
            const to = state.columns[action.toColumnId];
            if (!from || !to) return state;

            // remove from old, insert into new at index
            const fromIds = from.taskIds.filter((x) => x !== task.id);
            const toIds = [...new Set([...to.taskIds, task.id])];

            // returning the state object
            const next = {
                ...state,
                tasks: { ...state.tasks, [task.id]: { ...task, columnId: to.id } },
                columns: {
                    ...state.columns,
                    [from.id]: { ...from, taskIds: fromIds },
                    [to.id]: { ...to, taskIds: toIds },
                },
            };
            return next;
        }
    }
}

const BoardContxt = createContext<BoardContextDTO | null>(null);
export function BoardProvider({ initial, children }: { initial: BoardDTO, children: React.ReactNode }): JSX.Element {
    const [board, dispatch] = useReducer(reducer, initial);

  const createTask = useCallback(async (payload: Partial<TaskDTO> & { columnId: Id; boardId?: string; parentTaskIds?: string[] }) => {
        const res = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const created: TaskDTO = await res.json();
        if (!res.ok) {
            throw new Error((created as any)?.error || "Unable to create task");
        }
        dispatch({ type: "ADD_TASK", task: created });
        return created;
    }, [dispatch]);

    const patchTask = useCallback(async (id: Id, patch: Partial<TaskDTO>) => {
        dispatch({ type: "PATCH_TASK", id, patch });
        const res = await fetch("/api/tasks", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...patch }),
        });
        if (!res.ok) {
            let msg = "Update failed";
            try {
                const j = await res.json();
                msg = j?.error || msg;
            } catch { /* ignore */ }
            throw new Error(msg);
        }
    }, [dispatch]);

    const moveTask = useCallback(async (id: Id, toColumnId: Id) => {
        dispatch({ type: "MOVE_TASK", id, toColumnId });
        await fetch("/api/tasks", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, columnId: toColumnId }),
        });
    }, [dispatch]);

    const deleteTask = useCallback(async (id: Id) => {
        dispatch({ type: "PATCH_TASK", id, patch: { closedAt: new Date().toISOString() } as any });
        const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
        if (!res.ok) {
            let msg = "Delete failed";
            try {
                const j = await res.json();
                msg = j?.error || msg;
            } catch { /* ignore */ }
            throw new Error(msg);
        } else {
            const updated: TaskDTO = await res.json();
            dispatch({ type: "PATCH_TASK", id, patch: updated });
        }
    }, []);

    const reopenTask = useCallback(async (id: Id, reason: string) => {
        const res = await fetch(`/api/tasks/${id}/reopen`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason }),
        });
        if (!res.ok) {
            let msg = "Reopen failed";
            try {
                const j = await res.json();
                msg = j?.error || msg;
            } catch { /* ignore */ }
            throw new Error(msg);
        }
        const updated: TaskDTO = await res.json();
        dispatch({ type: "PATCH_TASK", id, patch: updated });
        return updated;
    }, []);

    const saveTask = useCallback(async (id: Id, patch: Partial<TaskDTO>) => {
        // optimistic update first
        //patchTask(id, patch);
        // then persist (handle errors as needed)
        await fetch("/api/tasks", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...patch }),
        });
    }, [patchTask]);

    const contextValue: BoardContextDTO = useMemo(
        () => ({ board, createTask, patchTask, moveTask, deleteTask, reopenTask, saveTask }),
        [board, createTask, patchTask, moveTask, deleteTask, reopenTask, saveTask]
    );

    /**
     * Now DnD: Drag-n-Drop setup
     */
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const onDragEnd = useCallback((e: DragEndEvent) => {
        const { active, over } = e;
        if (!over) return;

        const taskId = String(active.id);
        const toColId = (over.data.current?.columnId as string | undefined) ?? String(over.id);

        if (toColId) moveTask(taskId, toColId);
    }, [moveTask]);

    return <BoardContxt.Provider value={contextValue}>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
            {children}
        </DndContext>
    </BoardContxt.Provider>;
}

export function useBoard(): BoardContextDTO | null {
    const ctx = useContext(BoardContxt);
    return ctx;
}

// handy selectors
export function useTaskById(id: Id) {
    const { board } = useBoard()!;
    return board.tasks[id];
}

export function useColumnById(id: Id) {
    const { board } = useBoard()!;
    return board.columns[id];
}

/**
 * only inside the BoardContextProvider
 * @param id 
 * @returns 
 */
export function useTasksInColumn(id: Id) {
    const { board } = useBoard()!;
    const col = board.columns[id];
    return col?.taskIds.map((tid) => board.tasks[tid]) ?? [];
}
