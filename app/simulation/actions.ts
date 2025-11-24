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
  const res = await fetch(
    `${process.env.BACKEND_URL ?? "http://localhost:8080"}/simulation/clear`,
    {
      method: "POST",
    }
  );

  if (!res.ok) {
    console.warn("Failed to clear simulation log");
  }
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
    console.log("Simulation events response:", text);
    
    // Try to parse as JSON first (backend format: {"events": [...]})
    try {
      const data = JSON.parse(text);
      const events = data.events || data; // Handle both {"events": [...]} and [...] formats
      if (Array.isArray(events)) {
        return parseJSONEvents(events);
      }
    } catch {
      // Fall back to plain text parsing
    }
    
    // Parse plain text format (old format)
    const lines = text.trim().split('\n');

    if (lines.length === 0) {
      return null;
    }

    // Build robot info map - only use FIRST PLANNER_START for each robot (initial position)
    const robotInfoMap: Map<string, { name: string; type: "rover" | "drone"; startX: number; startY: number }> = new Map();
    let mapWidth = 0;
    let mapHeight = 0;

    for (const line of lines) {
      if (line.includes('PLANNER_START')) {
        const robotIdMatch = line.match(/robotId="([^"]*)"/);
        const robotNameMatch = line.match(/robotName="([^"]*)"/);
        const startMatch = line.match(/start=\((\d+),(\d+)\)/);
        const mapMatch = line.match(/map=\((\d+)x(\d+)\)/);

        if (robotIdMatch && robotNameMatch && startMatch && mapMatch) {
          const robotId = robotIdMatch[1];
          const robotName = robotNameMatch[1];
          const startX = parseInt(startMatch[1]);
          const startY = parseInt(startMatch[2]);
          mapWidth = parseInt(mapMatch[1]);
          mapHeight = parseInt(mapMatch[2]);

          const robotType = robotName.toLowerCase().includes("drone") ? "drone" : "rover";

          // Only set if not already present (use first PLANNER_START for initial position)
          if (!robotInfoMap.has(robotId)) {
            robotInfoMap.set(robotId, { name: robotName, type: robotType, startX, startY });
          }
        }
      }
    }

    if (robotInfoMap.size === 0) {
      return null;
    }

    // Parse events in order to build paths with task dwell times
    // When a robot finishes a task (reaches destination), add dwell frames before next task
    const robotPaths: Map<string, Array<{ x: number; y: number }>> = new Map();
    const TASK_DWELL_FRAMES = 15; // Number of frames to wait at each task location

    for (const [robotId, info] of robotInfoMap.entries()) {
      robotPaths.set(robotId, [{ x: info.startX, y: info.startY }]);
    }

    // Track which robots we've seen PLANNER_START for (to detect second+ tasks)
    const robotTaskCount: Map<string, number> = new Map();

    for (const line of lines) {
      // When we see a new PLANNER_START for a robot that already has moves,
      // add dwell frames at the current position (end of previous task)
      if (line.includes('PLANNER_START')) {
        const robotIdMatch = line.match(/robotId="([^"]*)"/);
        if (robotIdMatch) {
          const robotId = robotIdMatch[1];
          const currentCount = robotTaskCount.get(robotId) || 0;
          robotTaskCount.set(robotId, currentCount + 1);

          // If this is the 2nd+ task for this robot, add dwell frames
          if (currentCount > 0 && robotPaths.has(robotId)) {
            const path = robotPaths.get(robotId)!;
            if (path.length > 0) {
              const lastPos = path[path.length - 1];
              // Add dwell frames at the task completion location
              for (let i = 0; i < TASK_DWELL_FRAMES; i++) {
                path.push({ x: lastPos.x, y: lastPos.y });
              }
            }
          }
        }
      }

      if (line.includes('MOVE_EXECUTED')) {
        const robotIdMatch = line.match(/robotId="([^"]*)"/);
        const xMatch = line.match(/x=(\d+)/);
        const yMatch = line.match(/y=(\d+)/);

        if (robotIdMatch && xMatch && yMatch) {
          const robotId = robotIdMatch[1];
          const x = parseInt(xMatch[1]);
          const y = parseInt(yMatch[1]);

          if (robotPaths.has(robotId)) {
            robotPaths.get(robotId)!.push({ x, y });
          }
        }
      }
    }

    // Add final dwell frames at the end of each robot's path (completing last task)
    for (const path of robotPaths.values()) {
      if (path.length > 0) {
        const lastPos = path[path.length - 1];
        for (let i = 0; i < TASK_DWELL_FRAMES; i++) {
          path.push({ x: lastPos.x, y: lastPos.y });
        }
      }
    }

    // Find maximum path length to determine total frames
    let maxPathLength = 0;
    for (const path of robotPaths.values()) {
      maxPathLength = Math.max(maxPathLength, path.length);
    }

    if (maxPathLength === 0) {
      return null;
    }

    // Create synchronized frames where each frame contains all robot positions
    const frameInterval = 100; // ms between frames
    const frames: SimulationFrame[] = [];

    for (let frameIndex = 0; frameIndex < maxPathLength; frameIndex++) {
      const robotsInFrame: SimulationRobot[] = [];

      for (const [robotId, info] of robotInfoMap.entries()) {
        const path = robotPaths.get(robotId)!;
        // If robot finished, keep it at final position
        const pathIndex = Math.min(frameIndex, path.length - 1);
        const pos = path[pathIndex];

        robotsInFrame.push({
          id: robotId,
          name: info.name,
          type: info.type,
          x: pos.x,
          y: pos.y,
        });
      }

      frames.push({
        time: frameIndex * frameInterval,
        robots: robotsInFrame,
      });
    }

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

function parseJSONEvents(events: any[]): SimulationData | null {
  // Build robot info map - only use FIRST PLANNER_START for each robot (initial position)
  const robotInfoMap: Map<string, { name: string; type: "rover" | "drone"; startX: number; startY: number }> = new Map();
  let mapWidth = 0;
  let mapHeight = 0;

  for (const event of events) {
    if (event.type === 'PLANNER_START') {
      const data = event.data;
      const robotIdMatch = data.match(/robotId="([^"]*)"/);
      const robotNameMatch = data.match(/robotName="([^"]*)"/);
      const startMatch = data.match(/start=\((\d+),(\d+)\)/);
      const mapMatch = data.match(/map=\((\d+)x(\d+)\)/);

      if (robotIdMatch && robotNameMatch && startMatch && mapMatch) {
        const robotId = robotIdMatch[1];
        const robotName = robotNameMatch[1];
        const startX = parseInt(startMatch[1]);
        const startY = parseInt(startMatch[2]);
        mapWidth = parseInt(mapMatch[1]);
        mapHeight = parseInt(mapMatch[2]);

        const robotType = robotName.toLowerCase().includes("drone") ? "drone" : "rover";

        // Only set if not already present (use first PLANNER_START for initial position)
        if (!robotInfoMap.has(robotId)) {
          robotInfoMap.set(robotId, { name: robotName, type: robotType, startX, startY });
        }
      }
    }
  }

  if (robotInfoMap.size === 0) {
    return null;
  }

  // Parse events in order to build paths with task dwell times
  const robotPaths: Map<string, Array<{ x: number; y: number }>> = new Map();
  const TASK_DWELL_FRAMES = 15; // Number of frames to wait at each task location

  for (const [robotId, info] of robotInfoMap.entries()) {
    robotPaths.set(robotId, [{ x: info.startX, y: info.startY }]);
  }

  // Track which robots we've seen PLANNER_START for (to detect second+ tasks)
  const robotTaskCount: Map<string, number> = new Map();

  for (const event of events) {
    // When we see a new PLANNER_START for a robot that already has moves,
    // add dwell frames at the current position (end of previous task)
    if (event.type === 'PLANNER_START') {
      const robotIdMatch = event.data.match(/robotId="([^"]*)"/);
      if (robotIdMatch) {
        const robotId = robotIdMatch[1];
        const currentCount = robotTaskCount.get(robotId) || 0;
        robotTaskCount.set(robotId, currentCount + 1);

        // If this is the 2nd+ task for this robot, add dwell frames
        if (currentCount > 0 && robotPaths.has(robotId)) {
          const path = robotPaths.get(robotId)!;
          if (path.length > 0) {
            const lastPos = path[path.length - 1];
            // Add dwell frames at the task completion location
            for (let i = 0; i < TASK_DWELL_FRAMES; i++) {
              path.push({ x: lastPos.x, y: lastPos.y });
            }
          }
        }
      }
    }

    if (event.type === 'MOVE_EXECUTED') {
      const robotIdMatch = event.data.match(/robotId="([^"]*)"/);
      const xMatch = event.data.match(/x=(\d+)/);
      const yMatch = event.data.match(/y=(\d+)/);

      if (robotIdMatch && xMatch && yMatch) {
        const robotId = robotIdMatch[1];
        const x = parseInt(xMatch[1]);
        const y = parseInt(yMatch[1]);

        if (robotPaths.has(robotId)) {
          robotPaths.get(robotId)!.push({ x, y });
        }
      }
    }
  }

  // Add final dwell frames at the end of each robot's path (completing last task)
  for (const path of robotPaths.values()) {
    if (path.length > 0) {
      const lastPos = path[path.length - 1];
      for (let i = 0; i < TASK_DWELL_FRAMES; i++) {
        path.push({ x: lastPos.x, y: lastPos.y });
      }
    }
  }

  // Find maximum path length to determine total frames
  let maxPathLength = 0;
  for (const path of robotPaths.values()) {
    maxPathLength = Math.max(maxPathLength, path.length);
  }

  if (maxPathLength === 0) {
    return null;
  }

  // Create synchronized frames where each frame contains all robot positions
  const frameInterval = 100; // ms between frames
  const frames: SimulationFrame[] = [];

  for (let frameIndex = 0; frameIndex < maxPathLength; frameIndex++) {
    const robotsInFrame: SimulationRobot[] = [];

    for (const [robotId, info] of robotInfoMap.entries()) {
      const path = robotPaths.get(robotId)!;
      // If robot finished, keep it at final position
      const pathIndex = Math.min(frameIndex, path.length - 1);
      const pos = path[pathIndex];

      robotsInFrame.push({
        id: robotId,
        name: info.name,
        type: info.type,
        x: pos.x,
        y: pos.y,
      });
    }

    frames.push({
      time: frameIndex * frameInterval,
      robots: robotsInFrame,
    });
  }

  return {
    mapId: "current",
    mapName: `Pathfinding (${mapWidth}x${mapHeight})`,
    frames,
  };
}
