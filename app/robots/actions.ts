"use server";

import { RobotType, RobotAttributes, Robot } from "@/components/robots/types";
import { revalidatePath } from "next/cache";

// Backend robot format
interface BackendRobot {
  id: string;
  name: string;
  type: RobotType;
  attributes: string;
  mapId?: string;
  position?: number[];
}

/**
 * Retrieves all robots from the system.
 * 
 * @throws {Error} Throws an error if the API request fails or returns a non-ok response
 *
 * @returns Promise<Robot[]> - A promise that resolves to an array of Robot objects
 */
export async function getRobots(): Promise<Robot[]> {
  const res = await fetch(
    `${process.env.BACKEND_URL ?? ""}/robots`,
    { 
      method: "GET",
      cache: "no-store"
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch robots");
  }

  const rawRobots: BackendRobot[] = await res.json();
  
  // Transform backend format to frontend format
  const robots: Robot[] = rawRobots.map((robot: BackendRobot) => {
    // Parse attributes string into RobotAttributes object
    let attributes: RobotAttributes = { autonomy: 0, speed: 0 };
    if (robot.attributes && typeof robot.attributes === 'string') {
      // Try to parse as JSON or extract values from string
      try {
        // If it's JSON-like, parse it
        attributes = JSON.parse(robot.attributes);
      } catch {
        // If not JSON, try to extract numbers from the string
        const autonomyMatch = robot.attributes.match(/autonomy[:\s]+(\d+\.?\d*)/i);
        const speedMatch = robot.attributes.match(/speed[:\s]+(\d+\.?\d*)/i);
        if (autonomyMatch) attributes.autonomy = parseFloat(autonomyMatch[1]);
        if (speedMatch) attributes.speed = parseFloat(speedMatch[1]);
      }
    }
    
    return {
      id: robot.id,
      name: robot.name,
      type: robot.type,
      attributes,
      mapId: robot.mapId,
      position: robot.position
    };
  });
  
  return robots;
}

/**
 * Adds multiple robots to the system with specified parameters.
 *
 * This server action creates new robots by sending a POST request to the robots API.
 * After successful creation, it revalidates the robots page cache to ensure the UI
 * displays the updated robot list.
 *
 * @param type - The type of robot to create
 * @param quantity - The number of robots to create
 * @param attributes - The robot attributes containing autonomy and speed
 * @param mapId - The ID of the map to which to add the robots
 *
 * @throws {Error} Throws an error if the API request fails or returns a non-ok response
 *
 * @returns Promise<void> - Resolves when robots are successfully created and cache is revalidated
 */
export async function addRobots(
  type: RobotType,
  quantity: number,
  attributes: RobotAttributes,
  mapId: string
) {
  // Generate an array of robots as expected by the backend
  const { v4: uuidv4 } = await import('uuid');
  
  // Format attributes as a string for the backend
  const attributesString = `autonomy: ${attributes.autonomy}, speed: ${attributes.speed}`;
  
  // Create array of robot objects
  const robotsArray = [];
  for (let i = 0; i < quantity; i++) {
    robotsArray.push({
      name: `${type}-${i + 1}`,
      id: uuidv4(),
      type: type,
      attributes: attributesString,
      mapId: mapId,
      position: [0, 0] // Starting position
    });
  }
  
  const res = await fetch(
    `${process.env.BACKEND_URL ?? ""}/robots`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(robotsArray),
    }
  );
  if (!res.ok) {
    throw new Error("Failed to add robots");
  }
  revalidatePath("/robots");
}

export async function deleteRobot(id: string) {
  const res = await fetch(
    `${process.env.BACKEND_URL ?? ""}/robots/${id}`,
    {
      method: "DELETE",
    }
  );
  if (!res.ok) {
    throw new Error("Failed to delete robot");
  }
  revalidatePath("/robots");
}

export async function updateRobotType(id: string, type: "rover" | "drone") {
  const res = await fetch(
    `${process.env.BACKEND_URL ?? ""}/robots/${id}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type }),
    }
  );
  if (!res.ok) {
    throw new Error("Failed to update robot");
  }
  revalidatePath("/robots");
}

export async function resetRobotPosition(id: string) {
  const res = await fetch(
    `${process.env.BACKEND_URL ?? ""}/robots/${id}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ position: [0, 0] }),
    }
  );
  if (!res.ok) {
    throw new Error("Failed to reset robot position");
  }
}

export async function resetAllRobotPositions(mapId: string) {
  const robots = await getRobots();
  const mapRobots = robots.filter(r => r.mapId === mapId);

  await Promise.all(
    mapRobots.map(robot => resetRobotPosition(robot.id))
  );
}
