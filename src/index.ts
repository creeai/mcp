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
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version",
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

/** Verifica se o body é um pedido de initialize (JSON-RPC method === "initialize"). */
function isInitializeBody(body: unknown): boolean {
  if (Array.isArray(body)) {
    return body.some((m) => (m as { method?: string })?.method === "initialize");
  }
  return (body as { method?: string })?.method === "initialize";
}

type SessionEntry = {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
  createdAt: number;
};

/** Cria um novo par McpServer + Transport (uma sessão por usuário). */
async function createMcpSession(): Promise<SessionEntry> {
  const server = new McpServer(
    { name: "mcp-ecuro-light", version: "1.0.0" },
    { capabilities: {} }
  );
  registerAllTools(server);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  await server.connect(transport);
  return { server, transport, createdAt: Date.now() };
}

const MAX_SESSIONS = Math.max(1, parseInt(process.env.MAX_MCP_SESSIONS ?? "100", 10));

async function main() {
  const sessions = new Map<string, SessionEntry>();

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
        const sessionId = req.headers["mcp-session-id"] as string | undefined;
        const sessionIdNorm = sessionId?.trim() || undefined;

        logger.mcp(`${req.method} ${path}`, sessionIdNorm ? { sessionId: sessionIdNorm.slice(0, 8) + "…" } : undefined);

        try {
          let parsedBody: unknown;
          if (req.method === "POST") {
            parsedBody = await readBody(req);
          }

          const isInitialize = req.method === "POST" && isInitializeBody(parsedBody);
          const entry = sessionIdNorm ? sessions.get(sessionIdNorm) : undefined;

          if (isInitialize) {
            if (entry) {
              entry.transport.close().catch(() => {});
              entry.server.close().catch(() => {});
              sessions.delete(sessionIdNorm!);
            }
            if (sessions.size >= MAX_SESSIONS) {
              let oldestId: string | null = null;
              let oldest = Infinity;
              for (const [id, e] of sessions) {
                if (e.createdAt < oldest) {
                  oldest = e.createdAt;
                  oldestId = id;
                }
              }
              if (oldestId) {
                const old = sessions.get(oldestId)!;
                old.transport.close().catch(() => {});
                old.server.close().catch(() => {});
                sessions.delete(oldestId);
                logger.mcp("sessão antiga removida (limite)", { sessionId: oldestId.slice(0, 8) + "…" });
              }
            }
            const newEntry = await createMcpSession();
            await newEntry.transport.handleRequest(req, res, parsedBody);
            if (newEntry.transport.sessionId) {
              sessions.set(newEntry.transport.sessionId, newEntry);
              logger.mcp("nova sessão criada", { sessionId: newEntry.transport.sessionId.slice(0, 8) + "…", total: sessions.size });
            }
          } else {
            if (!entry) {
              logger.mcp("sessão não encontrada", { sessionId: sessionIdNorm });
              if (!res.headersSent) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    jsonrpc: "2.0",
                    error: { code: -32000, message: "Bad Request: Unknown or expired session. Send initialize first." },
                    id: null,
                  })
                );
              }
              return;
            }
            if (req.method === "POST") {
              await entry.transport.handleRequest(req, res, parsedBody);
            } else {
              await entry.transport.handleRequest(req, res);
            }
          }
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
    for (const [, entry] of sessions) {
      entry.transport.close().catch(() => {});
      await entry.server.close().catch(() => {});
    }
    sessions.clear();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
