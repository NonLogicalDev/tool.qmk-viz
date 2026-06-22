---
date: 2026-06-22
status: complete
subject: custom-keycode-declarations
---

# Goal

Improve custom keycode creation/editing so users only declare keycode names. Users should not type or manage `SAFE_RANGE` or any numeric/custom value; templates should assign `SAFE_RANGE` automatically when rendering QMK custom keycode enums.

# Context

Custom keycodes currently reuse the generic support-entry row shape and seed `value` with `SAFE_RANGE`. That makes a custom keycode look like an alias assignment even though QMK custom keycodes are normally enum members. The layout JSON should remain easy to template, but the UI should stop asking for a value the user should not own.

# Product Integration

- Existing product model: Layout support data contains reusable QMK-side helpers grouped as dances, macros, custom key aliases, and custom keycodes.
- New requirement's real intent: custom keycodes should be declarations, not value-bearing aliases.
- Cleanest integrated model: keep `kind: "keycode"` rows in `extKeys`, but make their value empty/ignored and render them with a declaration-oriented table.
- Existing pieces that should move, change, or disappear: remove the custom-keycode value field from the editor and move `SAFE_RANGE` responsibility into the template snippet/default generator.
- Architecture impact: no new persistence path; sanitize keycode rows on save/export so imported stale values do not leak into templates.
- Why this is better than a local patch: the UI, JSON, and template contract all say the same thing: keycode rows name enum members only.

# Decisions

- Keep custom keycodes in `extKeys` with `kind: "keycode"` for now.
- Store/export custom keycode rows with an empty `value`.
- Keep notes editable because notes are user-owned metadata.
- Generate `SAFE_RANGE` only in templates, on the first custom keycode enum entry.

# Implementation Steps

1. [x] Normalize custom keycode support rows so their `value` is empty on save/export.
2. [x] Remove the custom-keycode value input and displayed value column from the editor.
3. [x] Update the built-in keymap template and README example to assign `SAFE_RANGE` automatically.
4. [x] Update `DEVELOPMENT_LOG.md`.
5. [x] Validate build and focused UI behavior.
6. [x] Create a local checkpoint.

# Learning Log

- Custom keycodes should be treated as enum member declarations, not aliases. Their persisted `value` is intentionally empty.
- `cloneExtKeys()` is the right export/reconcile boundary for stripping stale keycode values from imported or older saved layouts.
- Nunjucks `trimBlocks` can collapse generated C lines together. The built-in template now uses explicit newline output in loops that must produce C declarations or initializer rows.
- Existing user projects may carry older custom templates; this change updates the built-in/default examples but does not overwrite user-authored templates.

# Work Log

- [x] 2026-06-22 09:11 - Created plan for custom keycode declaration flow.
- [x] 2026-06-22 09:19 - Removed custom-keycode value editing/display and normalized keycode values to empty on save/export.
- [x] 2026-06-22 09:19 - Updated built-in and Ergodox starter templates so custom keycodes render through enum loops and aliases remain `#define`s.
- [x] 2026-06-22 09:19 - Browser-validated custom keycode add/save flow, JSON export value stripping, and cleanup delete flow.
- [x] 2026-06-22 09:19 - Verified default template render, Ergodox starter template render, default-project JSON, `git diff --check`, and `npm run build`.

# Unfinished Work

N/A
