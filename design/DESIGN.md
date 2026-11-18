# DESIGN.md — Product Design System

## 1. Design Philosophy

### Design Direction

Create a modern, playful, approachable SaaS experience using a combination of:

- Soft pastel backgrounds.
- Colorful modular cards.
- Rounded surfaces and containers.
- Clean, readable typography.
- Minimal navigation.
- Strong visual hierarchy.
- Friendly illustrations and visual elements.

The overall aesthetic should feel modern, lightweight, friendly, and engaging without sacrificing usability or professionalism.

### Core Principles

1. **Friendly, not childish:** Use playful colors and visual elements while maintaining a professional product experience.
2. **Clean, not empty:** Use whitespace intentionally, but maintain enough information density to make pages useful.
3. **Color with purpose:** Use accent colors to distinguish content, categories, statuses, and important actions.
4. **Consistent, not repetitive:** Pages should share the same design language without looking like copies of the same layout.
5. **Function before decoration:** Visual elements must support usability and information hierarchy.

---

## 2. Visual Identity

### Overall Appearance

- A neutral off-white application background that fills the viewport edge to edge.
- No floating outer frame, viewport padding, or decorative page backdrop.
- Large white or near-white application surfaces.
- Rounded containers and modular card layouts.
- A mixture of neutral, colorful, and dark cards.
- Minimal borders and subtle shadows.
- Clean, compact typography.
- Friendly iconography and occasional illustrations.

### Visual Personality

The interface should communicate:

- Creativity
- Productivity
- Learning
- Approachability
- Clarity
- Modern technology

Avoid overly corporate enterprise dashboards, excessive minimalism, and overly decorative interfaces.

---

## 3. Color System

The following values are initial estimates and should be treated as adjustable design tokens.

### Primary Colors

| Token          | Color          | HEX       |
| -------------- | -------------- | --------- |
| Background     | Cool Off-White | `#F8F9FB` |
| Primary Blue   | Periwinkle     | `#C6D2FE` |
| Primary Yellow | Warm Gold      | `#FCD34E` |
| Primary Pink   | Soft Lavender  | `#E8B4F8` |
| Primary Orange | Tangerine      | `#FB923C` |
| Action         | Charcoal Slate | `#3B3F46` |

### Neutral Colors

| Token             | HEX       |
| ----------------- | --------- |
| Main Surface      | `#FFFFFF` |
| Secondary Surface | `#F8F9FB` |
| Muted Surface     | `#F3F4F6` |
| Primary Text      | `#101415` |
| Secondary Text    | `#6C7173` |
| Muted Text        | `#9DA2A4` |
| Border            | `#E0E6E7` |

### Color Usage Rules

- Keep the overall page background neutral; use pastel blue only in selected visual sections.
- Use white and light gray for primary content surfaces.
- Use yellow, pink, orange, and blue for highlighted cards and content categories.
- Pair each pastel surface with its deep semantic ink: periwinkle `#293185`, gold `#5E4C11`, lavender `#642776`, and tangerine `#5D4733`.
- Use black cards sparingly for strong visual contrast.
- Use neutral colors for most text.
- Never rely on pastel colors alone to communicate status.
- Maintain sufficient text contrast on colored backgrounds.

Do not use every accent color on every page. Select colors intentionally.

---

## 4. Typography

### Font Direction

Prefer clean, modern sans-serif fonts.

Recommended:

- Inter
- Geist Sans
- Plus Jakarta Sans

Choose one primary font family and use it consistently.

### Typography Hierarchy

| Element         | Recommended Size | Weight  |
| --------------- | ---------------- | ------- |
| Page Heading    | 24–30px          | 600–700 |
| Section Heading | 18–20px          | 600     |
| Card Heading    | 14–16px          | 600     |
| Body            | 13–15px          | 400     |
| Secondary Text  | 11–13px          | 400     |
| Labels          | 11–12px          | 500     |

### Typography Rules

- Prioritize readability over decorative typography.
- Use clear differences between headings, labels, and body text.
- Avoid excessive font weights.
- Keep secondary information visually subordinate.
- Use consistent line heights.

---

## 5. Layout System

### Application Structure

Use a flexible, full-viewport application layout consisting of:

- A full-width, full-height application background.
- A main application shell that stretches edge to edge across the device.
- Navigation area.
- Page header.
- Main content area.
- Optional contextual panels or sidebars.

### Layout Principles

- Use whitespace to separate content groups.
- Prefer modular layouts with clearly defined sections.
- Use CSS Grid for dashboard-style layouts.
- Use Flexbox for component-level alignment.
- The application shell always fills the viewport; do not wrap it in a floating frame.
- Keep padding inside the full-width shell for content breathing room.
- Constrain only inner reading or form columns when a narrower width improves readability.
- Do not introduce an outer page gutter, centered shell width, or colored viewport backdrop.

### Responsive Behavior

**Desktop**

- Use multi-column layouts where appropriate.
- Display contextual sidebars and supporting panels.
- Maintain clear separation between content sections.

**Tablet**

- Reduce the number of columns.
- Preserve important information hierarchy.
- Allow supporting panels to move below primary content.

**Mobile**

- Use single-column layouts.
- Collapse desktop navigation into mobile navigation.
- Make interactive controls comfortable to use.
- Avoid horizontal overflow.
- Prioritize primary content over secondary information.

Do not force the desktop dashboard layout onto mobile screens.

---

## 6. Spacing System

Use a consistent 4px-based spacing scale.

| Token | Value |
| ----- | ----- |
| xs    | 4px   |
| sm    | 8px   |
| md    | 12px  |
| lg    | 16px  |
| xl    | 24px  |
| 2xl   | 32px  |
| 3xl   | 40px  |
| 4xl   | 48px  |

### Spacing Rules

- Use consistent internal card padding.
- Maintain clear separation between major page sections.
- Avoid overcrowding cards.
- Keep related elements visually grouped.
- Use larger spacing between unrelated content groups.

---

## 7. Border Radius & Surfaces

Rounded surfaces are a defining characteristic of this design system.

| Component        | Recommended Radius |
| ---------------- | ------------------ |
| Small Controls   | 8px                |
| Buttons          | 10–14px            |
| Inputs           | 12px               |
| Cards            | 16–20px            |
| Large Containers | 24–32px            |
| Pills            | 999px              |

### Surface Treatment

Use three primary surface variations:

**Neutral Cards**

- White or light-gray background.
- Subtle border.
- Minimal shadow.

**Accent Cards**

- Pastel blue, yellow, pink, or orange backgrounds.
- Dark readable text.
- Minimal additional decoration.

**Dark Cards**

- Near-black background.
- White primary text.
- Muted secondary text.
- Used selectively for emphasis.

### Shadows

Prefer soft, subtle shadows.

Avoid:

- Heavy drop shadows.
- Strong outlines.
- Excessive glassmorphism.
- Excessive neumorphism.

The interface should feel soft and dimensional without appearing visually heavy.

---

## 8. Component Design Guidelines

### Buttons

Use rounded buttons with clear visual hierarchy.

Variants:

- Primary: Dark background with white text.
- Secondary: Light neutral background.
- Accent: Pastel background.
- Ghost: Transparent background.
- Destructive: Red-based treatment.

Provide hover, active, focus, and disabled states.

### Cards

Cards are a core building block of the design system.

Support:

- Neutral cards.
- Colored accent cards.
- Dark cards.
- Interactive cards.
- Metric cards.
- Content cards.

Cards should have consistent internal spacing, heading hierarchy, and alignment.

Avoid making every card identical. Use visual variation intentionally.

### Inputs

- Light neutral backgrounds.
- Subtle borders.
- Rounded corners.
- Clear labels.
- Visible focus states.
- Appropriate validation feedback.

### Badges

Use compact rounded badges for:

- Status.
- Categories.
- Priority.
- Progress.
- Labels.

Use pastel backgrounds with readable foreground colors.

### Navigation

- Minimal and visually lightweight.
- Rounded active states.
- Clear icons and labels.
- Consistent spacing.
- Avoid excessive navigation decoration.

### Charts & Data Visualization

- Prefer simple, readable charts.
- Use the established accent palette.
- Use consistent chart typography.
- Avoid unnecessary gridlines.
- Maintain clear legends and labels.

---

## 9. Iconography & Illustrations

### Icons

- Prefer Lucide icons.
- Use consistent stroke weight.
- Keep icon sizes proportional to surrounding text.
- Avoid mixing unrelated icon styles.

### Illustrations

The reference uses friendly visual elements and avatars.

Use illustrations selectively for:

- Empty states.
- Learning content.
- Achievements.
- AI interactions.
- Onboarding.

Avoid decorative illustrations that compete with important information.

---

## 10. Interaction Guidelines

All interactive elements must provide clear feedback.

### States

Every relevant component should support:

- Default
- Hover
- Active
- Focus
- Disabled
- Loading
- Error
- Success

### Motion

Use subtle, purposeful transitions.

Recommended:

- Hover transitions.
- Small scale or opacity changes.
- Smooth dropdown and modal transitions.
- Subtle card interactions.

Avoid excessive animations, bouncing effects, and distracting transitions.

Prioritize responsiveness and perceived performance.

---

## 11. Design Consistency Rules

These rules apply to every page.

1. Use the established color tokens.
2. Maintain consistent typography.
3. Follow the spacing scale.
4. Reuse existing component patterns.
5. Maintain consistent border radii.
6. Use accent colors intentionally.
7. Preserve the visual personality of the product.
8. Maintain consistent interaction behavior.
9. Ensure responsive behavior.
10. Do not introduce unrelated visual styles without justification.

### Important: Visual Consistency vs Layout Consistency

Every page must feel like part of the same product.

However, different pages may require different layouts.

For example:

- Dashboard: Modular cards and data visualization.
- Project workspace: Structured content and contextual navigation.
- Learning page: Course content and progress-oriented sections.
- Settings: Clean forms and grouped configuration sections.

Do not reuse the dashboard layout everywhere.

Reuse the design language, not necessarily the layout.

---

## 12. Technical Implementation Guidelines

### Technology

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- CSS variables for design tokens
- Lucide icons

### Component Architecture

- Prefer reusable components.
- Use component variants for visual differences.
- Keep page-specific layouts separate from shared components.
- Avoid duplicating styling logic.
- Avoid arbitrary color and spacing values when an approved token exists.

### shadcn/ui

Use shadcn/ui as the foundational component library.

Customize its default styles to match this design system.

Do not blindly use its default appearance if it conflicts with the established visual identity.

### Design Tokens

Define reusable CSS variables for:

- Colors.
- Typography.
- Spacing.
- Border radius.
- Shadows.

Tailwind classes should reference these tokens wherever practical.

---

## 13. AI Implementation Instructions

Before generating or modifying a page, the AI coding agent must:

1. Read this DESIGN.md.
2. Inspect existing components and design tokens.
3. Understand the purpose of the requested page.
4. Identify the appropriate layout structure.
5. Reuse existing components where appropriate.
6. Follow the established visual identity.
7. Consider responsive behavior.
8. Implement all relevant interaction states.
9. Validate the result visually.

### Design Decision Priority

When making design decisions, follow this priority:

1. Approved product-specific design decisions.
2. This DESIGN.md.
3. Existing reusable application components.
4. General UX best practices.
5. External design recommendations.

If a requested design conflicts with established rules, explain the trade-off rather than silently changing the design system.

---

## 14. Final Quality Standard

A successful implementation should:

- Look visually consistent with the reference.
- Feel modern, playful, and approachable.
- Use colors and whitespace intentionally.
- Have a clear information hierarchy.
- Avoid unnecessary visual complexity.
- Work across desktop, tablet, and mobile.
- Maintain accessibility and usability.
- Feel like part of one coherent product.

**The ultimate goal is not to reproduce one screenshot. It is to establish a recognizable visual identity that can support an entire application.**
