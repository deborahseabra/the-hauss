import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user JWT and check admin role
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ error: "Invalid or expired token" }, 401);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return jsonResponse({ error: "Forbidden: admin access required" }, 403);
    }

    // Parse request
    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case "list_users":
        return await listUsers(supabase, params);
      case "update_role":
        return await updateRole(supabase, params);
      case "toggle_tester":
        return await toggleTester(supabase, params);
      case "create_user":
        return await createUser(supabase, params);
      case "delete_user":
        return await deleteUser(supabase, params, user.id);
      case "dashboard_stats":
        return await dashboardStats(supabase);
      case "generate_edition":
        return await generateEdition(authHeader, params);
      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("Admin API error:", err);
    return jsonResponse(
      { error: "Internal server error", message: String(err) },
      500
    );
  }
});

// ── list_users ──────────────────────────────────────────────

async function listUsers(
  supabase: ReturnType<typeof createClient>,
  params: {
    page?: number;
    per_page?: number;
    search?: string;
    role_filter?: string;
    tester_filter?: string;
    referred_filter?: string;
    sort_by?: string;
    sort_dir?: string;
  }
) {
  const page = params.page || 1;
  const perPage = params.per_page || 20;
  const offset = (page - 1) * perPage;

  // Get users with entry counts
  let query = supabase
    .from("profiles")
    .select("id, name, email, role, is_tester, is_master, referred_by, created_at", {
      count: "exact",
    });

  if (params.search) {
    query = query.or(
      `name.ilike.%${params.search}%,email.ilike.%${params.search}%`
    );
  }

  if (params.role_filter && params.role_filter !== "all") {
    query = query.eq("role", params.role_filter);
  }

  if (params.tester_filter === "testers") {
    query = query.eq("is_tester", true);
  }
  if (params.referred_filter === "referred_only") {
    query = query.not("referred_by", "is", null);
  }

  const sortBy = params.sort_by || "created_at";
  const sortDir = params.sort_dir === "asc";
  query = query.order(sortBy, { ascending: sortDir });

  query = query.range(offset, offset + perPage - 1);

  const { data: users, error, count } = await query;

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  // Get entry counts for these users
  const userIds = (users || []).map((u) => u.id);
  let entryCounts: Record<string, number> = {};
  const referredByIds = [...new Set((users || []).map((u) => u.referred_by).filter(Boolean))];
  let referrerNames: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: counts } = await supabase.rpc("get_entry_counts_for_users", {
      user_ids: userIds,
    });

    // Fallback: count individually if RPC doesn't exist
    if (!counts) {
      for (const uid of userIds) {
        const { count: c } = await supabase
          .from("entries")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid);
        entryCounts[uid] = c || 0;
      }
    } else {
      for (const row of counts) {
        entryCounts[row.user_id] = row.count;
      }
    }
  }

  if (referredByIds.length > 0) {
    const { data: referrers } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", referredByIds as string[]);
    for (const r of referrers || []) {
      referrerNames[r.id] = r.name;
    }
  }

  const result = (users || []).map((u) => ({
    ...u,
    entry_count: entryCounts[u.id] || 0,
    referred_by_name: u.referred_by ? (referrerNames[u.referred_by] || "—") : null,
  }));

  return jsonResponse({
    users: result,
    total: count || 0,
    page,
    per_page: perPage,
  });
}

// ── update_role ─────────────────────────────────────────────

async function updateRole(
  supabase: ReturnType<typeof createClient>,
  params: { user_id: string; role: string }
) {
  if (!params.user_id || !params.role) {
    return jsonResponse({ error: "user_id and role are required" }, 400);
  }

  const validRoles = ["admin", "writer", "editor", "publisher"];
  if (!validRoles.includes(params.role)) {
    return jsonResponse({ error: `Invalid role: ${params.role}` }, 400);
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ role: params.role })
    .eq("id", params.user_id)
    .select()
    .single();

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ user: data });
}

// ── toggle_tester ───────────────────────────────────────────

async function toggleTester(
  supabase: ReturnType<typeof createClient>,
  params: { user_id: string; is_tester: boolean }
) {
  if (!params.user_id || params.is_tester === undefined) {
    return jsonResponse(
      { error: "user_id and is_tester are required" },
      400
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ is_tester: params.is_tester })
    .eq("id", params.user_id)
    .select()
    .single();

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ user: data });
}

// ── create_user ─────────────────────────────────────────────
// Uses inviteUserByEmail so the new user receives an invite email to set password and sign in.

async function createUser(
  supabase: ReturnType<typeof createClient>,
  params: {
    name: string;
    email: string;
    role?: string;
    is_tester?: boolean;
  }
) {
  const name = typeof params.name === "string" ? params.name.trim() : "";
  const email = typeof params.email === "string" ? params.email.trim().toLowerCase() : "";
  if (!name || !email) {
    return jsonResponse({ error: "name and email are required" }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: "Invalid email format" }, 400);
  }

  const appUrl = Deno.env.get("APP_URL") || "https://thehauss.me";
  const redirectTo = `${appUrl.replace(/\/$/, "")}/`;

  const {
    data: inviteData,
    error: inviteError,
  } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { name },
  });

  if (inviteError) {
    return jsonResponse({ error: inviteError.message }, 400);
  }

  const userId = inviteData?.user?.id;
  if (!userId) {
    return jsonResponse({ error: "Invite sent but user id not returned" }, 500);
  }

  // The trigger handle_new_user creates the profile. Update role/is_tester if specified.
  const updates: Record<string, unknown> = {};
  if (params.role) updates.role = params.role;
  if (params.is_tester !== undefined) updates.is_tester = params.is_tester;

  if (Object.keys(updates).length > 0) {
    await supabase.from("profiles").update(updates).eq("id", userId);
  }

  return jsonResponse({ success: true, user_id: userId });
}

// ── delete_user ─────────────────────────────────────────────
// Requires confirm_email to match profile.email. Cannot delete own account.
// Deleting from auth.users cascades to profiles and all related data.

async function deleteUser(
  supabase: ReturnType<typeof createClient>,
  params: { user_id?: string; confirm_email?: string },
  currentUserId: string
) {
  if (!params.user_id) {
    return jsonResponse({ error: "user_id is required" }, 400);
  }
  if (params.user_id === currentUserId) {
    return jsonResponse({ error: "Cannot delete your own account" }, 400);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", params.user_id)
    .single();

  if (profileError || !profile) {
    return jsonResponse({ error: "User not found" }, 404);
  }

  const confirmEmail = typeof params.confirm_email === "string" ? params.confirm_email.trim() : "";
  if (confirmEmail !== profile.email) {
    return jsonResponse({ error: "Email does not match" }, 400);
  }

  const { error: authError } = await supabase.auth.admin.deleteUser(params.user_id);
  if (authError) {
    return jsonResponse({ error: authError.message }, 400);
  }

  return jsonResponse({ success: true });
}

// ── dashboard_stats ─────────────────────────────────────────

async function dashboardStats(
  supabase: ReturnType<typeof createClient>
) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Total users by role
  const { data: roleCounts } = await supabase
    .from("profiles")
    .select("role");
  const byRole: Record<string, number> = {};
  for (const row of roleCounts || []) {
    byRole[row.role] = (byRole[row.role] || 0) + 1;
  }
  const totalUsers = Object.values(byRole).reduce((a, b) => a + b, 0);

  // Active writers this week
  const { count: activeThisWeek } = await supabase
    .from("entries")
    .select("user_id", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo);

  // Entries this week
  const { count: entriesThisWeek } = await supabase
    .from("entries")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo);

  // Total entries
  const { count: totalEntries } = await supabase
    .from("entries")
    .select("id", { count: "exact", head: true });

  // Signups last 30 days (by day)
  const { data: recentProfiles } = await supabase
    .from("profiles")
    .select("created_at")
    .gte("created_at", thirtyDaysAgo)
    .order("created_at");

  const signupsByDay: Record<string, number> = {};
  for (const p of recentProfiles || []) {
    const day = p.created_at.substring(0, 10);
    signupsByDay[day] = (signupsByDay[day] || 0) + 1;
  }

  // Entries last 30 days (by day)
  const { data: recentEntries } = await supabase
    .from("entries")
    .select("created_at")
    .gte("created_at", thirtyDaysAgo)
    .order("created_at");

  const entriesByDay: Record<string, number> = {};
  for (const e of recentEntries || []) {
    const day = e.created_at.substring(0, 10);
    entriesByDay[day] = (entriesByDay[day] || 0) + 1;
  }

  // Top 10 writers
  const { data: allEntries } = await supabase
    .from("entries")
    .select("user_id");
  const writerCounts: Record<string, number> = {};
  for (const e of allEntries || []) {
    writerCounts[e.user_id] = (writerCounts[e.user_id] || 0) + 1;
  }
  const topWriterIds = Object.entries(writerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  let topWriters: { name: string; role: string; entries: number }[] = [];
  if (topWriterIds.length > 0) {
    const { data: writerProfiles } = await supabase
      .from("profiles")
      .select("id, name, role")
      .in(
        "id",
        topWriterIds.map((w) => w[0])
      );
    const profileMap: Record<string, { name: string; role: string }> = {};
    for (const p of writerProfiles || []) {
      profileMap[p.id] = { name: p.name, role: p.role };
    }
    topWriters = topWriterIds.map(([id, count]) => ({
      name: profileMap[id]?.name || "Unknown",
      role: profileMap[id]?.role || "writer",
      entries: count,
    }));
  }

  // Recent 10 signups
  const { data: recentSignups } = await supabase
    .from("profiles")
    .select("name, email, role, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const { count: referralsTotalSignups } = await supabase
    .from("referrals")
    .select("id", { count: "exact", head: true });

  const { count: referralsConversions } = await supabase
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("status", "converted");

  return jsonResponse({
    total_users: totalUsers,
    by_role: byRole,
    active_this_week: activeThisWeek || 0,
    entries_this_week: entriesThisWeek || 0,
    total_entries: totalEntries || 0,
    signups_by_day: signupsByDay,
    entries_by_day: entriesByDay,
    top_writers: topWriters,
    recent_signups: recentSignups || [],
    referrals_total_signups: referralsTotalSignups || 0,
    referrals_conversions: referralsConversions || 0,
  });
}

// ── generate_edition ─────────────────────────────────────────

async function generateEdition(
  authHeader: string,
  params: { user_id?: string; week_start?: string }
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const res = await fetch(`${supabaseUrl}/functions/v1/generate-edition`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      user_id: params.user_id,
      week_start: params.week_start,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return jsonResponse(
      { error: data?.error || "Failed to generate edition", details: data },
      res.status
    );
  }
  return jsonResponse(data);
}
