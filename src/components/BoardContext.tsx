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

    const patchTask = useCallback((id: Id, patch: Partial<TaskDTO>) => {
        dispatch({ type: "PATCH_TASK", id, patch });
    }, [dispatch]);

    const moveTask = useCallback((id: Id, toColumnId: Id) => {
        dispatch({ type: "MOVE_TASK", id, toColumnId });
    }, [dispatch]);

    const saveTask = useCallback(async (id: Id, patch: Partial<TaskDTO>) => {
        // optimistic update first
        patchTask(id, patch);
        // then persist (handle errors as needed)
        await fetch("/api/tasks", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...patch }),
        });
    }, [patchTask]);

    const contextValue: BoardContextDTO = useMemo(() => ({ board, patchTask, moveTask, saveTask }), [board, patchTask, moveTask, saveTask]);

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