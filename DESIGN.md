# Design System: ZeroShot Grid Workbench
**Project ID:** local-zeroshot

## 1. Visual Theme & Atmosphere

ZeroShot should feel like a stark AI development workbench: bright, gridded, mechanical, and immediately operational. The reference direction is `NEW-DESIGN.html`: a light canvas, hard black grid lines, flat white surfaces, oversized editorial serif labels, and monospace operational controls.

The product is not a landing page. It is a tool for choosing a project, shaping a blueprint, and running Codex. ARCHITECT should feel like a focused design station. BUILD should feel like a production console with visible state, source selection, and live logs.

## 2. Color Palette & Roles

- **Grid Canvas (`oklch(96% 0.004 100)`):** Main background and page grid.
- **Workbench Surface (`oklch(100% 0 0)`):** Cards, panels, modals, and control surfaces.
- **Ink Line (`oklch(15% 0.02 100)`):** Text, borders, active states, primary buttons, and hard shadows.
- **Muted Copy (`oklch(40% 0.02 100)`):** Descriptions, metadata, helper text, and inactive labels.
- **Accent Red (`oklch(60% 0.22 25)`):** Focus rings, destructive emphasis, and important hover accents.
- **Success Green (`oklch(55% 0.16 145)`):** Ready, complete, and successful run state.
- **Warning Amber (`oklch(76% 0.16 80)`):** Review-needed and blocked state.
- **Info Blue (`oklch(58% 0.16 245)`):** Secondary informational emphasis.

## 3. Typography Rules

Use a display serif stack for large page and mode labels. Use a monospace stack for body text, controls, metadata, paths, counters, and log-like surfaces. Letter spacing remains normal. Do not scale font size with viewport width.

- **Page Title:** 32-60px serif, normal weight, uppercase for route names.
- **Mode Title:** 44-92px serif, normal weight, compact line height.
- **Section Heading:** 18-24px monospace or serif depending on hierarchy.
- **Control Label:** 12-14px monospace, 700-800 weight.
- **Body Text:** 14-16px monospace, 1.5-1.65 line height.
- **Metadata:** 11-13px monospace, tabular when showing counts or run state.
- **Code and Logs:** 12-13px monospace, 1.6 line height.

## 4. Component Styling

- **Buttons:** Use 2px Ink Line borders, 2px radius, monospace labels, and flat surfaces. Primary buttons invert to Ink Line background with Grid Canvas text.
- **Cards and Panels:** Use flat Workbench Surface fills, 2px Ink Line borders, 2px radius, and offset hard shadows. Avoid nested card styling.
- **Inputs and Forms:** Use Workbench Surface, 2px Ink Line borders, 2px radius, and Accent Red focus rings.
- **Phase Cards:** ARCHITECT and BUILD read as large selectable workbench modes. The serif title should dominate the card.
- **Status Surfaces:** Project state, run counts, and file availability are compact bordered grid tiles.
- **Code and Terminal Surfaces:** Logs invert to Ink Line background with Grid Canvas text, stable max heights, and safe wrapping.

## 5. Layout Principles

The first screen should show the current project slot, quick project selection, and ARCHITECT / BUILD choices in a clear grid. Use large first-read labels and compact operational metadata.

Project paths should not dominate phase pages. Show a compact project label in the header and keep the full path available through `title` text or focused project selection surfaces.

On mobile, stack project state and action cards vertically. Text inside cards and buttons must wrap or truncate deliberately without overlapping neighboring controls.
