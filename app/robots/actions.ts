"use server";

import { RobotType, RobotAttributes } from "@/lib/types";
import { revalidatePath } from "next/cache";

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
 *
 * @throws {Error} Throws an error if the API request fails or returns a non-ok response
 *
 * @returns Promise<void> - Resolves when robots are successfully created and cache is revalidated
 */
export async function addRobots(
  type: RobotType,
  quantity: number,
  attributes: RobotAttributes
) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/robots`,
    {
      method: "POST",
      body: JSON.stringify({
        type: type,
        quantity: quantity,
        attributes: attributes,
      }),
    }
  );
  if (!res.ok) {
    throw new Error("Failed to add robots");
  }
  revalidatePath("/robots");
}

export async function deleteRobot(uid: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/robots/${uid}`,
    {
      method: "DELETE",
    }
  );
  if (!res.ok) {
    throw new Error("Failed to delete robot");
  }
  revalidatePath("/robots");
}

export async function updateRobotType(uid: string, type: "rover" | "drone") {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/robots/${uid}`,
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
