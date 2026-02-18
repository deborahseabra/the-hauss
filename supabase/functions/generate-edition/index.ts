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

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function hexToBytes(hex: string) {
  const clean = hex.startsWith("\\x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = Number.parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
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
    ["encrypt", "decrypt"],
  );
}

async function decryptText(hex: string) {
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

async function encryptText(text: string) {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(text);
  const encryptedWithTag = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: AUTH_TAG_LENGTH * 8 },
    key,
    encoded,
  );
  const result = new Uint8Array(encryptedWithTag);
  const ciphertext = result.slice(0, result.length - AUTH_TAG_LENGTH);
  const authTag = result.slice(result.length - AUTH_TAG_LENGTH);
  const packed = new Uint8Array(IV_LENGTH + AUTH_TAG_LENGTH + ciphertext.length);
  packed.set(iv, 0);
  packed.set(authTag, IV_LENGTH);
  packed.set(ciphertext, IV_LENGTH + AUTH_TAG_LENGTH);
  return "\\x" + bytesToHex(packed);
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(weekStart: Date) {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() + 6);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

async function callOpenAI(prompt: {
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
}, userPayload: unknown) {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) throw new Error("OPENAI_API_KEY not configured");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: prompt.model || "gpt-4o-mini",
      temperature: Number(prompt.temperature) || 0.7,
      max_tokens: prompt.max_tokens || 1800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt.system_prompt },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
    }),
  });

  if (!res.ok) {
    const details = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${details}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content from OpenAI");
  return JSON.parse(content);
}

async function fetchCityWeather(city: string): Promise<{ temperature: number | null }> {
  try {
    const geoRes = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(city)}&limit=1`,
    );
    const geoData = await geoRes.json();
    const coords = geoData?.features?.[0]?.geometry?.coordinates;
    if (!coords) return { temperature: null };
    const [lng, lat] = coords;
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`,
    );
    const weatherData = await weatherRes.json();
    const temp = weatherData?.current_weather?.temperature;
    return { temperature: typeof temp === "number" ? temp : null };
  } catch {
    return { temperature: null };
  }
}

async function generateForUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  weekStartArg?: string,
) {
  const weekStartDate = weekStartArg
    ? new Date(`${weekStartArg}T00:00:00.000Z`)
    : startOfWeek(new Date());
  const weekEndDate = endOfWeek(weekStartDate);
  const weekStart = weekStartDate.toISOString().slice(0, 10);
  const weekEnd = weekEndDate.toISOString().slice(0, 10);

  const { data: rows, error: entriesError } = await supabase
    .from("entries")
    .select("id, title_encrypted, body_encrypted, section, mood, word_count, created_at")
    .eq("user_id", userId)
    .gte("created_at", weekStartDate.toISOString())
    .lte("created_at", weekEndDate.toISOString())
    .order("created_at", { ascending: true });
  if (entriesError) throw entriesError;

  const entries = await Promise.all((rows || []).map(async (r) => ({
    id: r.id,
    title: r.title_encrypted ? await decryptText(r.title_encrypted) : "",
    body: await decryptText(r.body_encrypted),
    section: r.section,
    mood: r.mood,
    word_count: r.word_count || 0,
    created_at: r.created_at,
  })));

  const entryCount = entries.length;
  const wordCount = entries.reduce((s, e) => s + (e.word_count || 0), 0);

  const { data: latestEdition } = await supabase
    .from("editions")
    .select("volume, number")
    .eq("user_id", userId)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVolume = latestEdition?.volume || 1;
  const nextNumber = (latestEdition?.number || 0) + 1;

  let editorialBody =
    "A quiet week in the notebook. The stories are smaller, but the signal is clear: your attention is becoming more precise.";
  let featuredIds: string[] = entries.slice(0, 2).map((e) => e.id);
  let orderedIds: string[] = entries.map((e) => e.id);

  const { data: prompt } = await supabase
    .from("ai_prompts")
    .select("model, temperature, max_tokens, system_prompt")
    .eq("id", "edition_generator")
    .maybeSingle();

  if (prompt && entries.length > 0) {
    try {
      const ai = await callOpenAI(prompt, {
        week_start: weekStart,
        week_end: weekEnd,
        entries: entries.map((e) => ({
          id: e.id,
          title: e.title,
          body: e.body,
          section: e.section,
          mood: e.mood,
          word_count: e.word_count,
          created_at: e.created_at,
        })),
      });
      editorialBody = ai.editorial_body || editorialBody;
      if (Array.isArray(ai.featured_entry_ids)) {
        featuredIds = ai.featured_entry_ids.filter((id: string) =>
          entries.some((e) => e.id === id)
        ).slice(0, 2);
      }
      if (Array.isArray(ai.ordered_entry_ids)) {
        const valid = ai.ordered_entry_ids.filter((id: string) =>
          entries.some((e) => e.id === id)
        );
        const missing = entries.map((e) => e.id).filter((id) => !valid.includes(id));
        orderedIds = [...valid, ...missing];
      }
    } catch (err) {
      console.error("AI generation failed, using fallback:", err);
    }
  }

  const editorialEncrypted = await encryptText(editorialBody);

  const { data: userProfile } = await supabase
    .from("profiles")
    .select("city")
    .eq("id", userId)
    .maybeSingle();

  const pubCity = userProfile?.city || null;
  const { temperature: pubTemp } = pubCity
    ? await fetchCityWeather(pubCity)
    : { temperature: null };

  const { data: upserted, error: upsertErr } = await supabase
    .from("editions")
    .upsert({
      user_id: userId,
      week_start: weekStart,
      week_end: weekEnd,
      volume: nextVolume,
      number: nextNumber,
      entry_count: entryCount,
      word_count: wordCount,
      editorial_encrypted: editorialEncrypted,
      publication_city: pubCity,
      publication_temperature: pubTemp,
    }, { onConflict: "user_id,week_start" })
    .select("id, user_id, week_start, number")
    .single();
  if (upsertErr) throw upsertErr;

  const editionId = upserted.id as string;
  await supabase.from("edition_entries").delete().eq("edition_id", editionId);

  if (orderedIds.length > 0) {
    const rowsToInsert = orderedIds.map((entryId, idx) => ({
      edition_id: editionId,
      entry_id: entryId,
      display_order: idx + 1,
      is_featured: featuredIds.includes(entryId),
    }));
    const { error: insertErr } = await supabase
      .from("edition_entries")
      .insert(rowsToInsert);
    if (insertErr) throw insertErr;

    // Auto-set cover from first entry's photo attachment
    const firstEntryId = orderedIds[0];
    const { data: photoRow } = await supabase
      .from("attachments")
      .select("url")
      .eq("entry_id", firstEntryId)
      .eq("type", "photo")
      .limit(1)
      .maybeSingle();
    if (photoRow?.url) {
      await supabase
        .from("editions")
        .update({ cover_image_url: photoRow.url })
        .eq("id", editionId);
    }
  }

  return {
    edition_id: editionId,
    user_id: userId,
    week_start: weekStart,
    week_end: weekEnd,
    entry_count: entryCount,
    word_count: wordCount,
    featured_ids: featuredIds,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cronSecret = Deno.env.get("CRON_SECRET");
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    const cronHeader = req.headers.get("x-cron-secret");
    const body = await req.json().catch(() => ({}));
    const { user_id, week_start } = body || {};

    const isCron = Boolean(cronSecret && cronHeader && cronHeader === cronSecret);

    if (!isCron) {
      if (!authHeader) return jsonResponse({ error: "Missing Authorization header" }, 401);
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);
      if (error || !user) return jsonResponse({ error: "Invalid or expired token" }, 401);
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (!profile || profile.role !== "admin") {
        return jsonResponse({ error: "Forbidden: admin access required" }, 403);
      }
    }

    if (user_id) {
      const result = await generateForUser(supabase, user_id, week_start);
      return jsonResponse({ ok: true, mode: "single", result });
    }

    const { data: users, error: usersErr } = await supabase
      .from("profiles")
      .select("id")
      .order("created_at", { ascending: true });
    if (usersErr) throw usersErr;

    const results = [];
    for (const u of users || []) {
      try {
        const generated = await generateForUser(supabase, u.id, week_start);
        results.push({ user_id: u.id, ok: true, generated });
      } catch (err) {
        results.push({ user_id: u.id, ok: false, error: String(err) });
      }
    }

    return jsonResponse({ ok: true, mode: "all_users", count: results.length, results });
  } catch (err) {
    console.error("generate-edition error:", err);
    return jsonResponse({ error: "Internal server error", message: String(err) }, 500);
  }
});
