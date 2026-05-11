# Design System: ZeroShot Modern Web App
**Project ID:** local-zeroshot

## 1. Visual Theme & Atmosphere

ZeroShot uses a polished modern web-app language inspired by Apple software surfaces: calm, precise, high-clarity, and quietly premium. The interface should feel like a focused control room for long-running AI work rather than a marketing page. The visual density is moderate: enough structure for scanning logs, files, settings, and run state, with enough whitespace to keep the workspace from feeling crowded.

The system favors bright layered surfaces, soft translucency, crisp typography, and restrained motion. Depth should feel optical and ambient, not decorative. UI should make progress and state changes visible through clear hierarchy, timeline structure, status color, and compact metadata.

## 2. Color Palette & Roles

- **Studio Canvas White (#F5F5F7):** Main app background. This is a cool Apple-like off-white that keeps large views quiet and clean.
- **Glass Panel White (#FFFFFF):** Primary panel, modal, and card surface. Use with subtle transparency when the panel overlays complex content.
- **Elevated Frost (#FBFBFD):** Secondary surface for toolbars, selected rows, and grouped controls.
- **Graphite Text (#1D1D1F):** Primary text and headings. Avoid pure black for a softer, native-app feel.
- **Secondary Graphite (#6E6E73):** Descriptions, helper text, metadata, and inactive navigation.
- **Tertiary Gray (#A1A1A6):** Disabled text, secondary icons, timestamps, and low-priority labels.
- **Apple Blue (#0071E3):** Primary actions, active navigation, progress emphasis, and focus states.
- **Blue Pressed (#005BB5):** Pressed or active state for Apple Blue actions.
- **Mint Success (#34C759):** Completed stages, successful validation, and ready states.
- **Amber Warning (#FF9F0A):** Attention states that need review but are not fatal.
- **System Red (#FF3B30):** Failed jobs, destructive actions, and explicit errors.
- **Separator Line (#D2D2D7):** Fine borders between panels and dense rows.
- **Hairline Separator (#E5E5EA):** Ultra-light borders for quiet grouping inside panels.
- **Code Ink (#2C2C2E):** Code and log foreground.
- **Code Surface (#F2F2F7):** Code blocks, terminal-like output, and collapsed log bodies.

## 3. Typography Rules

Use the Apple system stack: `SF Pro Display`, `SF Pro Text`, `-apple-system`, `BlinkMacSystemFont`, `Helvetica Neue`, `Arial`, `sans-serif`. UI text should use normal letter spacing. Do not use viewport-scaled typography.

- **Page Title:** 32-40px, 700 weight, tight but readable line height. Use for the main screen title only.
- **Section Heading:** 18-22px, 650-700 weight. Use inside panels and page sections.
- **Control Label:** 13-14px, 600 weight. Use for fields, compact tabs, and row headers.
- **Body Text:** 14-16px, 400-500 weight, 1.5 line height. Use for descriptions and readable copy.
- **Metadata:** 12-13px, 500 weight, tabular numerals when showing counts, durations, or job ids.
- **Code and Logs:** 12-13px, monospaced, 1.6 line height, no decorative styling.

## 4. Component Stylings

* **Buttons:** Primary buttons use Apple Blue (#0071E3), white text, 10-12px corner radius, compact icon+label composition, and a darker pressed state (#005BB5). Secondary buttons use Elevated Frost (#FBFBFD) with a fine Separator Line (#D2D2D7). Icon-only buttons must use recognizable Lucide icons with accessible labels.
* **Cards/Containers:** Panels use Glass Panel White (#FFFFFF), 16px corner radius, a one-pixel Hairline Separator (#E5E5EA), and a soft ambient shadow such as `0 16px 42px rgba(31, 35, 42, 0.06)`. Avoid nested cards. Use panels for major tools and cards only for repeated items or modals.
* **Inputs/Forms:** Inputs use Elevated Frost (#FBFBFD), 10-12px corner radius, a fine Separator Line (#D2D2D7), and an Apple Blue (#0071E3) focus ring. Placeholder text uses Tertiary Gray (#A1A1A6).
* **Timeline:** Long-running work is shown as a vertical expandable timeline. Each step has a compact status icon, a short title, a one-line latest event, an event count pill, and a collapsible log body. Running steps use Apple Blue (#0071E3), completed steps use Mint Success (#34C759), failed steps use System Red (#FF3B30).
* **Navigation:** Navigation should feel like a native app sidebar or compact top control strip. Active routes use Apple Blue (#0071E3) and a calm selected surface, not heavy blocks.
* **Code/Terminal Surfaces:** Use Code Surface (#F2F2F7) with Code Ink (#2C2C2E), rounded 10-12px corners, and stable max heights. Logs must wrap safely and never resize surrounding layout unexpectedly.

## 5. Layout Principles

Use a workspace-first layout. The first screen should show usable controls, current project context, and run state. Avoid landing-page hero sections unless the product explicitly needs marketing.

Spacing follows a 4px base rhythm with common steps of 8px, 12px, 16px, 24px, and 32px. Major panels should align to a clear grid and keep consistent gutters. Use responsive columns for editor/run views: controls and inputs on the left, status timeline or output on the right. On narrow screens, stack panels vertically with timeline first when a job is active.

Whitespace should clarify boundaries without making operational screens sparse. Dense data surfaces should rely on alignment, dividers, and compact typography rather than large decorative cards.

## 6. Depth & Motion

Depth is soft and functional. Use one ambient shadow level for elevated panels, a slightly stronger shadow for modals, and no shadows for simple rows or inline controls. Avoid gradient blobs, decorative orbs, heavy shadows, and one-note color themes.

Motion should be fast and restrained: 120-180ms for hover and disclosure transitions. Expanding timeline content should feel responsive and stable, with no layout jumps outside the expanded section.

## 7. Accessibility & Responsiveness

Interactive controls need visible focus states, clear hit targets, and semantic buttons for disclosure behavior. Text must fit inside controls at desktop and mobile widths. Status should never rely on color alone; pair color with icons and clear labels. Layouts should work from narrow mobile widths through wide desktop without overlapping text, controls, or log output.
