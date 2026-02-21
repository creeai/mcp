/**
 * Cliente HTTP para a API Ecuro Light.
 * Todas as requisições usam app-access-token e accept: application/json.
 */

import { config } from "../config.js";

const DEFAULT_HEADERS = {
  accept: "application/json",
  "app-access-token": config.ecuroAppAccessToken,
  "Content-Type": "application/json",
} as const;

export type EcuroGetOptions = {
  /** Se true, devolve o corpo como texto (ex: CSV) em vez de JSON */
  responseAsText?: boolean;
};

/**
 * GET para a API Ecuro. Retorna JSON por padrão.
 */
export async function get(
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
  options?: EcuroGetOptions
): Promise<unknown> {
  const url = new URL(path, config.ecuroBaseUrl);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { ...DEFAULT_HEADERS },
  });
  await ensureOk(res, path);
  if (options?.responseAsText) {
    return await res.text();
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
    return await res.text();
  }
  return (await res.json()) as unknown;
}

/**
 * POST para a API Ecuro.
 */
export async function post(path: string, body?: object): Promise<unknown> {
  const url = new URL(path, config.ecuroBaseUrl);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { ...DEFAULT_HEADERS },
    body: body ? JSON.stringify(body) : undefined,
  });
  await ensureOk(res, path);
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
    return await res.text();
  }
  return (await res.json()) as unknown;
}

/**
 * PUT para a API Ecuro.
 */
export async function put(path: string, body?: object): Promise<unknown> {
  const url = new URL(path, config.ecuroBaseUrl);
  const res = await fetch(url.toString(), {
    method: "PUT",
    headers: { ...DEFAULT_HEADERS },
    body: body ? JSON.stringify(body) : undefined,
  });
  await ensureOk(res, path);
  return (await res.json()) as unknown;
}

async function ensureOk(res: Response, path: string): Promise<void> {
  if (res.ok) return;
  let message: string;
  try {
    const json = (await res.json()) as { error?: string; message?: string };
    message = json.error ?? json.message ?? res.statusText;
  } catch {
    message = await res.text() || res.statusText;
  }
  throw new Error(`Ecuro API ${res.status} ${path}: ${message}`);
}
