export type TaskData = { id: string; title: string; columnId: string, subtaskCount: number, subtasksDone: number, subtasks: TaskData[] };
export type ColumnData = { id: string; name: string; tasks: TaskData[] };
export type BoardData = { columns: ColumnData[] };