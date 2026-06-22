---
date: 2026-06-21
status: in-progress
subject: export-template-workspace
---

# Goal

Redesign the Export page into a project-owned keymap templating workspace with a Monaco-derived editor, rendered `keymap.c` preview, full layout JSON preview, sticky copy/download actions, and project persistence for the template source.

# Context

The current Export page only shows a read-only layout JSON textarea and a downloads menu. The user wants Export to become the bridge from qmk-viz layout editing to actual QMK source generation: a user-authored `keymap.c` template stored with the keyboard project and rendered against the active layout JSON.

# Product Integration

- Existing product model: Project owns keyboard model and layouts; Layout owns mappings; Export currently exposes passive generated artifacts.
- New requirement's real intent: make qmk-viz produce source files, not just JSON inputs for external scripts.
- Cleanest integrated model: Export owns a project-level `keymap.c` template editor, renders it against the active layout export context, and keeps artifact copy/download actions visible in a sticky bottom bar.
- Existing pieces that should move, change, or disappear: replace the read-only JSON textarea as the main surface; move copy/download actions from the header into a sticky action bar; keep download variants behind a single action menu.
- Architecture impact: extend project persistence with template source, add a browser-side template renderer, add a Monaco-derived editor dependency, add rendered-output tabs, and keep the Export screen in dedicated page/components instead of expanding `App.tsx`.
- Why this is better than a local patch: it turns Export into a coherent workflow: edit template, inspect rendered `keymap.c` or JSON input, copy/download output.

# Decisions

- Store the keymap template on `SavedKeyboardProject`, not `SavedLayout`, so one keyboard project can share a source template across multiple layouts.
- Use a Jinja-like template engine rather than inventing only string interpolation; pass the downloaded Full Layout JSON as `ctx` so the same template can be rendered outside qmk-viz with `{ ctx: layoutJson }`.
- Use a Monaco-derived editor for the template input; keep preview output read-only and dense.
- Keep sticky bottom actions minimal: `Copy Layout JSON`, `Copy Keymap`, and one Downloads menu.
- Download actions should include existing Layout JSON, Layer KLE, and Project KLE, plus rendered Keymap C.
- `App.tsx` should coordinate state and route pages; Export markup belongs under `src/pages` / `src/components`.

# Implementation Steps

1. [x] Add project-persistent `keymapTemplate` support with safe defaults and import/backward compatibility.
2. [x] Add a Jinja-like render path and default QMK keymap template.
3. [x] Extract the Export UI into page/components before adding more markup to `App.tsx`.
4. [x] Add Monaco-derived template editor to Export page.
5. [x] Replace Export page output with preview tabs for rendered keymap and full layout JSON.
6. [x] Add sticky export action bar with copy/download actions.
7. [x] Update `DEVELOPMENT_LOG.md`.
8. [x] Build and browser-validate template rendering, preview switching, copy/download controls, and page extraction.
9. [x] Checkpoint.

# Learning Log

- Export is now extracted, but this is not enough to call the whole app decomposed. `App.tsx` remains too large and should next shed Editor and Project page markup.
- Monaco editor interaction is not a normal textarea for Playwright `fill()`; build/type checks plus DOM validation covered rendering, tab switching, and actions. Manual edit validation should use real browser interaction or a future component-level test.
- Adding Monaco increased the main bundle warning from the existing large-chunk warning to a larger large-chunk warning; code splitting Monaco is a follow-up candidate.
- `npm install` reported 2 audit findings (1 low, 1 moderate). Do not run automatic audit fixes until dependency impact is reviewed.

# Work Log

- [x] 2026-06-21 22:26 - Created Export template workspace plan from the requested keymap.c templating vision.
- [x] 2026-06-21 22:31 - Added user feedback that `App.tsx` must stop growing unbounded; Export work will be extracted into page/components before continuing.
- [x] 2026-06-21 22:36 - Implemented project-persistent keymap templates, Nunjucks rendering, extracted `ExportPage`, Monaco editor, preview tabs, and sticky export actions.
- [x] 2026-06-21 22:40 - Changed template context to `{ ctx: <Full Layout JSON> }` after user clarified the template should receive exactly the JSON users can download, not app-only helper objects.

# Unfinished Work

- [ ] Split the remaining large Editor and Project page markup out of `App.tsx` in a follow-up plan.
