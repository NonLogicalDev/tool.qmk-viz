---
date: 2026-06-22
status: complete
subject: editor-toolbelt-and-composer-simplification
---

# Goal

Move key-to-key operations into a keyboard toolbelt under the editor viewer, add Copy Key and Paste Key actions, simplify the Selected Key card, and move Action Composer expression preview below the action buttons.

# Context

The editor currently puts swap under Selected Key actions even though swap is a keyboard-view operation. The Selected Key card repeats graphical/action previews that also appear in the composer. The composer header is crowded by both follow-state controls and generated-expression preview.

# Product Integration

- Existing product model: the keyboard canvas is the main object-manipulation surface; the right panel edits the selected key's raw/action semantics.
- New requirement's real intent: reduce duplication and put key movement/copy/paste operations where users are looking when manipulating keys.
- Cleanest integrated model: keyboard viewer gets a compact toolbelt for operations involving two keys or key transfer; Selected Key becomes a focused current/raw editor; Composer header keeps only mode and follow-selection state while generated output lives after composer actions.
- Existing pieces that should move, change, or disappear: move Swap Key, Copy Key, Paste Key, Transparent, and No-op into the keyboard toolbelt; remove duplicate selected/composer preview rows; keep only Apply raw near the raw editor.
- Architecture impact: Editor page markup/style changes plus one small clipboard state addition in the workspace hook/store.
- Why this is better than a local patch: key-transfer operations become spatial and discoverable without expanding the already-dense selected-key/composer cards.

# Decisions

- Copy/Paste Key copies the current active-layer mapping only, matching Swap Key's active-layer behavior.
- Copy state is app-local and intentionally simple: copied action string plus source slot/layer label for UI feedback.
- Copy Key transforms into Cancel Copy while copy state is active, mirroring the existing Swap Key to Cancel Swap interaction.
- Active cancel states use solid colors with explicit hover/focus contrast instead of inheriting the generic button hover.
- Transparent and No-op are direct toolbelt operations, not a Selected Key submenu.
- Composer expression preview moves below the generated action buttons as a compact code row.
- No push to GitHub unless explicitly requested.

# Implementation Steps

1. [x] Add copied-key state and handlers.
2. [x] Move Swap Key into a keyboard toolbelt and add Copy Key/Paste Key buttons.
3. [x] Simplify Selected Key card markup.
4. [x] Move Action Composer expression preview below action buttons.
5. [x] Update `DEVELOPMENT_LOG.md`.
6. [x] Validate build and browser behavior.
7. [x] Create a local checkpoint commit only.

# Learning Log

- A copied toolbelt readout duplicated state already visible in the selected card and keycap; the final model uses a `copy` badge on the copied source key, matching the swap-source visual language.
- Keeping Transparent and No-op in a Selected Key menu after moving Swap/Copy/Paste created two action surfaces. Moving all direct key operations to the toolbelt made Selected Key simpler.
- Raw key capture became dead UI once Selected Key was reduced to raw editing, so capture state was narrowed to Simple composer keycode entry.
- Generic button hover rules can break active-state contrast; active cancel states need explicit hover/focus rules.

# Work Log

- [x] 2026-06-22 01:43 - Created plan for editor toolbelt, selected key simplification, and composer preview relocation.
- [x] 2026-06-22 02:02 - Implemented toolbelt copy/paste/swap/transparent/no-op, selected-card cleanup, composer output relocation, and copy keycap badge.
- [x] 2026-06-22 02:04 - Validated `npm run build`, `git diff --check`, copy/cancel, transparent/no-op, selected-card cleanup, composer preview placement, and active cancel button contrast in the in-app browser.
- [x] 2026-06-22 02:04 - Prepared the local checkpoint commit and confirmed no push should happen.

# Unfinished Work

N/A
