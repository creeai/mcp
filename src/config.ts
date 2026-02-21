/**
 * Configuração do servidor MCP e da API Ecuro Light.
 * Variáveis de ambiente: ECURO_BASE_URL, ECURO_APP_ACCESS_TOKEN, PORT.
 */

function getEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getEnvOptional(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

export const config = {
  /** Base URL da API Ecuro Light (ex: https://clinics.api.ecuro.com.br/api/v1/ecuro-light) */
  ecuroBaseUrl: getEnv("ECURO_BASE_URL").replace(/\/$/, ""),
  /** Token de acesso (header app-access-token) */
  ecuroAppAccessToken: getEnv("ECURO_APP_ACCESS_TOKEN"),
  /** Porta do servidor HTTP (default 3000) */
  port: parseInt(getEnvOptional("PORT", "3000"), 10),
} as const;
