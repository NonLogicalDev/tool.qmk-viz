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
- Second slice introduces a Zustand app store as the state substrate before deeper extraction. Store state first, behavior later: moving every mutation/action in the same pass would make regressions harder to isolate.
- Keep ephemeral DOM refs and derived `useMemo` values in components for now; move persisted/editor state and React-style setters into the store.

# Implementation Steps

1. [x] Extract top app chrome/header into a component.
2. [x] Extract Project page markup into a page component.
3. [x] Extract Project Browser modal into a component.
4. [x] Build and browser-validate navigation, Project Browser, and Project actions still work.
5. [x] Update `DEVELOPMENT_LOG.md`.
6. [x] Checkpoint.
7. [x] Add Zustand dependency and create a typed app store for app/editor state.
8. [x] Move current `useState` app state from `App.tsx` into the store while preserving existing setter callsites.
9. [x] Extract another page/editor component boundary after the store exists.
10. [x] Build and browser-validate state-bearing flows still work.
11. [x] Update `DEVELOPMENT_LOG.md`.
12. [x] Checkpoint.

# Learning Log

- The first safe extraction boundary was presentational: `AppTopbar`, `ProjectPage`, and `ProjectBrowserModal` can receive existing rendered picker/menu nodes and callbacks without moving persistence or mutation state yet.
- `App.tsx` dropped from 3,639 lines to 3,393 lines in this slice, but the Editor page still owns the largest remaining JSX/state cluster and needs a follow-up extraction.
- In-app browser role lookup did not find the `Project actions` trigger by accessible name, so stable trigger test IDs were added for Project/KLE action menus.
- A stale HMR console error from an intermediate `appPages` state remained in browser logs; a clean reload with a timestamp fence verified no current runtime errors.
- The next migration should avoid coupling state-substrate changes with behavior rewrites. A typed store with React-compatible setter actions lets the app move off `useState` first, then move behavior into domain-specific store actions in smaller slices.
- Zustand now owns app/editor state while `App.tsx` still owns mutation handlers. This is intentional staging: the next pass can move domain actions by area without changing all state callsites at once.
- Shared `ContextPicker` and `ActionMenu` components now read their open/search state from the store. `App.tsx` keeps thin render wrappers to avoid rewriting every menu callsite in the same slice.
- Modal extraction is a useful low-risk follow-up because JSON edit, create-layout, KLE help, and rename modals are presentational wrappers around existing submit handlers.
- Browser validation initially used stale `.keyboard-key` selectors; current keycaps are `.keycap` buttons with `data-testid="key-<slot>"`.
- `App.tsx` dropped from 3,393 lines to 3,106 lines in the Zustand/shared-component slice.

# Work Log

- [x] 2026-06-21 22:44 - Created decomposition plan after user requested systematic App.tsx breakup into pages and logical components.
- [x] 2026-06-21 22:45 - Moved the decomposition plan into its own epic after user clarified this should be separate from editor refinements.
- [x] 2026-06-21 22:59 - Extracted `AppTopbar`, `ProjectPage`, and `ProjectBrowserModal`; kept state orchestration and action menu construction in `App.tsx`.
- [x] 2026-06-21 23:01 - Build passed and in-app browser validation covered top nav, Project page, Project Browser, examples tab, Create Project -> From Example, Project actions, KLE model actions, and clean reload console errors.
- [x] 2026-06-21 23:05 - Prepared checkpoint commit for the first decomposition slice.
- [x] 2026-06-21 22:59 - Added second-slice plan for Zustand-backed state management plus continued component extraction.
- [x] 2026-06-21 23:17 - Added Zustand, migrated app/editor state into `src/stores/appStore.ts`, extracted shared `ActionMenu` and `ContextPicker`, and extracted bottom modal markup into `AppModals`.
- [x] 2026-06-21 23:20 - Build and in-app browser validation passed for top pickers, action menus, Project Browser, rename/KLE/create-layout modals, keycap rendering, and clean reload console errors.
- [x] 2026-06-21 23:24 - Prepared checkpoint commit for the Zustand/shared-component slice.

# Unfinished Work

- [ ] Follow-up: split Editor page and state-heavy editor subcomponents.
- [ ] Follow-up: consider moving shared action/context picker UI into reusable components after Editor boundaries are clearer.
- [ ] Follow-up: move mutation handlers from `App.tsx` into domain store actions by area, starting with project/layout loading and history.
