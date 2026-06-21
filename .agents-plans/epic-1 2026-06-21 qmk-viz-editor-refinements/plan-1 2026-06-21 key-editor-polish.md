---
date: 2026-06-21
status: complete
subject: key-editor-polish
---

# Goal

Polish qmk-viz so the Ergodox editor is easier to use: debug key ids should be tiny and out of the way, keycaps should look closer to square physical keys, layer selection should read as tabs, and the key editor/menu interactions should function reliably.

# Context

The app now renders the keyboard geometry directly from `keyboard-layout.json`. This pass should not reinterpret placement or change firmware layout generation. It is an interface refinement pass over the existing Vite/TypeScript app.

# Product Integration

- Existing product model: one-page keyboard layout editor that renders a physical keyboard, lets the user select a key, and edits a TSV-backed action value per layer.
- New requirement's real intent: make the editor feel more like a purposeful keyboard-layout tool rather than a debug canvas with fragile controls.
- Cleanest integrated model: keep one page, but make the layout view visually quieter and make the editor panel/state transitions explicit.
- Existing pieces that should move, change, or disappear: key ids become debug metadata in the keycap corner; layer buttons become a tab strip; key action controls need real click/state semantics instead of passive-looking buttons.
- Architecture impact: likely local React state and CSS changes only; no TSV compiler or keyboard model changes unless interaction bugs reveal state-shape issues.
- Why this is better than a local patch: treating the keycap, tab strip, and editor as one workflow avoids improving visuals while leaving the actual editing path unreliable.

# Decisions

- Preserve the current qmk-viz data model and raw KLE placement.
- Prefer CSS/state repairs over new dependencies.
- Validate in the in-app browser because visible interaction quality matters here.

# Implementation Steps

1. [x] Inspect current qmk-viz component/state structure and identify why key menu interactions feel unreliable.
2. [x] Restyle keycaps: tiny top-left ids, lower radius, stronger square-key proportions.
3. [x] Restyle layer controls as tabs with a clear selected/hover/focus state.
4. [x] Repair key editor interactions and ensure selecting keys/layers/action presets updates visible state.
5. [x] Update `DEVELOPMENT_LOG.md` with what changed and what did not work.
6. [x] Run build/layout validation and browser interaction checks.
7. [x] Prepare the completed refinement pass for a checkpoint commit.

# Learning Log

- The prior geometry fix established that visual placement should come from KLE JSON, not manual thumb-cluster overrides. This pass should not regress that decision.
- The key editor issue came from ambiguous draft state: `draftAction || currentAction` made the displayed input and the apply path diverge when the draft was empty or stale. The editor now synchronizes the draft explicitly from the selected key/layer cell.
- Browser validation is easier and less brittle with `data-testid` hooks on the editing controls; this does not affect the user-facing UI.

# Work Log

- [x] 2026-06-20 23:19 - Created the qmk-viz key editor polish plan after checkpointing the raw KLE right-thumb fix at `9f97843`.
- [x] 2026-06-20 23:19 - Inspected current qmk-viz interaction code and CSS.
- [x] 2026-06-20 23:26 - Implemented controlled draft-state synchronization, keycap/tab visual polish, and editor status feedback.
- [x] 2026-06-20 23:26 - Validated `just viz-build` and in-app browser key/layer/composer interactions.
- [x] 2026-06-20 23:26 - Prepared the completed refinement pass for a checkpoint commit.

# Unfinished Work

N/A
