---
date: 2026-06-22
status: complete
subject: small-screen-keyboard-and-atreus
---

# Goal

Fix the editor keyboard viewer on very small screens so the keyboard can scroll instead of clipping, add the downloaded Atreus KLE layout as a starter/example project, and clean up starter/default data issues found while validating.

# Context

The editor keyboard scaler works for normal viewport sizes, but the panel and keyboard viewport hide overflow, so very small screens can clip the keyboard with no way to scroll to the hidden area. The user also supplied `~/Downloads/keyboard-layout (5).json` as an Atreus keyboard KLE file to add to `default-projects`. Follow-up validation also surfaced non-standard local alias default data, inconsistent embedded Ergodox documents, and a low-value version graph minimap.

# Product Integration

- Existing product model: KLE is the source of truth for keyboard geometry; starter projects are full qmk-viz project JSON files with one default layout.
- New requirement's real intent: make the editor usable at constrained viewport sizes and broaden starter coverage with Atreus.
- Cleanest integrated model: keep scale-to-fit behavior, but allow the keyboard panel/viewport to scroll when the viewport is too small; add Atreus as another full starter project with KLE marker IDs and a default keymap.
- Existing pieces that should move, change, or disappear: no special Atreus code should be added to runtime; the KLE and layout JSON carry the example.
- Architecture impact: CSS-only viewer behavior fix, one `default-projects/atreus.json` asset, stock QMK key label cleanup, starter JSON normalization, and one version-tree component simplification.
- Why this is better than a local patch: the scroll fix applies to every keyboard model instead of one-off sizing around Atreus or Ergodox.

# Decisions

- Assign Atreus marker IDs as `A00` through `A41` in the KLE key order parsed from the supplied file.
- Preserve Atreus geometry from the supplied KLE and replace visible legends with IDs for qmk-viz compatibility.
- Use the QMK Atreus default layer semantics as `QW`, `RS`, and `LW`; the app strips leading underscores from layer names, so these correspond to QMK's `_QW`, `_RS`, and `_LW`.
- Treat the old local alias prefix as removed greenfield legacy, not as a compatibility prefix. Starter projects and parser labels should use stock QMK `KC_*` names or explicit custom support entries.
- Do not infer identifiers with underscores as layer names; this keeps custom aliases such as `NL_MS_L5` and `ALIAS_*` from being parsed as layer references.
- Keep the Ergodox starter identifiers as `LT/RT/LC/RC`, but ensure `defaultLayout`, `layouts[0].document`, and `versions[0].document` contain identical key mappings.
- Remove the React Flow minimap from the layout version graph because it consumes space without adding useful signal for these small local graphs.
- Do not push these changes to GitHub unless the user explicitly asks.

# Implementation Steps

1. [x] Generate `default-projects/atreus.json` from the downloaded KLE.
2. [x] Make the editor keyboard panel/viewport scroll instead of clipping on very small screens.
3. [x] Remove non-standard local alias defaults and labels.
4. [x] Normalize embedded Ergodox starter layout documents to the same identifier/key mapping.
5. [x] Remove the version graph minimap.
6. [x] Update `DEVELOPMENT_LOG.md`.
7. [x] Validate build and browser behavior at a narrow viewport.
8. [x] Create a local checkpoint only; do not push.

# Learning Log

- `overflow: auto` belongs on both the keyboard panel and stage viewport: the viewer can still scale down normally, but constrained screens get a real scroll path instead of clipped content.
- The Atreus starter stays data-only. Runtime rendering continues to derive geometry from KLE.
- QMK shifted punctuation should be represented with stock names such as `KC_LCBR`, `KC_RCBR`, `KC_LPRN`, `KC_RPRN`, and `KC_DQUO`, not local aliases.
- The Ergodox starter already had unique `LT/RT/LC/RC` identifiers, but its active document and version/default documents disagreed. Full project import/export must keep those documents consistent because the app can read any of them depending on flow.
- Version tree minimap is not useful for current compact layout history graphs; the normal React Flow controls and graph body are enough.

# Work Log

- [x] 2026-06-22 01:20 - Created plan from the small-screen clipping bug and Atreus starter request.
- [x] 2026-06-22 01:31 - Added Atreus starter, small-screen scroll CSS, stock shifted-symbol display labels, and removed non-standard local alias defaults.
- [x] 2026-06-22 01:35 - Normalized Ergodox starter documents and removed the version tree minimap.
- [x] 2026-06-22 01:35 - Validated source search, starter JSON consistency, build, Ergodox browser rendering, minimap removal, and small-screen scroll behavior.
- [x] 2026-06-22 01:35 - Prepared local checkpoint commit; no push requested or performed.

# Unfinished Work

N/A
