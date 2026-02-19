# Reflections — Checklist passo a passo

Tudo que você precisa fazer para deixar a aba **Reflections** (geração, limites e admin) funcionando de ponta a ponta.

---

## Parte 1 — Já implementado no código (só rodar / conferir)

### 1.1 Migrations no Supabase

1. Abra o **Supabase Dashboard** do seu projeto → **SQL Editor**.
2. Rode as migrations na ordem (se ainda não rodou):
   - `017_reflections_spec.sql` — tabelas `ask_editor_log`, `usage_limits`, colunas em `reflections`, RPC `get_ask_editor_usage`.
   - `018_reflections_prompts.sql` — prompts `reflections_from_entries`, `reflections_from_summaries`, `ask_your_editor`.

Ou use a CLI:

```bash
cd /Users/deborahseabra/Cursor/the-hauss
npx supabase db push
```

(Se você usa branches/link do Supabase, use o fluxo que já usa para aplicar migrations.)

### 1.2 Frontend e API

- **ReflectionsView**: seletor Week · Month · Quarter · Year, overlay para Reader, Ask Your Editor com contador e limite.
- **API**: `getReflection(userId, periodType)`, `fetchAskEditorUsage()`, `fetchUsageLimits()`, `updateUsageLimit()`.
- **Admin**: aba **Limits** (editar `usage_limits`), aba **Prompts** com os 3 novos prompts e nota de `{{period_label}}`.

Nada mais a fazer aqui além de garantir que o app está rodando e que você está logado como **admin** para ver Prompts e Limits.

---

## Parte 2 — O que ainda falta implementar

### 2.1 Edge Function: `generate-reflections` (crons semanal, mensal, trimestral, anual)

**O que faz:**  
Gera reflexões (blocos 1–4) para um período e salva em `reflections.content_json`.  
Pode ser **uma** função que recebe no body algo como `{ "period_type": "week" | "month" | "quarter" | "year", "user_id?": "..." }` e:
- lista usuários com role `editor`, `publisher` ou `admin` (em batches de 50);
- para cada usuário (ou só o `user_id` se passado), chama a lógica de geração do período.

**Lógica resumida:**

- **week / month** → `generateReflectionFromEntries`:
  1. Calcular `period_start` e `period_end` (ex.: semana que acabou no último domingo).
  2. Buscar entries do usuário nesse range.
  3. Se não houver entries, pular.
  4. Calcular `mood.data` a partir dos moods das entries (por dia ou por semana conforme o período).
  5. Buscar prompt `reflections_from_entries` em `ai_prompts`.
  6. Substituir `{{period_label}}` no prompt (ex.: "this week (Feb 9–15)").
  7. Chamar OpenAI com entries + mood data.
  8. Fazer UPSERT em `reflections` (user_id, period_type, period_start, period_end, content_json).

- **quarter / year** → `generateReflectionFromSummaries`:
  1. Buscar reflexões do período inferior (mensais para quarter, trimestrais para year).
  2. Se não houver reflexões suficientes, pular.
  3. Buscar prompt `reflections_from_summaries`, injetar `{{period_label}}`.
  4. Chamar OpenAI e UPSERT em `reflections`.

**Onde criar:**  
`supabase/functions/generate-reflections/index.ts` (ou um nome parecido), seguindo o padrão de `generate-edition` e `letter-open-reminder`: validar `x-cron-secret`, usar `SUPABASE_SERVICE_ROLE_KEY` e `OPENAI_API_KEY`.

**Secrets da Edge Function:**  
`CRON_SECRET`, `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (estes dois costumam vir automáticos).

---

### 2.2 Edge Function: `ask-your-editor` (on-demand)

**O que faz:**  
Responde à pergunta do usuário com base no diário (excerpts relevantes + OpenAI).

**Passos:**

1. Validar JWT (Authorization header) e obter `user_id` e `role`.
2. Chamar lógica de **checkLimit** (role, feature `ask_editor`): ler `usage_limits` e contar usos em `ask_editor_log` no período (mês). Se não permitido, retornar 403 com `{ allowed: false, used, limit }`.
3. Buscar 5–10 trechos relevantes das entries do usuário.  
   - **Com pgvector:** função de semantic search por embedding da pergunta.  
   - **Sem pgvector:** buscar últimas N entries ou busca por texto simples (ex.: `body ilike '%termo%'`) e retornar excerpts.
4. Buscar prompt `ask_your_editor` em `ai_prompts`.
5. Chamar OpenAI com pergunta + excerpts.
6. Inserir em `ask_editor_log` (user_id, question, response_json, tokens_used) com **service role**.
7. Retornar a resposta ao cliente.

**Onde criar:**  
`supabase/functions/ask-your-editor/index.ts`.  
Autenticação por Bearer (usuário logado), não por cron.

**Secrets:**  
`OPENAI_API_KEY` (e Supabase URL/Service Role, que já existem).

---

### 2.3 Chamar `ask-your-editor` no frontend

Hoje o frontend usa `fetchAskEditorUsage()` e mostra o contador. Falta:

- Um endpoint de API no frontend que chame a Edge Function `ask-your-editor` (POST com `{ question: "..." }`) passando o JWT.
- Na ReflectionsView, ao enviar a pergunta: chamar esse endpoint, mostrar loading, exibir a resposta e, em seguida, chamar de novo `fetchAskEditorUsage()` para atualizar “X of Y this month”.

Ou seja: em `src/lib/api.js` (ou onde fizer sentido) criar algo como `submitAskEditorQuestion(question)` que faz `POST .../functions/v1/ask-your-editor` com o body e o Authorization; em ReflectionsView usar isso no submit do Ask Your Editor.

---

### 2.4 Cron jobs para Reflections

Você já usa **pg_cron** + `net.http_post` para `generate-edition` e `letter-open-reminder` (ver `docs/CRON_SECRET_SETUP.md`).

Adicionar 4 jobs que chamam a Edge Function `generate-reflections` com o mesmo `x-cron-secret`:

| Job                         | Schedule (UTC) | Body (exemplo)              |
|----------------------------|----------------|-----------------------------|
| weekly_reflections         | Domingo 23:59  | `{"period_type":"week"}`    |
| monthly_reflections        | Dia 1, 01:00   | `{"period_type":"month"}`   |
| quarterly_reflections      | 1 jan/abr/jul/out, 02:00 | `{"period_type":"quarter"}` |
| yearly_reflections         | 1 jan, 03:00   | `{"period_type":"year"}`    |

**Exemplo de SQL** (ajuste `YOUR_PROJECT_REF` e `YOUR_CRON_SECRET`):

```sql
-- Weekly: Sunday 23:59 UTC
SELECT cron.schedule(
  'weekly_reflections',
  '59 23 * * 0',
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-reflections',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
      body := '{"period_type":"week"}'::jsonb
    );
  $$
);

-- Monthly: 1st of month, 01:00 UTC
SELECT cron.schedule(
  'monthly_reflections',
  '0 1 1 * *',
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-reflections',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
      body := '{"period_type":"month"}'::jsonb
    );
  $$
);

-- Quarterly: 1 Jan, Apr, Jul, Oct at 02:00 UTC
SELECT cron.schedule(
  'quarterly_reflections',
  '0 2 1 1,4,7,10 *',
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-reflections',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
      body := '{"period_type":"quarter"}'::jsonb
    );
  $$
);

-- Yearly: 1 Jan at 03:00 UTC
SELECT cron.schedule(
  'yearly_reflections',
  '0 3 1 1 *',
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-reflections',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
      body := '{"period_type":"year"}'::jsonb
    );
  $$
);
```

A migration **`019_reflections_cron.sql`** já contém os 4 jobs. Antes de rodar, substitua no arquivo (ou no SQL Editor):
- `YOUR_PROJECT_REF` → ref do seu projeto Supabase (ex.: `vpwhjzbkaksnvdszrfuu`)
- `YOUR_CRON_SECRET` → mesmo valor do secret **CRON_SECRET** das Edge Functions

Depois de aplicar a migration (ou colar o SQL no SQL Editor), os crons passam a chamar `generate-reflections` nos horários acima.

---

### 2.5 Email de preview semanal (Resend)

**Requisito:** Após o cron **semanal** de reflections, enviar um email com:
- Título da reflexão (`content_json.reflection.title`)
- Primeiro parágrafo do texto (truncado em ~200 caracteres)
- CTA: "Read Your Full Reflection →" (link para a aba Reflections do app)

**Onde:**  
Dentro da Edge Function `generate-reflections`: ao terminar de processar um usuário para `period_type === 'week'`, se a reflexão foi gerada, chamar Resend (usar `RESEND_API_KEY` e, se quiser, `RESEND_FROM` e `APP_URL` como em `letter-open-reminder`).

**Template:**  
Criar um HTML de email (ex.: `email-weekly-reflection.html` ou inline na função) no mesmo estilo dos outros (accent vermelho, masthead The Hauss, footer). Não é obrigatório ter arquivo separado; pode ser string HTML na função.

---

## Parte 3 — Resumo da ordem sugerida

1. **Migrations** — Rodar 017 e 018 no Supabase.
2. **Conferir frontend** — Login como admin, ver aba Limits e os 3 prompts em Prompts; usuário Editor/Publisher vê Reflections com 4 botões e Ask Your Editor com contador.
3. **Implementar** `generate-reflections` (Edge Function) com a lógica de entries/summaries e UPSERT em `reflections`.
4. **Implementar** `ask-your-editor` (Edge Function) com checkLimit, busca de excerpts, OpenAI e insert em `ask_editor_log`.
5. **No frontend** — Chamar a função `ask-your-editor` ao enviar pergunta e atualizar contador após resposta.
6. **Crons** — Agendar os 4 jobs no pg_cron (SQL acima) com seu `YOUR_PROJECT_REF` e `YOUR_CRON_SECRET`.
7. **Email** — Adicionar envio Resend após geração semanal (template + chamada na função).

Se quiser, na próxima mensagem podemos detalhar só uma dessas partes (por exemplo: corpo exato da `generate-reflections` ou do `ask-your-editor` em TypeScript passo a passo).
