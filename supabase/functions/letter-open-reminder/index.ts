/**
 * Letter Open Reminder — runs daily via cron
 * Finds letters that open today, creates in-app notifications, sends emails.
 * Requires: RESEND_API_KEY (optional — emails only sent if set), CRON_SECRET for invocation
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
  const supabase = createClient(supabaseUrl, serviceKey);

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const { data: entries, error: entriesErr } = await supabase
    .from("entries")
    .select("id, user_id, letter_open_at")
    .eq("section", "letter")
    .not("letter_open_at", "is", null)
    .gte("letter_open_at", `${today}T00:00:00`)
    .lt("letter_open_at", `${tomorrow}T00:00:00`);

  if (entriesErr) {
    console.error("letter-open-reminder: entries query failed", entriesErr);
    return jsonResponse({ error: entriesErr.message }, 500);
  }

  if (!entries || entries.length === 0) {
    return jsonResponse({ ok: true, processed: 0 });
  }

  const userIds = [...new Set(entries.map((e) => e.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", userIds);

  const emailByUser = new Map((profiles || []).map((p) => [p.id, p.email]));
  const resendKey = Deno.env.get("RESEND_API_KEY");
  let emailsSent = 0;

  for (const entry of entries) {
    const { error: notifErr } = await supabase.from("notifications").insert({
      user_id: entry.user_id,
      type: "letter_opened",
      entry_id: entry.id,
    });

    if (notifErr) console.error("notification insert failed", entry.id, notifErr);

    if (resendKey) {
      const email = emailByUser.get(entry.user_id);
      if (email) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: Deno.env.get("RESEND_FROM") || "The Hauss <notifications@resend.dev>",
              to: [email],
              subject: "Your letter to yourself is ready to open",
              html: `<p>Hi,</p><p>A letter you wrote to yourself has just opened.</p><p><a href="${Deno.env.get("APP_URL") || "https://thehauss.me"}">Open it in The Hauss</a></p>`,
            }),
          });
          if (res.ok) emailsSent++;
          else console.error("Resend error", await res.text());
        } catch (e) {
          console.error("Email send failed", e);
        }
      }
    }
  }

  return jsonResponse({
    ok: true,
    processed: entries.length,
    notificationsCreated: entries.length,
    emailsSent,
  });
});
