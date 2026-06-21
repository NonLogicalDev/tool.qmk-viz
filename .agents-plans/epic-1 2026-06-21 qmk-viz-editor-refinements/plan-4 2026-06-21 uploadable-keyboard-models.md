---
date: 2026-06-21
status: complete
subject: uploadable-keyboard-models
---

# Goal

Allow qmk-viz users to create browser-local keyboard projects, upload or later replace the project's Keyboard Layout Editor JSON, manage multiple named layouts under that keyboard project, and export structured JSON keyed by slot ID. Slot IDs should be pulled from the center legend entry of each KLE key.

# Context

qmk-viz currently ships one hardcoded Ergodox Infinity model and one associated TSV layout. The app should keep the built-in model as the default, but the product boundary should become JSON-first: arbitrary KLE JSON model in, keyboard project with named layouts in localStorage, structured keymap JSON out.

# Product Integration

- Existing product model: a one-page visual TSV editor with a built-in Ergodox model and fixed TSV shape.
- New requirement's real intent: let keyboard geometry and editing work survive as named local projects while producing a clean data contract for templating `keymap.c`.
- Cleanest integrated model: a keyboard project contains model JSON and multiple named layouts; each layout contains layer maps keyed by slot ID plus dances/custom keys.
- Existing pieces that should move, change, or disappear: hardcoded model assumptions should move behind reusable KLE-to-model helpers; layout source dropdown should become a layout selector inside the active keyboard project; KLE upload should be an explicit project step and should also support updating the active project's model later.
- Architecture impact: split built-in model construction from upload parsing, add slot extraction from center legend, make initial key maps work for models without bundled layouts, persist project records in localStorage, expose JSON export, preserve the original KLE document for download, and make KLE model replacement undoable.
- Why this is better than a local patch: it turns qmk-viz into a reusable keyboard editor rather than a single-keyboard visualizer and gives firmware generation a simple templating input.

# Decisions

- Preserve the built-in Ergodox Infinity source layout as the default model.
- Uploaded KLE JSON should be browser-local only for now; no persistence or filesystem writes.
- Extract the slot ID from the center legend entry, using KLE legend position 4 when present and falling back to the last non-empty legend line.
- Ignore keys without a usable slot ID so decorative legends and blanks do not become editable matrix positions.
- Generate starter layer maps for uploaded model slots with every physical key set to `~`.
- Store keyboard projects in `localStorage` as versioned JSON so GitHub Pages can host the app without a backend.
- Set Vite's base to a relative path so the built static app works under a GitHub Pages project subpath.
- Hierarchy is `Keyboard Project` > `Named Layout`. Keyboard project names come from KLE JSON metadata; layout names are user-editable.
- For this pass, keyboard project CRUD means create/select/rename/duplicate/delete keyboard projects; layout CRUD means create/select/rename/duplicate/delete layouts inside the active keyboard project.
- Primary app output is structured JSON, not TSV. Existing TSV conversion can remain as a compatibility helper for the current Ergodox QMK path, but should no longer be the main UI output.
- New user flow is `Create Project` > `Upload KLE file` > `Create New or Upload Layout file`.
- Users must always be able to download the canonical KLE file underpinning the active keyboard project.
- Users should also be able to download a KLE-compatible active-layer preview where the original KLE geometry is preserved and the current layer's QMK identifiers appear on key tops.
- Updating the KLE file in an active project must preserve layouts by stable slot ID and must be undoable.
- Uploading a layout file should accept the app's structured JSON layout document for the same project model, keyed by slot ID.
- Users must be able to download and re-import a full project file containing the KLE model plus every named layout.
- Canonical and exported KLE documents should drop `a` alignment properties because they break display on the Keyboard Layout Editor website.

# Implementation Steps

1. [x] Inspect current KLE parser, model construction, and TSV row assumptions.
2. [x] Extract reusable KLE model-building helpers.
3. [x] Add localStorage project storage.
4. [x] Add keyboard project create/select/rename/duplicate/delete UI.
5. [x] Add named layout create/select/rename/duplicate/delete/upload UI inside the active keyboard project.
6. [x] Add uploaded KLE model state, file input UI, and undoable active-project model update.
7. [x] Generate starter layer maps for uploaded models.
8. [x] Add structured JSON export keyed by slot ID, canonical/active-layer KLE downloads, and full project import/export.
9. [x] Add GitHub Pages-safe Vite build config.
10. [x] Keep built-in Ergodox layout behavior unchanged.
11. [x] Update `DEVELOPMENT_LOG.md`.
12. [x] Validate build and in-app browser project/edit/export behavior.
13. [x] Strip KLE `a` alignment properties from the canonical model and qmk-viz KLE clone/export path.
14. [x] Checkpoint the completed pass.

# Learning Log

- KLE center legend maps to the fifth legend slot in keyboard-layout-editor's multi-line label convention, but real files may omit blanks; a fallback to the last non-empty line makes uploads more forgiving.
- GitHub Pages hosting implies all durable state must live in browser storage or user-downloaded files; localStorage is enough for first-pass project persistence.
- JSON export should be slot-ID-first because templating `keymap.c` from rows/columns is a firmware concern, not an editor concern.
- The storage/UI hierarchy should mirror how humans think about keyboards: one keyboard model can have many layouts.
- KLE updates should be slot-stable rather than coordinate-stable: if a slot ID still exists after geometry changes, its action survives; new slots become transparent; removed slots disappear from exported maps.
- The project KLE download is the source model with derived center-slot identifiers embedded. The active-layer KLE download is a convenience preview and should not be treated as the canonical layout storage format.
- The full project file is the durable backup/migration format for this app: it includes the keyboard model's KLE source plus every named layout document.
- KLE `a` alignment properties are not needed for qmk-viz placement math and can make the same JSON display incorrectly on keyboard-layout-editor.com. The app can parse uploaded files with `a`, but stored/exported KLE clones should omit it.
- The in-app browser can validate upload UI presence and project state changes, but file-input automation is unreliable here; upload handlers were compile-validated rather than automated end-to-end.

# Work Log

- [x] 2026-06-21 01:17 - Created plan for uploadable KLE keyboard model support.
- [x] 2026-06-21 01:18 - Expanded scope to static GitHub Pages hosting and localStorage-backed projects.
- [x] 2026-06-21 01:20 - Changed primary export contract from TSV to structured JSON keyed by slot ID.
- [x] 2026-06-21 01:35 - Changed persistence hierarchy to keyboard project greater-than multiple named layouts.
- [x] 2026-06-21 01:38 - Implement keyboard-project-owned layout CRUD and selected-layout JSON export.
- [x] 2026-06-21 01:44 - Added requirements for create-project/upload-KLE/create-or-upload-layout flow, KLE downloads, and undoable KLE updates.
- [x] 2026-06-21 01:47 - Added requirement for downloadable and re-importable full project files containing KLE plus all layouts.
- [x] 2026-06-21 02:04 - Validated build, browser project controls, LT/RT KLE IDs, layout creation undo, and documented the pass.
- [x] 2026-06-21 02:08 - Removed `a` alignment properties from the source KLE and qmk-viz KLE clone/export path.
- [x] 2026-06-21 02:12 - Revalidated qmk-viz build, firmware build, browser app load, KLE ID count, and no remaining KLE `a` fields.

# Unfinished Work

N/A
