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
export async function addMap({ id, name, width, height }: Map) {
  const res = await fetch(
    `${process.env.BACKEND_URL ?? ""}/map/${id}`,
    {
      method: "POST",
      body: JSON.stringify({ name: name, width: width, height: height }),
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
 * Updates a map in the system.
 * 
 * @param id - The unique identifier of the map to update
 * @param width - The new width of the map in units
 * @param height - The new height of the map in units
 * 
 * @throws {Error} Throws an error if the API request fails or returns a non-ok response
 *
 * @returns Promise<void> - Resolves when the map is successfully updated and cache is revalidated
 */
export async function updateMap(id: string, width: number, height: number) {
  const res = await fetch(
    `${process.env.BACKEND_URL ?? ""}/map/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ width, height }),
    }
  );
  if (!res.ok) {
    throw new Error("Failed to update map");
  }
  revalidatePath("/map");
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
