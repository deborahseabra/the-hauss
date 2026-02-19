# Reflections — O que fazer agora (deploy e configuração)

Siga na ordem. Links do Supabase assumem que você já está no projeto certo.

---

## 1. Rodar as migrations no Supabase

**Onde:** Supabase Dashboard → **SQL Editor**  
**Link:** https://supabase.com/dashboard/project/_/sql  
(Substitua `_` pelo **Project ID** do seu projeto, ou abra o projeto e vá em **SQL Editor** no menu.)

**O que rodar (na ordem):**

1. Conteúdo da migration **017**  
   - Arquivo no repo: `supabase/migrations/017_reflections_spec.sql`  
   - Copie todo o conteúdo e execute no SQL Editor.

2. Conteúdo da migration **018**  
   - Arquivo: `supabase/migrations/018_reflections_prompts.sql`  
   - Copie e execute.

3. Conteúdo da migration **019** (crons de reflections)  
   - Arquivo: `supabase/migrations/019_reflections_cron.sql`  
   - **Antes de rodar:** substitua no SQL:
     - `YOUR_PROJECT_REF` → ref do projeto (ex.: `vpwhjzbkaksnvdszrfuu`, está na URL do projeto).
     - `YOUR_CRON_SECRET` → **o mesmo valor** do secret `CRON_SECRET` que você usa nas Edge Functions (o mesmo do `generate-edition` / `letter-open-reminder`).  
   - Depois copie o SQL já alterado e execute.

**Alternativa via CLI (se usar Supabase local/link):**
```bash
cd /Users/deborahseabra/Cursor/the-hauss
npx supabase db push
```
Ainda assim é preciso editar a 019 antes (trocar `YOUR_PROJECT_REF` e `YOUR_CRON_SECRET`) ou rodar o SQL da 019 manualmente no Dashboard depois do push.

---

## 2. Configurar os secrets das Edge Functions

**Onde:** Supabase Dashboard → **Project Settings** (ícone de engrenagem) → **Edge Functions** → **Secrets**  
**Link:** https://supabase.com/dashboard/project/_/settings/functions  
(Abra o projeto → Settings → Edge Functions → Secrets.)

**Secrets que as funções de Reflections usam:**

| Secret | Obrigatório para | Onde conseguir |
|--------|-------------------|----------------|
| `OPENAI_API_KEY` | generate-reflections, ask-your-editor | https://platform.openai.com/api-keys |
| `ENCRYPTION_KEY` | generate-reflections, ask-your-editor | Mesmo que você já usa (64 caracteres hex). Ex.: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CRON_SECRET` | generate-reflections (quando chamada pelo cron) | Mesmo que você já usa para `generate-edition` / `letter-open-reminder`. Gerar novo: `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `RESEND_API_KEY` | Email semanal (opcional) | https://resend.com/api-keys |
| `RESEND_FROM` | (opcional) Remetente do email | Ex.: `The Hauss <notifications@seudominio.com>` |
| `APP_URL` | (opcional) Link no email | Ex.: `https://thehauss.me` |

Se você já tem `OPENAI_API_KEY`, `ENCRYPTION_KEY` e `CRON_SECRET` configurados para outras funções, não precisa criar de novo; elas são compartilhadas.

---

## 3. Deploy das Edge Functions

**Onde:** no seu repo, pelo terminal (Supabase CLI) **ou** pelo Dashboard.

### Opção A — Pelo terminal (recomendado, inclui o template do email)

No projeto:

```bash
cd /Users/deborahseabra/Cursor/the-hauss
npx supabase functions deploy generate-reflections
npx supabase functions deploy ask-your-editor
```

Isso sobe a pasta de cada função (incluindo `email-weekly-reflection.html` em `generate-reflections`).

**Se pedir login:**  
https://supabase.com/dashboard/account/tokens — crie um Access Token e depois:

```bash
npx supabase login
# colar o token quando pedir
```

**Link da doc de deploy:**  
https://supabase.com/docs/guides/functions/deploy

### Opção B — Pelo Dashboard (copiar e colar o código)

**Link:** https://supabase.com/dashboard/project/_/functions  

1. **Nova função: `generate-reflections`**  
   - Create function → nome: `generate-reflections`.  
   - Código: copie **todo** o conteúdo de:  
     `supabase/functions/generate-reflections/index.ts`  
   - O template de email (`email-weekly-reflection.html`) no Dashboard costuma ser mais difícil de anexar; o ideal é usar a Opção A (CLI) para essa função.

2. **Nova função: `ask-your-editor`**  
   - Create function → nome: `ask-your-editor`.  
   - Código: copie **todo** o conteúdo de:  
     `supabase/functions/ask-your-editor/index.ts`

**Arquivos no seu repo para copiar:**

- `supabase/functions/generate-reflections/index.ts`  
- `supabase/functions/generate-reflections/email-weekly-reflection.html` (manter no mesmo diretório no deploy; pelo CLI isso já vai junto)  
- `supabase/functions/ask-your-editor/index.ts`

---

## 4. Conferir os crons (019)

Se você rodou a migration **019** no passo 1 (já com `YOUR_PROJECT_REF` e `YOUR_CRON_SECRET` trocados), os 4 jobs já estão agendados.

**Ver jobs no Supabase:**  
Dashboard → **Database** → **Cron Jobs** (ou extensão `pg_cron` no SQL).  
**Link:** https://supabase.com/dashboard/project/_/database/cron-jobs  
(Se não aparecer, consulte a doc do seu plano sobre pg_cron.)

---

## Resumo rápido

| # | O quê | Onde |
|---|--------|------|
| 1 | Rodar 017, 018, 019 (019 com placeholders trocados) | [SQL Editor](https://supabase.com/dashboard/project/_/sql) |
| 2 | Secrets: OPENAI_API_KEY, ENCRYPTION_KEY, CRON_SECRET (+ Resend se quiser email) | [Project Settings → Edge Functions → Secrets](https://supabase.com/dashboard/project/_/settings/functions) |
| 3 | Deploy: `generate-reflections` e `ask-your-editor` | Terminal: `npx supabase functions deploy generate-reflections` e `ask-your-editor` |
| 4 | Crons já agendados pela 019 | Conferir em Database → Cron Jobs |

Sempre que for “copiar o código”, use os arquivos do repo listados acima; os links do Dashboard são para abrir a tela certa no Supabase.
