---
date: 2026-06-21
status: complete
subject: keyboard-first-composer
---

# Goal

Make qmk-viz more keyboard-first: the keyboard viewer should take the full page width, key symbols should sit in the center of each key, action type should live at the bottom, long labels should fit dynamically, the action composer should show fields that match the selected action type, the selected/action composer panels should show graphical key previews, undo should be available, and the non-keyboard UI should be dense without feeling flat.

# Context

The current app renders correct KLE geometry and has working key editing, but the page still treats the editor sidebar as equal to the keyboard. The composer also uses the same two fields for every action type, which makes simple actions and layer actions feel confusing.

# Product Integration

- Existing product model: a one-page visual TSV editor where the keyboard is the primary manipulation surface and the panels are supporting controls.
- New requirement's real intent: make the keyboard canvas dominant and make editor controls compact and contextual.
- Cleanest integrated model: full-width keyboard first, compact control panels below, keycap content structured as debug id / centered symbol / bottom action type, and an action composer whose fields change with action semantics.
- Existing pieces that should move, change, or disappear: the right sidebar should become a compact lower panel grid; generic composer field labels should be replaced by action-specific fields.
- Architecture impact: mostly React presentation state and CSS; no TSV parser, layout renderer, or KLE coordinate changes.
- Why this is better than a local patch: it aligns the whole page around the keyboard-editing workflow instead of only shrinking pieces of the old sidebar layout.

# Decisions

- Preserve raw KLE geometry and TSV output.
- Increase keyboard display scale only because the viewer no longer shares horizontal space with the editor.
- Keep manual identifier editing available for exact QMK strings.
- Composer field sets: keycode only for plain and mod-tap actions, layer only for momentary/toggle/tap-toggle, keycode plus layer for layer-tap, and no inputs for transparent.
- Use Pretext measurement to choose the largest fitting font size per key label instead of coarse CSS buckets.
- Keep selected-key editing and action composition as the upper editor dock; make the TSV viewer a full-width bottom utility panel.
- Prefer smaller rectangular controls with restrained radius over large pill buttons.
- Keep raw QMK identifier editing as the power-user escape hatch.
- Model the action composer around Oryx-like behavior slots: tapped, held, double tapped, and tapped-then-held.
- Do not fake full four-slot compilation through the current TSV model. Generate compile-ready raw identifiers only for simple one-cell QMK forms; mark double-tap and tap-hold as requiring future custom QMK/tap-dance generation.
- Add undo as a bounded edit stack of key-cell changes rather than global browser history or a destructive reset.

# Implementation Steps

1. [x] Create a full-width keyboard-first page layout with compact controls outside the keyboard.
2. [x] Rework keycap internals so primary symbols are centered and action type sits at the bottom.
3. [x] Reduce key label sizing and overflow risk for long symbols.
4. [x] Make the action composer render action-specific fields.
5. [x] Add dynamic label fitting using Pretext.
6. [x] Condense the surrounding UI into a compact header, editor dock, and full-width TSV panel.
7. [x] Add graphical mini key previews to raw and generated action panels.
8. [x] Add raw QMK input and undo.
9. [x] Replace the macro dropdown with Oryx-like behavior fields and honest compile-readiness.
10. [x] Add canonical `@DANCES` and `@EXTKEYS` TSV sections.
11. [x] Add layer add/remove/reorder/rename controls.
12. [x] Convert undo/redo to app-wide TSV snapshots.
13. [x] Add raw key capture beside the selected key raw input.
14. [x] Update `DEVELOPMENT_LOG.md`.
15. [x] Validate build, QMK compile, and in-app browser interactions.
16. [x] Checkpoint the completed pass.

# Learning Log

- Prior typography pass showed the app benefits from browser-measured key text sizes rather than CSS-only judgment.
- Fixed font sizes and coarse fit buckets were not enough for the long-tail of QMK identifiers; measuring each label with Pretext gives the intended max-size-then-scale-down behavior.
- TSV output needs horizontal room, so it works better as a full-width lower panel than as a peer column beside the composer.
- Existing TSV format is intentionally low-level: it can hold one raw QMK identifier per key. A true Oryx-like four-behavior key model needs a richer behavior schema plus generated QMK C code.
- Once tap dances are generated, `TAP_DANCE_ENABLE` affects even layouts with no dances because QMK introspection expects `tap_dance_actions` to exist whenever the feature is enabled.
- Raw capture should write only the draft field. Applying remains explicit so accidental key presses do not silently mutate the layout.

# Work Log

- [x] 2026-06-21 00:11 - Created the keyboard-first composer plan from the requested layout and composer refinements.
- [x] 2026-06-21 00:11 - Implemented the page layout, keycap, and composer changes.
- [x] 2026-06-21 00:34 - Added Pretext-based dynamic label fitting and verified there were no key label clips in the browser.
- [x] 2026-06-21 00:47 - Condensed the editor/header UI and moved the TSV viewer to a full-width bottom panel.
- [x] 2026-06-21 00:52 - Validated `just viz-build` and in-app browser interactions.
- [x] 2026-06-21 01:03 - Added raw/generated graphical key previews and undo stack.
- [x] 2026-06-21 01:12 - Replaced macro dropdown with behavior slots and marked advanced slots as future custom-QMK work.
- [x] 2026-06-21 01:34 - Added canonical `@DANCES`/`@EXTKEYS`, layer management, app-wide undo/redo, and raw key capture.
- [x] 2026-06-21 01:40 - Fixed QMK compile failure caused by `TAP_DANCE_ENABLE` with no dances by generating a dummy tap-dance array.
- [x] 2026-06-21 01:43 - Validated `just viz-build`, renderer extras probe, `just build nonlogical-01`, and in-app browser capture/dance/layer undo flows.
- [x] 2026-06-21 01:44 - Checkpoint the safe milestone.

# Unfinished Work

- None for this pass.
