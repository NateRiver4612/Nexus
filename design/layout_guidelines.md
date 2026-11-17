# LAYOUT_GUIDELINES.md

## 1. Full-Screen Application Shell

All views render inside a persistent full-width application shell that fills the viewport edge to edge. There is no outer frame, viewport gutter, centered max-width wrapper, or decorative backdrop:

1. **Top Navigation Bar:** Full-width horizontal bar containing:
   - **Left:** Brand mark (`36px–44px` rounded square in `#3B3F46`), brand title (`NEXUS`), and workspace pill badge (`Nate River's Workspace`).
   - **Center:** Floating white pill container (`rounded-full bg-white p-1.5 border border-slate-200/70`) housing primary route tabs (`Dashboard`, `Projects`, `Planner`, `Artifacts`, `Notifications`, `Settings`).
   - **Right:** Circular icon buttons (`40px` diameter) for quick search, notifications (with `#FB923C` unread dot), and user avatar.
2. **Contextual Page Header:**
   - Breadcrumb pill bar (`Projects > Project Name > Current Item`).
   - Primary title (`H1`) paired inline with status pills (`• Active`, `• Todo`) and right-aligned primary action buttons (`+ New Project`, `Mark Complete`).
   - Optional full-width slim progress bar (`h-1.5 rounded-full`) with right-aligned percentage readout (`0%`–`100%`).

## 2. Canonical Page Archetypes

### Archetype A: Overview & Dashboard Grid (Projects Overview)

- **Top Summary Row (12-Column Grid):**
  - **Left (`lg:col-span-7`):** `2x2` grid of equal-height (`min-h-[132px]`) pastel KPI cards (`Total Projects`, `Production`, `Active Builds`, `Archived`).
  - **Right (`lg:col-span-5`):** White telemetry card combining a headline KPI (`99.94% Healthy`), an SVG multi-segment donut chart, and stacked pill legend rows.
- **Filter & Toolbar Row:** Left-aligned status filter pills (`All`, `Production`, `Staging`, `Archived`) + right-aligned pill search input and sort selector.
- **Content Grid:** Responsive `1 -> 2 -> 3` column grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5`) of equal-height `rounded-3xl` project cards.

### Archetype B: Task Detail & Structured Execution (Task View)

- **Asymmetric Two-Column Split (`12-Column Grid`):**
  - **Main Column (`lg:col-span-8`):** Stacked `rounded-3xl` cards for **Goal**, **Requirements** (interactive checklist), and **Definition of Done** (verification checklist), anchored by a bottom completion action bar.
  - **Inspector Column (`lg:col-span-4`):**
    1. **Task Progress Card:** Percentage header, SVG donut chart, and segmented breakdown pills.
    2. **2x2 Mini-Metric Bento Grid:** Compact pastel cards (`Est. Time`, `Checklist`, `Glossary`, `Sections`).
    3. **Notes Card:** Header with `+ New note` dark pill and dashed empty-state dropzone or note list.

### Archetype C: Three-Column AI Assistant & Artifact Workspace

- **Sub-Navigation Strip:** Horizontal pill tabs (`Overview`, `Planner`, `Artifacts`, `Knowledge`, `Assistant`, `Activity`, `Settings`) with active tab in `#3B3F46`.
- **Three-Column Split (`min-h-[680px]`):**
  - **Left Rail (`w-full lg:w-72 shrink-0`):** `+ New chat` full-width charcoal pill button, scrollable thread list (active thread highlighted as a `#3B3F46` rounded card), and bottom **Workspace Context** pastel summary card.
  - **Center Stream (`flex-1 min-w-0`):** Thread header bar (`AI Assistant` badge + `Hide/Show Doc` toggle), scrollable message feed (rich media attachments, markdown responses, inline artifact cards), quick-prompt chips, and pill-shaped message composer.
  - **Right Artifact Drawer (`w-full lg:w-[400px] xl:w-[440px] shrink-0`):** Collapsible document inspector with top toolbar (`Back`, filename, `Edit`, `Download`, `Copy`, `Close`), callout boxes, structured rules, and styled data tables.
