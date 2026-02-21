# MCP Server – Ecuro Light API

**Repositório:** [github.com/creeai/mcp](https://github.com/creeai/mcp)

Servidor MCP (Model Context Protocol) que expõe as ferramentas da **API Ecuro Light** para clientes como Cursor, Claude Desktop, etc. Inclui agendamento, pacientes, disponibilidade, clínicas, relatórios e comunicações.

## Requisitos

- Node.js 20+
- Conta Ecuro com token de acesso à API

## Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `ECURO_BASE_URL` | Sim | Base URL da API (ex: `https://clinics.api.ecuro.com.br/api/v1/ecuro-light`) |
| `ECURO_APP_ACCESS_TOKEN` | Sim | Token no header `app-access-token` |
| `PORT` | Não | Porta HTTP (default: `3000`) |

Copie `.env.example` para `.env` e preencha os valores.

## Uso local

```bash
npm install
cp .env.example .env
# Edite .env com ECURO_BASE_URL e ECURO_APP_ACCESS_TOKEN
npm run build
npm start
```

- **Health:** `GET http://localhost:3000/health`
- **MCP (Streamable HTTP):** `POST http://localhost:3000/mcp` (e `GET` para SSE quando aplicável)
- **Painel de testes:** `GET http://localhost:3000/panel` — interface web para testar cada ferramenta; cada tool já vem com um JSON de exemplo pré-configurado (substitua os UUIDs pelos da sua conta)

## Conectar no Cursor / Claude

No Cursor, adicione o servidor MCP em configurações (por exemplo em `.cursor/mcp.json` ou nas configurações do projeto):

```json
{
  "mcpServers": {
    "ecuro-light": {
      "type": "streamable-http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

Para uso em VPS, use a URL pública com HTTPS se houver proxy (ex: `https://seu-dominio.com/mcp`).

## Deploy no EasyPanel (VPS)

Passo a passo completo: **[DEPLOY.md](./DEPLOY.md)** (inclui envio do código para o GitHub [creeai/mcp](https://github.com/creeai/mcp) e deploy no EasyPanel).

Resumo:
1. Envie o código para o repo **creeai/mcp** (ver comandos em `DEPLOY.md`).
2. No EasyPanel, crie um app a partir do repositório **creeai/mcp** e use **Dockerfile** como método de build.
3. Configure as variáveis: `ECURO_BASE_URL`, `ECURO_APP_ACCESS_TOKEN`; `PORT` opcional.
4. Exponha a porta (ex.: 3000) e use `GET /health` como health check (opcional).

## Ferramentas expostas (27)

- **Agendamento:** create_appointment, update_appointment, confirm_appointment, update_appointment_full, list_appointments_of_patient, list_appointments_of_doctor, get_appointments_appid, list_returns
- **Disponibilidade:** specialty_availability, clinic_dates, blockers_for_clinic, dentist_availability
- **Pacientes:** get_patient_by_phone, get_patient_by_cpf, patient_details, list_patients, patient_incomplete_treatments, orto_patients
- **Clínicas:** list_clinics, list_specialties, active_dentists, get_clinic_logo
- **Relatórios:** export_csv, apireport, list_boletos
- **Comunicações:** communication_mark_read, onboarding_event

## Licença

Uso conforme os termos da API Ecuro Light.
