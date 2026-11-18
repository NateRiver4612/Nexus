# DESIGN_TOKENS.md

## 1. Color Palette

### Canvas & Surfaces

| Token Name               | Hex / Value | Tailwind Utility | Usage                                             |
| :----------------------- | :---------- | :--------------- | :------------------------------------------------ |
| `--bg-background`        | `#F8F9FB`   | `bg-[#F8F9FB]`   | Full-screen application background                |
| `--bg-surface`           | `#FFFFFF`   | `bg-white`       | Standard bento cards, panels, modals, inputs      |
| `--bg-surface-secondary` | `#F8F9FB`   | `bg-[#F8F9FB]`   | Subdued supporting surfaces                       |
| `--bg-surface-muted`     | `#F3F4F6`   | `bg-[#F3F4F6]`   | Neutral stat tiles, progress tracks, subtle wells |

### Text & Ink

| Token Name         | Hex / Value | Tailwind Utility | Usage                                          |
| :----------------- | :---------- | :--------------- | :--------------------------------------------- |
| `--text-primary`   | `#101415`   | `text-[#101415]` | Headings, primary values, text on pastel fills |
| `--text-secondary` | `#6C7173`   | `text-[#6C7173]` | Subtitles, metadata, inactive navigation items |
| `--text-muted`     | `#9DA2A4`   | `text-[#9DA2A4]` | Placeholders, timestamps, disabled labels      |
| `--text-inverse`   | `#FFFFFF`   | `text-white`     | Text and icons inside `#3B3F46` charcoal pills |

### Interactive & Charcoal Anchors

| Token Name                | Hex / Value | Tailwind Utility     | Usage                                                |
| :------------------------ | :---------- | :------------------- | :--------------------------------------------------- |
| `--accent-charcoal`       | `#3B3F46`   | `bg-[#3B3F46]`       | Primary CTAs, active filter pills, user chat bubbles |
| `--accent-charcoal-hover` | `#4B5051`   | `hover:bg-[#4B5051]` | Hover state for primary dark pills                   |

### Categorical & Semantic Pastel Fills

| Token Name                   | Hex / Value | Tailwind Utility | Semantic Mapping                                        |
| :--------------------------- | :---------- | :--------------- | :------------------------------------------------------ |
| `--pastel-gold`              | `#FCD34E`   | `bg-[#FCD34E]`   | Production, Estimated Time, Primary Highlight           |
| `--pastel-periwinkle`        | `#C6D2FE`   | `bg-[#C6D2FE]`   | Active Builds, Staging, Active Top Nav Pill, Audio Card |
| `--pastel-lavender`          | `#E8B4F8`   | `bg-[#E8B4F8]`   | Archived, Notes/Glossary, Transcript Badges             |
| `--pastel-tangerine`         | `#FB923C`   | `bg-[#FB923C]`   | Alerts, CI/Staging Segments, Sections Metric            |
| `--pastel-periwinkle-soft`   | `#E6EBFF`   | `bg-[#E6EBFF]`   | Milestones KPI, soft periwinkle fills                   |
| `--pastel-periwinkle-subtle` | `#F4F6FF`   | `bg-[#F4F6FF]`   | Current-task row and faint selection fills              |
| `--pastel-gold-soft`         | `#FFEEBC`   | `bg-[#FFEEBC]`   | Medium difficulty and gold soft fills                   |
| `--pastel-lavender-soft`     | `#F7E5FD`   | `bg-[#F7E5FD]`   | Artifacts KPI, deliverable callouts                     |
| `--pastel-tangerine-soft`    | `#FEE4CE`   | `bg-[#FEE4CE]`   | Knowledge KPI, alerts, high difficulty                  |

### Borders & Dividers

| Token Name        | Hex / Value | Tailwind Utility                 | Usage                                         |
| :---------------- | :---------- | :------------------------------- | :-------------------------------------------- |
| `--border-subtle` | `#E0E6E7`   | `border-[#E0E6E7]`               | Crisp 1px hairlines on white bento containers |
| `--border-dashed` | `#CFD4D6`   | `border-dashed border-[#CFD4D6]` | Empty-state dropzones (`+ Add a note`)        |

---

## 2. Typography Stack

- **Primary Sans Font:** `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Monospace Font _(Marked for Review)_:** `JetBrains Mono, ui-monospace, SFMono-Regular, monospace` (for commit hashes, file names, and telemetry counters).

| Role                   | Size / Line Height   | Weight       | Tracking  | Tailwind Class                                   |
| :--------------------- | :------------------- | :----------- | :-------- | :----------------------------------------------- |
| **Page Title (H1)**    | `24px–30px` / `1.2`  | `700 (Bold)` | `-0.02em` | `text-2xl sm:text-3xl font-bold tracking-tight`  |
| **KPI Metric Value**   | `30px–36px` / `1.1`  | `700 (Bold)` | `-0.02em` | `text-3xl sm:text-4xl font-bold tracking-tight`  |
| **Card Title (H2/H3)** | `16px–18px` / `1.35` | `700 (Bold)` | `-0.01em` | `text-base sm:text-lg font-bold`                 |
| **Section Overline**   | `11px` / `1.4`       | `700 (Bold)` | `+0.06em` | `text-[11px] font-bold uppercase tracking-wider` |
| **Body / Description** | `13px–14px` / `1.55` | `400–500`    | `0em`     | `text-xs sm:text-sm leading-relaxed`             |
| **Pill / Badge Label** | `11px–12px` / `1.2`  | `600–700`    | `0em`     | `text-[11px] font-bold`                          |

---

## 3. Spacing, Radii & Elevation

- **Base Grid Unit:** `4px`
- **Application Shell:** Full viewport width and height, with no outer gutter
- **Workspace Content Padding:** `p-4 sm:p-6 md:p-8`
- **Bento Grid Gap:** `gap-4` (`16px`) for tight metric clusters; `gap-5` (`20px`) for primary layout columns.
- **Card Internal Padding:** `p-5` (`20px`) for compact metric tiles; `p-6` (`24px`) for primary content cards.

| Radius Token     | Value    | Tailwind Utility | Usage                                                |
| :--------------- | :------- | :--------------- | :--------------------------------------------------- |
| `--radius-shell` | `32px`   | `rounded-[32px]` | Large overlays and modals                            |
| `--radius-card`  | `24px`   | `rounded-3xl`    | Bento cards, sidebars, chat & artifact panels        |
| `--radius-item`  | `16px`   | `rounded-2xl`    | Checklist rows, audio cards, inner callouts          |
| `--radius-pill`  | `9999px` | `rounded-full`   | Navigation tabs, status badges, buttons, search bars |

- **Elevation & Shadows:**
  - **Application Shell:** No outer frame shadow; the shell is flat and fills the viewport.
  - **Standard Cards:** Flat `1px` border (`border-slate-200/80`) with `shadow-2xs`; elevate to `shadow-lg` only on interactive card hover.
  - **Floating Popovers / Modals:** `shadow-2xl` with `backdrop-blur-xs` overlay (`bg-[#101415]/40`).
