import { z } from "zod";
import * as ecuro from "../client/ecuro.js";

function text(content: unknown): { content: [{ type: "text"; text: string }] } {
  return {
    content: [{ type: "text", text: typeof content === "string" ? content : JSON.stringify(content, null, 2) }],
  };
}

export const tools = [
  {
    name: "list_clinics",
    config: {
      title: "Listar clínicas",
      description: "Lista todas as clínicas ou uma clínica específica. clinicId opcional.",
      inputSchema: z.object({ clinicId: z.string().uuid().optional() }),
      example: "{}",
    },
    handler: async (args: { clinicId?: string }) => {
      const q: Record<string, string> = {};
      if (args.clinicId) q.clinicId = args.clinicId;
      return text(await ecuro.get("/list-clinics", q));
    },
  },
  {
    name: "list_specialties",
    config: {
      title: "Listar especialidades médicas",
      description: "Retorna todas as especialidades disponíveis.",
      inputSchema: z.object({}),
      example: "{}",
    },
    handler: async () => text(await ecuro.get("/list-specialties")),
  },
  {
    name: "active_dentists",
    config: {
      title: "Dentistas ativos da clínica",
      description: "Lista dentistas ativos da clínica. clinicId obrigatório.",
      inputSchema: z.object({ clinicId: z.string().uuid() }),
      example: JSON.stringify({ clinicId: "00000000-0000-0000-0000-000000000000" }, null, 2),
    },
    handler: async (args: { clinicId: string }) => text(await ecuro.post("/active-dentists", args)),
  },
  {
    name: "get_clinic_logo",
    config: {
      title: "Obter logo da clínica",
      description: "Retorna referência ao logo. id é o UUID do arquivo de logo.",
      inputSchema: z.object({ id: z.string().uuid() }),
      example: JSON.stringify({ id: "00000000-0000-0000-0000-000000000000" }, null, 2),
    },
    handler: async (args: { id: string }) => {
      const data = await ecuro.get(`/logo/${args.id}`) as unknown;
      return text({ success: true, logoId: args.id, message: "Logo disponível na API", data });
    },
  },
];
