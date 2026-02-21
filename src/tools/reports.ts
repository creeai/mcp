import { z } from "zod";
import * as ecuro from "../client/ecuro.js";

function text(content: unknown): { content: [{ type: "text"; text: string }] } {
  return {
    content: [{ type: "text", text: typeof content === "string" ? content : JSON.stringify(content, null, 2) }],
  };
}

export const tools = [
  {
    name: "export_csv",
    config: {
      title: "Exportar CSV de consultas",
      description: "Relatório CSV. clinicId obrigatório. Opcionais: startDate, endDate (YYYY-MM-DD), appointmentId, patientId, nonApiExclusive. Disponível 20h-8h BRT.",
      inputSchema: z.object({
        clinicId: z.string().uuid(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        appointmentId: z.string().uuid().optional(),
        patientId: z.string().uuid().optional(),
        nonApiExclusive: z.boolean().optional(),
      }),
    },
    handler: async (args: Record<string, unknown>) => {
      const q: Record<string, string> = {};
      for (const [k, v] of Object.entries(args)) {
        if (v !== undefined) q[k] = String(v);
      }
      const result = await ecuro.get("/csv", q);
      return text(result);
    },
  },
  {
    name: "apireport",
    config: {
      title: "Relatório CSV EcuroLight",
      description: "Relatório detalhado de consultas. clinicId obrigatório. Opcionais: startDate, endDate, appointmentId, patientId, nonApiExclusive. Máximo 31 dias.",
      inputSchema: z.object({
        clinicId: z.string().uuid(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        appointmentId: z.string().uuid().optional(),
        patientId: z.string().uuid().optional(),
        nonApiExclusive: z.boolean().optional(),
      }),
    },
    handler: async (args: Record<string, unknown>) => {
      const q: Record<string, string> = {};
      for (const [k, v] of Object.entries(args)) {
        if (v !== undefined) q[k] = String(v);
      }
      return text(await ecuro.get("/apireport", q));
    },
  },
  {
    name: "list_boletos",
    config: {
      title: "Listar boletos com filtros",
      description: "clinicId obrigatório. Opcionais: patientId, dentistId, issueStartDate, issueEndDate, dueStartDate, dueEndDate, status[], minValue, maxValue, dueSoon (today|week|month), overdue, orderBy, page, pageSize.",
      inputSchema: z.object({
        clinicId: z.string().uuid(),
        patientId: z.string().uuid().optional(),
        dentistId: z.string().uuid().optional(),
        issueStartDate: z.string().optional(),
        issueEndDate: z.string().optional(),
        dueStartDate: z.string().optional(),
        dueEndDate: z.string().optional(),
        status: z.array(z.string()).optional(),
        minValue: z.number().optional(),
        maxValue: z.number().optional(),
        dueSoon: z.enum(["today", "week", "month"]).optional(),
        overdue: z.boolean().optional(),
        orderBy: z.string().optional(),
        page: z.number().optional(),
        pageSize: z.number().optional(),
      }),
    },
    handler: async (args: Record<string, unknown>) => text(await ecuro.post("/list-boletos", args)),
  },
];
