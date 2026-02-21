import { z } from "zod";
import * as ecuro from "../client/ecuro.js";

function text(content: unknown): { content: [{ type: "text"; text: string }] } {
  return {
    content: [{ type: "text", text: typeof content === "string" ? content : JSON.stringify(content, null, 2) }],
  };
}

const ecuroBodyCreate = z.object({
  method: z.literal("create_appointment"),
  fullName: z.string().optional(),
  phoneNumber: z.string().optional(),
  clinicId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().optional(),
  dateOfBirth: z.string().optional(),
  email: z.string().email().optional(),
  specialityId: z.string().uuid().optional(),
  doctorId: z.string().optional(),
  patientId: z.string().uuid().optional(),
  socialNumber: z.string().optional(),
  notes: z.string().optional(),
  channelName: z.string().optional(),
  campaignToken: z.string().optional(),
  durationMinutes: z.number().optional(),
  maxConcurrentAppointments: z.number().optional(),
});
const ecuroBodyUpdate = z.object({
  method: z.literal("update_appointment"),
  appointmentId: z.string().uuid(),
  date: z.string().optional(),
  time: z.string().optional(),
  status: z.number().optional(),
  doctorId: z.string().optional(),
  doctorName: z.string().optional(),
  patientId: z.string().uuid().optional(),
});

export const tools = [
  {
    name: "create_appointment",
    config: {
      title: "Criar consulta",
      description: "Cria uma nova consulta (agendamento). Envie: fullName, phoneNumber, clinicId, date (YYYY-MM-DD), time (HH:MM:SS), dateOfBirth (YYYY-MM-DD). Use para criar consulta de avaliação.",
      inputSchema: ecuroBodyCreate,
      example: JSON.stringify({
        method: "create_appointment",
        clinicId: "00000000-0000-0000-0000-000000000000",
        fullName: "Maria Silva",
        phoneNumber: "11999999999",
        date: "2025-03-15",
        time: "09:00:00",
        dateOfBirth: "1990-05-20",
        email: "maria@email.com",
      }, null, 2),
    },
    handler: async (args: z.infer<typeof ecuroBodyCreate>) => text(await ecuro.post("/", args)),
  },
  {
    name: "update_appointment",
    config: {
      title: "Atualizar consulta (POST)",
      description: "Atualiza uma consulta existente via POST. Requer appointmentId e method=update_appointment.",
      inputSchema: ecuroBodyUpdate,
      example: JSON.stringify({
        method: "update_appointment",
        appointmentId: "00000000-0000-0000-0000-000000000000",
        date: "2025-03-16",
        time: "10:00:00",
      }, null, 2),
    },
    handler: async (args: z.infer<typeof ecuroBodyUpdate>) => text(await ecuro.post("/", args)),
  },
  {
    name: "confirm_appointment",
    config: {
      title: "Confirmar consulta",
      description: "Confirma uma consulta pendente. Altera status para CONFIRMED.",
      inputSchema: z.object({ appointmentId: z.string().uuid() }),
      example: JSON.stringify({ appointmentId: "00000000-0000-0000-0000-000000000000" }, null, 2),
    },
    handler: async (args: { appointmentId: string }) =>
      text(await ecuro.put("/", { appointmentId: args.appointmentId })),
  },
  {
    name: "update_appointment_full",
    config: {
      title: "Atualizar consulta (completo)",
      description: "Atualiza consulta com suporte a retorno: appointmentId, date, time, dateTime, status, doctorId, doctorName, durationMinutes, createReturnRecord, cancellationReason, notes.",
      inputSchema: z.object({
        appointmentId: z.string().uuid(),
        date: z.string().optional(),
        time: z.string().optional(),
        dateTime: z.string().optional(),
        status: z.union([z.number(), z.enum(["PENDING", "NOT_ANSWERED", "RESCHEDULED", "CONFIRMED", "CANCELED"])]).optional(),
        doctorId: z.string().optional(),
        doctorName: z.string().optional(),
        durationMinutes: z.number().optional(),
        createReturnRecord: z.boolean().optional(),
        cancellationReason: z.string().optional(),
        notes: z.string().optional(),
      }),
      example: JSON.stringify({
        appointmentId: "00000000-0000-0000-0000-000000000000",
        date: "2025-03-16",
        time: "10:00:00",
        status: "CONFIRMED",
        notes: "Paciente confirmou por telefone",
      }, null, 2),
    },
    handler: async (args: Record<string, unknown>) => text(await ecuro.put("/update-appointment", args)),
  },
  {
    name: "list_appointments_of_patient",
    config: {
      title: "Listar consultas do paciente",
      description: "Retorna histórico de consultas de um paciente.",
      inputSchema: z.object({ patientId: z.string().uuid() }),
      example: JSON.stringify({ patientId: "00000000-0000-0000-0000-000000000000" }, null, 2),
    },
    handler: async (args: { patientId: string }) => text(await ecuro.post("/list-appointments-of-patient", args)),
  },
  {
    name: "list_appointments_of_doctor",
    config: {
      title: "Listar consultas do médico",
      description: "Retorna consultas de um dentista/médico em um intervalo. dentistId, startTime e endTime em ISO.",
      inputSchema: z.object({
        dentistId: z.string(),
        startTime: z.string(),
        endTime: z.string(),
      }),
      example: JSON.stringify({
        dentistId: "00000000-0000-0000-0000-000000000000",
        startTime: "2025-03-01T00:00:00.000Z",
        endTime: "2025-03-31T23:59:59.999Z",
      }, null, 2),
    },
    handler: async (args: { dentistId: string; startTime: string; endTime: string }) =>
      text(await ecuro.post("/list-appointments-of-doctor", args)),
  },
  {
    name: "get_appointments_appid",
    config: {
      title: "Obter consultas por app/consumer",
      description: "Lista consultas do consumer. Modo 1: clinicId + appointmentId. Modo 2: clinicId + dateRange (YYYY-MM-DD,YYYY-MM-DD). Opcionais: all, status, dentistId.",
      inputSchema: z.object({
        clinicId: z.string().uuid(),
        dateRange: z.string().optional(),
        appointmentId: z.string().uuid().optional(),
        all: z.boolean().optional(),
        status: z.number().optional(),
        dentistId: z.string().optional(),
      }),
      example: JSON.stringify({
        clinicId: "00000000-0000-0000-0000-000000000000",
        dateRange: "2025-03-01,2025-03-31",
      }, null, 2),
    },
    handler: async (args: Record<string, unknown>) => {
      const q: Record<string, string> = {};
      if (args.clinicId) q.clinicId = String(args.clinicId);
      if (args.dateRange) q.dateRange = String(args.dateRange);
      if (args.appointmentId) q.appointmentId = String(args.appointmentId);
      if (args.all !== undefined) q.all = String(args.all);
      if (args.status !== undefined) q.status = String(args.status);
      if (args.dentistId) q.dentistId = String(args.dentistId);
      return text(await ecuro.get("/appointments/appid", q));
    },
  },
  {
    name: "list_returns",
    config: {
      title: "Listar registros de retorno",
      description: "Registros de retorno (reagendamento). Obrigatório: clinicId ou patientId ou initialAppointmentId. Opcionais: specialtyId, dentistId, startDate, endDate, includeRescheduled.",
      inputSchema: z.object({
        clinicId: z.string().uuid().optional(),
        patientId: z.string().uuid().optional(),
        initialAppointmentId: z.string().uuid().optional(),
        specialtyId: z.string().uuid().optional(),
        dentistId: z.string().uuid().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        includeRescheduled: z.boolean().optional(),
      }),
      example: JSON.stringify({
        clinicId: "00000000-0000-0000-0000-000000000000",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
      }, null, 2),
    },
    handler: async (args: Record<string, unknown>) => text(await ecuro.post("/list-returns", args)),
  },
];
