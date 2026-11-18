# THEMES.md — Theme Token Contract

## 1. Purpose

Nexus supports predefined appearance themes selected by users. Themes change
color, not product structure or component geometry.

This document defines the semantic token contract every theme must satisfy. The
runtime values live in `apps/web/app/globals.css`; this file is the human-readable
registry and review checklist.

Raw color values belong only in:

- Theme definitions in `apps/web/app/globals.css`.
- The theme registries in this document.

Application components must only use semantic tokens or shared visual properties.
They must never hardcode a theme-specific color.

## 2. Theme Activation

Themes are selected with a `data-theme` attribute on the root element:

```html
<html data-theme="pastel"></html>
```

- `pastel` is the default theme.
- `dark` is the first alternate preset.
- An unrecognized or missing value must fall back to `pastel`.

The theme picker, persistence, and Settings integration are intentionally deferred.
A future picker only changes the theme identifier; components must not be aware of
which theme is active.

## 3. Token Roles

### Core Colors

| Token                         | Purpose                                                  |
| ----------------------------- | -------------------------------------------------------- |
| `background`                  | Full-screen page background                              |
| `foreground`                  | Default text and icons                                   |
| `surface`                     | Cards, panels, modals, and other raised content surfaces |
| `surface-secondary`           | Inner workspace canvas and subdued supporting surfaces   |
| `primary`                     | Brand color and primary categorical emphasis             |
| `primary-soft`                | Soft periwinkle surface for KPI tiles and emphasis       |
| `primary-subtle`              | Faint periwinkle surface for selected task rows          |
| `primary-foreground`          | Deep ink placed on primary and primary-soft surfaces     |
| `secondary`                   | Neutral secondary controls and surfaces                  |
| `secondary-foreground`        | Text and icons placed on `secondary`                     |
| `accent`                      | First categorical accent, commonly gold/yellow           |
| `accent-soft`                 | Soft gold surface for badges and metrics                 |
| `accent-foreground`           | Deep ink placed on gold surfaces                         |
| `accent-secondary`            | Second categorical accent, commonly pink/lavender        |
| `accent-secondary-soft`       | Soft lavender surface for artifacts and metrics          |
| `accent-secondary-foreground` | Deep ink placed on lavender surfaces                     |
| `accent-tertiary`             | Third categorical accent, commonly orange                |
| `accent-tertiary-soft`        | Soft peach surface for knowledge and alerts              |
| `accent-tertiary-foreground`  | Deep ink placed on orange/peach surfaces                 |
| `muted`                       | Subdued backgrounds and neutral interactive hover states |
| `muted-foreground`            | Secondary metadata and subdued labels                    |
| `placeholder`                 | Input placeholder and disabled-hint text                 |
| `border`                      | Standard borders and dividers                            |
| `destructive`                 | Destructive actions and error emphasis                   |
| `destructive-foreground`      | Text and icons placed on `destructive`                   |
| `success`                     | Positive/completed state emphasis                        |
| `success-soft`                | Soft mint surface for completed pills and checklist rows |
| `success-foreground`          | Deep ink placed on success and success-soft surfaces     |

### Interactive Colors

| Token               | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `action`            | High-emphasis buttons and active navigation controls |
| `action-foreground` | Text and icons placed on `action`                    |
| `action-hover`      | Hover state for `action`                             |
| `focus-ring`        | Visible keyboard-focus indicator                     |

`primary` identifies the brand. `action` identifies the strongest interactive
control. They are separate because a theme's brand color does not always provide
sufficient contrast as a button surface.

### Component Colors

| Token                | Purpose                                  |
| -------------------- | ---------------------------------------- |
| `card-background`    | Card and content-panel background        |
| `card-foreground`    | Default card text and icons              |
| `sidebar-background` | Persistent navigation surface            |
| `sidebar-foreground` | Navigation text and icons                |
| `input-background`   | Text inputs, textareas, and selectors    |
| `input-border`       | Input borders and input focus boundaries |
| `popover-background` | Dropdowns, menus, and floating panels    |
| `popover-foreground` | Text and icons inside popovers           |

Component tokens may reference core tokens, but every component token must resolve
in every theme.

## 4. Pastel Theme — Default

| Token                         | Value     |
| ----------------------------- | --------- |
| `background`                  | `#F8F9FB` |
| `foreground`                  | `#101415` |
| `surface`                     | `#FFFFFF` |
| `surface-secondary`           | `#F8F9FB` |
| `primary`                     | `#C6D2FE` |
| `primary-soft`                | `#E6EBFF` |
| `primary-subtle`              | `#F4F6FF` |
| `primary-foreground`          | `#293185` |
| `secondary`                   | `#F3F4F6` |
| `secondary-foreground`        | `#101415` |
| `accent`                      | `#FCD34E` |
| `accent-soft`                 | `#FFEEBC` |
| `accent-foreground`           | `#5E4C11` |
| `accent-secondary`            | `#E8B4F8` |
| `accent-secondary-soft`       | `#F7E5FD` |
| `accent-secondary-foreground` | `#642776` |
| `accent-tertiary`             | `#FB923C` |
| `accent-tertiary-soft`        | `#FEE4CE` |
| `accent-tertiary-foreground`  | `#5D4733` |
| `muted`                       | `#F3F4F6` |
| `muted-foreground`            | `#6C7173` |
| `placeholder`                 | `#9DA2A4` |
| `border`                      | `#E0E6E7` |
| `destructive`                 | `#CC3D3D` |
| `destructive-foreground`      | `#FFFFFF` |
| `success`                     | `#34D399` |
| `success-soft`                | `#DCFCE7` |
| `success-foreground`          | `#166534` |
| `action`                      | `#3B3F46` |
| `action-foreground`           | `#FFFFFF` |
| `action-hover`                | `#4B5051` |
| `focus-ring`                  | `#3B3F46` |
| `card-background`             | `#FFFFFF` |
| `card-foreground`             | `#101415` |
| `sidebar-background`          | `#FFFFFF` |
| `sidebar-foreground`          | `#101415` |
| `input-background`            | `#FFFFFF` |
| `input-border`                | `#E0E6E7` |
| `popover-background`          | `#FFFFFF` |
| `popover-foreground`          | `#101415` |

## 5. Dark Theme

| Token                         | Value     |
| ----------------------------- | --------- |
| `background`                  | `#171923` |
| `foreground`                  | `#F5F5F4` |
| `surface`                     | `#252A3A` |
| `surface-secondary`           | `#1D2230` |
| `primary`                     | `#6477D8` |
| `primary-soft`                | `#E6EBFF` |
| `primary-subtle`              | `#F4F6FF` |
| `primary-foreground`          | `#111111` |
| `secondary`                   | `#303648` |
| `secondary-foreground`        | `#F5F5F4` |
| `accent`                      | `#D69B48` |
| `accent-soft`                 | `#FFEEBC` |
| `accent-foreground`           | `#171923` |
| `accent-secondary`            | `#B477C5` |
| `accent-secondary-soft`       | `#F7E5FD` |
| `accent-secondary-foreground` | `#171923` |
| `accent-tertiary`             | `#D98A50` |
| `accent-tertiary-soft`        | `#FEE4CE` |
| `accent-tertiary-foreground`  | `#171923` |
| `muted`                       | `#2D3343` |
| `muted-foreground`            | `#A9A9B3` |
| `placeholder`                 | `#9494A3` |
| `border`                      | `#3A4154` |
| `destructive`                 | `#F07178` |
| `destructive-foreground`      | `#171923` |
| `success`                     | `#34D399` |
| `success-soft`                | `#123524` |
| `success-foreground`          | `#BBF7D0` |
| `action`                      | `#F5F5F4` |
| `action-foreground`           | `#171923` |
| `action-hover`                | `#E2E2E2` |
| `focus-ring`                  | `#A9C5FA` |
| `card-background`             | `#252A3A` |
| `card-foreground`             | `#F5F5F4` |
| `sidebar-background`          | `#1D2230` |
| `sidebar-foreground`          | `#F5F5F4` |
| `input-background`            | `#1D2230` |
| `input-border`                | `#3A4154` |
| `popover-background`          | `#252A3A` |
| `popover-foreground`          | `#F5F5F4` |

Dark themes invert the action anchor: high-emphasis controls use a light surface
instead of the near-black treatment used by the Pastel theme.

## 6. Contrast Requirements

Body-sized text must meet a contrast ratio of at least `4.5:1`; large text and
non-text UI boundaries must meet at least `3:1`.

Verified default pairings:

| Pair                                      | Pastel    | Dark      |
| ----------------------------------------- | --------- | --------- |
| `foreground` on `background`              | `17.60:1` | `16.04:1` |
| `foreground` on `surface`                 | `18.54:1` | `13.09:1` |
| `primary-foreground` on `primary`         | `7.50:1`  | `4.65:1`  |
| `muted-foreground` on `surface`           | `4.94:1`  | `6.13:1`  |
| `action-foreground` on `action`           | `10.58:1` | `16.04:1` |
| `destructive-foreground` on `destructive` | `4.88:1`  | `6.12:1`  |

Verified soft-surface pairings:

| Pair                                                     | Ratio    |
| -------------------------------------------------------- | -------- |
| `primary-foreground` on `primary-soft`                   | `9.45:1` |
| `accent-foreground` on `accent-soft`                     | `7.23:1` |
| `accent-secondary-foreground` on `accent-secondary-soft` | `8.40:1` |
| `accent-tertiary-foreground` on `accent-tertiary-soft`   | `7.12:1` |
| `success-foreground` on `success-soft`                   | `6.49:1` |

Accent pairings in the Dark theme:

| Pair                                                | Ratio    |
| --------------------------------------------------- | -------- |
| `accent-foreground` on `accent`                     | `7.20:1` |
| `accent-secondary-foreground` on `accent-secondary` | `5.32:1` |
| `accent-tertiary-foreground` on `accent-tertiary`   | `6.42:1` |

Placeholder text is supplemental. Inputs must still provide persistent visible
labels; a placeholder must never be the only description of a field.

## 7. Shared Visual Properties

Typography, spacing, radii, and shadow geometry do not change between themes.

### Typography

- Sans family: Inter, with the platform sans-serif fallback.
- Monospace family: JetBrains Mono, with the platform monospace fallback.
- Body copy remains regular weight at the shared compact scale.
- Page and card headings retain their shared hierarchy and tracking.

### Spacing

Use the shared 4px-based scale: 4, 8, 12, 16, 24, 32, 40, and 48px.

### Radii

| Token            | Value    | Use                                   |
| ---------------- | -------- | ------------------------------------- |
| `radius-control` | `10px`   | Small controls and secondary buttons  |
| `radius-input`   | `12px`   | Inputs and textareas                  |
| `radius-item`    | `16px`   | Checklist rows, callouts, attachments |
| `radius-card`    | `24px`   | Bento cards and content panels        |
| `radius-shell`   | `32px`   | Large overlays and modals             |
| `radius-pill`    | `9999px` | Navigation, badges, and pill buttons  |

### Shadows

Keep shadow dimensions and offsets consistent across themes. Themes may adjust only
shadow color/opacity when needed for visibility. Interactive elevation is reserved
for clickable cards; static cards use a subtle border instead.

## 8. Component Rules

Components must:

1. Use semantic tokens for every themed color.
2. Use `action` for high-emphasis controls and `primary` for brand emphasis.
3. Pair every filled surface with its matching foreground token.
4. Use `muted` for neutral hover states, not categorical accents.
5. Use `focus-ring` for keyboard focus states.
6. Preserve shared typography, spacing, radii, and component geometry.
7. Keep status communication independent of color, using labels, icons, or text.

Components must not:

- Hardcode HEX, RGB, or named colors for themed UI.
- Assume a specific theme is active.
- Reuse brand or categorical colors as arbitrary button backgrounds.
- Change layout structure based on the active theme.

## 9. CSS Implementation Rules

- Define theme values as runtime CSS variables scoped by `:root` and
  `[data-theme="<id>"]`.
- Map those variables through Tailwind v4 `@theme inline` so utilities reference
  runtime variables rather than compiled HEX values.
- Keep shared typography, spacing, radii, and shadow geometry outside theme blocks.
- Preserve compatibility aliases for existing utilities such as `card` and
  `popover` while migrating components.
- Editor-only variables must map back to semantic theme tokens instead of
  maintaining a separate brand palette.

## 10. Adding a Theme

A new preset is complete only when:

1. It defines every token in Sections 3 and 4.
2. All foreground/background pairs meet the contrast requirements.
3. `primary` and `action` remain visually and semantically distinct.
4. Keyboard focus is visible on every surface.
5. Both filled and outlined destructive states are legible.
6. Editor content, selection, cursor, and code blocks follow the active theme.
7. Typography, spacing, radii, and component geometry are unchanged.
8. The theme is documented here and added to the future theme-picker registry.

Themes that omit tokens or rely on component-specific exceptions are not approved.
