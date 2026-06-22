---
date: 2026-06-21
status: complete
subject: dropdowns-and-responsive-keyboard
---

# Goal

Use the custom dropdown/picker archetype consistently across qmk-viz and make the keyboard viewer scale down on smaller screen widths so users do not need horizontal scrolling.

# Context

The top Project/Layout selectors already use a custom searchable picker. Other controls still use native `<select>` elements, especially the Layout page selector and Action Composer action/layer selectors. The keyboard editor already measures the stage and applies scale, but narrow viewports can still force uncomfortable scrolling or clipping.

# Product Integration

- Existing product model: qmk-viz is a dense visual editor with custom command menus, custom context pickers, and a keyboard-first editing surface.
- New requirement's real intent: make interaction language consistent and keep the keyboard as the primary full-width surface even on smaller screens.
- Cleanest integrated model: promote the existing custom picker into a reusable app-wide select archetype, then replace native selects with it where the choice set is controlled by app state.
- Existing pieces that should move, change, or disappear: remove remaining native selects from editor/composer surfaces; keep raw text fields for freeform values; tune keyboard stage sizing instead of adding scroll wrappers.
- Architecture impact: add a reusable picker path or generalize the current context picker enough to cover simple select controls; adjust keyboard stage measurement/CSS to scale to available width.
- Why this is better than a local patch: it prevents another round of one-off dropdown styling and aligns layout selection, action type selection, and layer selection around the same interaction model.

# Decisions

- Preserve compact density: picker popovers should be small, searchable when useful, and keyboard navigable.
- Do not convert freeform text inputs into dropdowns.
- Keep native file inputs hidden behind styled labels; those are not dropdowns.
- Keyboard scaling should prefer fitting the rendered model to container width over adding horizontal scroll.
- The picker archetype stays in `App.tsx` for now because all current dropdowns live there; extracting a separate component can wait until another module needs it.

# Implementation Steps

1. [x] Inventory remaining native selects and classify which should become custom pickers.
2. [x] Extract or generalize the existing custom picker archetype for app-wide select use.
3. [x] Replace native Layout page and composer selects with custom pickers.
4. [x] Tune keyboard viewer scaling/CSS for smaller screen widths.
5. [x] Update `DEVELOPMENT_LOG.md`.
6. [x] Build and browser-validate dropdown behavior and narrow-width keyboard fit.
7. [x] Checkpoint.

# Learning Log

- The old top-bar picker could be generalized without creating a new component: the real abstraction is one open picker id, one search term, one active option index, and a per-control `onSelect`.
- Keeping test IDs on the trigger buttons made the native-select removal easy to validate: `layout-select`, `simple-composer-kind`, `simple-layer`, and `mod-tap-modifier` now point at buttons instead of selects.
- The keyboard viewer was already measuring container width; the missing piece was lowering the minimum scale and hiding horizontal overflow so narrow viewports choose scale-down instead of sideways scrolling.

# Work Log

- [x] 2026-06-21 22:14 - Created plan after user requested custom dropdowns across the project and better keyboard scaling on smaller screens.
- [x] 2026-06-21 22:21 - Replaced the remaining native selects with generalized custom pickers and validated keyboard fit at a 700px browser viewport.

# Unfinished Work

N/A
