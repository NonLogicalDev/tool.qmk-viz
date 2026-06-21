---
date: 2026-06-21
status: complete
subject: composer-sync-and-json-editing
---

# Goal

Make key display terse for modifier chords, let Action Composer optionally follow the selected key without forcing that behavior, replace one-shot Project/Layout JSON paste flows with editable JSON modals that have Save and Close actions, and let users choose stable per-layer colors from a 16-color palette.

# Context

The editor now has two related but distinct concepts: selected-key editing and action composition. The selected key should always show the current key mapping; the composer should usually act as a scratchpad, but users should be able to opt into syncing it from selected-key state when useful. JSON flows also need to move from import-only paste dialogs to inspect/edit/save dialogs for project and layout data. Layer colors are now user-facing editor metadata, not just derived decoration.

# Product Integration

- Existing product model: Projects own keyboard model and layouts; Editor owns active layout/key editing and the action composer.
- New requirement's real intent: prevent hidden composer mutations while still allowing an explicit “follow selected key” workflow, make chord labels human-readable on the keyboard, make project/layout JSON a first-class editable representation rather than a clipboard-only import path, and give layer references stable visual identity.
- Cleanest integrated model: add a composer-local sync toggle, parse selected mappings into Simple/Dance controls only when that toggle is on, keep unknown compositions in Raw mode, use one JSON editor modal for project/layout edit flows, and persist a `layerColors` map with the layout document.
- Existing pieces that should move, change, or disappear: Project/Layout “Paste JSON” actions should become “Edit JSON”; paste-only modal copy should become save/close editing copy; one-shot import handlers should remain for KLE paste/upload but project/layout should save through the JSON editor.
- Architecture impact: add action unparsing helpers, sync toggle state, compact chord formatting, JSON editor modal state with save handlers for project/layout JSON, and `layerColors` state/serialization/reconciliation.
- Why this is better than a local patch: it separates selection from composition while preserving an explicit sync workflow, and it treats JSON as editable state instead of a transient import field.

# Decisions

- Default Action Composer sync to off so selecting keys does not mutate composer drafts unexpectedly.
- When sync is enabled, import recognized mappings into Simple controls and fall back to Raw QMK for unknown complex mappings.
- Sync known tap dances into Dance composer when the selected key references an existing dance entry.
- Render nested modifier wrappers as compact chords like `Gui+Shift+5`.
- Allow primary key labels to wrap up to three lines, but do not arbitrarily break inside words.
- Replace Project/Layout paste buttons with JSON edit buttons that open prefilled JSON and save back into app state.
- Keep KLE paste/update as a paste/import flow because it is model replacement rather than editing the current app-owned JSON object.
- Persist layer colors in layout JSON so versions, downloads, and project backups preserve color choices.
- Use a fixed 16-color palette rather than arbitrary color input to keep the UI compact and consistent.

# Implementation Steps

1. [x] Add terse chord display for nested modifier-wrapper key mappings.
2. [x] Allow key primary labels to wrap cleanly up to three lines.
3. [x] Stop selected-key changes from always mutating Action Composer fields.
4. [x] Add Action Composer “follow selected key” toggle.
5. [x] Unparse selected actions into Simple/Dance composer state when sync is enabled.
6. [x] Replace Project/Layout paste JSON actions with Edit JSON modal flows.
7. [x] Save edited Project/Layout JSON back through existing validation/import helpers.
8. [x] Add persisted per-layer colors and a compact 16-color picker.
9. [x] Update `DEVELOPMENT_LOG.md`.
10. [x] Validate build and browser behavior.
11. [x] Checkpoint.

# Learning Log

- Selection and composition are separate user workflows. Coupling them by default caused hidden state changes and doubled modifier wrappers.
- Modifier wrappers are implementation detail on keys; the visual label should show the user-facing shortcut chord.
- JSON editing needs save/close semantics because the user may want to inspect and tweak current project/layout data, not just paste a replacement blob.
- Layer color is layout metadata because the same keyboard model can have different layer semantics in different layouts.
- Project/Layout JSON editing is replacement of the current object, not import of a new object. File import remains the path for adding new projects/layouts.
- `Follow selected` should be opt-in because users often use the composer as a scratchpad while browsing the keyboard.

# Work Log

- [x] 2026-06-21 15:53 - Created this plan for the current composer sync and JSON editing refinement.
- [x] 2026-06-21 15:54 - Added persisted 16-color layer palette picking to the active scope.
- [x] 2026-06-21 16:04 - Build, source scan, and browser validation passed for chord display, composer sync, JSON edit modals, and layer color persistence.

# Unfinished Work

N/A
