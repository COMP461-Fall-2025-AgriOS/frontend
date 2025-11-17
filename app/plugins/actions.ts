"use server";

import { Plugin, CompileResult } from "@/components/plugins/types";
import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";

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

/**
 * Fixes plugin code based on compilation errors using Claude AI
 *
 * @param code - Current plugin code
 * @param error - Compilation error message
 * @param moduleId - Module ID for the plugin
 * @returns Promise<string> - Fixed plugin code
 */
export async function fixPluginWithAI(code: string, error: string, moduleId: string): Promise<string> {
  console.log("=== fixPluginWithAI called ===");
  console.log("Input code length:", code.length);
  console.log("Error message length:", error.length);
  console.log("Module ID:", moduleId);

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const client = new Anthropic({ apiKey });

  // Extract only the actual error lines (not warnings or notes) for clarity
  const errorLines = error.split('\n').filter(line =>
    line.includes('error:') ||
    line.match(/^\s*\d+\s*\|/) // Line numbers from compiler
  ).join('\n');

  console.log("Extracted error lines:", errorLines);

  // Get the template for reference
  const template = await getPluginTemplate();
  console.log("Template fetched, length:", template.length);

  const prompt = `You are a C++ expert. Fix this compilation error.

ERROR:
${errorLines || error}

BROKEN CODE:
${code}

REFERENCE TEMPLATE:
${template}

COMMON FIXES:
- Incomplete lines (e.g., "g_" should be "g_api->log(...)")
- Missing semicolons
- Missing #include "plugins/PluginAPI.h"
- Missing extern "C" on plugin_start/plugin_stop
- Typos in variable names

CRITICAL: You MUST fix the error. Do NOT return the same broken code.

Return ONLY the complete fixed C++ code. No explanations. No markdown. No code fences.`;

  try {
    console.log("Calling Anthropic API...");
    const stream = client.messages.stream({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 32768,
      messages: [{
        role: "user",
        content: prompt
      }]
    });

    console.log("Waiting for stream response...");
    // Use finalText() to get the complete streamed response
    let fixedCode = await stream.finalText();
    console.log("Raw AI response length:", fixedCode.length);
    console.log("Raw AI response first 300 chars:", fixedCode.substring(0, 300));

    // Robust cleanup of markdown and explanatory text
    // Remove common markdown code block patterns
    fixedCode = fixedCode.replace(/```cpp\s*/g, '');
    fixedCode = fixedCode.replace(/```c\+\+\s*/g, '');
    fixedCode = fixedCode.replace(/```c\s*/g, '');
    fixedCode = fixedCode.replace(/```\s*/g, '');

    // Remove common prefixes that AI might add
    fixedCode = fixedCode.replace(/^Here'?s? the fixed code:?\s*/i, '');
    fixedCode = fixedCode.replace(/^Fixed code:?\s*/i, '');
    fixedCode = fixedCode.replace(/^The corrected code:?\s*/i, '');

    // Trim whitespace
    fixedCode = fixedCode.trim();

    console.log("Cleaned AI response length:", fixedCode.length);
    console.log("Cleaned AI response first 300 chars:", fixedCode.substring(0, 300));

    // Validate that we got C++ code (starts with #include or has extern "C")
    if (!fixedCode.includes('#include') && !fixedCode.includes('extern "C"')) {
      console.error("AI response doesn't look like C++ code:", fixedCode.substring(0, 200));
      throw new Error("AI did not return valid C++ code. Please try again.");
    }

    // Check if code actually changed
    if (fixedCode === code) {
      console.error("CRITICAL: AI returned identical code!");
      console.error("First 500 chars of returned code:", fixedCode.substring(0, 500));
      console.error("Error that was sent to AI:", errorLines || error);

      // Extract line number from error for helpful message
      const lineMatch = error.match(/(\d+):\d+: error:/);
      const lineNum = lineMatch ? lineMatch[1] : "unknown";

      throw new Error(
        `AI couldn't fix the error automatically. Manual fix needed:\n` +
        `Line ${lineNum} appears to be incomplete. ` +
        `Check the editor for incomplete statements (like "g_" instead of "g_api->log(...)"). ` +
        `Or try regenerating the entire plugin.`
      );
    }

    console.log("Code was modified by AI");
    console.log("Changes made:", code.length, "->", fixedCode.length, "chars");
    console.log("=== fixPluginWithAI returning successfully ===");
    return fixedCode;
  } catch (error) {
    console.error("Failed to fix plugin code:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to fix plugin code");
  }
}

/**
 * Generates plugin code using Claude AI based on a description
 *
 * @param description - Description of what the plugin should do
 * @param moduleId - Module ID for the plugin
 * @returns Promise<string> - Generated plugin code
 */
export async function generatePluginWithAI(description: string, moduleId: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const client = new Anthropic({ apiKey });

  // Get the template to use as reference
  const template = await getPluginTemplate();

  const prompt = `Generate ONLY compilable C++ code for an AgriOS plugin. No markdown, no explanations.

REQUEST: ${description}

TEMPLATE (follow this structure exactly):
${template}

CRITICAL RULES:
1. Output ONLY C++ source code - nothing else
2. Every { must have a matching }
3. Every if/else must be complete
4. All statements must end with semicolons
5. Include these headers: "plugins/PluginAPI.h", <string>, <cstring>
6. Must have: extern "C" int plugin_start(...) and extern "C" void plugin_stop()
7. Module ID: "${moduleId}"

START CODE NOW (no preamble, no markdown):`;

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 32768,
      messages: [{
        role: "user",
        content: prompt
      }]
    });

    // Use finalText() to get the complete streamed response
    let rawCode = await stream.finalText();

    console.log("=== RAW AI RESPONSE ===");
    console.log("Length:", rawCode.length);
    console.log("Full response:\n", rawCode);
    console.log("=== END RAW RESPONSE ===");

    // More robust cleanup - extract code from markdown blocks if present
    let code = rawCode;

    // If wrapped in markdown code block, extract just the code
    const codeBlockMatch = code.match(/```(?:cpp|c\+\+|c)?\s*\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      code = codeBlockMatch[1];
      console.log("Extracted code from markdown block");
    } else {
      // Manual cleanup if no proper code block
      code = code.replace(/```cpp\s*/g, '');
      code = code.replace(/```c\+\+\s*/g, '');
      code = code.replace(/```c\s*/g, '');
      code = code.replace(/```\s*/g, '');
    }

    // Remove explanatory text before/after code
    code = code.replace(/^Here'?s? .*?:\s*/i, '');
    code = code.replace(/^Generated .*?:\s*/i, '');
    code = code.replace(/^The .*?:\s*/i, '');

    // Remove any trailing explanations (text after the last closing brace)
    const lastBrace = code.lastIndexOf('}');
    if (lastBrace !== -1) {
      const afterBrace = code.substring(lastBrace + 1).trim();
      if (afterBrace && !afterBrace.startsWith('//')) {
        // If there's non-comment text after last }, it's probably explanation
        code = code.substring(0, lastBrace + 1);
        console.log("Removed trailing explanation");
      }
    }

    code = code.trim();

    console.log("=== CLEANED CODE ===");
    console.log("Length:", code.length);
    console.log("First 500 chars:\n", code.substring(0, 500));
    console.log("Last 300 chars:\n", code.substring(code.length - 300));
    console.log("=== END CLEANED ===");

    // Validate that we got C++ code
    if (!code.includes('#include') || !code.includes('extern "C"')) {
      console.error("AI response doesn't look like valid C++ plugin code");
      throw new Error("AI did not return valid C++ plugin code. Please try again.");
    }

    // Basic syntax validation
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;

    if (openBraces !== closeBraces) {
      console.error(`Brace mismatch: ${openBraces} open, ${closeBraces} close`);
      throw new Error(`Generated code has unbalanced braces (${openBraces} open, ${closeBraces} close). Try generating again.`);
    }

    console.log(`Validation passed: ${openBraces} matched braces`);
    return code;
  } catch (error) {
    console.error("Failed to generate plugin code:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to generate plugin code");
  }
}
