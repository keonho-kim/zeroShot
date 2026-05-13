# Design System: ZeroShot Pixel Brutalist Workbench
**Project ID:** local-zeroshot

## 1. Visual Theme & Atmosphere

ZeroShot should feel like an 8-bit arcade control deck rebuilt as a serious engineering workbench. The interface is bright, square, tactile, and operational: hard black outlines, chunky pixel-like shadows, saturated arcade accents, checker-grid backgrounds, and compact monospace controls.

The product is not a landing page. It is a tool for choosing a project, shaping a blueprint, and running Codex. ARCHITECT should feel like a focused design station. BUILD should feel like a production console with visible state, source selection, and live logs.

## 2. Color Palette & Roles

- **Cabinet Canvas (`#f5f0dc`):** Main background.
- **Screen Surface (`#fffdf2`):** Cards, panels, modals, and control surfaces.
- **Pixel Line (`#101010`):** Text, borders, active states, and hard shadows.
- **Muted Copy (`#4f4a3f`):** Descriptions, metadata, helper text, and inactive labels.
- **Arcade Cyan (`#00d9ff`):** Navigation highlights and informational emphasis.
- **Arcade Yellow (`#ffe14a`):** Project slot and active workbench surfaces.
- **Arcade Pink (`#ff4fa3`):** Focus rings, destructive emphasis, and important hover accents.
- **Arcade Green (`#24d17e`):** Ready, complete, and successful run state.

## 3. Typography Rules

Use a heavy monospace stack throughout the product. Page and mode labels should read like cabinet marquee text: uppercase, square, and compact. Letter spacing remains normal. Do not scale font size with viewport width.

- **Page Title:** 28-56px monospace, 900 weight, uppercase for route names.
- **Mode Title:** 44-92px monospace, 900 weight, compact line height.
- **Section Heading:** 18-24px monospace or serif depending on hierarchy.
- **Control Label:** 12-14px monospace, 700-800 weight.
- **Body Text:** 14-16px monospace, 1.5-1.65 line height.
- **Metadata:** 11-13px monospace, tabular when showing counts or run state.
- **Code and Logs:** 12-13px monospace, 1.6 line height.

## 4. Component Styling

- **Buttons:** Use 3px Pixel Line borders, square or near-square corners, uppercase monospace labels, and 4px pixel shadows. Primary buttons invert to Pixel Line background with Cabinet Canvas text.
- **Cards and Panels:** Use flat Screen Surface fills, 3px Pixel Line borders, square corners, and offset hard shadows. Avoid nested card styling.
- **Inputs and Forms:** Use Screen Surface, 3px Pixel Line borders, square corners, and Arcade Pink focus rings.
- **Phase Cards:** ARCHITECT, DESIGN, and BUILD read as large arcade mode tiles. The title should dominate the card.
- **Status Surfaces:** Project state, run counts, and file availability are compact bordered grid tiles.
- **Code and Terminal Surfaces:** Logs invert to Pixel Line background with Cabinet Canvas text, stable max heights, and safe wrapping.

## 5. Layout Principles

The first screen should show the current project slot, quick project selection, and ARCHITECT / DESIGN / BUILD choices in a clear one-column arcade stack. Use large first-read labels and compact operational metadata.

Project paths should not dominate phase pages. Show a compact project label in the header and keep the full path available through `title` text or focused project selection surfaces.

On mobile, stack project state and action cards vertically. Text inside cards and buttons must wrap or truncate deliberately without overlapping neighboring controls.
