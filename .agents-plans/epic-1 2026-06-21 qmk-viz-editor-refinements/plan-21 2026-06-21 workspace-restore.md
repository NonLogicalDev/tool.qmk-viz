---
date: 2026-06-21
status: complete
subject: workspace-restore
---

# Goal

Add a Restore Workspace action that imports the full `qmk-viz-workspace` backup JSON produced by Backup Workspace.

# Context

The Project page already has Backup Workspace, which downloads all browser-local user projects plus active project/layout IDs. It only has additive single-project import, so there is no symmetric way to restore the full local app state from that backup.

# Product Integration

- Existing product model: Project page owns user project library operations, with single-project JSON import/export in the Project file menu and full-library backup as a top-level action.
- New requirement's real intent: make full local-state backup useful by providing a matching restore operation.
- Cleanest integrated model: place Restore Workspace beside Backup Workspace as a full-library operation, distinct from Project file import.
- Existing pieces that should move, change, or disappear: keep Project file import additive; add workspace restore as replace-all semantics with confirmation.
- Architecture impact: add workspace backup parsing/normalization in `appModel`, restore project array into app state, and rehydrate the active project/layout when present.
- Why this is better than overloading Import Project: it keeps single-project import and whole-workspace restore visually and behaviorally separate.

# Decisions

- Restore Workspace accepts only `kind: "qmk-viz-workspace"` files.
- Restore replaces all current user projects with the backup projects.
- Restore asks for confirmation before replacing current browser-local state.
- If the backup active project/layout IDs are missing or invalid, restore falls back to the first project and its active/default layout.
- Restoring an empty workspace is valid and leaves the app with no selected project.

# Implementation Steps

1. [x] Add workspace backup type and parser.
2. [x] Add restore handler in `App.tsx`.
3. [x] Add Restore Workspace control beside Backup Workspace.
4. [x] Update `DEVELOPMENT_LOG.md`.
5. [x] Build and browser-validate backup/restore behavior.
6. [x] Checkpoint.

# Learning Log

- Workspace restore should be a full replacement operation because the backup file represents the whole browser-local project library.
- Single-project import remains additive; using it for workspace restore would mix two different mental models.
- The app's file-chooser path is not automatable through the current in-app browser API, so restore validation used TypeScript/build validation plus browser UI validation for the upload control.

# Work Log

- [x] 2026-06-21 21:52 - Created restore-workspace plan after identifying Backup Workspace had no matching restore path.
- [x] 2026-06-21 21:56 - Added workspace backup parsing, restore confirmation, active project/layout fallback, and the Restore Workspace upload control.
- [x] 2026-06-21 21:56 - Validated `npm run build` and the Project page Restore Workspace control in the in-app browser.

# Unfinished Work

N/A
