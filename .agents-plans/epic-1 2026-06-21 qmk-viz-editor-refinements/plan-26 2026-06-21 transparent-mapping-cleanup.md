---
date: 2026-06-21
status: complete
subject: transparent-mapping-cleanup
---

# Goal

Stop leaking the old TSV transparent marker into qmk-viz's current UI and JSON output.

# Context

The app is now a visual JSON keymap editor with export templating. Transparent keys should use QMK's native `KC_TRNS` identifier in project/layout JSON, the action composer, generated keymap previews, and current UI labels. The previous `~` marker came from the TSV-era workflow and should only be recognized as stale imported/localStorage data that gets normalized away.

# Product Integration

- Existing product model: browser-local keyboard projects with KLE models, named layouts, visual editing, structured JSON export, and optional QMK template rendering.
- New requirement's real intent: remove TSV-era implementation language from current product behavior so exported JSON can be consumed directly by QMK-oriented tooling.
- Cleanest integrated model: make `KC_TRNS` the canonical transparent value at the keymap layer boundary and normalize legacy transparent spellings on read/write.
- Existing pieces that should move, change, or disappear: composer help, key action menus, action display helpers, and export serialization should stop treating `~` as the displayed/generated value.
- Architecture impact: narrow keymap/action normalization change; no page or state ownership changes.
- Why this is better than a local patch: fixing the keymap boundary prevents the old marker from resurfacing through export, previews, selected-key sync, or stale localStorage.

# Decisions

- `TRANSPARENT` is `KC_TRNS`.
- `~` and `KC_TRANSPARENT` are legacy/import spellings only and normalize to `KC_TRNS`.
- Historical plan/log entries can keep their old wording as historical record; current code, current plans, and new log entries should not present `~` as the product contract.

# Implementation Steps

1. [x] Update keymap normalization so stored, selected, cloned, reconciled, and exported key values canonicalize transparent to `KC_TRNS`.
2. [x] Update action display and simple composer logic so transparent actions generate and show `KC_TRNS` instead of `~`.
3. [x] Remove the `~` transparent icon from current editor controls.
4. [x] Validate build and generated JSON/export previews do not emit `"~"` for transparent keys.
5. [x] Record validation and checkpoint the cleanup.

# Learning Log

- The app still had several TSV-era transparent assumptions after the JSON/export shift: the keymap constant, composer help, parser output, action display, and key menu icon.
- Dances and extra-key aliases are also part of layout JSON, so their values need legacy transparent normalization too.

# Work Log

- [x] 2026-06-21 23:49 - Created the transparent mapping cleanup plan and captured the canonical `KC_TRNS` decision before edits.
- [x] 2026-06-21 23:57 - Implemented `KC_TRNS` normalization for keymap values, composer output, action display, dances, aliases, and the transparent key action icon.
- [x] 2026-06-22 00:06 - Validated build plus Export JSON: output is parseable, contains `KC_TRNS`, and contains no `~`.

# Unfinished Work

N/A
