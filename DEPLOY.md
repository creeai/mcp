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

---

## 4. Atualizar o deploy

Após alterações no código:

```bash
git add .
git commit -m "Sua mensagem"
git push origin main
```

Se o EasyPanel estiver com **push-to-deploy** ativo, um novo deploy será disparado automaticamente.
