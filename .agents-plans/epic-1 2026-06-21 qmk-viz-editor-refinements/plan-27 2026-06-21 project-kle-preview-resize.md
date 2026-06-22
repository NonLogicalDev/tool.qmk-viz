---
date: 2026-06-21
status: complete
subject: project-kle-preview-resize
---

# Goal

Make the Project page KLE marker preview resize with the browser width, reduce wasted horizontal keyboard padding, and stop the large top bar from sticking to the viewport.

# Context

The editor keyboard already measures its viewport and scales the stage. The Project page marker preview uses `KeyboardModelPreview`, which currently renders the KLE model at fixed `model.width * model.unit` dimensions inside a scrollable card. That makes the preview feel disconnected from the page width and can overflow as the browser narrows. Large keyboards such as Ergodox also lose legibility because KLE-derived stage bounds reserve excessive horizontal padding, and the top bar is too tall to remain sticky.

# Product Integration

- Existing product model: Project page summarizes the active project and exposes KLE model management; the marker preview should be a quick read-only confirmation of ID placement.
- New requirement's real intent: keep keyboard views legible by spending horizontal space on keys, not chrome or artificial margins.
- Cleanest integrated model: give `KeyboardModelPreview` its own measured viewport, scale the stage from the available card width, and reduce shared KLE model horizontal padding at the model-building boundary.
- Existing pieces that should move, change, or disappear: the fixed-size preview stage should become a scaled stage wrapper; the Project page should not own this local rendering state; top navigation should scroll normally instead of staying pinned.
- Architecture impact: localized component/CSS/model-boundary change; no workspace state changes.
- Why this is better than a local patch: the preview remains reusable for any project/model page without wiring resize state through app-level hooks.

# Decisions

- `KeyboardModelPreview` owns its own `ResizeObserver` and scale calculation.
- The preview should fit the available width, scaling down on narrow screens and modestly up on wide cards.
- KLE stage padding should be 10px on all sides instead of 100px horizontally and 10px vertically.
- The top bar should not use sticky positioning.

# Implementation Steps

1. [x] Add measured viewport sizing to `KeyboardModelPreview`.
2. [x] Render a stage scaler with computed visual dimensions and transform scale.
3. [x] Tighten preview CSS so the card clips cleanly without horizontal scrolling.
4. [x] Reduce shared KLE model horizontal padding so editor and preview can grow larger.
5. [x] Disable sticky top-bar positioning.
6. [x] Validate the Project page and editor at multiple browser widths.
7. [x] Record validation and checkpoint.

# Learning Log

- The Project page was not using the editor keyboard's responsive scaling path; it had a separate fixed-size read-only preview component.
- Horizontal KLE stage padding is stored on the built keyboard model and used by both editor and preview, so the padding fix belongs in `buildKeyboardModelFromKle`.

# Work Log

- [x] 2026-06-21 23:49 - Added a dedicated plan for Project page KLE preview resizing.
- [x] 2026-06-21 23:57 - Implemented measured Project KLE preview scaling, reduced shared horizontal keyboard padding from 100px to 10px, and removed sticky top-bar positioning.
- [x] 2026-06-22 00:06 - Validated Project preview and editor keyboard scaling at 760px and 1440px browser widths with no horizontal page overflow.

# Unfinished Work

N/A
