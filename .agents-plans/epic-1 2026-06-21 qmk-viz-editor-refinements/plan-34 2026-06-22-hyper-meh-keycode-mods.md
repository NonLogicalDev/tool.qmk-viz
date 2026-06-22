---
date: 2026-06-22
status: complete
subject: hyper-meh-keycode-mods
---

# Goal

Add Hyper and Meh to the Simple composer Keycode modifier list, with mutually exclusive behavior and an inline caveat that they clear the ordinary modifier stack.

Also repair the latest editor density regressions noticed during validation: the Selected Key row should render as a compact horizontal strip, and scrolling over the keyboard viewer should scroll the page when the keyboard itself has no vertical scroll to consume.

# Context

Hyper and Meh already exist as mod-tap hold options, but they are also useful as keycode modifier wrappers. They represent fixed modifier chords, so stacking them with Shift/Ctrl/Alt/Gui would be confusing and should be prevented by the UI.

# Decisions

- Generate `HYPR(<keycode>)` and `MEH(<keycode>)` for keycode modifiers.
- Selecting Hyper or Meh clears Shift, Ctrl, Alt, and Gui.
- Selecting any ordinary modifier clears Hyper and Meh.
- Keep the UI caveat compact under the modifier chips.
- Delimit the modifier chip groups visually with pipes, but do not render a literal `Regular Mods` label.
- Let the Selected Key card size to its content instead of stretching inside the editor grid row.
- Let wheel input over the keyboard viewport chain to the page when the keyboard is fully scaled into view.
- No push to GitHub unless explicitly requested.

# Implementation Steps

1. [x] Extend Simple composer modifier config and generated-expression logic.
2. [x] Make modifier checkbox toggles mutually exclusive for Hyper/Meh.
3. [x] Update parser/display support for `HYPR(...)` and `MEH(...)`.
4. [x] Add the UI caveat.
5. [x] Repair Selected Key compact-row rendering.
6. [x] Restore page scroll chaining over the keyboard viewer.
7. [x] Update `DEVELOPMENT_LOG.md`.
8. [x] Validate build and in-app browser behavior.
9. [x] Create a local checkpoint commit only.

# Learning Log

- `HYPR(...)` and `MEH(...)` need to be treated as exclusive keycode modifier wrappers, not mixed with the ordinary Shift/Ctrl/Alt/Gui stack.
- The composer UI should visually delimit ordinary modifiers from Meh/Hyper with pipes, but naming the group `Regular Mods` in the UI is too literal and noisy.
- The Selected Key row was structurally horizontal, but the containing CSS grid stretched the card's auto rows; `align-content: start` on the selected-key card fixes the real layout defect.
- `overscroll-behavior: contain` on the keyboard viewport trapped wheel input over the keyboard. Removing that containment lets the page scroll naturally when the keyboard viewport has no vertical overflow.

# Work Log

- [x] 2026-06-22 02:24 - Created plan for Hyper/Meh keycode modifier support.
- [x] 2026-06-22 02:33 - Implemented exclusive Hyper/Meh keycode modifier support, compact Selected Key row sizing, and keyboard scroll chaining.
- [x] 2026-06-22 02:33 - Validated build plus browser behavior for modifier labels, Selected Key row height, and page scrolling over the keyboard.
- [x] 2026-06-22 02:33 - `git diff --check` and `npm run build` passed before checkpointing.

# Unfinished Work

N/A
