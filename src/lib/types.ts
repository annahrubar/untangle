export type Priority = "high" | "medium" | "low";

export type ParsedTask = {
  title: string;
  priority: Priority;
  deadline: string | null; // ISO date "YYYY-MM-DD" or null
  subtasks?: ParsedTask[];
};

export type Task = {
  id: string;
  rawInput: string;
  title: string;
  priority: Priority;
  deadline: string | null; // ISO datetime
  done: boolean;
  parentId: string | null;
  createdAt: string;
  subtasks?: Task[];
};

export type RecommendItem = {
  id: string;
  title: string;
  why: string;
};
