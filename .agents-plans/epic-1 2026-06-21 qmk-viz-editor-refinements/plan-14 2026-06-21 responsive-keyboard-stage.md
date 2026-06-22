---
date: 2026-06-21
status: complete
subject: responsive-keyboard-stage
---

# Goal

Allow the editor keyboard to grow or shrink automatically based on available screen space, and reduce wasted top/bottom padding in the keyboard viewer area.

# Context

The editor keyboard stage was rendered at the model's fixed pixel unit and the panel provided horizontal scrolling. This preserved KLE geometry, but it did not take advantage of larger screens and left the keyboard area feeling vertically padded.

# Product Integration

- Existing product model: the Editor page is keyboard-first, with layer controls and action composer supporting the full-width keyboard surface.
- New requirement's real intent: the keyboard should feel like the primary object in the editor and adapt to the user's screen instead of staying at one fixed visual size.
- Cleanest integrated model: keep KLE/model coordinates unchanged, wrap the stage in a measured viewport, and apply visual scaling to the stage only.
- Existing pieces that should move, change, or disappear: the keyboard panel should stop owning horizontal scroll directly; the dedicated stage viewport should own scrolling and visual sizing.
- Architecture impact: add a lightweight measured wrapper around the existing keyboard stage and tighten CSS spacing around layer controls.
- Why this is better than a local patch: it preserves geometry and interaction code while making the editor surface responsive.

# Decisions

- Do not change `KeyboardModel.unit` or KLE-derived coordinates.
- Use automatic measured scaling instead of adding user-facing zoom controls.
- Keep a minimum readable scale and allow horizontal scroll below that floor.

# Implementation Steps

1. [x] Add measured keyboard viewport state.
2. [x] Compute a bounded visual scale from viewport width and screen height.
3. [x] Wrap the keyboard stage in a visual-size scaler.
4. [x] Tighten top/bottom padding and move overflow handling to the stage viewport.
5. [x] Validate build/browser behavior.
6. [x] Update `DEVELOPMENT_LOG.md`.
7. [x] Checkpoint.

# Learning Log

- Keyboard responsiveness should be a presentation layer concern; changing the model unit would couple screen behavior to KLE geometry and export semantics.
- The panel should not own keyboard overflow directly; a dedicated keyboard stage viewport can scroll below the minimum scale while the visual stage remains centered.

# Work Log

- [x] 2026-06-21 17:09 - Created this plan after the user asked for the editor keyboard to grow/shrink and use less vertical padding.
- [x] 2026-06-21 17:13 - Added the measured stage viewport, bounded scale calculation, and tighter keyboard panel spacing.

# Unfinished Work

N/A
