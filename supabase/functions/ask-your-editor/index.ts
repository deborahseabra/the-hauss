/**
 * Ask Your Editor — on-demand Q&A over the user's journal.
 * Checks usage limit, fetches relevant excerpts, calls OpenAI, logs to ask_editor_log.
 * Requires: OPENAI_API_KEY, ENCRYPTION_KEY (to decrypt entry excerpts).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const EXCERPTS_LIMIT = 10;
const EXCERPT_MAX_CHARS = 400;

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("\\x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = Number.parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}

async function getCryptoKey() {
  const keyHex = Deno.env.get("ENCRYPTION_KEY");
  if (!keyHex || keyHex.length !== 64) {
    throw new Error("ENCRYPTION_KEY missing or invalid");
  }
  const keyBytes = hexToBytes(keyHex);
  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
}

async function decryptText(hex: string): Promise<string> {
  if (!hex) return "";
  try {
    const key = await getCryptoKey();
    const data = hexToBytes(hex);
    const iv = data.slice(0, IV_LENGTH);
    const authTag = data.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = data.slice(IV_LENGTH + AUTH_TAG_LENGTH);
    const combined = new Uint8Array(ciphertext.length + AUTH_TAG_LENGTH);
    combined.set(ciphertext, 0);
    combined.set(authTag, ciphertext.length);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, tagLength: AUTH_TAG_LENGTH * 8 },
      key,
      combined,
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return "";
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return jsonResponse({ error: "OPENAI_API_KEY not configured" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ error: "Invalid or expired token" }, 401);
    }

    const userId = user.id;

    const body = await req.json().catch(() => ({}));
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    if (!question) {
      return jsonResponse({ error: "Missing or empty question" }, 400);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    const role = profile?.role ?? "writer";

    const { data: limitRow } = await supabase
      .from("usage_limits")
      .select("limit_value, period")
      .eq("role", role)
      .eq("feature", "ask_editor")
      .single();

    const limitVal = limitRow?.limit_value ?? 0;
    if (limitVal === 0) {
      return jsonResponse(
        { error: "Ask Your Editor is not available on your plan", allowed: false, used: 0, limit: 0 },
        403,
      );
    }

    if (limitVal !== -1) {
      const periodStart =
        limitRow?.period === "month"
          ? new Date(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1).toISOString()
          : limitRow?.period === "week"
            ? (() => {
                const d = new Date();
                const day = d.getUTCDay();
                const diff = day === 0 ? -6 : 1 - day;
                d.setUTCDate(d.getUTCDate() + diff);
                d.setUTCHours(0, 0, 0, 0);
                return d.toISOString();
              })()
            : new Date().toISOString().slice(0, 10) + "T00:00:00.000Z";

      const { count, error: countErr } = await supabase
        .from("ask_editor_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", periodStart);

      if (countErr) {
        return jsonResponse({ error: "Failed to check usage" }, 500);
      }
      const used = count ?? 0;
      if (used >= limitVal) {
        return jsonResponse(
          {
            error: "Limit reached for this period",
            allowed: false,
            used,
            limit: limitVal,
          },
          403,
        );
      }
    }

    const { data: entryRows } = await supabase
      .from("entries")
      .select("id, title_encrypted, body_encrypted, section, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(EXCERPTS_LIMIT);

    const excerpts: { date: string; section: string; text: string }[] = [];

    for (const row of entryRows || []) {
      const title = row.title_encrypted ? await decryptText(row.title_encrypted) : "";
      const body = row.body_encrypted ? await decryptText(row.body_encrypted) : "";
      const plain = stripHtml(body);
      const excerpt = (title ? `Title: ${title}\n` : "") + plain.slice(0, EXCERPT_MAX_CHARS) + (plain.length > EXCERPT_MAX_CHARS ? "…" : "");
      const date = row.created_at?.slice(0, 10) ?? "";
      excerpts.push({
        date,
        section: row.section ?? "dispatch",
        text: excerpt,
      });
    }

    const { data: promptRow } = await supabase
      .from("ai_prompts")
      .select("model, temperature, max_tokens, system_prompt")
      .eq("id", "ask_your_editor")
      .single();

    if (!promptRow) {
      return jsonResponse({ error: "ask_your_editor prompt not found" }, 500);
    }

    const userMessage = JSON.stringify({
      question,
      excerpts,
    });

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: promptRow.model || "gpt-4o-mini",
        temperature: Number(promptRow.temperature) ?? 0.6,
        max_tokens: promptRow.max_tokens || 800,
        messages: [
          { role: "system", content: promptRow.system_prompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI error:", openaiRes.status, errText);
      return jsonResponse({ error: "AI service error" }, 502);
    }

    const openaiData = await openaiRes.json();
    const answer = openaiData?.choices?.[0]?.message?.content ?? "";
    const usage = openaiData?.usage?.total_tokens ?? null;

    const responseJson = { answer };

    const { error: insertErr } = await supabase.from("ask_editor_log").insert({
      user_id: userId,
      question,
      response_json: responseJson,
      tokens_used: usage,
    });

    if (insertErr) {
      console.error("ask_editor_log insert failed:", insertErr);
    }

    return jsonResponse({ answer });
  } catch (err) {
    console.error("ask-your-editor error:", err);
    return jsonResponse(
      { error: "Internal server error", message: String(err) },
      500,
    );
  }
});
