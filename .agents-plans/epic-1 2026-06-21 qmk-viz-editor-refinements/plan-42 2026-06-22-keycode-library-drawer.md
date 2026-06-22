---
date: 2026-06-22
status: complete
subject: keycode-library-drawer
---

# Goal

Prototype an editor-wide keycode library that complements capture: users can open a standalone drawer, browse keycodes by category, search by human terms like `key a` or `volume`, and copy QMK identifiers.

# Context

The editor already has capture for the Simple composer, but users still need a dependable way to discover QMK keycodes without knowing exact names. This should be useful across the app without becoming another field-specific composer panel.

# Product Integration

- Existing product model: the editor has a visual keyboard, action composer, support-data tables, and export workflow.
- New requirement's real intent: provide a reference/search surface that makes valid QMK identifiers discoverable anywhere in the workflow.
- Cleanest integrated model: mount a global floating drawer from the app shell and keep the keycode catalog in a focused library module.
- Existing pieces that should move, change, or disappear: do not grow the composer or `App.tsx`; reuse copy/toast behavior and existing visual language.
- Architecture impact: add `src/lib/keycodeLibrary.ts` and `src/components/KeycodeLibraryDrawer.tsx`; no persistence or layout model changes.
- Why this is better than a local patch: the feature is broadly useful and searchable without coupling it to any one editor input.

# Decisions

- Ship a curated stock-QMK prototype catalog first: letters, numbers, punctuation, navigation, editing, function keys, modifiers, media, mouse, lock/system, and QMK/system actions.
- Use token search over keycode, label, category, and aliases so human queries like `key a`, `volume`, and `print screen` work.
- Use native-feeling category accordions (`details`/`summary`) as the primary category navigation.
- Keep the category browser visually distinct from the app's custom dropdown/picker pattern.
- Provide Copy per result and keep insertion into composer/key fields for a later pass if the pattern proves useful.
- Keep the drawer compact and fixed at bottom-right so it behaves like contextual help without stealing editor layout space.
- Scope the drawer to the editor page only; Project and Export should not show keycode reference UI.
- Use explicit category toggle buttons instead of native `details` so the full group header row is the hit target and expansion is reliable without a search query.
- Keep group headers visually distinct from result rows, and make the category list the only scroll surface inside the drawer.

# Implementation Steps

1. [x] Add categorized keycode catalog and search helpers.
2. [x] Add global keycode library drawer component with category accordions, search, and copy.
3. [x] Mount the drawer from the app shell.
4. [x] Add compact responsive drawer styles.
5. [x] Update `DEVELOPMENT_LOG.md`.
6. [x] Validate build and browser behavior.
7. [x] Create a local checkpoint.
8. [x] Move the keycode drawer mount from the app shell into the editor page.
9. [x] Replace native category `details` with explicit full-row toggle buttons.
10. [x] Restyle category groups so headers and member rows are visually distinct.
11. [x] Fix drawer overflow so expanded group contents scroll inside the card.
12. [x] Revalidate editor-only availability, no-search expansion, mobile containment, and build.

# Learning Log

- Category accordions are a better fit than the app's searchable dropdowns because this is a browsing/reference surface, not a picker for one field.
- The first prototype catalog has 92 entries. It is intentionally curated and can later be generated from QMK docs or expanded without changing the drawer UI.
- Search is token-based across code, label, description, category, and aliases; this makes `key a` find `KC_A` and `volume` find `KC_VOLU`, `KC_VOLD`, and `KC_MUTE`.
- The drawer should remain read-only/reference oriented for this pass. Applying keycodes directly into focused editor fields is a separate interaction model to design later.
- The native `details` version was too brittle here because expansion state was partly implied by search state. Explicit category buttons make the full header row clickable and keep behavior obvious.
- The category list should be a flex column, not a grid, because expanded result lists need to contribute to scroll height instead of being compressed inside the drawer.

# Work Log

- [x] 2026-06-22 09:21 - Created plan for the global keycode library drawer prototype.
- [x] 2026-06-22 09:22 - Updated UI direction to category accordions, visually distinct from app dropdowns, after user clarification.
- [x] 2026-06-22 09:27 - Added the keycode catalog, drawer component, app mount, and compact responsive styles.
- [x] 2026-06-22 09:27 - Browser-validated open state, category accordions, `key a` search, `volume` search, copy-to-clipboard, and mobile containment.
- [x] 2026-06-22 09:27 - Verified `git diff --check` and `npm run build`.
- [x] 2026-06-22 09:40 - Captured follow-up requirements: editor-only drawer, visually distinct group headers, full-row group toggles, no-search expansion, and contained drawer overflow.
- [x] 2026-06-22 09:49 - Moved the drawer to `EditorPage`, replaced native `details` with explicit category toggle buttons, and made the category list an internal scroll surface.
- [x] 2026-06-22 09:50 - Browser-validated Project has no keycode trigger, Layout has one trigger, no-search groups expand from the header row, search expands matching categories, and forced mobile overflow scrolls internally.
- [x] 2026-06-22 09:50 - Verified `git diff --check` and `npm run build`; captured desktop and mobile screenshots.

# Unfinished Work

N/A
