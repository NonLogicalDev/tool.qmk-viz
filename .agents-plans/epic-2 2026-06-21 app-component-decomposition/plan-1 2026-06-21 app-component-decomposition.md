---
date: 2026-06-21
status: in-progress
subject: app-component-decomposition
---

# Goal

Systematically break `App.tsx` into pages and logical components so it stops acting as the entire application.

# Context

`App.tsx` is over 3,600 lines even after the Export page extraction. It still owns header/chrome, Project page markup, Project Browser modal, Editor page markup, state coordination, render helpers, and all action handlers. The user explicitly called out unbounded growth and asked to split it into pages/components. This is architectural cleanup, so it now lives in its own epic rather than the qmk-viz editor-refinements epic.

# Product Integration

- Existing product model: `App.tsx` coordinates the active project/layout state and renders every page.
- New requirement's real intent: establish durable UI ownership boundaries so new features do not keep inflating a single file.
- Cleanest integrated model: `App.tsx` keeps state orchestration, persistence, and cross-page actions; pages/components own markup for chrome, Project, Export, browser modals, and eventually Editor sub-surfaces.
- Existing pieces that should move, change, or disappear: move topbar/chrome, Project page, Project Browser modal, and Editor subpanels into separate modules; avoid creating generic abstractions that only hide prop drilling without improving ownership.
- Architecture impact: add page/component modules and shared UI props/types where needed; keep behavioral state in App for this slice to reduce risk.
- Why this is better than local cleanup: it creates places for future work to land without growing `App.tsx` and lets later refactors move state down deliberately.

# Decisions

- Use a new repo-local epic: `epic-2 2026-06-21 app-component-decomposition`.
- First slice extracts low-risk presentational surfaces: `AppTopbar`, `ProjectPage`, and `ProjectBrowserModal`.
- Keep existing `renderActionMenu` and context picker logic in `App.tsx` for now; pass rendered menu nodes to extracted components to avoid rewriting shared menu behavior mid-refactor.
- Do not extract Editor all at once. Split it after page chrome/project extraction so the next slice can focus on keyboard stage, selected-key editor, composer, support-data, and version tree boundaries.
- Preserve existing test IDs and browser-visible behavior.

# Implementation Steps

1. [x] Extract top app chrome/header into a component.
2. [x] Extract Project page markup into a page component.
3. [x] Extract Project Browser modal into a component.
4. [x] Build and browser-validate navigation, Project Browser, and Project actions still work.
5. [x] Update `DEVELOPMENT_LOG.md`.
6. [x] Checkpoint.

# Learning Log

- The first safe extraction boundary was presentational: `AppTopbar`, `ProjectPage`, and `ProjectBrowserModal` can receive existing rendered picker/menu nodes and callbacks without moving persistence or mutation state yet.
- `App.tsx` dropped from 3,639 lines to 3,393 lines in this slice, but the Editor page still owns the largest remaining JSX/state cluster and needs a follow-up extraction.
- In-app browser role lookup did not find the `Project actions` trigger by accessible name, so stable trigger test IDs were added for Project/KLE action menus.
- A stale HMR console error from an intermediate `appPages` state remained in browser logs; a clean reload with a timestamp fence verified no current runtime errors.

# Work Log

- [x] 2026-06-21 22:44 - Created decomposition plan after user requested systematic App.tsx breakup into pages and logical components.
- [x] 2026-06-21 22:45 - Moved the decomposition plan into its own epic after user clarified this should be separate from editor refinements.
- [x] 2026-06-21 22:59 - Extracted `AppTopbar`, `ProjectPage`, and `ProjectBrowserModal`; kept state orchestration and action menu construction in `App.tsx`.
- [x] 2026-06-21 23:01 - Build passed and in-app browser validation covered top nav, Project page, Project Browser, examples tab, Create Project -> From Example, Project actions, KLE model actions, and clean reload console errors.
- [x] 2026-06-21 23:05 - Prepared checkpoint commit for the first decomposition slice.

# Unfinished Work

- [ ] Follow-up: split Editor page and state-heavy editor subcomponents.
- [ ] Follow-up: consider moving shared action/context picker UI into reusable components after Editor boundaries are clearer.
