"use server";

import { revalidatePath } from "next/cache";
import type { Task, TaskAssignment } from "@/components/tasks/types";

export interface CreateTaskParams {
  mapId: string;
  targetPosition: [number, number];
  priority?: number;
  description?: string;
  moduleIds: string[];
}

/**
 * Create a new task for a map
 */
export async function createTask(params: CreateTaskParams): Promise<void> {
  const res = await fetch(`${process.env.BACKEND_URL ?? ""}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mapId: params.mapId,
      targetPosition: params.targetPosition,
      priority: params.priority ?? 0,
      description: params.description ?? "",
      moduleIds: params.moduleIds,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to create task: ${error}`);
  }

  revalidatePath("/simulation");
}

/**
 * Get all tasks for a specific map
 */
export async function getTasks(mapId: string): Promise<Task[]> {
  const res = await fetch(
    `${process.env.BACKEND_URL ?? ""}/tasks?mapId=${mapId}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch tasks");
  }

  const data = await res.json();
  return data.tasks || [];
}

/**
 * Assign tasks to robots using specified algorithm
 */
export async function assignTasks(
  mapId: string,
  algorithm: "greedy" | "optimal" | "balanced" = "optimal"
): Promise<TaskAssignment[]> {
  const res = await fetch(
    `${process.env.BACKEND_URL ?? ""}/tasks/assign?mapId=${mapId}&algorithm=${algorithm}`,
    {
      method: "POST",
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Backend error:", errorText);
    throw new Error(`Failed to assign tasks: ${errorText}`);
  }

  const data = await res.json();
  return data.assignments || [];
}

/**
 * Get current task assignments for a map
 */
export async function getTaskAssignments(mapId: string): Promise<TaskAssignment[]> {
  const res = await fetch(
    `${process.env.BACKEND_URL ?? ""}/tasks/assignments?mapId=${mapId}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch task assignments");
  }

  const data = await res.json();
  return data.assignments || [];
}

/**
 * Batch create multiple tasks at once
 */
export async function createMultipleTasks(
  tasks: CreateTaskParams[]
): Promise<void> {
  const promises = tasks.map((task) => createTask(task));
  await Promise.all(promises);
  revalidatePath("/simulation");
}
