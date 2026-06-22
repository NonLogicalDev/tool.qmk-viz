---
date: 2026-06-22
status: complete
subject: version-load-confirmation
---

# Goal

Replace all browser-native confirmation prompts with a compact qmk-viz modal, including the Version Tree load path where loading a version replaces the current working layout edits unless the user saved them as a version first.

# Context

`LayoutVersionTree` delegates clicks to `loadLayoutVersion(versionId)`. That function records app undo history, but it still replaces the active layout document with the selected saved version snapshot. The user wanted a confirmation guard at that destructive boundary, then clarified that confirmations should use custom app modals and apply to every existing confirmation path.

# Decisions

- Put the confirmation request in `loadLayoutVersion(...)`, not in `LayoutVersionTree`, so future version-selection entry points share the same guard.
- Confirm even when clicking the active version, because that can still reset unsaved working edits to the saved version snapshot.
- Keep the prompt explicit: save a version first if the current edits should be kept.
- Replace all `window.confirm(...)` calls with one typed `ConfirmDialog` state plus a reusable `ConfirmationModal`.
- Store IDs/payloads in pending confirmations and re-check current state on confirm so a stale modal does not delete or load the wrong active entity.
- No push unless explicitly requested.

# Implementation Steps

1. [x] Add confirmation before loading a version snapshot.
2. [x] Cancel without calling `recordHistory()` or replacing the document when the user rejects.
3. [x] Replace remaining browser confirmations with custom app modal confirmations.
4. [x] Validate build and browser confirm behavior.
5. [x] Update `DEVELOPMENT_LOG.md`.
6. [x] Create a local checkpoint without pushing.

# Learning Log

- Confirmation belongs at the shared operation boundary, not the graph/menu components, because multiple UI entry points can trigger the same destructive operation.
- `window.confirm(...)` blocks styling and interaction consistency; a typed pending-confirmation state keeps the UX inside qmk-viz.
- Workspace restore parse output is a hydrated `WorkspaceFile`, not the serialized export shape. The pending restore modal stores the parsed workspace so confirm does not need to re-read the file.

# Work Log

- [x] 2026-06-22 03:18 - Created plan for version-load confirmation.
- [x] 2026-06-22 03:15 - Replaced `window.confirm(...)` paths with a reusable app confirmation modal.
- [x] 2026-06-22 03:15 - Validated build and representative modal behavior in the in-app browser.

# Unfinished Work

N/A
