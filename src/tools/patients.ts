import { z } from "zod";
import * as ecuro from "../client/ecuro.js";

function text(content: unknown): { content: [{ type: "text"; text: string }] } {
  return {
    content: [{ type: "text", text: typeof content === "string" ? content : JSON.stringify(content, null, 2) }],
  };
}

export const tools = [
  {
    name: "get_patient_by_phone",
    config: {
      title: "Buscar paciente por telefone",
      description: "Busca paciente pelo número de telefone. Formatação automática.",
      inputSchema: z.object({ phone: z.string() }),
      example: JSON.stringify({ phone: "11999999999" }, null, 2),
    },
    handler: async (args: { phone: string }) => text(await ecuro.post("/get-patient-by-phone/", args)),
  },
  {
    name: "get_patient_by_cpf",
    config: {
      title: "Buscar paciente por CPF",
      description: "Busca paciente por CPF (com ou sem formatação). clinicId opcional para multi-clínica.",
      inputSchema: z.object({
        cpf: z.string(),
        clinicId: z.string().uuid().optional(),
      }),
      example: JSON.stringify({
        cpf: "12345678900",
        clinicId: "00000000-0000-0000-0000-000000000000",
      }, null, 2),
    },
    handler: async (args: { cpf: string; clinicId?: string }) => text(await ecuro.post("/get-patient-by-cpf", args)),
  },
  {
    name: "patient_details",
    config: {
      title: "Detalhes completos do paciente",
      description: "Perfil, pagamentos, consultas, procedimentos, tratamentos, comunicações. clinicId obrigatório; patientId ou cpf.",
      inputSchema: z.object({
        clinicId: z.string().uuid(),
        patientId: z.string().uuid().optional(),
        cpf: z.string().optional(),
      }),
      example: JSON.stringify({
        clinicId: "00000000-0000-0000-0000-000000000000",
        patientId: "00000000-0000-0000-0000-000000000000",
      }, null, 2),
    },
    handler: async (args: Record<string, string | undefined>) => {
      const q: Record<string, string> = {};
      if (args.clinicId) q.clinicId = args.clinicId;
      if (args.patientId) q.patientId = args.patientId;
      if (args.cpf) q.cpf = args.cpf;
      return text(await ecuro.get("/patient-details", q));
    },
  },
  {
    name: "list_patients",
    config: {
      title: "Listar pacientes com filtros",
      description: "Pelo menos um filtro: clinicId obrigatório; all, lastAppointment (YYYY-MM-DD), dateOfBirth (YYYY-MM-DD).",
      inputSchema: z.object({
        clinicId: z.string().uuid(),
        all: z.boolean().optional(),
        lastAppointment: z.string().optional(),
        dateOfBirth: z.string().optional(),
      }),
      example: JSON.stringify({
        clinicId: "00000000-0000-0000-0000-000000000000",
        all: true,
      }, null, 2),
    },
    handler: async (args: Record<string, unknown>) => {
      const q: Record<string, string> = {};
      for (const [k, v] of Object.entries(args)) {
        if (v !== undefined) q[k] = String(v);
      }
      return text(await ecuro.get("/list-patients", q));
    },
  },
  {
    name: "patient_incomplete_treatments",
    config: {
      title: "Tratamentos não completados do paciente",
      description: "Tratamentos ativos com procedimentos e histórico. patientId obrigatório.",
      inputSchema: z.object({ patientId: z.string().uuid() }),
      example: JSON.stringify({ patientId: "00000000-0000-0000-0000-000000000000" }, null, 2),
    },
    handler: async (args: { patientId: string }) =>
      text(await ecuro.post("/patient-incomplete-treatments", args)),
  },
  {
    name: "orto_patients",
    config: {
      title: "Pacientes de ortodontia por categoria",
      description: "clinicId obrigatório. category: nao-remarcados, active, inactive, atrazados, fantasma, indicacao, cancelled, finalized. Opcionais: page, pageSize, patientName, startDate, endDate.",
      inputSchema: z.object({
        clinicId: z.string().uuid(),
        category: z.enum(["nao-remarcados", "active", "inactive", "atrazados", "fantasma", "indicacao", "cancelled", "finalized"]).optional(),
        page: z.number().optional(),
        pageSize: z.number().optional(),
        patientName: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
      example: JSON.stringify({
        clinicId: "00000000-0000-0000-0000-000000000000",
        category: "active",
        page: 1,
        pageSize: 20,
      }, null, 2),
    },
    handler: async (args: Record<string, unknown>) => text(await ecuro.post("/orto-patients", args)),
  },
];
