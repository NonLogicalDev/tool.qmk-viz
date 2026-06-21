---
date: 2026-06-21
status: complete
subject: layout-version-tree-and-safe-deletes
---

# Goal

Add per-layout version trees in qmk-viz, make destructive project/layout operations visually dangerous with confirmation dialogs, and introduce a special project-level read-only Default layout template used to bootstrap future layouts.

# Context

Layouts now have their own page with read-only preview. The next product step is to make Layouts useful as a layout history browser: each explicit save creates a dated version node, any version can be loaded, and saving from an older version creates a fork. Even with undo, deleting projects or layouts should feel dangerous and require confirmation.

The scope expanded before pause:

- Top bar order should be `Projects -> KLE Model -> Layouts -> Editor -> Export`.
- Projects page should render the currently associated KLE model as a visual marker preview and show project/layout/version stats.
- Any normal layout should be savable as the special Default layout for the project.
- Default must be its own read-only bootstrap template, not a tag or marker on an existing normal layout.
- `App.tsx` is too large for safe continued edits and should be split before more UI work.

# Product Integration

- Existing product model: browser-local keyboard projects contain named layouts; each layout has one mutable current document.
- New requirement's real intent: make layout iteration safe and inspectable by preserving dated branches instead of overwriting the only copy, while making "default for future layouts" a reusable project template.
- Cleanest integrated model: each named layout owns a version DAG/tree; the editor edits the current working copy; the Layouts page selects/loads saved versions, saves child versions, and shows a special read-only `Default` layout template that can be replaced from any current layout.
- Existing pieces that should move, change, or disappear: Layouts gains version tree controls and read-only preview; `SavedLayout` gains `versions` and `activeVersionId`; `SavedKeyboardProject` gains a `defaultLayout` document; delete buttons get danger styling and explicit confirmation; large pure helpers move out of `App.tsx`.
- Architecture impact: add a graph library, normalize project/layout/default-template storage, preserve versions and default template in project import/export, reconcile version and default documents when KLE models change, split App into smaller modules, and add guarded delete handlers.
- Why this is better than a local patch: it turns Layouts into a real review/history/template surface, keeps Default separate from editable layout identity, and reduces the risk of future edits by shrinking `App.tsx`.

# Decisions

- Use `@xyflow/react` to render the version tree.
- Keep the current working layout document separate from saved versions.
- A `Save Version` action creates a new child version from the current working document with `parentId` equal to the active base version.
- Loading a version replaces the current working document and sets that version as the active base, so later saves fork from it.
- Version nodes carry `createdAt` timestamps and compact labels.
- Project and layout delete buttons require `window.confirm(...)` and use danger styling.
- The project-level Default layout is a separate read-only template document used only to bootstrap new normal layouts.
- Saving a normal layout as Default replaces the project default template; it does not mark or mutate that normal layout's identity.
- `App.tsx` should be split along pure boundaries first: app model/import/export helpers, action/keycode constants, keycap preview/rendering, version graph rendering, and only then page components.

# Implementation Steps

1. [x] Install `@xyflow/react`.
2. [x] Add initial layout version types, clone helpers, normalize helpers, save-version action, and load-version action in `App.tsx`.
3. [x] Add initial confirmation dialogs for project/layout deletion and attach `danger-button` classes.
4. [x] Install the first split target as `qmk-viz/src/lib/appModel.ts`.
5. [x] Finish the `App.tsx` split by importing from `src/lib/appModel.ts` and deleting duplicate local helper/type definitions.
6. [x] Move QMK action/keycode constants and event-to-keycode helpers out of `App.tsx`.
7. [x] Move `PreviewKeycap` and reusable keyboard key rendering helpers out of `App.tsx`.
8. [x] Move React Flow version graph construction/rendering out of `App.tsx`.
9. [x] Add project-level `defaultLayout` state fully through create/load/normalize/import/export/KLE-reconcile flows.
10. [x] Make `New Layout` copy from the read-only project Default layout template.
11. [x] Add a Layouts-page action to save the current normal layout as the project Default template.
12. [x] Render the special read-only Default layout separately from normal layouts.
13. [x] Render the layout version tree in Layouts with React Flow.
14. [x] Add CSS danger styling for destructive buttons.
15. [x] Add Projects-page keyboard marker preview and project/layout/version stats.
16. [x] Update `DEVELOPMENT_LOG.md`.
17. [x] Validate with `just viz-build` and in-app browser checks.
18. [x] Checkpoint the completed pass.

# Learning Log

- Layout history should live with named layouts, not with keyboard models. KLE model updates need to reconcile every saved version by slot ID.
- Undo is session-local and immediate; confirmation still matters for destructive project/layout removal because those actions remove larger containers.
- Default layout should not be modeled as a tag, property, or selected version of a normal layout. It is a project-level read-only bootstrap document.
- The current `App.tsx` size is now a real delivery risk. Further feature work should start by finishing the helper split, not by adding more JSX or state handlers to the same file.
- The first extraction boundary is stable: project/layout/default-template model helpers now live in `qmk-viz/src/lib/appModel.ts`, and `App.tsx` imports them instead of duplicating that logic.
- `qmk-viz/src/lib/qmkActions.ts`, `qmk-viz/src/components/PreviewKeycap.tsx`, and `qmk-viz/src/components/LayoutVersionTree.tsx` now own the second extraction boundary.
- The Projects page should render the keyboard model visually with marker IDs, not raw KLE JSON. Raw KLE remains available through the download action.
- The Default template is copied by value into new layouts; it is not selected, tagged, or renamed from a normal layout.
- Full project re-import should preserve the Default template timestamp as well as the template document, so the read-only Default metadata round-trips cleanly.

# Work Log

- [x] 2026-06-21 02:31 - Created plan after adding the graph dependency and before changing the layout data model.
- [x] 2026-06-21 02:43 - Paused implementation at the user's request and recorded the expanded scope, WIP files, and unfinished work.
- [x] 2026-06-21 02:50 - Reconciled `App.tsx` with `src/lib/appModel.ts`; `just viz-build` passes again.
- [x] 2026-06-21 12:12 - Extracted QMK action helpers, preview keycap rendering, and version tree rendering; `just viz-build` passes.
- [x] 2026-06-21 12:24 - Added project Default template flows, Projects marker preview/stats, danger styling, and browser/build validation.
- [x] 2026-06-21 12:27 - Preserved Default template `updatedAt` on full project re-import, updated the development log, reran `just viz-build`, and ran `git diff --check`.

# Closeout State

Last clean checkpoint before this plan: `d002e03 2026-06-21T09:30:00Z :: checkpoint :: qmk-viz layers stay in editor`.

Checkpoint sequence for this plan:

- `937e612 2026-06-21T09:51:15Z :: checkpoint :: qmk-viz WIP builds after appModel split`
- `d0710ee 2026-06-21T19:13:30Z :: checkpoint :: qmk-viz extracts helpers and renders version tree`

Resolved implementation state:

- `App.tsx` is reconciled with `src/lib/appModel.ts`.
- QMK action helpers, preview keycap rendering, version tree rendering, and project marker preview rendering now live outside `App.tsx`.
- `just viz-build` passes after the completed pass.

Validation notes:

- `just viz-build` passes after the full pass.
- `git diff --check` passes after the full pass.
- In-app browser confirmed top nav order, editor 76-key rendering, Projects stats, visual marker preview with 76 keys, Layouts Default controls, version tree rendering, Save Version incrementing version nodes, Save Current as Default switching preview to Default, and New Layout increasing layout count.
- Delete confirmation source is explicit through `window.confirm(...)` in both project and layout delete handlers; browser interaction reached the confirm path, but the test tab became unstable before a clean dismissed-state assertion could be captured.

# Unfinished Work

N/A
