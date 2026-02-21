/**
 * Cliente HTTP para a API Ecuro Light.
 * Todas as requisições usam app-access-token e accept: application/json.
 */

import { config } from "../config.js";
import { logger } from "../logger.js";

const DEFAULT_HEADERS = {
  accept: "application/json",
  "app-access-token": config.ecuroAppAccessToken,
  "Content-Type": "application/json",
} as const;

export type EcuroGetOptions = {
  /** Se true, devolve o corpo como texto (ex: CSV) em vez de JSON */
  responseAsText?: boolean;
};

/** Monta a URL completa: base + path (evita que new URL("/path", base) substitua o path do base). */
function buildFullUrl(path: string, query?: Record<string, string | number | boolean | undefined>): URL {
  const base = config.ecuroBaseUrl.replace(/\/$/, "");
  const pathNorm = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(base + "/" + pathNorm);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url;
}

/**
 * GET para a API Ecuro. Retorna JSON por padrão.
 */
export async function get(
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
  options?: EcuroGetOptions
): Promise<unknown> {
  const url = buildFullUrl(path, query);
  logger.ecuro("GET", { path, query });
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { ...DEFAULT_HEADERS },
  });
  const raw = await res.text();
  if (!res.ok) {
    logEcuroError("GET", url.toString(), res.status, raw);
    throw new Error(buildErrorWithBody(path, raw, res.statusText));
  }
  logger.ecuro("GET ok", { path, status: res.status });
  if (options?.responseAsText) return raw;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
    return raw;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

/**
 * POST para a API Ecuro.
 */
export async function post(path: string, body?: object): Promise<unknown> {
  const url = buildFullUrl(path);
  logger.ecuro("POST", { path });
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { ...DEFAULT_HEADERS },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await res.text();
  if (!res.ok) {
    logEcuroError("POST", url.toString(), res.status, raw);
    throw new Error(buildErrorWithBody(path, raw, res.statusText));
  }
  logger.ecuro("POST ok", { path, status: res.status });
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
    return raw;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

/**
 * PUT para a API Ecuro.
 */
export async function put(path: string, body?: object): Promise<unknown> {
  const url = buildFullUrl(path);
  logger.ecuro("PUT", { path });
  const res = await fetch(url.toString(), {
    method: "PUT",
    headers: { ...DEFAULT_HEADERS },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await res.text();
  if (!res.ok) {
    logEcuroError("PUT", url.toString(), res.status, raw);
    throw new Error(buildErrorWithBody(path, raw, res.statusText));
  }
  logger.ecuro("PUT ok", { path, status: res.status });
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function logEcuroError(method: string, fullUrl: string, status: number, body: string): void {
  logger.ecuroError("Erro na resposta Ecuro", { method, fullUrl, status, body: body.slice(0, 500) });
}

function buildErrorMessage(path: string, raw: string, statusText: string): string {
  let message = statusText;
  if (raw) {
    try {
      const json = JSON.parse(raw) as { error?: string; message?: string };
      message = json.error ?? json.message ?? message;
    } catch {
      message = raw;
    }
  }
  return `Ecuro API ${path}: ${message}`;
}

/** Expõe o body completo no erro para o painel exibir (formato que inclui body bruto). */
export function buildErrorWithBody(path: string, raw: string, statusText: string): string {
  const summary = buildErrorMessage(path, raw, statusText);
  if (!raw) return summary;
  return `${summary}\n\n--- Body completo da resposta ---\n${raw}`;
}
