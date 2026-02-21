import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../logger.js";
import * as appointments from "./appointments.js";
import * as availability from "./availability.js";
import * as patients from "./patients.js";
import * as clinics from "./clinics.js";
import * as reports from "./reports.js";
import * as communications from "./communications.js";

export const allTools = [
  ...appointments.tools,
  ...availability.tools,
  ...patients.tools,
  ...clinics.tools,
  ...reports.tools,
  ...communications.tools,
];

type ToolHandler = (a: Record<string, unknown>) => Promise<{ content: [{ type: "text"; text: string }] }>;

export function getToolsList(): { name: string; title: string; description: string; example: string }[] {
  return allTools.map((t) => ({
    name: t.name,
    title: t.config.title,
    description: t.config.description,
    example: (t.config as { example?: string }).example ?? "{}",
  }));
}

export async function invokeTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ success: true; text: string } | { success: false; error: string }> {
  const t = allTools.find((x) => x.name === toolName);
  if (!t) {
    logger.toolError("Tool não encontrada", { toolName });
    return { success: false, error: `Tool não encontrada: ${toolName}` };
  }
  logger.tool("invoke", { toolName, argsKeys: Object.keys(args) });
  try {
    const result = await (t.handler as ToolHandler)(args);
    const text = result.content?.[0]?.type === "text" ? result.content[0].text : JSON.stringify(result);
    logger.tool("invoke ok", { toolName, textLen: typeof text === "string" ? text.length : 0 });
    return { success: true, text };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.toolError("invoke falhou", { toolName, error: message });
    return { success: false, error: message };
  }
}

export function registerAllTools(server: McpServer): void {
  for (const t of allTools) {
    server.registerTool(
      t.name,
      {
        title: t.config.title,
        description: t.config.description,
        inputSchema: t.config.inputSchema,
      },
      async (args: unknown, _extra: unknown) => {
        const handler = t.handler as (a: Record<string, unknown>) => Promise<{ content: [{ type: "text"; text: string }] }>;
        return handler(args as Record<string, unknown>);
      }
    );
  }
}
