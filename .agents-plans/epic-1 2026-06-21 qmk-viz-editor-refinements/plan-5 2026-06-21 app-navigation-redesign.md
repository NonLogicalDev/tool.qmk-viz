---
date: 2026-06-21
status: complete
subject: app-navigation-redesign
---

# Goal

Redesign qmk-viz so project, model, layout, and export administration are not overloaded into the header. The app should feel like a real editor with multiple focused work areas, while keeping the keyboard editing surface prominent.

# Context

The JSON project workflow added necessary controls, but placing project CRUD, KLE upload/download, layout CRUD, undo/redo, and branding in one hero/header created a dense admin slab above the keyboard. The user explicitly called this out as bad UX and asked for more pages instead of easy header compaction.

# Product Integration

- Existing product model: one page with a large hero/header that doubles as branding, global navigation, project admin, model admin, layout admin, and history.
- New requirement's real intent: separate high-frequency editing from low-frequency administration so the app feels deliberate, not like every feature was bolted onto the first available row.
- Cleanest integrated model: a compact topbar/rail owns identity, navigation, current context, and undo/redo. Separate pages own Editor, Projects, KLE Model, Layouts/Layers, and Export.
- Existing pieces that should move, change, or disappear: project controls move to Projects; KLE upload/download moves to Model; layout CRUD and layer CRUD move to Layouts; export textarea/downloads move to Export; the editor page keeps only layer tabs, keyboard, selected-key inspector, and action composer.
- Architecture impact: add app-page state and conditional page rendering, preserve existing editor state/actions, and restyle the shell around page-level cards instead of a monolithic hero.
- Why this is better than a local patch: it changes the information architecture so future features have an obvious home and the keyboard remains the main task surface.

# Decisions

- Use in-app pages rather than URL routing for this pass; localStorage state and GitHub Pages hosting stay simple.
- Keep existing `data-testid` attributes on moved controls where practical so browser checks remain stable.
- Put undo/redo in the topbar because history is global; keep destructive project/layout deletes inside their owning pages.
- Keep layer switching on the Editor page, but move layer creation/renaming/reordering/removal to the Layouts page.
- Export page owns all JSON/KLE/project download buttons and the full JSON textarea.

# Implementation Steps

1. [x] Inspect current hero/header JSX and CSS.
2. [x] Create this navigation redesign plan.
3. [x] Add page state and compact app topbar/nav.
4. [x] Move project CRUD/import/export controls into a Projects page.
5. [x] Move KLE model upload/download into a Model page.
6. [x] Move layout CRUD and layer management into a Layouts page.
7. [x] Move export controls/textarea into an Export page.
8. [x] Restyle the shell so the Editor page starts with the keyboard, not a control slab.
9. [x] Validate with `just viz-build` and in-app browser checks.
10. [x] Update `DEVELOPMENT_LOG.md`.
11. [x] Checkpoint the completed pass.

# Learning Log

- Header compaction is the wrong fix when controls belong to different user jobs. The real problem is information architecture.
- Project/model/layout/export controls are lower-frequency than key editing, so they should live behind navigation instead of occupying the top of every editing session.
- Keeping layer switching on the editor page works because it is part of key editing. Layer creation, renaming, reordering, and deletion belongs on the Layouts page because it is structural admin.
- Context chips are useful in the topbar as navigation shortcuts, but editable fields in the topbar recreate the same overload problem.

# Work Log

- [x] 2026-06-21 02:16 - Created plan for splitting qmk-viz into focused app pages.
- [x] 2026-06-21 02:22 - Implemented the page split, validated build/browser behavior, and updated the development log.

# Unfinished Work

N/A
