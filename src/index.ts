import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { config } from "./config.js";
import { registerAllTools, getToolsList, invokeTool } from "./tools/index.js";
import { getPanelHtml } from "./panelPage.js";

const HEALTH_PATH = "/health";
const MCP_PATH = "/mcp";
const PANEL_PATH = "/panel";
const PANEL_API_PATH = "/panel/api";

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
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);

  const httpServer = createServer(async (req, res) => {
    const url = req.url ?? "/";
    const path = url.split("?")[0];

    if (path === HEALTH_PATH && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
      return;
    }

    if (path === PANEL_PATH && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(getPanelHtml(PANEL_PATH, getToolsList()));
      return;
    }

    if (path === `${PANEL_API_PATH}/tools` && req.method === "GET") {
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
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "Campo 'tool' obrigatório" }));
          return;
        }
        const result = await invokeTool(tool.trim(), typeof args === "object" && args !== null ? args : {});
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(result));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Panel /test error:", message);
        if (!res.headersSent) {
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ success: false, error: message }));
        }
      }
      return;
    }

    if (path === MCP_PATH || path === "/") {
      if (req.method === "GET") {
        const accept = (req.headers["accept"] ?? "").toLowerCase();
        if (!accept.includes("text/event-stream")) {
          res.writeHead(302, { Location: PANEL_PATH });
          res.end();
          return;
        }
      }
      if (req.method === "GET" || req.method === "POST") {
        let parsedBody: unknown;
        if (req.method === "POST") {
          parsedBody = await readBody(req);
        } else {
          parsedBody = undefined;
        }
        try {
          await transport.handleRequest(req, res, parsedBody);
        } catch (err) {
          console.error("MCP handleRequest error:", err);
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

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  httpServer.listen(config.port, () => {
    console.log(`MCP Ecuro Light server listening on port ${config.port}`);
    console.log(`  Health: http://localhost:${config.port}${HEALTH_PATH}`);
    console.log(`  MCP:    http://localhost:${config.port}${MCP_PATH}`);
    console.log(`  Panel:  http://localhost:${config.port}${PANEL_PATH}`);
    if (!config.ecuroBaseUrl.includes("ecuro-light")) {
      console.warn(`  AVISO: ECURO_BASE_URL não contém "/ecuro-light". Use: https://clinics.api.ecuro.com.br/api/v1/ecuro-light`);
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
