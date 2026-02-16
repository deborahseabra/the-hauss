# The Hauss

**Your life, edited into a personal newspaper.**

The Hauss is a platform that transforms personal journal entries into curated weekly editions — styled like a premium newspaper, powered by an AI editor that helps you see patterns, polish prose, and understand yourself through your own words.

---

## Overview

The Hauss reimagines personal journaling as a publishing act. Every week, your scattered thoughts, dispatches, and reflections are compiled into a newspaper-style edition — complete with headlines, sections, an editorial note, and AI-powered insights.

It's not a diary. It's your personal newsroom.

### Core Concept

| Traditional Journal | The Hauss |
|---|---|
| Linear diary entries | Curated weekly editions |
| Written and forgotten | Organized into sections |
| Raw text only | AI-polished prose with tone options |
| Private by default | Private-first with selective publishing |
| No feedback | AI editor that finds patterns and asks questions |

---

## Features

### Views

**My Journal** — A chronological, day-by-day view of your entries. Intimate and personal. Each entry shows timestamp, mood, section tag, source (App or Telegram), and visibility status.

**Last Edition** — Your weekly newspaper. Features a masthead with your publication name and motto, a live ticker, top stories with headlines and excerpts, "The Week at a Glance" briefing, an AI editor's note, section index, and stats bar.

**Archives** — A grid of past edition "covers," browsable by year. Each cover shows the edition number, date range, lead headline, entry count, word count, and dominant mood.

**Sections** — An alternating NYT-style layout organizing your entries by category: Personal Essays, Dispatches, Letters to Self, Reviews, and Photo Essays. Each section shows its entries, word count, and AI-detected themes.

**Reflections** — The AI editor's analytical view. Includes period-based reflections (week/month/quarter/all-time), hidden pattern connections, mood index charts, recurring theme tracking, editorial questions, and an interactive "Ask Your Editor" feature.

### AI Editor

The writing editor includes a built-in AI assistant with two modes:

- **Proofread** — Fixes grammar, spelling, and punctuation while preserving the author's voice. Shows a detailed list of corrections made.
- **Rewrite** — Transforms raw journal text into polished editorial pieces with three tone options:
  - *Intimate* — Personal, introspective, diary-like. First person, raw and honest.
  - *Literary* — Elegant prose, vivid imagery, New Yorker style. Third person, observational.
  - *Journalistic* — Structured, factual, NYT style. Clear narrative with quotes and context.

### Entry Editor

A full-featured writing environment with:

- Distraction-free writing area with word count
- Headline field (optional — AI can generate one)
- Section selection (Dispatch, Personal Essay, Letter to Self, Review)
- Mood tagging (Bright, Calm, Heavy, Electric, Reflective)
- Visibility toggle (Private / Public)
- Attachment support (Photo, Location, Link)
- Collapsible sidebar for metadata
- Always-visible AI editor panel at the bottom

### Settings

- **Theme** — Light and Dark mode
- **Accent colors** — Crimson, Cobalt, Forest, Amethyst
- **Filing sources** — Telegram (connected), WhatsApp (available)
- **Plan management** — Free tier and Premium ($9/mo)
- **Publication customization** — Name and motto

### Other Features

- Live ticker with writing stats and trending themes
- Edition switcher (This Week, Last Week, This Month, All Editions)
- Public page support (thehauss.me/username)
- Entry source tracking (App vs. Telegram)
- Multi-period analytics (Week, Month, Quarter, All Time)

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite 6** | Build tool and dev server |
| **Google Fonts** | Playfair Display, Source Serif 4, IBM Plex Sans, IBM Plex Mono |

No external UI libraries — all components are built from scratch with inline styles for maximum design control.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
git clone https://github.com/deborahseabra/the-hauss.git
cd the-hauss
npm install
```

### Development

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173)

### Build

```bash
npm run build
```

Output goes to `dist/`.

### Preview Production Build

```bash
npm run preview
```

---

## Project Structure

```
the-hauss/
├── index.html                  # HTML entry point
├── package.json                # Dependencies and scripts
├── vite.config.js              # Vite configuration
├── public/
│   └── vite.svg                # Favicon
├── src/
│   ├── main.jsx                # React DOM entry point
│   └── App.jsx                 # Main application (all components)
└── the-hauss-kick-off.jsx      # Original design specification
```

### Component Architecture

All components live in `src/App.jsx`:

```
App (main)
├── PlatformHeader          # Sticky top bar with logo, actions, user menu
├── Navigation              # Tab bar: Journal, Edition, Archives, Sections, Reflections
├── JournalView             # Day-by-day timeline of entries
├── EditionView (inline)    # Weekly newspaper layout
│   ├── Ticker              # Scrolling stats ribbon
│   └── EditionSwitcher     # Period selector
├── ArchivesView            # Grid of past edition covers
├── SectionsView            # NYT-style alternating section layout
├── ReflectionsView         # AI analytics dashboard
├── EditorView              # Full-screen writing editor
│   └── AiEditor            # AI proofread/rewrite panel
├── SettingsPanel           # Slide-in settings drawer
└── Footer                  # Publication name and links
```

---

## Data Model

The app currently uses mock data (`MOCK` object) that demonstrates the full data structure:

### User
```js
{ name, email, plan, avatar }
```

### Edition
```js
{ week, number, entryCount }
```

### Entry (Journal)
```js
{ time, text, mood, section, isPublic, source, hasPhoto? }
```

### Story (Edition)
```js
{ section, headline, subhead, excerpt, readTime, date, source, isPublic, aiEdited }
```

### Briefing Item
```js
{ day, note }
```

### Archive Edition
```js
{ num, week, headline, entries, words, mood }
```

### Reflection Period
```js
{ label, date, moods[], trend[], reflection[], connections[], themes[], questions[], stats[] }
```

---

## Environment & Configuration

The app supports runtime theming via React state:

- **Mode**: `light` | `dark`
- **Accent**: `red` | `blue` | `green` | `purple`
- **Publication name**: Customizable string
- **Motto**: Customizable string

All theme values are computed dynamically via `getTheme(mode, accent)`.

---

## Roadmap

- [ ] Component modularization (split `App.jsx` into individual files)
- [ ] Backend integration (Supabase)
- [ ] Telegram bot for entry filing
- [ ] Real AI editor integration (OpenAI / Anthropic)
- [ ] PDF export of editions
- [ ] Public page rendering
- [ ] Mobile responsive design
- [ ] Authentication flow
- [ ] Premium plan billing

---

## License

Private project. All rights reserved.
