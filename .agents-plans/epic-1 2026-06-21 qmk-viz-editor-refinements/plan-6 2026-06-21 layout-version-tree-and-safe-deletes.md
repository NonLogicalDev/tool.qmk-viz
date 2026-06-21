---
date: 2026-06-21
status: in-progress
subject: layout-version-tree-and-safe-deletes
---

# Goal

Add per-layout version trees in qmk-viz, make destructive project/layout operations visually dangerous with confirmation dialogs, and introduce a special project-level read-only Default layout template used to bootstrap future layouts.

# Context

Layouts now have their own page with read-only preview. The next product step is to make Layouts useful as a layout history browser: each explicit save creates a dated version node, any version can be loaded, and saving from an older version creates a fork. Even with undo, deleting projects or layouts should feel dangerous and require confirmation.

The scope expanded before pause:

- Top bar order should be `Projects -> KLE Model -> Layouts -> Editor -> Export`.
- Projects page should render the currently associated KLE file and show project/layout/version stats.
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
9. [ ] Add project-level `defaultLayout` state fully through create/load/normalize/import/export/KLE-reconcile flows.
10. [ ] Make `New Layout` copy from the read-only project Default layout template.
11. [ ] Add a Layouts-page action to save the current normal layout as the project Default template.
12. [ ] Render the special read-only Default layout separately from normal layouts.
13. [x] Render the layout version tree in Layouts with React Flow.
14. [ ] Add CSS danger styling for destructive buttons.
15. [ ] Add Projects-page KLE source preview and project/layout/version stats.
16. [ ] Update `DEVELOPMENT_LOG.md`.
17. [ ] Validate with `just viz-build` and in-app browser checks.
18. [ ] Checkpoint the completed pass.

# Learning Log

- Layout history should live with named layouts, not with keyboard models. KLE model updates need to reconcile every saved version by slot ID.
- Undo is session-local and immediate; confirmation still matters for destructive project/layout removal because those actions remove larger containers.
- Default layout should not be modeled as a tag, property, or selected version of a normal layout. It is a project-level read-only bootstrap document.
- The current `App.tsx` size is now a real delivery risk. Further feature work should start by finishing the helper split, not by adding more JSX or state handlers to the same file.
- The first extraction boundary is stable: project/layout/default-template model helpers now live in `qmk-viz/src/lib/appModel.ts`, and `App.tsx` imports them instead of duplicating that logic.
- `qmk-viz/src/lib/qmkActions.ts`, `qmk-viz/src/components/PreviewKeycap.tsx`, and `qmk-viz/src/components/LayoutVersionTree.tsx` now own the second extraction boundary.

# Work Log

- [x] 2026-06-21 02:31 - Created plan after adding the graph dependency and before changing the layout data model.
- [x] 2026-06-21 02:43 - Paused implementation at the user's request and recorded the expanded scope, WIP files, and unfinished work.
- [x] 2026-06-21 02:50 - Reconciled `App.tsx` with `src/lib/appModel.ts`; `just viz-build` passes again.
- [x] 2026-06-21 12:12 - Extracted QMK action helpers, preview keycap rendering, and version tree rendering; `just viz-build` passes.

# Paused State

Last clean checkpoint before this WIP: `d002e03 2026-06-21T09:30:00Z :: checkpoint :: qmk-viz layers stay in editor`.

Current uncommitted files:

- `qmk-viz/package.json` and `qmk-viz/package-lock.json`: `@xyflow/react` dependency added.
- `qmk-viz/src/App.tsx`: partially implements versioned layout storage/actions, topbar order, delete confirmation handlers, and a first project `defaultLayout` type addition.
- `qmk-viz/src/lib/appModel.ts`: new extracted app-model helper module created, but `App.tsx` has not yet been rewired to import it.
- `.agents-plans/epic-1 2026-06-21 qmk-viz-editor-refinements/plan-6 2026-06-21 layout-version-tree-and-safe-deletes.md`: this active plan.

Resolved WIP risk:

- `App.tsx` is reconciled with `src/lib/appModel.ts`.
- `just viz-build` passes after the split.

Remaining risk:

- Browser validation has not been run for the version tree, Default template, Projects-page stats, or delete confirmations.

# Unfinished Work

- Finish the `App.tsx` split and get the app compiling again.
- Complete the project-level read-only Default template model and UI.
- Complete version tree UI rendering and fork/save behavior.
- Complete Projects page KLE source preview and stats.
- Complete danger button styling and confirmation-dialog validation.
- Update `DEVELOPMENT_LOG.md` once the implementation shape is stable.
- Run `just viz-build`, browser validation, `git diff --check`, and then checkpoint.
