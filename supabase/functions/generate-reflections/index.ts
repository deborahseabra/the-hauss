/**
 * Generate Reflections — runs via cron (weekly, monthly, quarterly, yearly)
 * Generates reflection content from entries (week/month) or from prior reflections (quarter/year).
 * Requires: OPENAI_API_KEY, ENCRYPTION_KEY, CRON_SECRET. Optional: RESEND_API_KEY for weekly email.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const MOOD_EMOJI: Record<number, string> = {
  0: "🌤",
  1: "🌊",
  2: "🌧",
  3: "⚡",
  4: "🪞",
};
const MOOD_LABELS = ["Bright", "Calm", "Heavy", "Electric", "Reflective"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() + 6);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function getPeriodRange(
  periodType: string,
): { period_start: string; period_end: string; period_label: string } {
  const now = new Date();
  const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (periodType === "week") {
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(weekStart);
    const startStr = weekStart.toISOString().slice(0, 10);
    const endStr = weekEnd.toISOString().slice(0, 10);
    const label = `this week (${mo[weekStart.getUTCMonth()]} ${weekStart.getUTCDate()}–${weekEnd.getUTCDate()})`;
    return { period_start: startStr, period_end: endStr, period_label: label };
  }

  if (periodType === "month") {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const prevM = m === 0 ? 11 : m - 1;
    const prevY = m === 0 ? y - 1 : y;
    const startStr = `${prevY}-${String(prevM + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(Date.UTC(prevY, prevM + 1, 0));
    const endStr = lastDay.toISOString().slice(0, 10);
    const label = `${mo[prevM]} ${prevY}`;
    return { period_start: startStr, period_end: endStr, period_label: label };
  }

  if (periodType === "quarter") {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const q = Math.floor(m / 3) + 1;
    const prevQ = q === 1 ? 4 : q - 1;
    const prevY = q === 1 ? y - 1 : y;
    const startM = (prevQ - 1) * 3;
    const startStr = `${prevY}-${String(startM + 1).padStart(2, "0")}-01`;
    const endM = startM + 2;
    const lastDay = new Date(Date.UTC(prevY, endM + 1, 0));
    const endStr = lastDay.toISOString().slice(0, 10);
    const label = `Q${prevQ} ${prevY}`;
    return { period_start: startStr, period_end: endStr, period_label: label };
  }

  if (periodType === "year") {
    const prevY = now.getUTCFullYear() - 1;
    const startStr = `${prevY}-01-01`;
    const endStr = `${prevY}-12-31`;
    const label = `the year ${prevY}`;
    return { period_start: startStr, period_end: endStr, period_label: label };
  }

  throw new Error(`Unknown period_type: ${periodType}`);
}

function computeMoodData(
  entries: { created_at: string; mood: number | null }[],
  periodType: string,
  periodStart: string,
  periodEnd: string,
): { label: string; value: string }[] {
  const start = new Date(periodStart + "T00:00:00Z").getTime();
  const end = new Date(periodEnd + "T23:59:59Z").getTime();

  if (periodType === "week") {
    const buckets: Record<number, number[]> = {};
    for (let i = 0; i < 7; i++) buckets[i] = [];
    for (const e of entries) {
      const t = new Date(e.created_at).getTime();
      if (t < start || t > end) continue;
      const dayIdx = Math.floor((t - start) / 86400000);
      if (dayIdx >= 0 && dayIdx < 7 && e.mood != null) buckets[dayIdx].push(e.mood);
    }
    return Array.from({ length: 7 }, (_, i) => {
      const arr = buckets[i] || [];
      const most = arr.length
        ? arr.sort((a, b) => arr.filter((x) => x === b).length - arr.filter((x) => x === a).length)[0]
        : 3;
      return {
        label: DAY_NAMES[(new Date(start).getUTCDay() + i) % 7],
        value: MOOD_EMOJI[most] ?? "🌤",
      };
    });
  }

  if (periodType === "month") {
    const weekMs = 7 * 86400000;
    const numWeeks = Math.min(5, Math.ceil((end - start) / weekMs) + 1);
    const buckets: Record<number, number[]> = {};
    for (let i = 0; i < numWeeks; i++) buckets[i] = [];
    for (const e of entries) {
      const t = new Date(e.created_at).getTime();
      if (t < start || t > end) continue;
      const weekIdx = Math.floor((t - start) / weekMs);
      if (weekIdx >= 0 && weekIdx < numWeeks && e.mood != null) buckets[weekIdx].push(e.mood);
    }
    return Array.from({ length: numWeeks }, (_, i) => {
      const arr = buckets[i] || [];
      const most = arr.length
        ? arr.sort((a, b) => arr.filter((x) => x === b).length - arr.filter((x) => x === a).length)[0]
        : 3;
      return { label: `W${i + 1}`, value: MOOD_EMOJI[most] ?? "🌤" };
    });
  }

  return [];
}

async function callOpenAI(
  openaiKey: string,
  prompt: { model: string; temperature: number; max_tokens: number; system_prompt: string },
  userPayload: unknown,
): Promise<Record<string, unknown>> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: prompt.model || "gpt-4o-mini",
      temperature: Number(prompt.temperature) ?? 0.7,
      max_tokens: prompt.max_tokens || 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt.system_prompt },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content from OpenAI");
  return JSON.parse(content);
}

async function generateReflectionFromEntries(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  periodType: string,
  periodStart: string,
  periodEnd: string,
  periodLabel: string,
  openaiKey: string,
): Promise<Record<string, unknown> | null> {
  const startDate = new Date(periodStart + "T00:00:00.000Z");
  const endDate = new Date(periodEnd + "T23:59:59.999Z");

  const { data: rows, error: entriesError } = await supabase
    .from("entries")
    .select("id, title_encrypted, body_encrypted, section, mood, word_count, created_at")
    .eq("user_id", userId)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString())
    .order("created_at", { ascending: true });

  if (entriesError || !rows?.length) return null;

  const entries = await Promise.all(
    rows.map(async (r: { id: string; title_encrypted?: string; body_encrypted?: string; section: string; mood: number | null; word_count: number; created_at: string }) => ({
      id: r.id,
      title: r.title_encrypted ? await decryptText(r.title_encrypted) : "",
      body: r.body_encrypted ? await decryptText(r.body_encrypted) : "",
      section: r.section,
      mood: r.mood,
      word_count: r.word_count || 0,
      created_at: r.created_at,
    })),
  );

  const moodData = computeMoodData(rows, periodType, periodStart, periodEnd);

  const { data: promptRow } = await supabase
    .from("ai_prompts")
    .select("model, temperature, max_tokens, system_prompt")
    .eq("id", "reflections_from_entries")
    .single();

  if (!promptRow) {
    console.error("reflections_from_entries prompt not found");
    return null;
  }

  const systemPrompt = String(promptRow.system_prompt || "").replace(/\{\{period_label\}\}/g, periodLabel);

  const payload = {
    entries: entries.map((e) => ({
      id: e.id,
      date: e.created_at?.slice(0, 10),
      section: e.section,
      mood: e.mood != null ? MOOD_LABELS[e.mood] ?? "Reflective" : null,
      text: (e.body || "").slice(0, 2000),
      word_count: e.word_count,
    })),
    mood_data: moodData,
  };

  const ai = await callOpenAI(openaiKey, { ...promptRow, system_prompt }, payload);
  const content = {
    reflection: ai.reflection ?? {},
    connections: Array.isArray(ai.connections) ? ai.connections : [],
    themes: Array.isArray(ai.themes) ? ai.themes : [],
    mood: {
      ...(typeof ai.mood === "object" && ai.mood !== null ? ai.mood : {}),
      data: moodData,
    },
  };
  return content;
}

async function generateReflectionFromSummaries(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  periodType: string,
  periodStart: string,
  periodEnd: string,
  periodLabel: string,
  openaiKey: string,
): Promise<Record<string, unknown> | null> {
  const childType = periodType === "quarter" ? "month" : "quarter";
  const { data: priorRows } = await supabase
    .from("reflections")
    .select("id, content_json, period_start, period_end, period_type")
    .eq("user_id", userId)
    .eq("period_type", childType)
    .gte("period_start", periodStart)
    .lte("period_end", periodEnd)
    .order("period_start", { ascending: true });

  if (!priorRows?.length) return null;

  const summaries = priorRows
    .filter((r) => r.content_json && typeof r.content_json === "object")
    .map((r) => ({
      period_start: r.period_start,
      period_end: r.period_end,
      ...(r.content_json as Record<string, unknown>),
    }));

  if (summaries.length === 0) return null;

  const { data: promptRow } = await supabase
    .from("ai_prompts")
    .select("model, temperature, max_tokens, system_prompt")
    .eq("id", "reflections_from_summaries")
    .single();

  if (!promptRow) {
    console.error("reflections_from_summaries prompt not found");
    return null;
  }

  const systemPrompt = String(promptRow.system_prompt || "").replace(/\{\{period_label\}\}/g, periodLabel);
  const ai = await callOpenAI(openaiKey, { ...promptRow, system_prompt }, { summaries });
  const content = {
    reflection: ai.reflection ?? {},
    connections: Array.isArray(ai.connections) ? ai.connections : [],
    themes: Array.isArray(ai.themes) ? ai.themes : [],
    mood: typeof ai.mood === "object" && ai.mood !== null ? ai.mood : { dominant: "reflective", trend_label: "" },
  };
  return content;
}

let weeklyReflectionTemplate: string | null = null;

async function loadWeeklyReflectionTemplate(): Promise<string> {
  if (weeklyReflectionTemplate) return weeklyReflectionTemplate;
  const path = new URL("./email-weekly-reflection.html", import.meta.url);
  weeklyReflectionTemplate = await Deno.readTextFile(path);
  return weeklyReflectionTemplate;
}

async function sendWeeklyReflectionEmail(
  userId: string,
  contentJson: { reflection?: { title?: string; text?: string } },
  supabase: ReturnType<typeof createClient>,
) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return;
  const { data: profile } = await supabase.from("profiles").select("email").eq("id", userId).single();
  if (!profile?.email) return;
  const title = contentJson?.reflection?.title ?? "Your weekly reflection";
  const text = contentJson?.reflection?.text ?? "";
  const excerptPlain = text.slice(0, 200).trim() + (text.length > 200 ? "…" : "");
  const excerptHtml = excerptPlain.replace(/\n/g, "<br>");
  const appUrl = Deno.env.get("APP_URL") || "https://thehauss.me";

  let html: string;
  try {
    const template = await loadWeeklyReflectionTemplate();
    html = template
      .replace(/\{\{title\}\}/g, title)
      .replace(/\{\{excerpt\}\}/g, excerptHtml)
      .replace(/\{\{app_url\}\}/g, appUrl);
  } catch (e) {
    console.error("Failed to load email template, using fallback:", e);
    html = `<p><strong>${title}</strong></p><p>${excerptHtml}</p><p><a href="${appUrl}/#/reflections">Read your full reflection →</a></p>`;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM") || "The Hauss <notifications@resend.dev>",
        to: [profile.email],
        subject: title,
        html,
      }),
    });
  } catch (e) {
    console.error("Weekly reflection email failed:", e);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = req.headers.get("x-cron-secret");
  const envSecret = Deno.env.get("CRON_SECRET");
  if (envSecret && cronSecret !== envSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) return jsonResponse({ error: "OPENAI_API_KEY not configured" }, 500);

  const supabase = createClient(supabaseUrl, serviceKey);
  const body = await req.json().catch(() => ({}));
  const periodType = (body?.period_type || "week") as string;
  const singleUserId = body?.user_id as string | undefined;

  if (!["week", "month", "quarter", "year"].includes(periodType)) {
    return jsonResponse({ error: "Invalid period_type" }, 400);
  }

  const { period_start, period_end, period_label } = getPeriodRange(periodType);

  let userIds: string[] = [];
  if (singleUserId) {
    const { data: p } = await supabase.from("profiles").select("role").eq("id", singleUserId).single();
    if (p && ["editor", "publisher", "admin"].includes(p.role)) userIds = [singleUserId];
  } else {
    const { data: users } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["editor", "publisher", "admin"]);
    userIds = (users || []).map((u) => u.id);
  }

  const BATCH = 50;
  const results: { user_id: string; ok: boolean; error?: string }[] = [];

  for (let i = 0; i < userIds.length; i += BATCH) {
    const batch = userIds.slice(i, i + BATCH);
    for (const uid of batch) {
      try {
        let content: Record<string, unknown> | null = null;
        if (periodType === "week" || periodType === "month") {
          content = await generateReflectionFromEntries(
            supabase,
            uid,
            periodType,
            period_start,
            period_end,
            period_label,
            openaiKey,
          );
        } else {
          content = await generateReflectionFromSummaries(
            supabase,
            uid,
            periodType,
            period_start,
            period_end,
            period_label,
            openaiKey,
          );
        }

        if (!content) {
          results.push({ user_id: uid, ok: true });
          continue;
        }

        const { error: upsertErr } = await supabase.from("reflections").upsert(
          {
            user_id: uid,
            period: periodType,
            period_start: period_start,
            period_end: period_end,
            period_type: periodType,
            content_json: content,
            generated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,period,period_start" },
        );

        if (upsertErr) throw upsertErr;
        results.push({ user_id: uid, ok: true });

        if (periodType === "week") {
          await sendWeeklyReflectionEmail(uid, content, supabase);
        }
      } catch (err) {
        console.error(`generate-reflections ${periodType} for ${uid}:`, err);
        results.push({ user_id: uid, ok: false, error: String(err) });
      }
    }
  }

  return jsonResponse({
    ok: true,
    period_type: periodType,
    period_start,
    period_end,
    processed: results.length,
    results,
  });
});
