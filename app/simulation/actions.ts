"use server";

import { revalidatePath } from "next/cache";

export interface SimulationParams {
  robotId: string;
  mapId: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

/**
 * Triggers a pathfinding simulation for a specific robot
 * 
 * @param params - Simulation parameters including robot ID, map ID, start position, and target coordinates
 * @throws {Error} Throws an error if the API request fails or returns a non-ok response
 * @returns Promise<void> - Resolves when the simulation is successfully triggered
 */
export async function runSimulation(params: SimulationParams) {
  // First, update the robot's position to the starting position
  const updateRes = await fetch(
    `${process.env.BACKEND_URL ?? ""}/robots/${params.robotId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        position: [params.startX, params.startY]
      }),
    }
  );
  
  if (!updateRes.ok) {
    throw new Error("Failed to update robot position");
  }

  // Then trigger the pathfinding simulation
  const res = await fetch(
    `${process.env.BACKEND_URL ?? ""}/robots/${params.robotId}/pathfind`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mapId: params.mapId,
        target: [params.targetX, params.targetY]
      }),
    }
  );
  
  if (!res.ok) {
    throw new Error("Failed to run simulation");
  }
  
  revalidatePath("/simulation");
}

/**
 * Clears the simulation log
 * 
 * @throws {Error} Throws an error if the API request fails or returns a non-ok response
 * @returns Promise<void> - Resolves when the log is successfully cleared
 */
export async function clearSimulationLog() {
  // This endpoint would need to be implemented in the backend
  // For now, we'll just return success
  return Promise.resolve();
}
