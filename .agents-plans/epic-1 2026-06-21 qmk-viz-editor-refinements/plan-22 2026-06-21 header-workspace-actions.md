---
date: 2026-06-21
status: complete
subject: header-workspace-actions
---

# Goal

Move workspace-level actions out of the Project page and into a compact global action menu next to Undo/Redo.

# Context

Backup Workspace and Restore Workspace operate on the whole browser-local app state, not on the active project. Keeping them in the Project page header makes the page feel like an everything drawer and duplicates the broader Project Browser cleanup problem.

# Product Integration

- Existing product model: the header owns global app context and history; the Project page owns active-project details and project-level actions.
- New requirement's real intent: workspace backup/restore should be available globally without keeping every global operation visible on the Project page.
- Cleanest integrated model: add a header Workspace menu next to Undo/Redo and move Backup/Restore there.
- Existing pieces that should move, change, or disappear: remove Backup Workspace and Restore Workspace from Project page actions; keep Create Project there until the dedicated Project Browser lands.
- Architecture impact: reuse existing `renderActionMenu()` and file-import handling; no new state model required.
- Why this is better than a local patch: it aligns operation scope with UI location and reduces Project page visual clutter.

# Decisions

- Workspace menu lives in the same header utility group as Undo/Redo.
- Workspace menu contains Backup Workspace and Restore Workspace.
- Restore Workspace remains a file input and keeps the confirmation/replace-all behavior.
- Project page keeps Create Project for now; broader project browsing/actions move in a later Project Browser pass.

# Implementation Steps

1. [x] Add Workspace menu to the header utility group.
2. [x] Move Backup/Restore controls into the menu.
3. [x] Remove workspace-level controls from Project page actions.
4. [x] Adjust header/action menu styling if needed.
5. [x] Update `DEVELOPMENT_LOG.md`.
6. [x] Build and browser-validate the menu.
7. [x] Checkpoint.

# Learning Log

- Header history styling originally targeted every descendant button, which would have shrunk buttons inside the Workspace popover. Narrowing the selector to direct utility controls preserves normal menu item sizing.
- Workspace backup/restore are app-global local-state utilities, so placing them beside Undo/Redo better reflects their scope than keeping them in Project page actions.

# Work Log

- [x] 2026-06-21 21:58 - Created header-workspace-actions plan after the user identified workspace buttons as global utilities.
- [x] 2026-06-21 22:01 - Moved Backup Workspace and Restore Workspace into a header Workspace menu and removed them from Project page actions.
- [x] 2026-06-21 22:01 - Validated `npm run build` and browser-checked the header menu plus Project page action row.

# Unfinished Work

N/A
