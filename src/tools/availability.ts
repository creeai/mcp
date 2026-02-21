import { z } from "zod";
import * as ecuro from "../client/ecuro.js";

function text(content: unknown): { content: [{ type: "text"; text: string }] } {
  return {
    content: [{ type: "text", text: typeof content === "string" ? content : JSON.stringify(content, null, 2) }],
  };
}

export const tools = [
  {
    name: "specialty_availability",
    config: {
      title: "Disponibilidade por especialidade",
      description: "Horários disponíveis por especialidade. clinicId obrigatório. Opcionais: specialtyId, doctorId, duration, concurrent, durationAware, startDate, endDate. Horários em BRT.",
      inputSchema: z.object({
        clinicId: z.string().uuid(),
        specialtyId: z.string().uuid().optional(),
        doctorId: z.string().optional(),
        duration: z.number().optional(),
        concurrent: z.number().optional(),
        durationAware: z.boolean().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    },
    handler: async (args: Record<string, unknown>) => {
      const q: Record<string, string | number | boolean> = {};
      for (const [k, v] of Object.entries(args)) {
        if (v !== undefined) q[k] = v as string | number | boolean;
      }
      return text(await ecuro.get("/specialty-availability", q));
    },
  },
  {
    name: "clinic_dates",
    config: {
      title: "Datas livres da clínica",
      description: "Datas e horários livres. dateMin, dateMax (YYYY-MM-DD), clinicId.",
      inputSchema: z.object({
        dateMin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dateMax: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        clinicId: z.string().uuid(),
      }),
    },
    handler: async (args: Record<string, string>) =>
      text(await ecuro.get("/dates", args as Record<string, string>)),
  },
  {
    name: "blockers_for_clinic",
    config: {
      title: "Bloqueadores da clínica",
      description: "Bloqueadores de clínica e dentistas para os próximos 3 meses.",
      inputSchema: z.object({ clinicId: z.string().uuid() }),
    },
    handler: async (args: { clinicId: string }) =>
      text(await ecuro.post("/blockers-for-a-clinic", args)),
  },
  {
    name: "dentist_availability",
    config: {
      title: "Disponibilidade do dentista",
      description: "Disponibilidade detalhada de um dentista em uma data. dentistId e date (YYYY-MM-DD).",
      inputSchema: z.object({
        dentistId: z.string(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    },
    handler: async (args: { dentistId: string; date: string }) =>
      text(await ecuro.post("/dentist-availabilty", { dentistId: args.dentistId, date: args.date })),
  },
];
