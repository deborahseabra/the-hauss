/**
 * The Hauss — Database Seed Script
 *
 * Populates all Supabase tables with realistic encrypted data
 * for the authenticated user. Uses the service role key to bypass RLS.
 *
 * Usage: node scripts/seed.mjs
 */

import crypto from "crypto";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env.local");
  const content = readFileSync(envPath, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
  return env;
}

const ENV = loadEnv();
const SUPABASE_URL = ENV.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY;
const ENCRYPTION_KEY_HEX = ENV.ENCRYPTION_KEY;
const USER_ID = "3e13afbd-773a-4d22-b2a1-354ec1a2c75c";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ENCRYPTION_KEY_HEX) {
  console.error("Missing env vars. Ensure .env.local has VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Encryption (AES-256-GCM, same format as lib/encryption.ts)
// ---------------------------------------------------------------------------
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const encryptionKey = Buffer.from(ENCRYPTION_KEY_HEX, "hex");

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

function encryptHex(text) {
  if (!text) return null;
  return "\\x" + encrypt(text).toString("hex");
}

// ---------------------------------------------------------------------------
// Supabase REST helper
// ---------------------------------------------------------------------------
const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function supabaseInsert(table, rows) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`INSERT into ${table} failed (${res.status}): ${body}`);
  }
  return res.json();
}

async function supabaseDelete(table, filter) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const res = await fetch(url, { method: "DELETE", headers });
  if (!res.ok) {
    const body = await res.text();
    console.warn(`DELETE from ${table} warning (${res.status}): ${body}`);
  }
}

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

const ENTRIES_DATA = [
  // --- Week 47: Feb 9-15, 2026 ---
  { title: "After Three Years of Doubt, She Finally Made the Leap", body: "It wasn't courage that made me do it. It was the slow, creeping realization that staying put required more bravery than leaving ever would. The morning I resigned, the sky over Paulista was absurdly blue — the kind of blue that feels like the universe is showing off. I remember thinking: if the world can be this gratuitously beautiful on a Tuesday, maybe I can afford to be a little reckless.\n\nThree years I'd spent in that office. Three years of telling myself 'next quarter.' Three years of watching the window and wondering what the light looked like from the other side.\n\nWhen I finally told my manager, she looked at me like I'd announced I was moving to Mars. 'But you just got promoted,' she said. I nodded. 'That's exactly why.'", section: "essay", mood: 3, is_public: true, source: "telegram", created_at: "2026-02-14T23:30:00-03:00" },
  { title: "A Week of Small Victories and One Spectacular Failure", body: "Monday's breakthrough was almost enough to make up for Thursday's kitchen disaster. The mushroom stroganoff was, by any objective measure, a catastrophe. The mushrooms were somehow both overcooked and underflavored. The cream sauce separated into what looked like a science experiment gone wrong. I ate it anyway, standing in the kitchen, because admitting defeat felt worse than the taste.\n\nBut the week had its moments. The retention model finally clicked. Marina said yes to Lisbon. And I kept one photo out of twelve — the one where you can't tell what you're looking at. Just light and shadow and the edge of a building.", section: "dispatch", mood: 3, is_public: false, source: "app", created_at: "2026-02-12T21:15:00-03:00" },
  { title: null, body: "Can't sleep. Started reading Clarice Lispector again — 'A Hora da Estrela.' Every sentence feels like she's writing directly to me, across decades. Underlined almost everything. There's a line about how we only become who we are at the moment we lose ourselves. I keep turning it over.", section: "essay", mood: 4, is_public: false, source: "app", created_at: "2026-02-15T23:45:00-03:00" },
  { title: "Golden Hour From the Apartment", body: "Golden hour from the apartment balcony today. The light in São Paulo at this hour — it turns everything amber. Took 12 photos. Only kept one. It's the one where you can't tell what you're looking at. Just light and shadow and the edge of a building. That's the one that felt true.", section: "photo", mood: 0, is_public: true, source: "telegram", created_at: "2026-02-14T18:42:00-03:00" },
  { title: null, body: "Lunch with Marina at the Italian place on Augusta. She told me she's moving to Lisbon in March. I felt three things at once: happy for her, jealous of her certainty, and relieved that someone close to me is also making a leap. We split the bill and she cried a little in the parking lot. I pretended I didn't notice, which is maybe what friends do.", section: "dispatch", mood: 1, is_public: false, source: "telegram", created_at: "2026-02-14T12:15:00-03:00" },
  { title: null, body: "The mushroom stroganoff was, by any objective measure, a catastrophe. The mushrooms were somehow both overcooked and underflavored. The cream sauce separated. I ate it anyway, standing in the kitchen, because admitting defeat felt worse than the taste. Note to self: when the recipe says 'medium heat,' it means medium heat.", section: "dispatch", mood: 3, is_public: false, source: "app", created_at: "2026-02-13T21:30:00-03:00" },
  { title: null, body: "Woke up before the alarm. First time this month. Lay there for ten minutes just listening to the city wake up. There's a specific sound São Paulo makes at 7am — traffic starting to hum, a dog barking somewhere in Pinheiros, the coffee shop downstairs pulling its metal gate up. It's not quiet, but it's a kind of peace.", section: "letter", mood: 1, is_public: false, source: "app", created_at: "2026-02-12T07:30:00-03:00" },
  { title: "The Day Everything Clicked", body: "Breakthrough at work today. Finally cracked the retention model I've been wrestling with for weeks. The answer was embarrassingly simple — we were measuring the wrong moment. It's not about when people leave, it's about the last time they felt seen. Wrote up the whole thing in one sitting. 2,400 words. Felt electric.", section: "essay", mood: 3, is_public: true, source: "app", created_at: "2026-02-12T23:00:00-03:00" },
  { title: null, body: "Nothing extraordinary happened today. Worked. Ate. Walked to the pharmacy and back. Watched the light change from the window. Sometimes I think the unremarkable days are the ones that hold everything together — the ordinary glue between the chapters. Today was glue. And that's okay.", section: "dispatch", mood: 1, is_public: false, source: "telegram", created_at: "2026-02-11T20:15:00-03:00" },
  { title: null, body: "Started the week with intention. Wrote 3 pages in the morning before coffee. There's something about the blankness of Monday morning — it's like a fresh sheet of newspaper. Anything could be the headline.", section: "dispatch", mood: 0, is_public: false, source: "app", created_at: "2026-02-09T08:00:00-03:00" },

  // --- Week 46: Feb 2-8, 2026 ---
  { title: "The Art of Staying When Everything Says Go", body: "Everyone around me is leaving — new cities, new jobs, new lives. And here I am, still in the same apartment, still walking the same route to the same café. But I'm starting to wonder if staying is its own kind of courage. The kind nobody writes songs about.\n\nMarina told me last week she's been planning Lisbon for months. She made it sound spontaneous, but I know her spreadsheets. I know the color-coded columns. Sometimes the bravest thing is admitting you've already decided.\n\nI haven't decided yet. Or maybe I have, and I'm just waiting for my body to catch up with my mind.", section: "essay", mood: 2, is_public: false, source: "app", created_at: "2026-02-07T22:00:00-03:00" },
  { title: "Why I Stopped Apologizing for Taking Up Space", body: "I counted today. Four times before noon I said 'sorry' when I meant 'excuse me' or 'actually, I disagree.' Four times I made myself smaller so someone else could feel bigger. It's a habit I'm trying to break, but habits that keep you safe are the hardest ones to release.\n\nThe turning point was a meeting at 3pm. I had an idea. A good one. And instead of prefacing it with 'this might be silly, but...' I just said it. The room went quiet. Then someone said, 'That's exactly right.' No apology. No qualifier. Just the idea, standing on its own.", section: "essay", mood: 3, is_public: true, source: "app", created_at: "2026-02-06T21:00:00-03:00" },
  { title: null, body: "Rain all day. The kind of rain that makes São Paulo feel like it's exhaling. Stayed inside, made tea three times, finished a chapter of the Lispector book. Didn't write anything meaningful. Didn't need to.", section: "dispatch", mood: 1, is_public: false, source: "telegram", created_at: "2026-02-05T19:30:00-03:00" },
  { title: null, body: "Tried a new coffee place in Vila Madalena. The barista recognized me from last week even though I was sure I'd been invisible. 'The one who writes in the corner,' he said. I didn't correct him.", section: "dispatch", mood: 0, is_public: false, source: "app", created_at: "2026-02-03T10:45:00-03:00" },
  { title: "Dear Future Me: Don't Forget How This Felt", body: "I'm writing this on a Tuesday evening and everything is uncertain and somehow that feels exactly right. Don't forget: the uncertainty wasn't the enemy. The certainty was. The certainty that things should stay the same, that safety equals stasis, that the known is always better than the unknown.\n\nRemember this feeling — the one where your stomach is tight but your mind is clear. That's not anxiety. That's readiness.", section: "letter", mood: 4, is_public: false, source: "app", created_at: "2026-02-04T20:30:00-03:00" },

  // --- Week 45: Jan 26 - Feb 1, 2026 ---
  { title: "January Came and Went Like a Long Exhale", body: "Thirty-one days and I can barely tell you what happened. Not because nothing happened — because it all happened so gradually. Like watching a plant grow. You don't see the change, but one day you realize it's taller than it was.\n\nI wrote more this month than any month since I started. 22 entries. Some of them are good. Most of them are honest, which might be better.", section: "essay", mood: 1, is_public: false, source: "app", created_at: "2026-02-01T23:00:00-03:00" },
  { title: null, body: "Cooked risotto tonight. Actual risotto, not the shortcut version. Stood at the stove for 45 minutes, adding broth one ladle at a time. It's meditative if you let it be. The rice doesn't care about your deadlines.", section: "dispatch", mood: 1, is_public: false, source: "app", created_at: "2026-01-30T21:00:00-03:00" },
  { title: "The Playlist That Got Me Through January", body: "Thirty-one days, forty-four songs, one recurring theme: women figuring it out. Joni Mitchell. Adriana Calcanhotto. SZA. Clarice Falcão. The algorithm figured out my existential crisis before I did.\n\nThe standout track was 'Águas de Março' by Elis Regina — which makes no sense in January, but the line about 'é pau, é pedra, é o fim do caminho' felt prophetic. It's all sticks and stones and the end of the road. Until it's not.", section: "review", mood: 0, is_public: false, source: "app", created_at: "2026-01-31T20:00:00-03:00" },
  { title: null, body: "Sunday morning. Farmers market in the neighborhood. Bought way too many tomatoes because the vendor smiled at me and I can't say no to kindness. The tomatoes are now on the counter, judging me.", section: "dispatch", mood: 0, is_public: false, source: "telegram", created_at: "2026-01-26T11:00:00-03:00" },
  { title: "A Note on What You Deserve", body: "You keep forgetting. So here it is, in writing: you deserve to take up space. You deserve to change your mind. You deserve a career that doesn't require you to perform enthusiasm. You deserve tomatoes from the farmers market even if you don't have a plan for them.\n\nThis is not aspirational. This is factual.", section: "letter", mood: 4, is_public: false, source: "app", created_at: "2026-01-28T07:30:00-03:00" },

  // --- Week 44: Jan 19-25, 2026 ---
  { title: "On Ambition, Mushroom Risotto, and Letting Things Be", body: "Spent the weekend trying not to plan anything. It lasted about four hours before I found myself making a spreadsheet for February goals. The irony isn't lost on me — I'm so ambitious about relaxation that I turned it into a project.\n\nThe risotto was good this time. Better than good. The secret, I've learned, is patience and butter. There's probably a life lesson in there but I'm too tired to find it.", section: "essay", mood: 0, is_public: false, source: "app", created_at: "2026-01-25T22:00:00-03:00" },
  { title: null, body: "Meeting with the product team went well. My manager used the word 'impressive' which she deploys approximately once per fiscal quarter. I'm choosing to take it as a sign.", section: "dispatch", mood: 3, is_public: false, source: "app", created_at: "2026-01-22T18:00:00-03:00" },
  { title: "Clarice Lispector's 'A Hora da Estrela'", body: "Every sentence feels like she's writing directly to me, across decades. The story of Macabéa — a woman so invisible she barely registers in her own life — is somehow the most personal thing I've ever read. Lispector doesn't describe; she inhabits. The prose doesn't flow — it erupts.\n\nFinished it in one sitting. Started it again immediately. There are books you read and books that read you. This one read me.", section: "review", mood: 4, is_public: true, source: "app", created_at: "2026-01-23T23:30:00-03:00" },
  { title: "To the Version of Me Who's Still Afraid", body: "She's doing fine. You should know that. She's still afraid, but she stopped letting that be the reason she doesn't try. She burned the stroganoff and laughed about it. She said the thing in the meeting. She kept one photo out of twelve.\n\nYou would like her. She's still you, just louder.", section: "letter", mood: 4, is_public: false, source: "app", created_at: "2026-01-21T07:00:00-03:00" },

  // --- Week 43: Jan 12-18, 2026 ---
  { title: "A Quiet Week in a Loud City", body: "São Paulo doesn't do quiet. But this week, I found pockets of it — between the honking and the construction and the music drifting from the bar downstairs. In the ten seconds after the traffic light changes and before anyone moves. In the elevator at 6am when I'm the only one awake.\n\nQuiet isn't the absence of noise. It's the presence of attention.", section: "essay", mood: 1, is_public: false, source: "app", created_at: "2026-01-18T21:00:00-03:00" },
  { title: null, body: "Downloaded three productivity apps. Deleted two of them by lunch. Kept the one that's basically just a notes app with a nicer font. Sometimes the problem isn't the tool — it's the fact that I'd rather organize my to-do list than do the things on it.", section: "dispatch", mood: 1, is_public: false, source: "app", created_at: "2026-01-15T19:00:00-03:00" },
  { title: null, body: "Thursday. The kind of Thursday that feels like it should be Friday but isn't. Made pasta. Watched the news. Called my mother. She asked if I'm eating enough. I lied. She knows.", section: "dispatch", mood: 2, is_public: false, source: "telegram", created_at: "2026-01-16T22:00:00-03:00" },
  { title: null, body: "Walking through Ibirapuera Park at sunset. The light was doing that thing where everything looks like a painting. Two kids were chasing each other around the lake. A couple sat on a bench, not talking, just being. I thought: this is enough. This is more than enough.", section: "dispatch", mood: 0, is_public: false, source: "app", created_at: "2026-01-12T17:30:00-03:00" },

  // --- Week 42: Jan 5-11, 2026 ---
  { title: "New Year, Same Questions, Better Answers", body: "Everyone keeps asking what my New Year's resolutions are, as if I have a neat little list. I don't. What I have is a feeling — this persistent, low-grade hum of readiness. Like the universe sent me a calendar invite and I haven't clicked 'accept' yet.\n\nThe questions haven't changed: What do I want? What am I willing to risk? What would I do if no one was watching? But the answers are getting clearer. Or maybe I'm just getting braver about hearing them.\n\nResolution: stop answering questions I haven't asked myself.", section: "essay", mood: 0, is_public: true, source: "app", created_at: "2026-01-11T22:00:00-03:00" },
  { title: null, body: "First Monday of the year. The office felt like waking up from a dream — everyone moving slowly, coffee cups in hand, talking about beach vacations and family dinners. I'd spent the break reading and walking and thinking. I came back different. No one noticed.", section: "dispatch", mood: 1, is_public: false, source: "app", created_at: "2026-01-05T19:00:00-03:00" },
  { title: null, body: "Yoga class. First time in months. My body remembered things my mind had forgotten. The instructor said 'just breathe' and I realized I'd been holding my breath since November.", section: "dispatch", mood: 0, is_public: false, source: "app", created_at: "2026-01-07T08:30:00-03:00" },
  { title: "That Restaurant on Augusta", body: "The pasta was fine. The conversation was not. Sometimes you go to dinner with someone and realize mid-appetizer that you've outgrown each other. It's not dramatic — it's geological. Slow erosion of common ground until you're sitting across from a stranger you've known for five years.\n\nI paid the bill and said 'let's do this again' knowing we wouldn't. We both smiled. The lying was kind.", section: "review", mood: 2, is_public: false, source: "app", created_at: "2026-01-09T23:00:00-03:00" },
  { title: null, body: "Rain again. Wrote for two hours straight — didn't plan to, it just happened. Started with a grocery list and ended with something that might be a personal essay about why I can't throw away empty jars. The jar essay is probably a metaphor but I'm too close to it to see for what.", section: "dispatch", mood: 1, is_public: false, source: "app", created_at: "2026-01-08T21:00:00-03:00" },
  { title: null, body: "Golden light streaming through the kitchen window at 6pm. Made anotações about nothing in particular. The pen felt good in my hand. Sometimes that's the whole point.", section: "dispatch", mood: 0, is_public: false, source: "telegram", created_at: "2026-01-06T18:00:00-03:00" },
  { title: null, body: "Saturday morning. Walked to the bakery in flip-flops. The woman behind the counter gave me an extra pão de queijo because 'you look like you need it.' She's not wrong. Sometimes the city takes care of you in small ways.", section: "dispatch", mood: 0, is_public: false, source: "app", created_at: "2026-01-10T09:00:00-03:00" },
  { title: null, body: "Journaling about journaling. Very meta. But there's something worth noting: I've been writing every day for 42 weeks now. That's longer than any habit I've ever maintained, including flossing and being nice to my sister. The writing has become less of a practice and more of a pulse.", section: "essay", mood: 4, is_public: false, source: "app", created_at: "2026-01-11T10:00:00-03:00" },
];

const EDITIONS_DATA = [
  { week_start: "2026-02-09", week_end: "2026-02-15", volume: 1, number: 47, editorial: "This was a week of inflection. Seven entries across seven days — unusual consistency. The AI editor noticed a shift from observation to declaration, from 'I noticed' to 'I decided.' The recurring theme: permission. Something is changing." },
  { week_start: "2026-02-02", week_end: "2026-02-08", volume: 1, number: 46, editorial: "A quieter week, but not a still one. The rain shaped your writing this week — three of five entries mention water, weather, or the sound of São Paulo in the wet. The AI editor notes a theme of patience emerging: with yourself, with your risotto, with the decisions still unmade." },
  { week_start: "2026-01-26", week_end: "2026-02-01", volume: 1, number: 45, editorial: "January closed with a rare admission: 'I wrote more this month than any month since I started.' Eight entries this week, more than you've written since early December. The tomatoes from the farmers market appear twice. Your writing is getting domestic — in the best way." },
  { week_start: "2026-01-19", week_end: "2026-01-25", volume: 1, number: 44, editorial: "The ambition-and-risotto duality defined this week. Your manager said 'impressive' — a word she apparently rations — and you cooked something that required patience. These two things are connected, even if you can't see how yet." },
  { week_start: "2026-01-12", week_end: "2026-01-18", volume: 1, number: 43, editorial: "A self-proclaimed quiet week in a loud city. Four entries, each one a small observation. The AI editor noticed you're paying more attention to light and sound than events. That's a shift worth watching." },
  { week_start: "2026-01-05", week_end: "2026-01-11", volume: 1, number: 42, editorial: "New year, new entries, same restless energy. Nine entries this week — your most prolific week in two months. You wrote about resolutions without making any. The jar essay is your most surprising piece: what starts as comedy becomes confession." },
];

const REFLECTIONS_DATA = [
  {
    period: "week", period_start: "2026-02-09", period_end: "2026-02-15",
    reflection: "This was a week of inflection. You wrote seven entries across seven days — your most consistent week since October. But the shift wasn't just in quantity. Your language changed. Early in the week, you observed. By Sunday, you declared.\n\nThe recurring word was permission — sometimes spoken, sometimes implied. You gave yourself permission to leave, to feel jealous, to eat bad stroganoff standing up, to keep only one photo out of twelve.\n\nSomething is changing. The question is whether you know what it is yet.",
    connections: ["You mention Marina in 8 entries, always when something in your own life is shifting. She might be your mirror for change.", "Your best writing happens between 10PM and midnight. 73% of your personal essays were written after dark.", "Entries via Telegram are 40% shorter but higher in emotional intensity. Quick thoughts carry more weight than you think.", "Every time you mention cooking, the next day's entry is more reflective. Food unlocks introspection."],
    themes: [{ theme: "Permission", count: 14, trend: "up" }, { theme: "Marina", count: 8, trend: "stable" }, { theme: "Food as metaphor", count: 11, trend: "up" }, { theme: "Light & photography", count: 9, trend: "stable" }, { theme: "Clarice Lispector", count: 5, trend: "up" }],
    mood_data: [{ day: "Mon", val: 4, emoji: "☀️" }, { day: "Tue", val: 3, emoji: "🌤" }, { day: "Wed", val: 3, emoji: "🌤" }, { day: "Thu", val: 5, emoji: "⚡" }, { day: "Fri", val: 4, emoji: "☀️" }, { day: "Sat", val: 2, emoji: "🌙" }, { day: "Sun", val: 5, emoji: "⚡" }],
    stats: { entries: "7", words: "4,280", streak: "12 days", avg_per_entry: "611", via_telegram: "3", public: "2" },
    questions: ["When did the math change — the cost of staying vs. leaving?", "Marina is moving to Lisbon. You felt jealousy and relief. Which surprised you more?", "You kept one photo out of twelve. What made that one feel true?", "You've mentioned permission 14 times. Who were you asking?"],
  },
  {
    period: "month", period_start: "2026-02-01", period_end: "2026-02-15",
    reflection: "February opened with momentum and hasn't let up. You've written 14 entries in 15 days — a pace you haven't hit since the first month on the platform. The quality has shifted too: your sentences are getting shorter, more decisive.\n\nThe theme of the month is action. January was full of 'what if' and 'maybe.' February replaced those with 'I did' and 'I will.' The resignation on Feb 15 wasn't impulsive — it was the culmination of 47 days of quiet preparation.\n\nYou're also writing more publicly. Four entries went public this month, compared to one in all of January. You're ready to be seen.",
    connections: ["Your February entries reference January entries 6 times — you're in active dialogue with your past self.", "Public entries are 30% longer than private ones. Visibility makes you more deliberate.", "Every Letter to Self this month was written before 8 AM. Your mornings belong to introspection.", "The word 'finally' appears 9 times this month. Zero times in January."],
    themes: [{ theme: "Action", count: 18, trend: "up" }, { theme: "Permission", count: 14, trend: "up" }, { theme: "Visibility", count: 9, trend: "up" }, { theme: "Marina", count: 5, trend: "stable" }, { theme: "Clarice", count: 5, trend: "up" }],
    mood_data: [{ day: "W1", val: 3, emoji: "🌤" }, { day: "W2", val: 4, emoji: "⚡" }, { day: "W3", val: 4, emoji: "☀️" }, { day: "W4", val: 5, emoji: "⚡" }],
    stats: { entries: "14", words: "9,640", streak: "12 days", avg_per_entry: "689", via_telegram: "5", public: "4" },
    questions: ["Your writing pace doubled. What changed — discipline or urgency?", "You went public 4 times. What made those entries feel ready?", "January's 'what if' became February's 'I did.' Was there a single moment?", "You write Letters to Self only in the morning now. Why?"],
  },
  {
    period: "quarter", period_start: "2025-12-01", period_end: "2026-02-15",
    reflection: "The arc of the last three months is unmistakable: December was grief, January was restlessness, February is action. You processed a loss, sat with uncertainty, and then — without fanfare — started moving.\n\nYou wrote 142 entries across 13 weeks. The density of personal essays doubled from December to February. Your dispatches got shorter but your essays got deeper. The ratio shifted from observation to reflection.\n\nThe most striking change: your relationship with your own voice. In December you wrote 'I think' 34 times. In February, just 6. You stopped hedging.",
    connections: ["December's grief entries and February's action entries share the same vocabulary — transformation repurposed the language of loss.", "Your longest writing streaks correlate with periods of professional uncertainty. Writing is your stabilizer.", "Marina appears more in transition months. She was absent in your most stable weeks.", "Your reading habits (Clarice, Lispector) preceded your bravest writing by exactly one week."],
    themes: [{ theme: "Identity", count: 34, trend: "up" }, { theme: "Career", count: 28, trend: "up" }, { theme: "Permission", count: 22, trend: "up" }, { theme: "Grief to Action", count: 18, trend: "up" }, { theme: "Marina", count: 15, trend: "stable" }],
    mood_data: [{ day: "Dec", val: 2, emoji: "🌧" }, { day: "Jan W1", val: 2, emoji: "🌙" }, { day: "Jan W3", val: 3, emoji: "🌤" }, { day: "Feb W1", val: 4, emoji: "☀️" }, { day: "Feb W2", val: 5, emoji: "⚡" }],
    stats: { entries: "142", words: "38,400", best_streak: "12 days", avg_per_entry: "270", personal_essays: "24", public: "11" },
    questions: ["December's grief — have you finished processing it, or just redirected it?", "Your hedging dropped 80%. Is that confidence or urgency?", "You read Clarice before your bravest writing. Coincidence or ritual?", "Three months ago you were still. Now you're running. Toward what?"],
  },
  {
    period: "all", period_start: "2025-03-01", period_end: "2026-02-15",
    reflection: "Forty-seven editions. Eight hundred and forty-seven entries. One year of your inner life, captured in words.\n\nThe through-line is unmistakable: a woman learning, slowly and sometimes painfully, to trust her own judgment. The early editions are full of questions. The recent ones are full of answers disguised as questions.\n\nYou started The Deborah Times as an experiment. It became a practice. And somewhere around edition 30, it became a mirror you couldn't look away from. The writing changed you — not the other way around.",
    connections: ["Your vocabulary has expanded 40% since edition 1. You found new words for old feelings.", "The topics you avoid are as revealing as the ones you pursue. You've never written about your parents.", "Your most-referenced entry is from edition 12: 'The Morning I Decided to Stay.' You've linked back to it 7 times.", "Seasons affect your writing more than events. Fall is grief, winter is stillness, spring is action."],
    themes: [{ theme: "Self-trust", count: 67, trend: "up" }, { theme: "Career transitions", count: 45, trend: "up" }, { theme: "Food & cooking", count: 42, trend: "stable" }, { theme: "Photography & light", count: 38, trend: "stable" }, { theme: "Marina", count: 23, trend: "stable" }],
    mood_data: [{ day: "Q1", val: 3, emoji: "🌤" }, { day: "Q2", val: 2, emoji: "🌧" }, { day: "Q3", val: 3, emoji: "🌤" }, { day: "Q4", val: 4, emoji: "⚡" }],
    stats: { entries: "847", words: "198,000", editions: "47", avg_per_week: "18", personal_essays: "89", public: "34" },
    questions: ["You've been writing for a year. Who were you in edition 1?", "The topics you avoid — are you ready to go there?", "Your writing changed you. When did you first notice?", "Forty-seven editions from now, what do you hope to read?"],
  },
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
async function seed() {
  console.log("Seeding The Hauss database...\n");

  // --- Clean existing data (order matters due to FK constraints) ---
  console.log("1/7  Cleaning existing data...");
  await supabaseDelete("edition_entries", `edition_id=not.is.null`);
  await supabaseDelete("attachments", `user_id=eq.${USER_ID}`);
  await supabaseDelete("ai_edits", `user_id=eq.${USER_ID}`);
  await supabaseDelete("reflections", `user_id=eq.${USER_ID}`);
  await supabaseDelete("editions", `user_id=eq.${USER_ID}`);
  await supabaseDelete("entries", `user_id=eq.${USER_ID}`);

  // --- Insert entries ---
  console.log("2/7  Inserting entries...");
  const entryRows = ENTRIES_DATA.map((e) => ({
    user_id: USER_ID,
    title_encrypted: encryptHex(e.title),
    body_encrypted: encryptHex(e.body),
    section: e.section,
    mood: e.mood,
    is_public: e.is_public,
    source: e.source,
    word_count: wordCount(e.body),
    created_at: e.created_at,
  }));
  const entries = await supabaseInsert("entries", entryRows);
  console.log(`   → ${entries.length} entries created`);

  // Build lookup: entries by week_start date for linking to editions
  function weekOf(dateStr) {
    const d = new Date(dateStr);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setUTCDate(diff);
    return monday.toISOString().slice(0, 10);
  }

  const entriesByWeek = {};
  for (const entry of entries) {
    const ws = weekOf(entry.created_at);
    if (!entriesByWeek[ws]) entriesByWeek[ws] = [];
    entriesByWeek[ws].push(entry);
  }

  // --- Insert editions ---
  console.log("3/7  Inserting editions...");
  const editionRows = EDITIONS_DATA.map((ed) => {
    const weekEntries = entriesByWeek[ed.week_start] || [];
    const totalWords = weekEntries.reduce((sum, e) => sum + (e.word_count || 0), 0);
    return {
      user_id: USER_ID,
      week_start: ed.week_start,
      week_end: ed.week_end,
      volume: ed.volume,
      number: ed.number,
      entry_count: weekEntries.length,
      word_count: totalWords,
      editorial_encrypted: encryptHex(ed.editorial),
      top_story_id: weekEntries.length > 0 ? weekEntries[0].id : null,
    };
  });
  const editions = await supabaseInsert("editions", editionRows);
  console.log(`   → ${editions.length} editions created`);

  // --- Insert edition_entries ---
  console.log("4/7  Inserting edition_entries...");
  const editionEntryRows = [];
  for (const edition of editions) {
    const weekEntries = entriesByWeek[edition.week_start] || [];
    weekEntries.forEach((entry, i) => {
      editionEntryRows.push({
        edition_id: edition.id,
        entry_id: entry.id,
        display_order: i,
        is_featured: i === 0,
      });
    });
  }
  if (editionEntryRows.length > 0) {
    const edEntries = await supabaseInsert("edition_entries", editionEntryRows);
    console.log(`   → ${edEntries.length} edition_entries created`);
  }

  // --- Insert ai_edits ---
  console.log("5/7  Inserting ai_edits...");
  const aiEditTargets = entries.filter((_, i) => [0, 1, 7, 11, 15, 29].includes(i)).slice(0, 6);
  const aiEditRows = aiEditTargets.map((entry, i) => {
    const isRewrite = i % 2 === 0;
    const origData = ENTRIES_DATA[entries.indexOf(entry)] || ENTRIES_DATA[0];
    return {
      entry_id: entry.id,
      user_id: USER_ID,
      mode: isRewrite ? "rewrite" : "proofread",
      tone: isRewrite ? (i === 0 ? "literary" : i === 2 ? "journalistic" : "intimate") : null,
      original_encrypted: encryptHex(origData.body),
      result_encrypted: encryptHex(origData.body + "\n\n[AI-edited version with improved clarity and flow]"),
      headline_encrypted: isRewrite ? encryptHex(origData.title || "Untitled Piece") : null,
      subhead_encrypted: isRewrite ? encryptHex("A reflection on the moments that define us") : null,
      changes_count: isRewrite ? null : Math.floor(Math.random() * 8) + 1,
      applied: i < 4,
    };
  });
  const aiEdits = await supabaseInsert("ai_edits", aiEditRows);
  console.log(`   → ${aiEdits.length} ai_edits created`);

  // --- Insert reflections ---
  console.log("6/7  Inserting reflections...");
  const reflectionRows = REFLECTIONS_DATA.map((r) => ({
    user_id: USER_ID,
    period: r.period,
    period_start: r.period_start,
    period_end: r.period_end,
    reflection_encrypted: encryptHex(r.reflection),
    connections: JSON.stringify(r.connections),
    themes: JSON.stringify(r.themes),
    mood_data: JSON.stringify(r.mood_data),
    stats: JSON.stringify(r.stats),
    questions: JSON.stringify(r.questions),
  }));
  const reflections = await supabaseInsert("reflections", reflectionRows);
  console.log(`   → ${reflections.length} reflections created`);

  // --- Insert attachments ---
  console.log("7/7  Inserting attachments...");
  const photoEntries = entries.filter((e) => ENTRIES_DATA[entries.indexOf(e)]?.section === "photo" || ENTRIES_DATA[entries.indexOf(e)]?.title?.includes("Golden"));
  const attachmentRows = [
    {
      entry_id: photoEntries[0]?.id || entries[0].id,
      user_id: USER_ID,
      type: "photo",
      url: `${USER_ID}/golden-hour-sp.jpg`,
      metadata: JSON.stringify({ caption: "Golden hour from the apartment — São Paulo at 5pm", width: 1920, height: 1080 }),
    },
    {
      entry_id: entries.find((_, i) => ENTRIES_DATA[i]?.body?.includes("Ibirapuera"))?.id || entries[3].id,
      user_id: USER_ID,
      type: "photo",
      url: `${USER_ID}/ibirapuera-sunset.jpg`,
      metadata: JSON.stringify({ caption: "Ibirapuera Park at sunset", width: 1600, height: 1200 }),
    },
    {
      entry_id: entries.find((_, i) => ENTRIES_DATA[i]?.body?.includes("Italian place"))?.id || entries[4].id,
      user_id: USER_ID,
      type: "location",
      url: null,
      metadata: JSON.stringify({ name: "Ristorante Augusta", lat: -23.5558, lng: -46.6625, address: "Rua Augusta, São Paulo" }),
    },
    {
      entry_id: entries.find((_, i) => ENTRIES_DATA[i]?.title?.includes("Playlist"))?.id || entries[5].id,
      user_id: USER_ID,
      type: "link",
      url: "https://open.spotify.com/playlist/example",
      metadata: JSON.stringify({ title: "January Survival Kit", platform: "spotify", track_count: 44 }),
    },
  ];
  const attachments = await supabaseInsert("attachments", attachmentRows);
  console.log(`   → ${attachments.length} attachments created`);

  // --- Update profile ---
  console.log("\nUpdating profile settings...");
  const profileUrl = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${USER_ID}`;
  const profileRes = await fetch(profileUrl, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      publication_name: "The Deborah Times",
      motto: "All the life that's fit to print",
      theme_mode: "light",
      theme_accent: "red",
    }),
  });
  if (profileRes.ok) console.log("   → Profile updated");
  else console.warn("   → Profile update warning:", await profileRes.text());

  console.log("\n✓ Seed complete!");
  console.log(`  Entries: ${entries.length}`);
  console.log(`  Editions: ${editions.length}`);
  console.log(`  Edition-Entries: ${editionEntryRows.length}`);
  console.log(`  AI Edits: ${aiEdits.length}`);
  console.log(`  Reflections: ${reflections.length}`);
  console.log(`  Attachments: ${attachments.length}`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
