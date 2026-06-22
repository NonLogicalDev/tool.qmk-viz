---
date: 2026-06-22
status: complete
subject: composer-preview-well-and-actions
---

# Goal

Rework the Action Composer layout so the graphical key preview and generated expression are grouped together before the final action buttons, with compact section dividers and right-aligned action buttons at the bottom. Also tighten adjacent editor controls discovered during validation.

# Context

The previous pass moved generated output below the composer actions, but the resulting order made actions interrupt the flow. The desired flow is compose fields first, then output preview, then final actions.

# Product Integration

- Existing product model: Action Composer is a compact builder for a QMK expression that can be copied, saved as an alias, or applied to the selected key.
- New requirement's real intent: make the generated output feel like a preview/result well, not an action toolbar, and keep actions consistently final.
- Cleanest integrated model: composer header and mode tabs, editable fields, output preview well with keycap left and expression right, then a bottom action row with right-bunched buttons.
- Existing pieces that should move, change, or disappear: move `.generated` after `.composer-output-preview`; remove the explanatory action span from the button row; make section boundaries visual instead of adding large padding.
- Architecture impact: localized Editor page markup and CSS changes only.
- Why this is better than a local patch: it gives the composer a stable read order: choose behavior, inspect generated result, then act.

# Decisions

- Keep action buttons at the bottom of the composer card.
- Render the graphical key preview before the generated expression in the output well.
- Use compact horizontal section separators instead of new bulky cards.
- Right-align the action buttons as a tight group.
- Show Hyper and Meh modifier-stack definitions directly in the mod-tap modifier dropdown labels.
- Move Layer actions to the far-left of the layer toolbar before the layer name field.
- Clamp action menu and context picker popovers to the viewport rather than relying on hardcoded left/right alignment.
- Rename the final generated action button to `Apply generated`.
- No push to GitHub unless explicitly requested.

# Implementation Steps

1. [x] Restructure `EditorPage` composer markup into compact sections.
2. [x] Put key preview before generated expression in the output well.
3. [x] Move composer action buttons to the bottom and right-align them.
4. [x] Update CSS for section dividers and responsive behavior.
5. [x] Update mod-tap modifier labels and layer toolbar ordering.
6. [x] Update `DEVELOPMENT_LOG.md`.
7. [x] Validate build and in-app browser behavior.
8. [x] Create a local checkpoint commit only.

# Learning Log

- Composer controls read more clearly as full-width rows in the right-side editor panel; auto-fit columns created uneven parameter density.
- Bottom composer actions need to be visually separate from the generated preview so users inspect the result before acting on it.
- Popover alignment needs viewport clamping because editor scroll state can put a trigger near or beyond the visible viewport edge.

# Work Log

- [x] 2026-06-22 02:06 - Created plan for Action Composer preview well and bottom action row reordering.
- [x] 2026-06-22 02:10 - Implemented composer output well ordering, full-width composer parameters, right-bunched bottom actions, explicit Hyper/Meh modifier labels, and left-first Layer actions.
- [x] 2026-06-22 02:18 - Added viewport-clamped popover positioning, removed the Active Layer label, renamed Use generated to Apply generated, and validated build/browser behavior.

# Unfinished Work

N/A
