# INTERACTION_GUIDELINES.md

## 1. Interactive States & Micro-Interactions

- **Tactile Button Feedback:** All pill buttons and icon triggers must include `transition-all` and subtle press compression (`active:scale-95` or `active:scale-[0.98]`).
- **Card Hover Elevation:** Clickable project cards lift slightly (`hover:-translate-y-1`) with a diffused shadow (`hover:shadow-lg`). Static informational cards remain grounded with a `1px` border.
- **Filter & Tab Transitions:** Switching filter pills (`All`, `Production`, `Staging`, `Archived`) or sub-tabs (`Overview`, `Assistant`, `Note`) updates the active pill fill immediately (`#3B3F46` with white text) without layout shift.
- **Live Progress Synchronization:**
  - Checking or unchecking any item in **Requirements** or **Definition of Done** must immediately recalculate the completion percentage, animate the header progress bar (`transition-all duration-500`), update the SVG donut chart stroke offsets, and unlock the `Mark Complete` button once 100% of items are checked.

## 2. Assistant & Artifact Panel Workflows

- **Collapsible Artifact Panel:**
  - Clicking an inline artifact card (`interview_tips.md`) opens the right-hand Artifact Preview column if collapsed.
  - Clicking `Hide Doc` or the panel's `X` button smoothly collapses the right column, allowing the center chat stream to expand (`flex-1`) to fill the freed horizontal width.
- **Inline Document Editing:**
  - Toggling `Edit` switches the artifact body from formatted preview mode to an editable `<textarea>` pre-populated with raw markdown, preserving unsaved edits in component state until toggled back to `Preview`.
- **Composer & Quick Prompts:**
  - Pressing `Enter` (without `Shift`) submits the user message; `Shift + Enter` inserts a newline.
  - Clicking quick-action chips (`Summarize Rules`, `Export Markdown`, `Add to Planner`) populates or triggers immediate contextual responses.

## 3. Responsive Breakpoints & Adaptation

- **Desktop (`xl: 1280px+`):** Full multi-column bento layouts render side-by-side (3-column project grid; 8/4 task split; 3-column assistant + artifact workspace).
- **Tablet (`md: 768px` – `lg: 1024px`):**
  - Project grids adapt to 2 columns (`md:grid-cols-2`).
  - Top navigation pill bar scrolls horizontally (`overflow-x-auto`) without wrapping onto two lines.
  - Assistant sidebars stack cleanly or toggle via drawer triggers to prevent cramped text columns.
- **Mobile (`< 768px`):**
  - The application shell stays full-width and full-height while inner content padding tightens (`p-2`) to maximize screen real estate.
  - All multi-column grids collapse into single-column vertical stacks (`grid-cols-1`).
  - Interactive pills, checkboxes, and icon buttons maintain a minimum `40px–44px` touch target area.
