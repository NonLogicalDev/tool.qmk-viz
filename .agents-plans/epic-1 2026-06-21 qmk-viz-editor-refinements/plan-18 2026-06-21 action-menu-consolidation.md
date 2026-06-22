---
date: 2026-06-21
status: complete
subject: action-menu-consolidation
---

# Goal

Reduce button clutter by moving secondary, file, and destructive actions into compact action menus while keeping primary creation/apply actions immediately visible.

# Context

The qmk-viz UI has accumulated many adjacent buttons across the Editor, Projects, and Export pages. The previous polish pass unified button visuals, but the interface still reads as rows of similar controls rather than a hierarchy of primary actions and secondary menus.

# Product Integration

- Existing product model: qmk-viz is a dense editor where the keyboard and selected-key panels should dominate the screen.
- New requirement's real intent: reduce visual noise and make action groups easier to scan without hiding the main editing workflow.
- Cleanest integrated model: introduce a reusable local action-menu primitive and use it to group secondary actions by object: layout, layer, key, project, model, export, and version.
- Existing pieces that should move, change, or disappear: repeated wide button rows should collapse into one visible primary action plus a compact menu trigger where possible.
- Architecture impact: local React state for one open menu, small markup changes, and CSS for popover menus; no project/keymap data-model change.
- Why this is better than a local patch: a shared menu primitive keeps all grouped controls visually and behaviorally consistent instead of hand-styling isolated hamburger buttons.

# Decisions

- Keep high-frequency creation/apply actions visible.
- Put destructive actions at the bottom of their menu and keep danger styling.
- Keep file upload labels in menus, but only close the menu after file selection so the file picker is not unmounted prematurely.
- Use accessible menu trigger attributes: `aria-haspopup`, `aria-expanded`, and menu/menuitem roles.

# Implementation Steps

1. [x] Inspect existing button-heavy surfaces.
2. [x] Add reusable action-menu state/render helper.
3. [x] Convert editor layout, layer, key, project, model, export, and version action rows.
4. [x] Add compact menu styling and responsive behavior.
5. [x] Build and validate screenshots.
6. [x] Update `DEVELOPMENT_LOG.md`.
7. [x] Checkpoint.

# Learning Log

- Shared action menus work better than a local hamburger per section because menu close behavior, focus styling, and popover layout stay consistent across pages.
- CSS descendant selectors such as `.page-actions button:first-child` can leak into nested action menus; direct-child selectors are safer when menus render inside existing button groups.
- File upload menu entries should close after `input[type=file]` change, not on label click, so the browser file picker is not unmounted too early.

# Work Log

- [x] 2026-06-21 20:21 - Created action-menu consolidation plan.
- [x] 2026-06-21 20:31 - Added shared action menu helper with outside-click and Escape close handling.
- [x] 2026-06-21 20:34 - Converted layout, layer, selected key, support table rows, version, project, model, and export controls to grouped action menus.
- [x] 2026-06-21 20:36 - Added compact popover menu styling and fixed page-action selector bleed.
- [x] 2026-06-21 20:37 - `git diff --check` passed.
- [x] 2026-06-21 20:37 - `just build` passed; existing Vite chunk-size warning remains.
- [x] 2026-06-21 20:38 - Captured action-menu screenshots for Editor, Projects, and Export states.

# Unfinished Work

N/A
