"use server";

import { Plugin, CompileResult } from "@/components/plugins/types";
import { revalidatePath } from "next/cache";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

/**
 * Fetches all available plugins from the backend
 * 
 * @returns Promise<Plugin[]> - Array of plugins with their status
 */
export async function getPlugins(): Promise<Plugin[]> {
  try {
    const [pluginsRes, enabledRes] = await Promise.all([
      fetch(`${BACKEND_URL}/plugins`, { cache: "no-store" }),
      fetch(`${BACKEND_URL}/enabled-plugins`, { cache: "no-store" })
    ]);

    if (!pluginsRes.ok || !enabledRes.ok) {
      throw new Error("Failed to fetch plugins");
    }

    const pluginIds: string[] = await pluginsRes.json();
    const enabledIds: string[] = await enabledRes.json();

    // Check which plugins have source code
    const plugins: Plugin[] = await Promise.all(
      pluginIds.map(async (id) => {
        let hasSource = false;
        try {
          const sourceRes = await fetch(`${BACKEND_URL}/plugins/${id}/source`, {
            cache: "no-store"
          });
          // Check if response is OK and has non-empty body
          if (sourceRes.ok) {
            const sourceText = await sourceRes.text();
            hasSource = sourceText.length > 0;
          }
        } catch {
          hasSource = false;
        }

        const status = enabledIds.includes(id)
          ? 'enabled'
          : 'available';

        return {
          id,
          status,
          hasSource
        };
      })
    );

    return plugins;
  } catch (error) {
    console.error("Failed to fetch plugins:", error);
    return [];
  }
}

/**
 * Fetches the list of enabled plugins
 * 
 * @returns Promise<string[]> - Array of enabled plugin IDs
 */
export async function getEnabledPlugins(): Promise<string[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/enabled-plugins`, { 
      cache: "no-store" 
    });

    if (!res.ok) {
      throw new Error("Failed to fetch enabled plugins");
    }

    return await res.json();
  } catch (error) {
    console.error("Failed to fetch enabled plugins:", error);
    return [];
  }
}

/**
 * Updates which plugins are enabled
 * 
 * @param ids - Array of plugin IDs to enable
 */
export async function enablePlugins(ids: string[]): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/enabled-plugins`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(ids)
  });

  if (!res.ok) {
    throw new Error("Failed to enable plugins");
  }

  revalidatePath("/plugins");
}

/**
 * Invokes a plugin with the given context
 * 
 * @param id - Plugin ID to invoke
 * @param context - JSON string context to pass to the plugin
 */
export async function invokePlugin(id: string, context: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/invoke/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: context
  });

  if (!res.ok) {
    throw new Error("Failed to invoke plugin");
  }

  revalidatePath("/plugins");
}

/**
 * Revalidate the plugins page after an upload
 * Called from client after successful upload
 */
export async function revalidatePlugins(): Promise<void> {
  revalidatePath("/plugins");
}

/**
 * Fetches the source code for a plugin
 * 
 * @param id - Plugin ID
 * @returns Promise<string> - Source code
 */
export async function getPluginSource(id: string): Promise<string> {
  try {
    const res = await fetch(`${BACKEND_URL}/plugins/${id}/source`, {
      cache: "no-store"
    });

    if (!res.ok) {
      return "";
    }

    return await res.text();
  } catch (error) {
    console.error("Failed to fetch plugin source:", error);
    return "";
  }
}

/**
 * Saves plugin source code
 * 
 * @param id - Plugin ID
 * @param source - Source code to save
 */
export async function savePluginSource(id: string, source: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/plugins/${id}/source`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain"
    },
    body: source
  });

  if (!res.ok) {
    throw new Error("Failed to save plugin source");
  }

  revalidatePath("/plugins");
}

/**
 * Compiles a plugin from source code
 * 
 * @param id - Plugin ID
 * @param source - Source code to compile (optional, will use saved source if not provided)
 * @returns Promise<CompileResult> - Compilation result
 */
export async function compilePlugin(id: string, source?: string): Promise<CompileResult> {
  const body = source || "";
  
  const res = await fetch(`${BACKEND_URL}/plugins/${id}/compile`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain"
    },
    body
  });

  if (!res.ok) {
    return {
      success: false,
      output: "",
      errors: "Failed to compile plugin"
    };
  }

  const result: CompileResult = await res.json();
  revalidatePath("/plugins");
  return result;
}

/**
 * Hot-loads (or reloads) a plugin
 * 
 * @param id - Plugin ID
 */
export async function hotLoadPlugin(id: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/plugins/${id}/reload`, {
    method: "POST"
  });

  if (!res.ok) {
    throw new Error("Failed to hot-load plugin");
  }

  revalidatePath("/plugins");
}

/**
 * Deletes a plugin (source and compiled files)
 * 
 * @param id - Plugin ID
 */
export async function deletePlugin(id: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/plugins/${id}`, {
    method: "DELETE"
  });

  if (!res.ok) {
    throw new Error("Failed to delete plugin");
  }

  revalidatePath("/plugins");
}

/**
 * Fetches the plugin template code
 * 
 * @returns Promise<string> - Template code
 */
export async function getPluginTemplate(): Promise<string> {
  try {
    const res = await fetch(`${BACKEND_URL}/plugins/template`, {
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error("Failed to fetch plugin template");
    }

    return await res.text();
  } catch (error) {
    console.error("Failed to fetch plugin template:", error);
    return "";
  }
}

