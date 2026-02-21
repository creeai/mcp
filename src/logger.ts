/**
 * Logger para debug da aplicação.
 * Formato: [ISO timestamp] [categoria] mensagem [dados opcionais]
 */

const LOG_LEVEL = (process.env.LOG_LEVEL ?? "info").toLowerCase(); // debug | info | warn | error

const levels = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = levels[LOG_LEVEL as keyof typeof levels] ?? 1;

function ts(): string {
  return new Date().toISOString();
}

function log(level: keyof typeof levels, category: string, message: string, data?: unknown): void {
  if (levels[level] < currentLevel) return;
  const prefix = `[${ts()}] [${category}]`;
  if (data !== undefined) {
    const dataStr = typeof data === "object" ? JSON.stringify(data) : String(data);
    console[level === "debug" ? "log" : level](`${prefix} ${message}`, dataStr.length > 200 ? dataStr.slice(0, 200) + "..." : dataStr);
  } else {
    console[level === "debug" ? "log" : level](`${prefix} ${message}`);
  }
}

export const logger = {
  http: (message: string, data?: unknown) => log("info", "HTTP", message, data),
  httpDebug: (message: string, data?: unknown) => log("debug", "HTTP", message, data),
  mcp: (message: string, data?: unknown) => log("info", "MCP", message, data),
  mcpDebug: (message: string, data?: unknown) => log("debug", "MCP", message, data),
  panel: (message: string, data?: unknown) => log("info", "PANEL", message, data),
  ecuro: (message: string, data?: unknown) => log("info", "ECURO", message, data),
  ecuroError: (message: string, data?: unknown) => log("error", "ECURO", message, data),
  tool: (message: string, data?: unknown) => log("info", "TOOL", message, data),
  toolError: (message: string, data?: unknown) => log("error", "TOOL", message, data),
  warn: (category: string, message: string, data?: unknown) => log("warn", category, message, data),
  error: (category: string, message: string, data?: unknown) => log("error", category, message, data),
};
