---
date: 2026-06-21
status: complete
subject: active-project-library-rework
---

# Goal

Rework qmk-viz project handling so an empty user library is valid, starter projects are opt-in examples, active project/layout picking lives in the top bar, and transient feedback is shown as toasts instead of inline page chrome.

Additional scope added during implementation: simple-composer layer actions must use a layer dropdown, layer rename must update layer references, duplicate layer names must be rejected, and the redundant Layer Actions rename item should be removed.

# Context

The app previously seeded starter projects directly into localStorage and assumed `keyboardProjects[0]` existed. The Project page also duplicated active-project selection with a top context chip, a dropdown, and a selectable stats list.

# Product Integration

- Existing product model: qmk-viz is a browser-local keymap workspace with user projects, KLE keyboard models, layouts, editor state, and exports.
- New requirement's real intent: separate the user's saved project library from examples/templates and make project/layout switching global, searchable, and compact.
- Cleanest integrated model: user projects are the only persisted app state; starter examples are read-only import sources; Project page manages library/search/model setup while the top bar owns active project/layout selection.
- Existing pieces that should move, change, or disappear: remove the Project page project dropdown, remove the model top-bar chip/page, stop fallback seeding from `default-projects`, and replace inline status banners with toast notifications.
- Architecture impact: nullable active project guards, example-project loader, workspace backup export, top-bar selects, KLE help modal, and toast status helper.
- Why this is better than a local patch: it makes the hierarchy clear: user library first, examples second, active project/layout always visible, and feedback transient rather than another layout row.

# Decisions

- `loadKeyboardProjects()` should return only saved user projects; no saved value means an empty library.
- `default-projects/` remains bundled, but those files are exposed through an Examples section and copied into the user library only when selected.
- Top navigation keeps page tabs for Projects, Editor, and Export, but the context strip only contains Project and Layout selectors.
- The Project page uses search plus a selectable project list instead of a second active-project dropdown.
- Workspace backup exports all current user projects and active selection state in a separate `qmk-viz-workspace` JSON envelope.
- `setStatusMessage` is kept as the internal status API but now also emits Sonner toasts; inline status rows are removed from page layout.
- The page tabs remain `Project`, `Layout`, and `Export`; only the adjacent active context fields change into Project/Layout pickers, and the model context field is removed.
- Simple composer layer-target actions use the current layout's layer names as dropdown options instead of freeform text.
- Layer names must remain unique; renaming a layer updates `MO`, `TG`, `TT`, `TO`, `DF`, `OSL`, `LT`, and `LM` references in layer mappings, dances, and extra key values.

# Implementation Steps

1. [x] Add toast library dependency.
2. [x] Change project loading so zero saved projects is a valid state.
3. [x] Add example-project loading separate from user project persistence.
4. [x] Make active project/layout state null-safe.
5. [x] Move project/layout selectors into the top bar and remove the Project page dropdown.
6. [x] Add project search, workspace backup, KLE website/help affordances, and KLE instructions modal.
7. [x] Replace inline status UI with temporary toasts.
8. [x] Add composer layer dropdown and safe layer rename/reference rewrite.
9. [x] Update styles for compact top selectors, examples, empty states, and modal content.
10. [x] Update `DEVELOPMENT_LOG.md`.
11. [x] Run build and browser validation.
12. [x] Checkpoint.

# Learning Log

- Starter projects should be importable data, not implicit localStorage content; otherwise users cannot distinguish samples from their own work.
- The active project picker belongs in global chrome because every page depends on the active project/layout.
- Toasts are a better fit than inline status text for transient operations like copy, capture, import, and validation failures.
- The top-bar correction is that navigation remains three pages; the duplicate active-name fields become selectors, and the model field disappears.
- Layer renames are semantic edits because mappings can reference layer names inside QMK actions.
- The in-app browser's read-only evaluate scope did not expose `localStorage`; a fresh dev-server port/origin was enough to validate empty-library behavior.
- Simple composer layer actions should clamp to current layer names rather than preserving a stale fallback like `SYMB` when that layer does not exist.

# Work Log

- [x] 2026-06-21 21:02 - Created the active-project-library rework plan and installed `sonner`.
- [x] 2026-06-21 21:13 - Added new requirements to the active plan: keep Export tab, convert active context names to pickers, use composer layer dropdowns, and make layer renames safe.
- [x] 2026-06-21 21:21 - Implemented zero-project state, example loading, top-bar selectors, project search, workspace backup, KLE help, toast notifications, layer dropdowns, and safe layer rename/reference rewriting.
- [x] 2026-06-21 21:21 - `npm run build` passed with the existing Vite chunk-size warning.
- [x] 2026-06-21 21:21 - In-app browser validation passed for empty state, example loading, top selectors, composer layer dropdown, layer reference rewrite, duplicate layer rename rejection, project search, and KLE help.

# Unfinished Work

N/A
