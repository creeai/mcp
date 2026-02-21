import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { config } from "./config.js";
import { registerAllTools, getToolsList, invokeTool } from "./tools/index.js";
import { getPanelHtml } from "./panelPage.js";
import { logger } from "./logger.js";

const HEALTH_PATH = "/health";
const MCP_PATH = "/mcp";
const PANEL_PATH = "/panel";
const PANEL_API_PATH = "/panel/api";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
} as const;

function readBody(req: import("node:http").IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(undefined);
      }
    });
    req.on("error", reject);
  });
}

async function main() {
  const server = new McpServer(
    { name: "mcp-ecuro-light", version: "1.0.0" },
    { capabilities: {} }
  );
  registerAllTools(server);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  await server.connect(transport);

  const httpServer = createServer(async (req, res) => {
    for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v);

    if (req.method === "OPTIONS") {
      logger.httpDebug("OPTIONS preflight");
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url ?? "/";
    const path = url.split("?")[0];
    logger.http(`${req.method} ${path}`);

    if (path === HEALTH_PATH && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
      return;
    }

    if (path === PANEL_PATH && req.method === "GET") {
      logger.panel("GET panel HTML");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(getPanelHtml(PANEL_PATH, getToolsList()));
      return;
    }

    if (path === `${PANEL_API_PATH}/tools` && req.method === "GET") {
      logger.panel("GET panel api/tools");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(getToolsList()));
      return;
    }

    if (path === `${PANEL_API_PATH}/test` && req.method === "POST") {
      try {
        const body = (await readBody(req)) as { tool?: string; args?: Record<string, unknown> } | undefined;
        const tool = body?.tool;
        const args = body?.args ?? {};
        if (typeof tool !== "string" || !tool.trim()) {
          logger.panel("POST panel api/test – tool ausente", { body });
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "Campo 'tool' obrigatório" }));
          return;
        }
        logger.tool("invoke via panel", { tool, argsKeys: Object.keys(args ?? {}) });
        const result = await invokeTool(tool.trim(), typeof args === "object" && args !== null ? args : {});
        logger.panel("POST panel api/test ok", { tool, success: result.success });
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(result));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.toolError("panel api/test falhou", { message });
        if (!res.headersSent) {
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ success: false, error: message }));
        }
      }
      return;
    }

    if (path === "/") {
      if (req.method === "GET") {
        const accept = (req.headers["accept"] ?? "").toLowerCase();
        if (!accept.includes("text/event-stream")) {
          logger.http("GET / → redirect /panel");
          res.writeHead(302, { Location: PANEL_PATH });
          res.end();
          return;
        }
      }
    }
    if (path === MCP_PATH || path === "/") {
      if (req.method === "GET" || req.method === "POST") {
        logger.mcp(`${req.method} ${path}`);
        try {
          await transport.handleRequest(req, res);
          logger.mcp(`${req.method} ${path} ok`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const stack = err instanceof Error ? err.stack : undefined;
          logger.error("MCP", `handleRequest error: ${msg}`, stack ?? err);
          if (!res.headersSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                jsonrpc: "2.0",
                error: { code: -32603, message: "Internal server error" },
                id: null,
              })
            );
          }
        }
        return;
      }
    }

    logger.http("404 Not found", { path, method: req.method });
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  httpServer.listen(config.port, () => {
    logger.http(`MCP Ecuro Light server listening on port ${config.port}`);
    logger.http(`  Health: http://localhost:${config.port}${HEALTH_PATH}`);
    logger.http(`  MCP:    http://localhost:${config.port}${MCP_PATH}`);
    logger.http(`  Panel:  http://localhost:${config.port}${PANEL_PATH}`);
    if (!config.ecuroBaseUrl.includes("ecuro-light")) {
      logger.warn("CONFIG", "ECURO_BASE_URL não contém /ecuro-light", { url: config.ecuroBaseUrl });
    }
  });

  const shutdown = async () => {
    httpServer.close();
    await transport.close();
    await server.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
