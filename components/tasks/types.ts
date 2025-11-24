export type TaskStatus = "pending" | "assigned" | "in_progress" | "completed" | "failed";

export interface Task {
  id: string;
  description: string;
  targetPosition: [number, number]; // [x, y]
  priority: number;
  moduleIds: string[]; // Plugin IDs to execute at this location
  status?: TaskStatus;
}

export interface TaskAssignment {
  taskId: string;
  robotId: string;
}

export interface TaskArea {
  // For UI: rectangular area defined by user
  x: number;
  y: number;
  width: number;
  height: number;
  moduleIds: string[];
  priority: number;
  description: string;
}
