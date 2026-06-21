---
date: 2026-06-21
status: complete
subject: layout-create-and-kle-name
---

# Goal

Make `Create Layout` ask for a layout name before creating it, ensure uploading/updating a KLE model does not rename the keyboard project, add paste-based JSON imports, merge project stats into the active project card, display key dances/macros/extra key aliases in the Editor, and improve complex QMK action rendering/warnings.

# Context

The project model now separates project identity from keyboard model identity. KLE upload should update the model/geometry while preserving the user's project name. Layout creation should also avoid silently creating generic `New Layout` entries; the user should name the layout at creation time.

Follow-up scope:

- Pasted JSON should work anywhere file upload works: KLE model, full project, and layout JSON.
- Active project and project stats should be one compact surface rather than a separate large stats card.
- The Editor should display key dances and extra key aliases so layout-specific support data is visible without switching to Export.
- `LT(<LAYER>, <KC>)` and related layer functions should render with clearer labels and layer-associated color markers.
- Complex `FUNC(args)` mappings should show whether the editor recognizes the composition and where it is likely unsafe.
- Macros should render in their own support-data table rather than being mixed into aliases.
- Mod-tap should be one composer category with the modifier as a parameter, not one category per modifier.
- Simple composer should stay simple: no extra Layer Actions or Modifier Wrapper sections.
- Simple composer dropdown labels should include QMK function names in parentheses, such as `Momentary layer (MO)`, so QMK users can orient quickly.
- Any Simple composer keycode field should include modifier checkboxes for Shift/Ctrl/Alt/Gui plus a Capture button next to the input.
- `LT` and `MT` composer field order should be consistent: keycode first, hold action second.
- Simple composer Capture should split keyboard shortcuts into base keycode plus checked modifiers, e.g. `Cmd+Shift+K` captures `KC_K` with Gui and Shift checked.
- Nested modifier stacks should render readably on keys, e.g. `Cmd + Shift` as the stack and the base key as the primary keycap label.
- Action Composer output should be savable into `extKeys` as a named extra key alias.
- All Layout Support Data tables should support add, edit, and delete for their entries.
- Simple composer should include a Raw action type whose output can be applied to the current key or saved as an extra key.

# Product Integration

- Existing product model: Projects own KLE/model setup; Editor owns active layout management.
- New requirement's real intent: keep user-owned names intentional, make import paths faster than file-pickers when users already have JSON on the clipboard, make project selection/status compact, surface support-code data where key editing happens, make complex mappings understandable before compile time, and make layer/macro workflows first-class.
- Cleanest integrated model: create layout opens a name modal, KLE upload updates only the model and reconciled layout documents, paste imports reuse the same object-level parsers as file upload, active project includes compact project stats, Editor owns inline-editable support tables for dances/macros/aliases, Simple composer stays compact with QMK hints, and action parsing exposes layer metadata plus validation messages used by keycaps and selected-key warnings.
- Existing pieces that should move, change, or disappear: the `Create Layout` button should open a modal instead of directly calling create; `updateActiveKeyboardModel` should stop assigning `importedModel.name` to the project; file-upload parsing should split into parse-object helpers; the standalone project stats card should disappear.
- Architecture impact: add a small create-layout dialog state path, a generic paste-JSON dialog state path, object-level import helpers, compact project stat rows, an inline-editable Editor support-data card, macro/alias filtering, Simple composer parameter state, and richer action metadata for layer dots and validation notes.
- Why this is better than a local patch: it preserves a coherent distinction between imported keyboard metadata and saved project organization, removes duplicated import logic, and makes the Editor the place to understand all layout data, not only per-key mappings.

# Decisions

- Use a dedicated `Create layout` modal instead of overloading the rename dialog.
- Default the modal value to a unique `New Layout` suggestion.
- Keep KLE upload status focused on model update while project name remains unchanged.
- Use one paste JSON modal for project, KLE, and layout JSON; the kind determines which existing parser is used.
- Keep file upload and paste import behavior identical by sharing parsed-object helpers.
- Merge project stats into the active-project card as compact rows that also switch projects.
- Display dances, macros, and extra key aliases as inline-editable Editor tables.
- Assign layer colors in the editor view from layer order so layer-related mappings can share a stable visual marker.
- Keep complex mapping validation conservative: recognized QMK wrappers get an OK note; malformed, unknown, wrong-arity, or nested-unsafe mappings warn.
- Classify macro rows from existing `extKeys` data by `kind` or name instead of adding a new layout schema field in this pass.
- Collapse mod-tap variants into `Mod-tap` plus a modifier selector.
- Keep layer actions in the single action dropdown and surface their QMK names in the labels instead of adding separate shortcut sections.
- Do not expose modifier wrapper composition in Simple composer in this pass; raw input remains available for advanced nested wrappers.
- Treat keycode modifiers as part of the keycode input control, not a separate action category.
- Render keycode input before hold-layer/hold-modifier controls for all Simple composer actions that include a tap key.
- For Simple composer capture, modifier keys pressed with the captured key populate modifier checkboxes; the base captured key remains the keycode input.
- Modifier wrapper preview should flatten nested wrapper functions into a human-readable stack while preserving the raw QMK expression.
- Saving generated actions to extra keys should create/update an `extKeys` row without applying it to the selected keyboard key.
- Support-data editing should happen inline in the tables to keep the interface compact.
- Raw composer input should share the existing generated-action apply/save controls instead of creating another raw-control surface.

# Implementation Steps

1. [x] Add create-layout modal state and submit handler.
2. [x] Route `Create Layout` through the modal.
3. [x] Stop KLE upload from changing project name.
4. [x] Add paste JSON import modal and shared parsed-object import helpers.
5. [x] Add paste buttons for project, KLE model, and layout JSON.
6. [x] Merge project stats into the active project card and remove the standalone stats card.
7. [x] Display key dances, macros, and extra key aliases in the Editor.
8. [x] Collapse mod-tap composer options into one parameterized category.
9. [x] Remove extra Layer Actions and Modifier Wrapper sections from Simple Composer.
10. [x] Add QMK function names to dropdown labels.
11. [x] Add modifier checkboxes and Capture button to every Simple composer keycode field.
12. [x] Align `LT`/`MT` field order as keycode first, hold action second.
13. [x] Make Simple composer Capture populate modifier checkboxes from held shortcut modifiers.
14. [x] Improve `LT(...)` and modifier-stack rendering with layer/modifier metadata and visible layer color dots.
15. [x] Add selected-key warnings/notes for recognized and unsupported complex `FUNC(args)` mappings.
16. [x] Add Action Composer save-to-extra-key flow.
17. [x] Add Raw action type to Simple composer.
18. [x] Add compact add/edit/delete controls to Dances, Macros, and Aliases tables.
19. [x] Update `DEVELOPMENT_LOG.md`.
20. [x] Validate build/browser behavior.
21. [x] Checkpoint.

# Learning Log

- Project name and KLE model name are separate user concepts; imports should not overwrite project organization labels.
- Pasted JSON is not a separate data model; it should enter through the same validation and normalization paths as uploaded files.
- Dances and extra aliases are layout support data, so showing them in Editor is more useful than hiding them in raw JSON export only.
- Layer colors should be derived view metadata, not persisted project data, until users explicitly need named color customization.
- `LT(layer,key)` is a common enough complex mapping to deserve first-class rendering instead of a generic function string.
- Macro support can be display-only initially; editing macro bodies should be a deliberate later composer/data-model pass.
- Mod-tap is a behavior category; the specific modifier belongs in form state, not in the action kind list.
- Advanced nested wrappers remain possible through raw input. Adding a custom wrapper UI made Simple composer too complex for the current product model.
- Modifier checkboxes on the keycode input are a better fit than a wrapper-composer section because they are local to the key being emitted.
- Tap key first, hold action second matches how users reason about `LT(layer,key)` and `MT(mod,key)` even though QMK macro argument order differs.
- Shortcut capture should not flatten into a raw wrapper string in the Simple composer; keeping base key plus checked modifiers preserves editability.
- Modifier stack rendering should be human-facing (`Cmd + Shift`) and not leak raw wrapper names like `LGUI + LSFT` onto the keycap when a friendly name exists.
- Composer-generated extra keys should use `kind: alias` unless a later macro-specific composer creates true macro records.
- Inline support-data editing is preferable to modals for now because these are small structured rows and the editor already has enough modal surfaces.
- Raw composer keeps advanced expressions in the same generated-action pipeline as structured composer actions.

# Work Log

- [x] 2026-06-21 15:01 - Created this plan after the user requested modal layout creation and KLE upload preserving project name.
- [x] 2026-06-21 15:07 - Expanded scope for paste imports, compact project stats, and Editor support-data tables.
- [x] 2026-06-21 15:13 - Expanded scope for better `LT(...)` rendering, layer color markers, and complex mapping validation warnings.
- [x] 2026-06-21 15:15 - Expanded scope for layer-action composer shortcuts and a separate Macro support-data table.
- [x] 2026-06-21 15:20 - Added nested modifier-wrapper composition to the active scope after the user asked for `RGUI(LSFT(KC_9))`.
- [x] 2026-06-21 15:22 - Changed modifier-wrapper composition direction from ordered selects to a checkbox stack.
- [x] 2026-06-21 15:23 - Added mod-tap category consolidation to the active scope.
- [x] 2026-06-21 15:25 - Simplified Simple composer scope: remove extra layer/wrapper sections and keep QMK function hints in dropdown labels.
- [x] 2026-06-21 15:27 - Added reusable Simple composer keycode input requirements: modifier checkboxes plus Capture.
- [x] 2026-06-21 15:28 - Added consistent `LT`/`MT` field ordering requirement: keycode first, hold action second.
- [x] 2026-06-21 15:31 - Added Simple composer shortcut capture requirement for modifiers plus base key.
- [x] 2026-06-21 15:34 - Added keycap display requirement for readable modifier stacks.
- [x] 2026-06-21 15:34 - Added Action Composer save-to-extra-key requirement.
- [x] 2026-06-21 15:36 - Added inline add/edit/delete requirements for Dances, Macros, and Aliases support-data tables.
- [x] 2026-06-21 15:37 - Added Simple composer Raw action requirement.
- [x] 2026-06-21 15:42 - Build and browser validation passed; ready to checkpoint the completed pass.

# Unfinished Work

N/A
