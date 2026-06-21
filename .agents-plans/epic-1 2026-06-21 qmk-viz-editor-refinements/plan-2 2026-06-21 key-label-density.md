---
date: 2026-06-21
status: complete
subject: key-label-density
---

# Goal

Reduce visual noise inside qmk-viz keycaps by shrinking key action labels and representing transparent cells as a quiet state rather than full text.

# Context

The previous polish pass made key ids tiny and moved them to the corner. Primary action labels were still too large for 42px KLE units, and transparent keys rendered as `~` plus `transparent`, which made transparent-heavy layers visually noisy.

# Product Integration

- Existing product model: keyboard-first TSV editor where the physical layout should be scannable before individual action details.
- New requirement's real intent: make keycaps feel like compact physical keyboard labels, not oversized UI cards.
- Cleanest integrated model: key action text is small and dense; transparent keys are represented with a subtle ghost mark and low-contrast styling.
- Architecture impact: CSS plus transparent action display metadata only; no layout, TSV, or geometry changes.
- Why this is better than a local patch: reducing text and transparent-key noise together keeps sparse layers readable.

# Decisions

- Keep debug key ids visible but tiny.
- Keep `~` as the stored/exported transparent identifier.
- Make transparent cells visually quiet in keycaps; the editor still exposes the exact identifier in the selected-key details and TSV output.

# Implementation Steps

1. [x] Shrink primary and secondary keycap typography.
2. [x] Replace visible transparent key text with a subtle visual marker.
3. [x] Update `DEVELOPMENT_LOG.md`.
4. [x] Validate build and in-app browser visual metrics.
5. [x] Prepare the refinement for checkpoint.

# Learning Log

- Browser measurement before this pass: primary key labels were `14.4px`, secondary labels were `9.92px`, and transparent key text rendered as `~transparent`.
- Browser measurement after this pass: primary key labels were `10.368px`, secondary labels were `7.92px`, and the `SYMB` layer showed 43 ghosted transparent keycaps with hidden primary text.

# Work Log

- [x] 2026-06-20 23:34 - Created the key label density plan after measuring the current browser-rendered key typography.
- [x] 2026-06-20 23:34 - Applied typography and transparent-state refinements.
- [x] 2026-06-20 23:45 - Validated `just viz-build` and in-app browser typography/transparent-state metrics.
- [x] 2026-06-20 23:45 - Prepared the refinement for checkpoint.

# Unfinished Work

N/A
