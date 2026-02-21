import { z } from "zod";
import * as ecuro from "../client/ecuro.js";

function text(content: unknown): { content: [{ type: "text"; text: string }] } {
  return {
    content: [{ type: "text", text: typeof content === "string" ? content : JSON.stringify(content, null, 2) }],
  };
}

export const tools = [
  {
    name: "communication_mark_read",
    config: {
      title: "Marcar comunicação como lida",
      description: "Marca uma comunicação como lida pelo paciente. id é o UUID da comunicação.",
      inputSchema: z.object({ id: z.string().uuid() }),
      example: JSON.stringify({ id: "00000000-0000-0000-0000-000000000000" }, null, 2),
    },
    handler: async (args: { id: string }) =>
      text(await ecuro.put(`/communications/${args.id}/read`)),
  },
  {
    name: "onboarding_event",
    config: {
      title: "Processar evento de onboarding",
      description: "Eventos: first_login_done ou push-permission-status. username (CPF), event, timestamp (ISO). permissionStatus obrigatório para push-permission-status.",
      inputSchema: z.object({
        username: z.string(),
        event: z.enum(["first_login_done", "push-permission-status"]),
        timestamp: z.string(),
        permissionStatus: z.string().optional(),
      }),
      example: JSON.stringify({
        username: "12345678900",
        event: "first_login_done",
        timestamp: "2025-03-15T14:30:00.000Z",
      }, null, 2),
    },
    handler: async (args: Record<string, unknown>) => text(await ecuro.post("/onboarding-event", args)),
  },
];
