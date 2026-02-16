# The Hauss — Design Guide

This document defines the visual language, typography, color system, layout patterns, and component standards for The Hauss platform.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Typography](#typography)
3. [Color System](#color-system)
4. [Layout & Grid](#layout--grid)
5. [Component Catalog](#component-catalog)
6. [Patterns & Conventions](#patterns--conventions)
7. [Animation & Motion](#animation--motion)
8. [Iconography](#iconography)
9. [Content Voice](#content-voice)

---

## Design Philosophy

The Hauss takes its visual cues from premium newspapers — particularly *The New York Times*, *The Guardian*, and *The New Yorker*. The design is built on five principles:

### 1. Editorial Authority
Every element borrows from newspaper tradition: mastheads, column grids, section labels, rules (divider lines), and typographic hierarchy. The interface should feel like reading a beautifully typeset publication, not using an app.

### 2. Typographic Hierarchy
Typography does the heavy lifting. Sizes, weights, serif vs. sans-serif, italic vs. roman — these create the information architecture. Minimal use of color or visual ornamentation.

### 3. Quiet Density
Information-rich without feeling crowded. Like a newspaper, multiple stories coexist on one page through careful use of columns, rules, and white space. The density is comfortable, not overwhelming.

### 4. Private by Default
Visual language reinforces privacy. Lock icons, muted labels, and subtle indicators. Public content is the exception, marked clearly but not loudly.

### 5. AI as Editor, Not Feature
The AI editor is presented as a trusted colleague — an editorial voice — not a flashy tech feature. It uses the `✦` symbol, speaks in complete sentences, and never interrupts.

---

## Typography

The Hauss uses four typeface families, each with a specific role.

### Type Stack

| Role | Family | Fallbacks | Usage |
|---|---|---|---|
| **Display** | Playfair Display | Georgia, serif | Headlines, mastheads, edition numbers, section names |
| **Body** | Source Serif 4 | Georgia, serif | Body text, excerpts, editorial notes, descriptions |
| **Sans** | IBM Plex Sans | -apple-system, sans-serif | Labels, navigation, metadata, buttons, UI controls |
| **Mono** | IBM Plex Mono | monospace | Timestamps, word counts, statistics |

### Font Loading

All fonts are loaded via Google Fonts with specific weights:

```
Playfair Display: 400, 500, 600, 700, 800 (roman & italic)
Source Serif 4:   300, 400, 500, 600 (roman & italic, optical size 8-60)
IBM Plex Sans:    300, 400, 500, 600
IBM Plex Mono:    300, 400
```

### Type Scale

| Element | Family | Size | Weight | Style | Letter-spacing |
|---|---|---|---|---|---|
| Masthead title | Display | 40px | 700 | Normal | -0.5px |
| Page heading (h2) | Display | 28px | 700 | Normal | — |
| Lead headline | Display | 30px | 700 | Normal | — |
| Secondary headline | Display | 22px | 600 | Normal | — |
| Card headline | Display | 15–16px | 600 | Normal | — |
| Section label | Sans | 10px | 600 | Uppercase | 1.5px |
| Navigation label | Sans | 11px | 500 | Uppercase | 1px |
| Body text (large) | Body | 18px | 400 | Normal | — |
| Body text (medium) | Body | 15–16px | 400 | Normal | — |
| Body text (small) | Body | 13–14px | 400 | Normal | — |
| Subhead / deck | Body | 13–15px | 400 | Italic | — |
| Motto / tagline | Body | 11px | 400 | Italic | 0.5px |
| Button label | Sans | 11–12px | 500 | Normal | — |
| Badge / tag | Sans | 9–10px | 500 | Uppercase | 1–1.5px |
| Timestamp | Mono | 11px | 400 | Normal | — |
| Stat value | Display | 24px | 700 | Normal | — |
| Stat label | Sans | 10px | 400 | Uppercase | 1px |

### Line Heights

| Context | Line Height |
|---|---|
| Headlines | 1.1–1.3 |
| Subheads | 1.5 |
| Body text (reading) | 1.7–1.85 |
| Body text (compact) | 1.5–1.65 |
| Labels / metadata | 1 (single line) |

### Typographic Rules

- **Never use bold body text.** Emphasis comes from italic or semantic weight.
- **Section labels are always uppercase** with wide letter-spacing (1–1.5px).
- **Subheads are always italic** in the Body font.
- **Mono is reserved for data** — timestamps, counts, stats. Never for prose.
- **Display is reserved for editorial content** — headlines, mastheads, section names. Never for UI chrome.

---

## Color System

### Architecture

Colors are organized in two layers:

1. **Palette** — Four accent color families (red, blue, green, purple)
2. **Theme** — Semantic tokens derived from mode (light/dark) + selected palette

### Accent Palettes

| Name | Key | Primary | Light | Light BG | Dark BG |
|---|---|---|---|---|---|
| Crimson | `red` | `#c41e1e` | `#e85d5d` | `#fef5f5` | `#2a1818` |
| Cobalt | `blue` | `#1e5fc4` | `#5d8be8` | `#f5f8fe` | `#181e2a` |
| Forest | `green` | `#1e7a3d` | `#4da66a` | `#f5fef7` | `#182a1c` |
| Amethyst | `purple` | `#6b21a8` | `#9b59d0` | `#faf5fe` | `#221828` |

In light mode, the **primary** value is used as accent. In dark mode, the **light** value is used for better contrast.

### Light Theme Tokens

| Token | Value | Usage |
|---|---|---|
| `bg` | `#fff` | Page background |
| `surface` | `#fff` | Card/panel background |
| `ink` | `#121212` | Primary text, headlines |
| `inkLight` | `#363636` | Body text |
| `inkMuted` | `#727272` | Secondary text, metadata |
| `inkFaint` | `#999` | Tertiary text, placeholders |
| `rule` | `#e2e2e2` | Dividers, borders |
| `ruleDark` | `#121212` | Masthead rules, strong dividers |
| `accent` | palette.primary | Section labels, highlights, interactive |
| `accentBg` | palette.bg | Accent-tinted backgrounds |
| `overlay` | `rgba(0,0,0,0.6)` | Modal backdrops |
| `sectionBg` | `#f7f7f7` | Alternate section backgrounds |
| `platformBg` | `#fafafa` | Platform header background |
| `platformBorder` | `#e8e8e8` | Platform header border |

### Dark Theme Tokens

| Token | Value | Usage |
|---|---|---|
| `bg` | `#111` | Page background |
| `surface` | `#1a1a1a` | Card/panel background |
| `ink` | `#ffffff` | Primary text, headlines |
| `inkLight` | `#f0f0f0` | Body text |
| `inkMuted` | `#d0d0d0` | Secondary text, metadata |
| `inkFaint` | `#a0a0a0` | Tertiary text, placeholders |
| `rule` | `#2e2e2e` | Dividers, borders |
| `ruleDark` | `#ffffff` | Masthead rules, strong dividers |
| `accent` | palette.light | Section labels, highlights |
| `accentBg` | palette.bgDark | Accent-tinted backgrounds |
| `overlay` | `rgba(0,0,0,0.75)` | Modal backdrops |
| `sectionBg` | `#1c1c1c` | Alternate section backgrounds |
| `platformBg` | `#0a0a0a` | Platform header background |
| `platformBorder` | `#252525` | Platform header border |

### Color Usage Rules

- **Accent is used sparingly.** Section labels, the `✦` symbol, active states, and subtle highlights. Never for large areas.
- **Ink hierarchy is the primary tool.** Four levels: `ink` → `inkLight` → `inkMuted` → `inkFaint`.
- **`ruleDark` (not `rule`)** is used for masthead dividers and major section breaks.
- **Selection color** inverts: `background: ink, color: bg`.
- **Transitions** between themes use `0.4s ease` for background and color.

---

## Layout & Grid

### Page Structure

```
┌─────────────────────────────────────────────┐
│  Platform Header (sticky, full-width)       │  height: 48px
├─────────────────────────────────────────────┤
│  ┌─────────────── 980px ──────────────────┐ │
│  │  Navigation (sticky below header)       │ │
│  ├─────────────────────────────────────────┤ │
│  │                                         │ │
│  │  View Content                           │ │
│  │                                         │ │
│  ├─────────────────────────────────────────┤ │
│  │  Footer                                 │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

- **Max content width:** 980px (centered)
- **Horizontal padding:** 24px
- **Platform header:** full-width, sticky at top, z-index 900
- **Navigation:** sticky at top: 48px, z-index 800

### Grid Patterns

**Edition View — Two-column with divider:**
```
┌──────────────────────┬─┬──────────┐
│  Main content        │ │ Sidebar  │
│  (flex: 1)           │1│ (340px)  │
│  padding-right: 28px │ │ pl: 28px │
└──────────────────────┴─┴──────────┘
```
CSS: `grid-template-columns: 1fr 1px 340px`

**Reflections View — Wide primary + narrow sidebar:**
```
┌──────────────────────┬─┬──────────┐
│  Reflections         │ │ Mood     │
│  Connections         │1│ Themes   │
│  Questions           │ │ Stats    │
│  Ask Editor          │ │          │
└──────────────────────┴─┴──────────┘
```
CSS: `grid-template-columns: 1fr 1px 300px`

**Archives — Three-column card grid:**
```
┌──────────┬──────────┬──────────┐
│ Edition  │ Edition  │ Edition  │
│ cover    │ cover    │ cover    │
├──────────┼──────────┼──────────┤
│ Edition  │ Edition  │ Edition  │
│ cover    │ cover    │ cover    │
└──────────┴──────────┴──────────┘
```
CSS: `grid-template-columns: 1fr 1fr 1fr; gap: 16px`

**Sections — Alternating two-column:**
```
Section 1:  ┌─ Entries ─┬─ Image ──┐
Section 2:  ├─ Image ───┼─ Entries ┤  (flipped)
Section 3:  ├─ Entries ─┼─ Image ──┤
```
CSS: `grid-template-columns: 1fr 1fr; gap: 24px` with `order` flip on odd sections

**Journal — Single column:**
```
┌──────── 620px ────────┐
│  Day header (sticky)  │
│  ┌──────────────────┐ │
│  │  Entry           │ │
│  │  Entry           │ │
│  └──────────────────┘ │
│  Day header (sticky)  │
│  ┌──────────────────┐ │
│  │  Entry           │ │
│  └──────────────────┘ │
└───────────────────────┘
```
Max-width: 620px, centered

**More Stories — Three-column with vertical dividers:**
```
┌──────────┊──────────┊──────────┐
│ Story    ┊ Story    ┊ Story    │
└──────────┊──────────┊──────────┘
```
CSS: `grid-template-columns: 1fr 1fr 1fr; gap: 24px` with `borderRight` on items

### Spacing Scale

| Use Case | Value |
|---|---|
| Section vertical padding | 40px top, 24–32px bottom |
| Between major sections | 24px (with rule divider) |
| Between entries/items | 12–14px |
| Card internal padding | 16–20px |
| Grid gap | 16–24px |
| Platform header content gap | 8–10px |
| Inline element gap | 6–8px |

### Divider Hierarchy

| Type | Style | Usage |
|---|---|---|
| **Major rule** | 2px solid `ruleDark` (ink) | Masthead, section top borders, stats bar top |
| **Standard rule** | 1px solid `rule` | Between entries, sidebar borders, general dividers |
| **Accent rule** | 2px solid `accent`, width: 40–60px | Decorative accents below headings |
| **Column divider** | 1px solid `rule`, full height | Between grid columns (via separate `<div>`) |

---

## Component Catalog

### Platform Header

```
┌─[The Hauss][BETA]─────────────────[+ New Entry][Upgrade][⚙][D]─┐
```

- Height: 48px, sticky, full-width
- Logo: Display font, 18px, weight 700
- Beta badge: Sans 9px, uppercase, accent border
- "New Entry" button: filled (ink bg, bg text), with pen icon
- User avatar: 30px circle, accent background, white initial

### Navigation Bar

```
──── MY JOURNAL    LAST EDITION    ARCHIVES    SECTIONS    ✦ REFLECTIONS ────
```

- Centered flex layout, gap: 24px
- Sans 11px, weight 500, uppercase, letter-spacing 1px
- Active: `ink` color + 2px `accent` bottom border
- Inactive: `inkMuted` color + 2px transparent border
- Reflections tab has `✦` prefix

### Edition Masthead

```
              Week of Feb 9 – 15, 2026
              São Paulo · 28°C
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              The Deborah Times
        All the life that's fit to print
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                            Vol. I · No. 47
                            7 entries
```

- Three-column layout: left metadata, center masthead, right edition info
- Masthead: Display 40px, weight 700
- Motto: Body 11px, italic
- Bounded by 2px `ruleDark` lines top and bottom

### Section Label

```
✦ PERSONAL ESSAY
```

- Sans 10px, weight 600, uppercase, letter-spacing 1.5px
- Color: accent
- Often paired with `✦` symbol or category icon

### Story Card (Lead)

```
PERSONAL ESSAY  🌐 Public  ✦ AI
After Three Years of Doubt, She Finally Made the Leap
A reflection on leaving the comfort of corporate life...
┌─────────────────────────────┐
│       [image placeholder]    │
└─────────────────────────────┘
It wasn't courage that made me do it...
8 min read · Feb 14 · via Telegram
```

- Section label + visibility badge + AI badge in row
- Headline: Display 30px, weight 700, line-height 1.15
- Subhead: Body 15px, italic
- Image area: `sectionBg` background
- Excerpt: Body 15px, line-height 1.7
- Meta row: Sans 11px, `inkMuted`, dot-separated

### Briefing Item

```
Mon   Started the week with intention. Wrote 3 pages.
──────────────────────────────────────────────────────
Tue   Lunch with Marina. She's moving to Lisbon.
```

- Day label: Sans 10px, weight 600, `inkMuted`, min-width 30px
- Note: Body 13px, line-height 1.5
- Separated by 1px `rule` border

### Mood Bar Chart

```
 ☀️  🌤  🌤  ⚡  ☀️  🌙  ⚡
 ██  █▌  █▌  ██  ██  █   ██
 Mo  Tu  We  Th  Fr  Sa  Su
```

- Flex layout, items aligned to bottom
- Bar height: `(value / 5) * 50px`
- Bar opacity: `0.2 + (value / 5) * 0.8`
- Color: `accent`
- Day labels: Sans 9px, `inkMuted`

### Stats Bar

```
═══════════════════════════════════════════
   847        7         47        4,280
Total Entries  This Edition  Editions  Words This Week
───────────────────────────────────────────
```

- Top border: 2px solid `ink`
- Bottom border: 1px solid `rule`
- Flex row with vertical dividers (1px, 36px height)
- Value: Display 24px, weight 700
- Label: Sans 10px, uppercase, letter-spacing 1px, `inkMuted`

### Button Styles

**Primary (filled):**
- Background: `ink`, Color: `bg`
- Sans 12px, weight 500
- Padding: 8–10px vertical, 16–24px horizontal
- No border-radius (sharp corners — newspaper aesthetic)
- Hover: opacity 0.85

**Secondary (outlined):**
- Background: transparent, Border: 1px solid `rule`
- Color: `inkMuted`
- Same typography as primary

**Accent (special):**
- Background: transparent, Border: 1px solid `accent`
- Color: `accent`
- Used for upgrade buttons, public toggles

**Toggle / Segmented:**
- Row of buttons with `margin-left: -1` to collapse borders
- Active: `ink` bg, `bg` text
- Inactive: transparent bg, `inkMuted` text, `rule` border

**Disabled:**
- Background: `rule`, Color: `inkFaint`
- cursor: default

### AI Editor Panel

```
✦ AI EDITOR
┌─────────────────┬─────────────────┐
│ ✏️ Proofread     │ ✦ Rewrite       │
│ Fix grammar,    │ Transform into  │
│ spelling...     │ polished piece..│
└─────────────────┴─────────────────┘
```

- Two-card layout, each with icon + title + description
- Card: `sectionBg` background, `rule` border
- Hover: border changes to `ink` (proofread) or `accent` (rewrite)
- Disabled state at opacity 0.45 when text < 20 chars
- Results show in the same panel with Apply/Collapse/Discard actions

### Settings Panel

- Slides in from right, 400px wide
- Full-height, `surface` background
- Sections separated by 1px `rule` dividers
- Overlay backdrop: `overlay` color
- Close button: `✕` character, `inkMuted`
- Animation: `slideInRight 0.3s ease`

---

## Patterns & Conventions

### Visibility Indicators

| State | Icon | Style |
|---|---|---|
| Private | Lock SVG | Sans 9px, `inkFaint` |
| Public | Globe SVG | Sans 9px, `inkFaint` or `accent` |
| AI Edited | `✦ AI` | Sans 9px, `accent` |

### Source Indicators

- "via Telegram" or "via App"
- Sans 10–11px, italic, `inkFaint`
- Aligned to far right of meta rows

### Empty States

- Image placeholders: `sectionBg` background with centered SVG icon (rect + circle + path)
- Stroke: `rule` or `inkFaint`, strokeWidth: 1

### Interactive States

| State | Style |
|---|---|
| Hover (cards) | `borderColor: ink`, `transform: translateY(-2px)` |
| Hover (buttons) | `opacity: 0.85` |
| Hover (text buttons) | Border color change |
| Active (nav) | Accent bottom border |
| Active (toggle) | `ink` background, `bg` text |
| Focus (inputs) | Outline: none (borderless design) |
| Disabled | Opacity 0.45 or `rule` background |

### Form Elements

- **Text inputs:** Borderless style with `sectionBg` background, `rule` border, sans/body font
- **Textareas:** Fully transparent, no border, no resize
- **Placeholders:** `inkFaint` color

### Loading States

- Spinning `✦` symbol: `animation: spin 1.5s linear infinite`
- Paired with status text: Sans 13px + Body 12px italic

### Success States

- Full-screen overlay with centered content
- Large `✦` at 40px, accent color
- Display 28px headline
- Body italic subtext
- Action buttons row

---

## Animation & Motion

### Keyframes

| Name | From | To | Duration | Usage |
|---|---|---|---|---|
| `fadeIn` | opacity: 0 | opacity: 1 | 0.2–0.4s | General entrance |
| `fadeInUp` | opacity: 0, Y: +12px | opacity: 1, Y: 0 | 0.4–0.6s | Cards, entries |
| `slideInRight` | opacity: 0, X: +40px | opacity: 1, X: 0 | 0.3s | Settings panel |
| `editorSlideIn` | opacity: 0, Y: +8px | opacity: 1, Y: 0 | 0.35s | Editor view |
| `sidebarIn` | opacity: 0, X: +12px | opacity: 1, X: 0 | 0.25s | Editor sidebar |
| `spin` | rotate: 0deg | rotate: 360deg | 1–1.5s | Loading spinners |

### Staggered Animations

List items use staggered delays:

```
animation: fadeInUp 0.4s ease ${index * 0.05}s both
```

Journal entries use compound delays based on day + entry index:

```
animation: fadeInUp 0.4s ease ${(dayIndex * 0.1) + (entryIndex * 0.05)}s both
```

### Transitions

| Property | Duration | Easing | Context |
|---|---|---|---|
| `opacity` | 0.6s | ease | Page load |
| `background-color, color` | 0.4s | ease | Theme changes |
| `border-color` | 0.2s | — | Hover states |
| `transform` | 0.2s | — | Card hover lift |
| `all` | 0.15s | — | Toggle states |

### Ticker Animation

Continuous horizontal scroll using transform:

```js
// Offset decreases by 0.5px every 30ms
setInterval(() => setOffset(prev => prev - 0.5), 30)
// Applied as: transform: translateX(${offset}px)
```

Text is doubled (`text + separator + text`) for seamless loop.

---

## Iconography

All icons are inline SVGs with consistent properties:

| Property | Value |
|---|---|
| Size | 10–18px (contextual) |
| Stroke | `currentColor` or specific token |
| StrokeWidth | 1–2 (contextual) |
| Fill | none |
| StrokeLinecap | round (when specified) |

### Icon Set

| Icon | Usage | Size |
|---|---|---|
| Pen/Edit | New Entry, Proofread | 14–18px |
| Lock | Private indicator | 10–14px |
| Globe | Public indicator | 10–14px |
| Gear | Settings | 17px |
| Arrow Left | Back navigation | 16px |
| Sidebar | Toggle sidebar | 14px |
| Image placeholder | Photo areas | 32–40px |

### The Sparkle `✦`

The `✦` character (four-pointed star, Unicode U+2726) is the signature AI indicator throughout the app:

| Context | Size | Color |
|---|---|---|
| AI Editor header | 16px | accent |
| Reflections header | 14px | accent |
| AI insight marker | 10–12px | accent |
| Loading spinner | 24px | accent (spinning) |
| Published success | 40px | accent |
| Navigation label | inline | — |

---

## Content Voice

### AI Editor Voice

The AI editor speaks as a thoughtful, literary editor — not a robot:

- **Tone:** Warm but precise. Observational, never prescriptive.
- **Structure:** Complete sentences and paragraphs. Never bullet points.
- **Insight style:** "You wrote X. Perhaps because Y." — suggestive, not declarative.
- **Questions:** Open-ended, specific to the user's actual writing.
- **References:** Cites specific entries, dates, word counts, patterns.

### Label Language

| Context | Style | Examples |
|---|---|---|
| Section names | Title Case | Personal Essays, Dispatches |
| UI labels | Uppercase | NEW ENTRY, AI EDITOR, MOOD |
| Descriptions | Sentence case, italic | "Quick notes and observations" |
| Metadata | Lowercase | "8 min read", "via Telegram" |
| Stats | Formatted numbers | "4,280", "847" |

### Mood Vocabulary

| Emoji | Label | Character |
|---|---|---|
| ☀️ | Bright | Optimistic, energetic |
| 🌤 | Calm | Steady, peaceful |
| 🌧 | Heavy | Difficult, processing |
| ⚡ | Electric | Breakthrough, intense |
| 🌙 | Reflective | Introspective, quiet |

---

## Implementation Notes

### No Border Radius

All elements use sharp corners (no border-radius). This is a deliberate design choice to reinforce the newspaper aesthetic. The only exception is the user avatar circle (`borderRadius: "50%"`).

### Scrollbar Styling

Custom WebKit scrollbar:
- Width: 6px
- Track: transparent
- Thumb: `rule` color, border-radius 3px

### Selection Styling

```css
::selection {
  background: ink;
  color: bg;
}
```

### Z-Index Layers

| Layer | Z-Index | Element |
|---|---|---|
| Platform header | 900 | Sticky top bar |
| Navigation | 800 | Sticky nav tabs |
| Day headers (journal) | 10 | Sticky day labels |
| User dropdown | 999 | Profile menu |
| Editor overlay | 2000 | Full-screen editor |
| Settings overlay | 2000 | Side panel + backdrop |
