import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as appointments from "./appointments.js";
import * as availability from "./availability.js";
import * as patients from "./patients.js";
import * as clinics from "./clinics.js";
import * as reports from "./reports.js";
import * as communications from "./communications.js";

const allTools = [
  ...appointments.tools,
  ...availability.tools,
  ...patients.tools,
  ...clinics.tools,
  ...reports.tools,
  ...communications.tools,
];

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
