---
date: 2026-06-22
status: complete
subject: composer-alias-keycodes
---

# Goal

Polish the global workspace action trigger and extend the editor action composer so users can copy generated QMK expressions, save generated expressions as named aliases through a modal, rename Extra Keys to Custom Key Aliases, manage custom keycodes that templates can consume, keep `NL_*` identifiers custom, and remove low-signal keyboard selection toasts.

# Context

The editor already supports dances, macros, and generic `extKeys`, but the UI treats all non-macro rows as "extra key aliases" and the generated composer output can only be applied to a key or saved through an inline mini-form. The workspace action trigger also renders unlike the rest of the topbar controls. User follow-up clarified that `NL_MS_L5` and related identifiers are not stock QMK and should not be parsed/labeled as such, and that key/layer selection should not produce incessant toasts.

# Product Integration

- Existing product model: Layout support data is the durable place for reusable QMK-side helpers; Export renders templates against the downloadable layout JSON.
- New requirement's real intent: make generated QMK expressions reusable and make QMK template support data explicit enough to drive enums/custom ranges in user templates.
- Cleanest integrated model: keep layout support data grouped as dances, macros, custom key aliases, and custom keycodes; make composer save-alias a focused modal; expose generated QMK expression copy from the composer action row.
- Existing pieces that should move, change, or disappear: remove the inline `[+ Extra Key]` save row from the composer, rename alias labels, and split generic non-macro `extKeys` display into aliases vs keycodes.
- Architecture impact: reuse the existing `extKeys` persistence array with `kind: "alias" | "macro" | "keycode"` so layout JSON and templates receive the new table without an additional storage path.
- Why this is better than a local patch: it keeps all reusable QMK helper identifiers in one exported layout support surface while giving the composer a simpler, more intentional workflow.

# Decisions

- Use `kind: "keycode"` for custom keycodes in the existing `extKeys` array rather than adding a separate top-level field.
- Save generated composer output as `kind: "alias"` through a modal named "Save Key Alias".
- Keep custom keycodes layout-scoped, because they are consumed by the layout export/template path.
- Do not special-case `NL_*` as stock QMK; render it literally as a custom identifier.
- Keep toasts for save/copy/delete/import errors and outcomes, but not for ordinary key clicks or layer-tab switching.

# Implementation Steps

1. [x] Add modal state and workflow for saving generated composer output as a custom key alias.
2. [x] Add composer copy-to-clipboard action for the generated QMK expression.
3. [x] Rename Extra Keys UI to Custom Key Aliases and split custom keycodes into their own support table.
4. [x] Fix Workspace action trigger layout so icon and text match other topbar controls.
5. [x] Treat `NL_*` identifiers as custom, not stock QMK.
6. [x] Remove low-signal selection toasts.
7. [x] Update `DEVELOPMENT_LOG.md`.
8. [x] Validate build and in-app browser behavior.
9. [x] Checkpoint.

# Learning Log

- The existing `extKeys` array was enough for custom key aliases and custom keycodes; adding grouped `ctx.layout.macros`, `ctx.layout.customKeyAliases`, and `ctx.layout.customKeycodes` to the export object makes templates easier without breaking the raw support list.
- `NL_*` labels should not live in the stock display label map. User/project keycodes need to remain literal unless explicitly named in layout support data.
- Selection state is visible in the keyboard and selected-key panel; toasting every click is redundant.

# Work Log

- [x] 2026-06-22 01:01 - Created plan from the workspace action, composer copy, save-alias modal, and custom-keycode request.
- [x] 2026-06-22 01:17 - Implemented custom key alias modal, generated-expression copy, custom keycode table, grouped template export fields, `NL_*` custom rendering, and quieter selection behavior.
- [x] 2026-06-22 01:17 - Final `npm run build`, `git diff --check`, and in-app browser validation passed; checkpoint prepared.

# Unfinished Work

N/A
