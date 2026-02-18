/**
 * The Hauss — Data Access Layer
 *
 * Functions that query Supabase and decrypt encrypted fields.
 * Returns data already transformed into the shapes expected by the views.
 */

import { supabase } from "../supabaseClient";
import { encrypt, decrypt, decryptOptional } from "./crypto";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOOD_EMOJI = { 0: "☀️", 1: "🌤", 2: "🌧", 3: "⚡", 4: "🌙" };
const MOOD_LABELS = { 0: "Bright", 1: "Calm", 2: "Heavy", 3: "Electric", 4: "Reflective" };

const SECTION_LABELS = {
  dispatch: "Dispatches",
  essay: "Personal Essays",
  letter: "Letters to Self",
  review: "Reviews",
  photo: "Photo Essays",
};

export const ARTICLE_SECTION_LABELS = {
  dispatch: "Dispatch",
  essay: "Personal Essay",
  letter: "Letter to Self",
  review: "Review",
  photo: "Photo Essay",
};

export const ARTICLE_MOOD_MAP = [
  { emoji: "☀️", label: "Bright" },
  { emoji: "🌤", label: "Calm" },
  { emoji: "🌧", label: "Heavy" },
  { emoji: "⚡", label: "Electric" },
  { emoji: "🌙", label: "Reflective" },
];

export const SOURCE_LABELS = {
  app: "App",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  api: "API",
};

const SECTION_UPPER = {
  dispatch: "DISPATCH",
  essay: "PERSONAL ESSAY",
  letter: "LETTER TO SELF",
  review: "REVIEW",
  photo: "PHOTO ESSAY",
};

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function formatDayOfWeek(dateStr) {
  const d = new Date(dateStr);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}

function formatWeekRange(start, end) {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${mo[s.getMonth()]} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`;
}

function formatWeekShort(start, end) {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (s.getMonth() === e.getMonth()) {
    return `${mo[s.getMonth()]} ${s.getDate()}–${e.getDate()}`;
  }
  return `${mo[s.getMonth()]} ${s.getDate()}–${mo[e.getMonth()]} ${e.getDate()}`;
}

function estimateReadTime(wc) {
  const mins = Math.max(1, Math.ceil(wc / 200));
  return `${mins} min read`;
}

async function decryptEntry(row) {
  const [title, body] = await Promise.all([
    decryptOptional(row.title_encrypted),
    decrypt(row.body_encrypted),
  ]);
  return { ...row, title, body };
}

async function decryptAiEdit(ae) {
  if (!ae) return null;
  const first = Array.isArray(ae) ? ae[0] : ae;
  if (!first) return null;
  const [headline, subhead, editedBody, originalBody] = await Promise.all([
    decryptOptional(first.headline_encrypted),
    decryptOptional(first.subhead_encrypted),
    decrypt(first.result_encrypted),
    decrypt(first.original_encrypted),
  ]);
  return {
    mode: first.mode,
    tone: first.tone,
    headline,
    subhead,
    edited_body: editedBody,
    original_body: originalBody,
    changes_count: first.changes_count,
    applied: first.applied,
  };
}

async function decryptEntryFull(row) {
  const entry = await decryptEntry(row);
  const ai_edit = await decryptAiEdit(row.ai_edits || row.ai_edit);
  const attachments = row.attachments || [];
  return { ...entry, ai_edit, attachments };
}

export function getReadTime(wordCount) {
  return Math.max(1, Math.ceil((wordCount || 0) / 230));
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

export async function fetchEntries({ userId, from, to, section, limit: lim } = {}) {
  let query = supabase
    .from("entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);
  if (section) query = query.eq("section", section);
  if (lim) query = query.limit(lim);

  const { data, error } = await query;
  if (error) throw error;

  return Promise.all(data.map(decryptEntry));
}

/**
 * Fetches entries with full ai_edits + attachments joins.
 * Returns decrypted entries in the ArticleView shape.
 */
export async function fetchEntriesFull({ userId, from, to, section, limit: lim } = {}) {
  let query = supabase
    .from("entries")
    .select(`
      id, user_id, section, title_encrypted, body_encrypted, mood, is_public,
      source, word_count, created_at, updated_at,
      ai_edits(mode, tone, headline_encrypted, subhead_encrypted,
        result_encrypted, original_encrypted, changes_count, applied),
      attachments(type, url, metadata)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);
  if (section) query = query.eq("section", section);
  if (lim) query = query.limit(lim);

  const { data, error } = await query;
  if (error) throw error;

  return Promise.all(data.map(decryptEntryFull));
}

/**
 * Fetches entries of a specific edition with ai_edits, attachments, and edition context.
 */
export async function fetchEditionEntriesFull(editionId) {
  const { data: edRows, error: eeError } = await supabase
    .from("edition_entries")
    .select(`
      display_order, is_featured,
      entry:entries(
        id, user_id, section, title_encrypted, body_encrypted, mood, is_public,
        source, word_count, created_at, updated_at,
        ai_edits(mode, tone, headline_encrypted, subhead_encrypted,
          result_encrypted, original_encrypted, changes_count, applied),
        attachments(type, url, metadata)
      )
    `)
    .eq("edition_id", editionId)
    .order("display_order", { ascending: true });

  if (eeError) throw eeError;

  const { data: edition } = await supabase
    .from("editions")
    .select("id, volume, number, week_start, week_end")
    .eq("id", editionId)
    .single();

  return Promise.all(
    edRows.map(async (ee) => {
      const entry = await decryptEntryFull(ee.entry);
      return {
        ...entry,
        edition: edition
          ? {
              id: edition.id,
              volume: edition.volume,
              number: edition.number,
              week_start: edition.week_start,
              week_end: edition.week_end,
              is_featured: ee.is_featured,
              display_order: ee.display_order,
            }
          : null,
      };
    })
  );
}

/**
 * Fetches a single public entry by ID (no auth required).
 * The RLS policy "Anyone can view public entries" allows this.
 */
export async function fetchPublicEntry(entryId) {
  const { data, error } = await supabase
    .from("entries")
    .select(`
      id, user_id, section, title_encrypted, body_encrypted, mood, is_public,
      source, word_count, created_at, updated_at,
      ai_edits(mode, tone, headline_encrypted, subhead_encrypted,
        result_encrypted, original_encrypted, changes_count, applied),
      attachments(type, url, metadata)
    `)
    .eq("id", entryId)
    .eq("is_public", true)
    .single();

  if (error) throw error;
  return decryptEntryFull(data);
}

/**
 * Fetches the profile name for a user (public display).
 */
export async function fetchPublicProfile(userId) {
  const { data } = await supabase
    .from("profiles")
    .select("name, publication_name")
    .eq("id", userId)
    .single();
  return data;
}

/**
 * Fetches entries and groups them by date for JournalView.
 * Returns array of { date: "Sunday, February 15", entries: [...] }
 */
export async function fetchJournal({ userId, from, to }) {
  const entries = await fetchEntries({ userId, from, to });

  const grouped = {};
  for (const entry of entries) {
    const dayLabel = formatDayOfWeek(entry.created_at);
    if (!grouped[dayLabel]) grouped[dayLabel] = [];
    grouped[dayLabel].push({
      id: entry.id,
      time: formatTime(entry.created_at),
      text: entry.body,
      title: entry.title,
      mood: MOOD_EMOJI[entry.mood] ?? "",
      section: SECTION_LABELS[entry.section] || entry.section,
      isPublic: entry.is_public,
      source: entry.source,
      hasPhoto: false,
      wordCount: entry.word_count,
    });
  }

  return Object.entries(grouped).map(([date, entries]) => ({ date, entries }));
}

// ---------------------------------------------------------------------------
// Editions
// ---------------------------------------------------------------------------

async function buildEditionViewData(edition, decryptedEntries, userId) {
  const editorial = await decryptOptional(edition.editorial_encrypted);
  const entryIds = decryptedEntries.map((ee) => ee.entry.id);
  const { data: aiEdits } = await supabase
    .from("ai_edits")
    .select("entry_id, applied")
    .in("entry_id", entryIds)
    .eq("applied", true);
  const aiEditedSet = new Set((aiEdits || []).map((a) => a.entry_id));

  const topStories = decryptedEntries.map((ee) => {
    const e = ee.entry;
    return {
      id: e.id,
      section: SECTION_UPPER[e.section] || e.section.toUpperCase(),
      headline: e.title || e.body.slice(0, 60) + "...",
      subhead: e.title ? e.body.slice(0, 120) + (e.body.length > 120 ? "..." : "") : "",
      excerpt: e.body,
      readTime: estimateReadTime(e.word_count),
      date: formatDate(e.created_at),
      source: e.source,
      isPublic: e.is_public,
      aiEdited: aiEditedSet.has(e.id),
      isFeatured: ee.is_featured,
    };
  });

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const briefingMap = {};
  for (const ee of decryptedEntries) {
    const d = new Date(ee.entry.created_at);
    const dayName = dayNames[d.getDay()];
    if (!briefingMap[dayName]) {
      const body = ee.entry.body;
      briefingMap[dayName] = body.length > 80 ? body.slice(0, 77) + "..." : body;
    }
  }
  const briefing = weekDays.map((day) => ({
    day,
    note: briefingMap[day] || "No entry this day.",
  }));

  const sectionCounts = {};
  for (const ee of decryptedEntries) {
    const sec = ee.entry.section;
    const label = SECTION_LABELS[sec] || sec;
    sectionCounts[label] = (sectionCounts[label] || 0) + 1;
  }

  const { count: totalEntries } = await supabase
    .from("entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const { count: totalEditions } = await supabase
    .from("editions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const featured = topStories.filter((s) => s.isFeatured);
  const rest = topStories.filter((s) => !s.isFeatured);

  return {
    edition: {
      id: edition.id,
      volume: edition.volume,
      num: edition.number,
      week: formatWeekRange(edition.week_start, edition.week_end),
      week_start: edition.week_start,
      week_end: edition.week_end,
      number: `Vol. ${edition.volume} · No. ${edition.number}`,
      entryCount: edition.entry_count,
      is_public: Boolean(edition.is_public),
      share_mode: edition.share_mode || "cover",
    },
    topStories: featured.length >= 2 ? featured.slice(0, 2) : [...featured, ...rest].slice(0, 2),
    briefing,
    editorial: {
      headline: "The Editor's Note",
      content: editorial || "",
    },
    sections: Object.entries(sectionCounts).map(([name, count]) => ({ name, count })),
    moreStories: rest.slice(0, 3).map((s) => ({
      id: s.id,
      section: s.section,
      headline: s.headline,
      readTime: s.readTime,
      isPublic: s.isPublic,
    })),
    stats: {
      totalEntries: totalEntries || 0,
      thisEdition: edition.entry_count,
      editions: totalEditions || 0,
      wordsThisWeek: edition.word_count,
    },
  };
}

async function fetchEditionRaw(userId, edition) {
  const { data: edEntries, error: eeError } = await supabase
    .from("edition_entries")
    .select("*, entry:entries(*)")
    .eq("edition_id", edition.id)
    .order("display_order", { ascending: true });

  if (eeError) throw eeError;

  const decryptedEntries = await Promise.all(
    edEntries.map(async (ee) => {
      const entry = await decryptEntry(ee.entry);
      return { ...ee, entry };
    })
  );

  return buildEditionViewData(edition, decryptedEntries, userId);
}

/**
 * Fetches the Nth most recent edition (0 = this week, 1 = last week, 2 = two weeks ago).
 */
export async function fetchEditionByOffset(userId, offset) {
  const { data: editions, error } = await supabase
    .from("editions")
    .select("*")
    .eq("user_id", userId)
    .order("week_start", { ascending: false })
    .range(offset, offset);

  if (error) throw error;
  if (!editions || editions.length === 0) return null;

  return fetchEditionRaw(userId, editions[0]);
}

/**
 * Fetches a specific edition by ID.
 */
export async function fetchEditionById(userId, editionId) {
  const { data: edition, error } = await supabase
    .from("editions")
    .select("*")
    .eq("id", editionId)
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  if (!edition) return null;

  return fetchEditionRaw(userId, edition);
}

/**
 * Fetches the latest edition. Alias for fetchEditionByOffset(userId, 0).
 */
export async function fetchLatestEdition(userId) {
  return fetchEditionByOffset(userId, 0);
}

/**
 * Updates edition sharing flags.
 */
export async function updateEditionSharing(userId, editionId, { isPublic, shareMode }) {
  const payload = {
    is_public: Boolean(isPublic),
    share_mode: shareMode || "cover",
    shared_at: isPublic ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from("editions")
    .update(payload)
    .eq("id", editionId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetches a public edition for sharing route.
 * - cover mode: returns minimal cover data
 * - full mode: returns edition data in the same shape as fetchLatestEdition
 */
export async function fetchPublicEdition(editionId) {
  const { data: edition, error: edError } = await supabase
    .from("editions")
    .select("*")
    .eq("id", editionId)
    .eq("is_public", true)
    .single();

  if (edError) throw edError;
  if (!edition) return null;

  // Cover mode does not expose full entry reading.
  if (edition.share_mode !== "full") {
    return {
      mode: "cover",
      edition: {
        id: edition.id,
        volume: edition.volume,
        num: edition.number,
        week: formatWeekRange(edition.week_start, edition.week_end),
        week_start: edition.week_start,
        week_end: edition.week_end,
        number: `Vol. ${edition.volume} · No. ${edition.number}`,
        entryCount: edition.entry_count,
      },
      stats: {
        totalEntries: edition.entry_count || 0,
        thisEdition: edition.entry_count || 0,
        editions: 1,
        wordsThisWeek: edition.word_count || 0,
      },
      topStories: [],
      briefing: [],
      editorial: {
        headline: "The Editor's Note",
        content: "",
      },
      sections: [],
      moreStories: [],
    };
  }

  const { data: edEntries, error: eeError } = await supabase
    .from("edition_entries")
    .select("*, entry:entries(*)")
    .eq("edition_id", edition.id)
    .order("display_order", { ascending: true });
  if (eeError) throw eeError;

  const decryptedEntries = await Promise.all(
    (edEntries || [])
      .filter((ee) => ee.entry)
      .map(async (ee) => {
        const entry = await decryptEntry(ee.entry);
        return { ...ee, entry };
      })
  );

  const data = await buildEditionViewData(edition, decryptedEntries, edition.user_id);
  return { ...data, mode: "full" };
}

// ---------------------------------------------------------------------------
// Archives
// ---------------------------------------------------------------------------

export async function fetchAllEditions(userId) {
  const { data: editions, error } = await supabase
    .from("editions")
    .select("*")
    .eq("user_id", userId)
    .order("week_start", { ascending: false });

  if (error) throw error;

  // Decrypt editorials to extract headlines
  const results = await Promise.all(
    editions.map(async (ed) => {
      const editorial = await decryptOptional(ed.editorial_encrypted);
      const headline = editorial
        ? editorial.split(".")[0].slice(0, 60)
        : `Edition No. ${ed.number}`;

      // Derive a mood from week number pattern
      const moods = ["⚡", "🌧", "🌤", "☀️", "🌙"];
      const moodEmoji = moods[ed.number % moods.length];

      return {
        id: ed.id,
        num: `No. ${ed.number}`,
        week: formatWeekShort(ed.week_start, ed.week_end),
        headline,
        entries: ed.entry_count,
        words: ed.word_count,
        mood: moodEmoji,
      };
    })
  );

  return results;
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export async function fetchSections(userId) {
  const entries = await fetchEntries({ userId });

  const sectionMap = {};
  for (const entry of entries) {
    const key = entry.section;
    if (!sectionMap[key]) {
      sectionMap[key] = {
        name: SECTION_LABELS[key] || key,
        entries: [],
        totalWords: 0,
      };
    }
    sectionMap[key].entries.push(entry);
    sectionMap[key].totalWords += entry.word_count || 0;
  }

  // Order sections by count
  const ordered = Object.values(sectionMap).sort((a, b) => b.entries.length - a.entries.length);

  return ordered.map((sec) => {
    const topEntries = sec.entries.slice(0, 3).map((e) => ({
      id: e.id,
      headline: e.title || e.body.slice(0, 60) + "...",
      sub: e.title ? e.body.slice(0, 100) + (e.body.length > 100 ? "..." : "") : "",
      time: estimateReadTime(e.word_count),
    }));

    // Derive themes from content keywords
    const themes = deriveThemes(sec.entries);

    const totalWords = sec.totalWords;
    const wordsLabel = totalWords >= 1000
      ? `${(totalWords / 1000).toFixed(1)}k`
      : String(totalWords);

    return {
      name: sec.name,
      count: sec.entries.length,
      words: wordsLabel,
      entries: topEntries,
      themes,
    };
  });
}

function deriveThemes(entries) {
  const keywords = {};
  const themeWords = [
    "career", "permission", "identity", "food", "cooking", "light",
    "photography", "marina", "clarice", "fear", "courage", "change",
    "self-trust", "ambition", "grief", "action", "visibility", "quiet",
    "city", "são paulo", "music", "literature", "relationships",
    "mornings", "transition", "growth",
  ];

  for (const e of entries) {
    const text = ((e.title || "") + " " + e.body).toLowerCase();
    for (const kw of themeWords) {
      if (text.includes(kw)) {
        keywords[kw] = (keywords[kw] || 0) + 1;
      }
    }
  }

  return Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));
}

// ---------------------------------------------------------------------------
// Reflections
// ---------------------------------------------------------------------------

export async function fetchReflection(userId, period) {
  const { data, error } = await supabase
    .from("reflections")
    .select("*")
    .eq("user_id", userId)
    .eq("period", period)
    .order("period_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const reflectionText = await decrypt(data.reflection_encrypted);

  // Parse JSONB fields (Supabase client auto-parses them)
  const themes = (data.themes || []).map((t) => ({
    theme: t.theme,
    count: t.count,
    trend: t.trend === "up" ? "↑" : t.trend === "down" ? "↓" : "—",
  }));

  const moodData = data.mood_data || [];
  const connections = data.connections || [];
  const questions = data.questions || [];
  const stats = data.stats || {};

  // Build period labels
  const periodLabels = {
    week: "This Week",
    month: "This Month",
    quarter: "3 Months",
    all: "All Time",
  };

  const periodDates = {
    week: formatWeekShort(data.period_start, data.period_end) + ", " + new Date(data.period_end + "T12:00:00").getFullYear(),
    month: new Date(data.period_start + "T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    quarter: formatWeekShort(data.period_start, data.period_end),
    all: `${Object.keys(stats).includes("editions") ? stats.editions : "47"} editions · 1 year`,
  };

  const trendLabels = {
    week: "6-Week Trend",
    month: "6-Month Trend",
    quarter: "Quarterly Trend",
    all: "12-Month Trend",
  };

  // Build trend data based on mood_data
  const trend = moodData.map((m, i) => ({ w: m.day, v: m.val }));

  // Build stats array from object
  const statsArray = Object.entries(stats).map(([key, value]) => ({
    label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    value: String(value),
  }));

  // Determine mood hint from data
  const avgMood = moodData.length > 0
    ? moodData.reduce((s, m) => s + m.val, 0) / moodData.length
    : 3;
  const moodHints = {
    week: avgMood > 3.5 ? "Optimism at a 3-month high" : "A steady week with moments of clarity",
    month: avgMood > 3.5 ? `${periodDates.month?.split(" ")[0] || "This month"} is your brightest month yet` : "A month of measured progress",
    quarter: "Clear upward arc from the beginning",
    all: avgMood > 3 ? "Your brightest period since you started" : "A year of measured growth",
  };

  // Build reflection title
  const reflectionTitles = {
    week: "This Week's Reflection",
    month: `${new Date(data.period_start + "T12:00:00").toLocaleDateString("en-US", { month: "long" })} So Far`,
    quarter: "The Last Three Months",
    all: "One Year of Writing",
  };

  return {
    label: periodLabels[period] || period,
    date: periodDates[period] || "",
    moods: moodData,
    trend,
    trendLabel: trendLabels[period] || "Trend",
    moodHint: moodHints[period] || "",
    reflectionTitle: reflectionTitles[period] || "Reflection",
    reflection: reflectionText.split("\n\n").filter(Boolean),
    connections,
    themes,
    questions,
    stats: statsArray,
  };
}

export async function fetchAllReflections(userId) {
  const periods = ["week", "month", "quarter", "all"];
  const results = {};

  await Promise.all(
    periods.map(async (p) => {
      const data = await fetchReflection(userId, p);
      if (data) results[p] = data;
    })
  );

  return results;
}

// ---------------------------------------------------------------------------
// Write: Entries
// ---------------------------------------------------------------------------

/**
 * Creates a new journal entry with encrypted title/body.
 * Returns the created entry (decrypted) or throws on error.
 */
export async function createEntry({ userId, title, body, section, mood, isPublic, source }) {
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;

  const [titleHex, bodyHex] = await Promise.all([
    title ? encrypt(title) : Promise.resolve(null),
    encrypt(body),
  ]);

  const row = {
    user_id: userId,
    title_encrypted: titleHex,
    body_encrypted: bodyHex,
    section: section || "dispatch",
    mood: mood ?? null,
    is_public: isPublic || false,
    source: source || "app",
    word_count: wordCount,
  };

  const { data, error } = await supabase
    .from("entries")
    .insert(row)
    .select()
    .single();

  if (error) throw error;

  return decryptEntry(data);
}

// ---------------------------------------------------------------------------
// Write: Profile
// ---------------------------------------------------------------------------

/**
 * Updates profile fields (publication_name, motto, theme_mode, theme_accent).
 * Only sends fields that are provided (non-undefined).
 */
export async function updateProfile(userId, fields) {
  const allowed = ["publication_name", "motto", "theme_mode", "theme_accent"];
  const updates = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) updates[key] = fields[key];
  }

  if (Object.keys(updates).length === 0) return;

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Admin: AI Prompts
// ---------------------------------------------------------------------------

export async function fetchPrompts() {
  const { data, error } = await supabase
    .from("ai_prompts")
    .select("*")
    .order("id");

  if (error) throw error;
  return data;
}

export async function updatePrompt(id, fields) {
  const { data, error } = await supabase
    .from("ai_prompts")
    .update(fields)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

export async function uploadAttachment(userId, file) {
  const ext = file.name.split(".").pop();
  const filePath = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(filePath, file, { contentType: file.type });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from("attachments")
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

export async function createAttachments(entryId, userId, attachments) {
  if (!attachments || attachments.length === 0) return [];

  const rows = attachments.map((a) => ({
    entry_id: entryId,
    user_id: userId,
    type: a.type,
    url: a.url || null,
    metadata: a.metadata || {},
  }));

  const { data, error } = await supabase
    .from("attachments")
    .insert(rows)
    .select();

  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Admin API — Edge Function calls (requires admin role)
// ---------------------------------------------------------------------------

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

export async function adminApi(session, action, params = {}) {
  const res = await fetch(`${supabaseUrl}/functions/v1/admin-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...params }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Admin API error");
  return json;
}
