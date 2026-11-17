# COMPONENT_SPECIFICATIONS.md

## 1. Pills, Badges & Buttons

- **Primary Action Button:**
  - Classes: `inline-flex items-center gap-2 rounded-full bg-[#3B3F46] hover:bg-[#4B5051] text-white px-5 py-2.5 text-xs font-semibold transition active:scale-95`
- **Navigation Pill (Top Bar):**
  - Active (Workspace / Projects): `rounded-full bg-[#C6D2FE]/80 text-[#101415] px-4 py-2 text-xs font-semibold`
  - Active (Sub-tabs / Filters): `rounded-full bg-[#3B3F46] text-white px-4 py-2 text-xs font-semibold`
  - Inactive: `rounded-full text-slate-500 hover:text-[#101415] hover:bg-slate-100/80 px-4 py-2 text-xs font-semibold`
- **Status Pill with Dot Indicator:**
  - Structure: `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold`
  - Lead dot: `w-1.5 h-1.5 rounded-full` (`bg-[#FCD34E]` for Production/Active, `bg-[#FB923C]` for Staging, `bg-[#3B82F6]` for Todo).

## 2. Bento KPI & Project Cards

- **KPI Stat Tile:**
  - Container: `rounded-3xl p-5 flex flex-col justify-between min-h-[132px] cursor-pointer transition`
  - Top-left icon badge: `w-9 h-9 rounded-full bg-white/70 (or bg-black/10) flex items-center justify-center text-[#101415]`
  - Bottom row: Left-aligned label (`text-sm font-semibold`) + right-aligned bold numeric counter (`text-3xl sm:text-4xl font-bold`).
- **Project Card:**
  - Container: `rounded-3xl p-6 border flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-lg`
  - Variants: Crisp White (`bg-white border-slate-200/80`), Pastel Lavender (`bg-[#E8B4F8] border-transparent`), Warm Tangerine (`bg-[#FB923C] border-transparent`), Soft Periwinkle (`bg-[#C6D2FE] border-transparent`).
  - Internal Structure:
    1. Header: `40px` circular code icon + `PRJ-XXX` / branch name on left; status pill on right.
    2. Body: Bold title, 2-line clamped description, horizontal row of tech stack pills.
    3. Footer: `Sprint Readiness` label + percentage badge (`bg-[#3B3F46] text-white`), `h-2` progress bar, overlapping circular team avatars (`-space-x-2 ring-2 ring-white`), request throughput, and circular `32px` arrow button (`ArrowUpRight`).

## 3. Interactive Checklist Row

- **Container:** `rounded-2xl border p-4 flex items-center gap-3.5 cursor-pointer transition-all`
  - Unchecked: `bg-white border-slate-200/80 hover:border-slate-300 hover:bg-[#F8F9FB]`
  - Checked: `bg-[#F8F9FB] border-slate-200/60` with `line-through text-slate-400` label.
- **Checkbox Control:** `w-5 h-5 rounded-full flex items-center justify-center border` (`border-slate-300 bg-white` unchecked; `bg-[#3B3F46] border-[#3B3F46] text-white` checked).

## 4. Multi-Segment SVG Donut Chart

- **Dimensions:** `112px`–`128px` square (`viewBox="0 0 100 100"`), rotated `-90deg` so segments start at 12 o'clock.
- **Ring Geometry:** `r="38"`, `strokeWidth="12"` to `"14"`, `strokeLinecap="round"`, base track `#EEF0F4`.
- **Segment Colors:** Primary `#3B3F46`, Secondary `#FB923C` or `#FCD34E`, Tertiary `#A5B4FC` or `#C6D2FE`.
- **Center Label:** Stacked bold primary value (`142` or `0/7`) + muted unit caption (`Deploys` or `Tasks`).

## 5. AI Assistant & Artifact Components

- **User Message Bubble:** Right-aligned `bg-[#101415] text-white rounded-3xl rounded-tr-md px-5 py-3 text-xs sm:text-sm`.
- **Audio Attachment Card:** `rounded-3xl bg-[#C6D2FE]/65 p-4` with `40px` circular `#101415` play/pause button, file metadata (`A031.m4a · 362KB`), format pill (`M4A`), and animated vertical waveform bars.
- **Assistant Response Card:** Left-aligned `32px` `#101415` speaker/assistant badge paired with a `bg-white border border-slate-200/80 rounded-3xl rounded-tl-md p-5` markdown container.
- **Inline Artifact Attachment Card:** `rounded-2xl bg-[#F8F9FB] hover:bg-[#EEF0F4] border border-slate-200/80 p-3.5 flex items-center justify-between` with document icon, filename (`interview_tips.md`), and download button.
- **Artifact Preview Panel:**
  - Callout Box: `rounded-2xl bg-[#C6D2FE]/35 border-l-4 border-[#FCD34E] p-3.5 text-xs font-semibold text-[#101415]`.
  - Comparison Table: `rounded-2xl border border-slate-200/80 overflow-hidden` with `bg-[#EEF0F4]/80` header row and rank pills (`1st` in `#101415`, `2nd` in `#FCD34E`, `3rd` in `#C6D2FE`).
