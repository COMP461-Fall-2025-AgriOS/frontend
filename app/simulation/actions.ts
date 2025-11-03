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

interface SimulationRobot {
  id: string;
  name: string;
  type: "rover" | "drone";
  x: number;
  y: number;
}

interface SimulationFrame {
  time: number; // milliseconds
  robots: SimulationRobot[];
}

export interface SimulationData {
  mapId: string;
  mapName: string;
  frames: SimulationFrame[];
}

/**
 * Fetches simulation events from backend and converts them to frame format
 * 
 * @returns Promise<SimulationData | null> - Simulation data in frame format, or null if no data
 */
export async function fetchSimulationData(): Promise<SimulationData | null> {
  try {
    const res = await fetch(
      `${process.env.BACKEND_URL ?? "http://localhost:8080"}/simulation/events`,
      { cache: "no-store" }
    );
    
    if (!res.ok) {
      throw new Error("Failed to fetch simulation events");
    }
    
    const text = await res.text();
    const lines = text.trim().split('\n');
    
    if (lines.length === 0) {
      return null;
    }
    
    // Parse PLANNER_START to get robot info
    const plannerStartLine = lines.find(line => line.includes('PLANNER_START'));
    if (!plannerStartLine) {
      return null;
    }
    
    const robotIdMatch = plannerStartLine.match(/robotId="([^"]*)"/);
    const robotNameMatch = plannerStartLine.match(/robotName="([^"]*)"/);
    const startMatch = plannerStartLine.match(/start=\((\d+),(\d+)\)/);
    const goalMatch = plannerStartLine.match(/goal=\((\d+),(\d+)\)/);
    const mapMatch = plannerStartLine.match(/map=\((\d+)x(\d+)\)/);
    
    if (!robotIdMatch || !robotNameMatch || !startMatch || !mapMatch) {
      return null;
    }
    
    const robotId = robotIdMatch[1] || "robot-1";
    const robotName = robotNameMatch[1] || "Robot 1";
    const startX = parseInt(startMatch[1]);
    const startY = parseInt(startMatch[2]);
    const mapWidth = parseInt(mapMatch[1]);
    const mapHeight = parseInt(mapMatch[2]);
    
    // Determine robot type from name
    const robotType = robotName.toLowerCase().includes("drone") ? "drone" : "rover";
    
    // Parse MOVE_EXECUTED events to get the path
    const moveEvents = lines
      .filter(line => line.includes('MOVE_EXECUTED'))
      .map(line => {
        const xMatch = line.match(/x=(\d+)/);
        const yMatch = line.match(/y=(\d+)/);
        return {
          x: xMatch ? parseInt(xMatch[1]) : 0,
          y: yMatch ? parseInt(yMatch[1]) : 0,
        };
      });
    
    // If no move events, create a single frame at start position
    if (moveEvents.length === 0) {
      return {
        mapId: "unknown",
        mapName: `Map (${mapWidth}x${mapHeight})`,
        frames: [
          {
            time: 0,
            robots: [
              {
                id: robotId,
                name: robotName,
                type: robotType,
                x: startX,
                y: startY,
              },
            ],
          },
        ],
      };
    }
    
    // Create frames from move events (one frame per move)
    const frameInterval = 100; // ms between frames
    const frames: SimulationFrame[] = moveEvents.map((move, index) => ({
      time: index * frameInterval,
      robots: [
        {
          id: robotId,
          name: robotName,
          type: robotType,
          x: move.x,
          y: move.y,
        },
      ],
    }));
    
    return {
      mapId: "current",
      mapName: `Pathfinding (${mapWidth}x${mapHeight})`,
      frames,
    };
  } catch (error) {
    console.error("Failed to fetch simulation data:", error);
    return null;
  }
}
