/**
 * HTML do painel de testes (inline para não depender de arquivos estáticos).
 * A lista de tools com exemplos é injetada na página para ficar pré-configurada.
 */
export type PanelTool = { name: string; title: string; description: string; example: string };

export function getPanelHtml(basePath: string, toolsList: PanelTool[]): string {
  const api = `${basePath}/api`;
  const toolsJson = JSON.stringify(toolsList).replace(/<\/script>/gi, "<\\/script>");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Painel de testes – MCP Ecuro Light</title>
  <style>
    :root {
      --bg: #0f1419;
      --surface: #1a2332;
      --border: #2d3a4d;
      --text: #e6edf3;
      --muted: #8b949e;
      --accent: #58a6ff;
      --success: #3fb950;
      --error: #f85149;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 1rem;
      line-height: 1.5;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0 0 0.5rem 0;
    }
    .subtitle { color: var(--muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
    .tools {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .tool {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
    }
    .tool h2 {
      font-size: 1rem;
      margin: 0 0 0.25rem 0;
      color: var(--accent);
    }
    .tool .name { font-family: ui-monospace, monospace; font-size: 0.85rem; color: var(--muted); margin-bottom: 0.5rem; }
    .tool .desc { font-size: 0.9rem; color: var(--muted); margin-bottom: 0.75rem; }
    .tool label { display: block; font-size: 0.85rem; margin-bottom: 0.25rem; color: var(--muted); }
    .tool textarea {
      width: 100%;
      min-height: 100px;
      font-family: ui-monospace, monospace;
      font-size: 0.85rem;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      padding: 0.5rem;
      resize: vertical;
    }
    .tool textarea::placeholder { color: var(--muted); }
    .tool button {
      margin-top: 0.5rem;
      padding: 0.5rem 1rem;
      background: var(--accent);
      color: var(--bg);
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }
    .tool button:hover { opacity: 0.9; }
    .tool button:disabled { opacity: 0.5; cursor: not-allowed; }
    .result {
      margin-top: 0.75rem;
      padding: 0.75rem;
      border-radius: 6px;
      font-family: ui-monospace, monospace;
      font-size: 0.85rem;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .result.success { background: rgba(63,185,80,0.15); border: 1px solid var(--success); color: var(--success); }
    .result.error { background: rgba(248,81,73,0.15); border: 1px solid var(--error); color: var(--error); }
    .result.empty { display: none; }
    .loadErr { color: var(--error); margin: 1rem 0; }
  </style>
</head>
<body>
  <h1>Painel de testes – MCP Ecuro Light</h1>
  <p class="subtitle">Preencha o JSON de entrada para cada ferramenta e clique em Testar.</p>
  <div id="loadErr" class="loadErr result empty"></div>
  <div class="tools" id="tools"></div>
  <script>
    const api = ${JSON.stringify(api)};
    const PANEL_TOOLS = ${toolsJson};
    const toolsEl = document.getElementById('tools');
    const loadErrEl = document.getElementById('loadErr');

    function renderTools(list) {
      toolsEl.innerHTML = list.map(t => \`
        <div class="tool" data-name="\${escapeHtml(t.name)}">
          <h2>\${escapeHtml(t.title)}</h2>
          <div class="name">\${escapeHtml(t.name)}</div>
          <div class="desc">\${escapeHtml(t.description)}</div>
          <label>Entrada (JSON) – pré-configurado</label>
          <textarea placeholder="{}" spellcheck="false"></textarea>
          <button type="button">Testar</button>
          <div class="result empty" data-result></div>
        </div>
      \`).join('');

      toolsEl.querySelectorAll('.tool').forEach((el, i) => {
        const name = list[i].name;
        const textarea = el.querySelector('textarea');
        const btn = el.querySelector('button');
        const resultEl = el.querySelector('[data-result]');
        textarea.value = list[i].example || "{}";
        btn.addEventListener('click', async () => {
          let args = {};
          try {
            const raw = textarea.value.trim() || '{}';
            args = JSON.parse(raw);
          } catch (e) {
            resultEl.textContent = 'JSON inválido: ' + e.message;
            resultEl.className = 'result error';
            resultEl.classList.remove('empty');
            return;
          }
          btn.disabled = true;
          resultEl.classList.add('empty');
          try {
            const r = await fetch(api + '/test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tool: name, args })
            });
            let data;
            const responseText = await r.text();
            try {
              data = responseText ? JSON.parse(responseText) : {};
            } catch (_) {
              data = { success: false, error: responseText || r.status + ' ' + r.statusText };
            }
            resultEl.classList.remove('empty');
            if (data.success) {
              resultEl.textContent = data.text ?? '';
              resultEl.className = 'result success';
            } else {
              resultEl.textContent = data.error || r.status + ' ' + r.statusText || 'Erro desconhecido';
              resultEl.className = 'result error';
            }
          } catch (e) {
            resultEl.textContent = 'Erro de rede: ' + (e && e.message ? e.message : String(e));
            resultEl.className = 'result error';
            resultEl.classList.remove('empty');
          }
          btn.disabled = false;
        });
      });
    }

    function escapeHtml(s) {
      const div = document.createElement('div');
      div.textContent = s;
      return div.innerHTML;
    }

    loadErrEl.classList.add('empty');
    renderTools(PANEL_TOOLS);
  </script>
</body>
</html>`;
}
