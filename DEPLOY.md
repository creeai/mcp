# Deploy – MCP Ecuro Light

Repositório: **[github.com/creeai/mcp](https://github.com/creeai/mcp)**

## 1. Enviar o código para o GitHub (creeai/mcp)

Se o projeto ainda não estiver no repositório, na pasta do projeto (`d:\mcp`):

```bash
git init
git remote add origin https://github.com/creeai/mcp.git
git add .
git commit -m "MCP Server Ecuro Light API - 27 tools"
git branch -M main
git push -u origin main
```

Se já existir conteúdo no `creeai/mcp` (ex.: README), pode ser necessário `git pull origin main --allow-unrelated-histories` antes do push, ou fazer um force push **apenas se tiver certeza** que ninguém mais usa o repo: `git push -u origin main --force`.

---

## 2. Deploy no EasyPanel (VPS)

1. **Acesse o EasyPanel** no seu servidor (ex.: `https://seu-servidor:3000`).

2. **Novo app**
   - Clique em **Create** / **New App**.
   - Escolha **Deploy from GitHub** (ou **Git**).
   - Conecte o GitHub se ainda não estiver conectado e selecione o repositório **creeai/mcp**.

3. **Build**
   - Método de build: **Dockerfile** (o projeto já tem `Dockerfile` na raiz).
   - Branch: `main` (ou a que você usar).

4. **Variáveis de ambiente** (obrigatórias)
   - `ECURO_BASE_URL` = base URL da API Ecuro (ex.: `https://clinics.api.ecuro.com.br/api/v1/ecuro-light`).
   - `ECURO_APP_ACCESS_TOKEN` = token para o header `app-access-token`.
   - `PORT` = opcional; o EasyPanel costuma injetar a porta (ex.: 3000).
   - `MAX_MCP_SESSIONS` = opcional; máximo de sessões simultâneas (default: 100). Cada cliente (Cursor, n8n, etc.) usa uma sessão após o primeiro `initialize`.

5. **Porta e domínio**
   - Exponha a porta **3000** (ou a que o painel atribuir).
   - (Opcional) Configure domínio e SSL (Let’s Encrypt) no EasyPanel.

6. **Health check** (opcional)
   - URL: `GET /health`.
   - O servidor responde 200 quando está no ar.

7. **Deploy**
   - Salve e inicie o deploy. O EasyPanel vai clonar o repo, buildar a imagem com o Dockerfile e subir o container.

Após o deploy, o endpoint MCP (Streamable HTTP) ficará em:

- `https://seu-dominio.com/mcp` (ou a porta/path que você configurou).

---

## 3. Testar após o deploy

- Health: `curl https://seu-dominio.com/health`
- MCP: o cliente (Cursor, Claude API, etc.) usa a URL `https://seu-dominio.com/mcp` com transporte **streamable-http**.

### Multi-usuário

O servidor suporta **vários clientes ao mesmo tempo**. Cada cliente faz um `initialize` e recebe um **Mcp-Session-Id**; as próximas requisições (POST/GET) devem enviar esse header. O servidor mantém uma sessão (par server+transport) por `Mcp-Session-Id`. O número máximo de sessões é controlado por `MAX_MCP_SESSIONS` (default 100); ao atingir o limite, a sessão mais antiga é encerrada. Não é necessário configurar nada além da variável de ambiente; Cursor, n8n e outros clientes MCP já enviam o session ID automaticamente.

### Usar no n8n

O servidor pode ser usado como **MCP externo** no n8n:

1. No workflow, adicione o nó **MCP Client** (ou **MCP Client Tool**).
2. **Endpoint**: `https://seu-dominio.com/mcp` (ex.: `https://ecuro-mcp-ecuro.mimenl.easypanel.host/mcp`).
3. **Server Transport**: **HTTP Streamable**.
4. **Authentication**: **None** (o servidor não exige auth).
5. **Tools to Include**: crie uma credencial HTTP (tipo "None" / sem auth) e selecione-a no nó; assim o nó consegue listar as tools. Depois escolha "All" ou "Selected" e as tools que quiser.
6. As 27 tools (agendamentos, pacientes, clínicas, relatórios, etc.) ficarão disponíveis para o agente.

**Se aparecer "Could not connect to your MCP server":**

- Confirme que o servidor está no ar: abra no navegador `https://seu-dominio.com/health` — deve responder `ok`.
- Se o n8n estiver na nuvem (n8n.cloud), o domínio do MCP precisa ser **público** e acessível da internet (EasyPanel com domínio e SSL está ok).
- Se estiver atrás de proxy/nginx, desative buffer e gzip para o path `/mcp` (como na doc do MCP Server Trigger do n8n).
- Teste o MCP manualmente: `curl -X POST https://seu-dominio.com/mcp -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'` — deve devolver JSON com `result` (não erro).

**"Set up credential to see options" (Tools to Include):** o nó exige que uma credencial esteja selecionada para listar as tools. Crie uma credencial do tipo **HTTP Request** com autenticação **None** e associe ao nó; aí as opções de tools aparecem.

---

## 4. Atualizar o deploy

Após alterações no código:

```bash
git add .
git commit -m "Sua mensagem"
git push origin main
```

Se o EasyPanel estiver com **push-to-deploy** ativo, um novo deploy será disparado automaticamente.
