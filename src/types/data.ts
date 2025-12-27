//export type TaskData = { id: string; title: string; columnId: string, subtaskCount: number, subtasksDone: number, subtasks: TaskData[] };
//export type ColumnData = { id: string; name: string; tasks: TaskData[] };

export type BoardContextDTO = {
  board: BoardDTO; // board data

  // actions
  patchTask: (id: string, patch: Partial<TaskDTO>) => Promise<void>;
  createTask: (
    payload: Partial<TaskDTO> & { columnId: string; boardId?: string; parentTaskIds?: string[] }
  ) => Promise<TaskDTO>;
  deleteTask: (id: string) => Promise<void>;
  reopenTask: (id: string, reason: string) => Promise<TaskDTO>;
  moveTask: (id: string, toColumnId: string) => void;
  // optional server syncs
  saveTask: (id: string, patch: Partial<TaskDTO>) => Promise<void>;
};

export type BoardDTO = {
  id: string,
  name: string,
  columns: Record<string, ColumnDTO>,
  tasks: Record<string, TaskDTO> // taskId key, taskDTO value
  //tasks: TaskDTO[],
  //columnOrder: Id[];
};

// Optional helper (used by board)
export type ColumnDTO = {
  id: string;
  name: string;
  taskIds: string[],
  //tasks: TaskDTO[];
};

// Unified Task type. A "subtask" is any task with one or more parents.
export type TaskDTO = {
  id: string;
  title: string;
  description: string;

  // Kanban placement
  columnId?: string | null;

  // Parent pointers (subtasks if non-empty, top-level if empty)
  parentTaskIds: string[];

  // Simple progress fields you already had around the app
  completed: boolean;
  state: string;
  status: string;
  priority: "" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  xp: number;
  estimatedSec: number; // store seconds
  dependencyExternalIds: string[];

  // Timing
  startAt: string | null; // ISO
  endAt: string | null;   // ISO
  logHours: number;
  closureLogs: TaskClosureDTO[];

  // Timestamps
  createdAt: string; // ISO
  closedAt: string | null;

  // Optional when hydrating a single task
  subtasks: TaskDTO[];
};


export type Actions =
  | { type: "ADD_TASK"; task: TaskDTO }
  | { type: "PATCH_TASK"; id: string; patch: Partial<TaskDTO> }
  | { type: "MOVE_TASK"; id: string; toColumnId: string }
  | { type: "HYDRATE"; data: BoardDTO };

export type TaskClosureDTO = {
  id: string;
  closedAt: string;
  reopenedAt: string | null;
  reopenReason: string | null;
};
