"use server";

import { Map } from "@/components/maps/types";
import { revalidatePath } from "next/cache";

/**
 * Adds a new map to the system with the specified properties.
 *
 * @param map - The map object containing all required properties
 * @param map.id - The unique identifier for the map
 * @param map.name - The display name of the map
 * @param map.width - The width of the map in units
 * @param map.height - The height of the map in units
 *
 * @throws {Error} Throws an error if the API request fails or returns a non-ok response
 *
 * @returns Promise<void> - Resolves when the map is successfully created and cache is revalidated
 */
export async function addMap({ id, name, width, height, mapUrl }: Map) {
  const res = await fetch(
    `${process.env.BACKEND_URL ?? ""}/map/${id}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, width, height, mapUrl }),
    }
  );
  if (!res.ok) {
    throw new Error("Failed to add map");
  }
  revalidatePath("/map");
}

/**
 * Retrieves all maps from the system.
 * 
 * @throws {Error} Throws an error if the API request fails or returns a non-ok response
 *
 * @returns Promise<Map[]> - A promise that resolves to an array of Map objects
 */
export async function getMaps(): Promise<Map[]> {
  const res = await fetch(
    `${process.env.BACKEND_URL ?? ""}/map/`,
    { method: "GET" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch maps");
  }

  const maps: Map[] = await res.json();
  return maps;
}

/**
 * Deletes a map from the system.
 * 
 * @param id - The unique identifier of the map to delete
 * 
 * @throws {Error} Throws an error if the API request fails or returns a non-ok response
 *
 * @returns Promise<void> - Resolves when the map is successfully deleted and cache is revalidated
 */
export async function deleteMap(id: string) {
  const res = await fetch(
    `${process.env.BACKEND_URL ?? ""}/map/${id}`,
    {
      method: "DELETE",
    }
  );
  if (!res.ok) {
    throw new Error("Failed to delete map");
  }
  revalidatePath("/map");
}

/**
 * Retrieves the occupancy grid for a specific map.
 * The grid contains 0 for accessible cells and 1 for obstacles/inaccessible cells.
 * 
 * @param mapId - The unique identifier of the map
 * 
 * @returns Promise<number[][] | null> - A 2D array representing the grid, or null if not found
 */
export async function getMapGrid(mapId: string): Promise<number[][] | null> {
  try {
    const res = await fetch(
      `${process.env.BACKEND_URL ?? "http://localhost:8080"}/map/${mapId}/grid`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      console.error("Failed to fetch map grid");
      return null;
    }

    const data = await res.json();
    return data.grid || null;
  } catch (error) {
    console.error("Error fetching map grid:", error);
    return null;
  }
}
