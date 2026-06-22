---
date: 2026-06-21
status: complete
subject: empty-project-and-layout-states
---

# Goal

Make empty project states first-class: new projects should start without a KLE model, projects should be able to have zero layouts, and Ergodox should not be the hidden fallback keyboard for generic projects.

# Context

The current app model assumes every project has a `KeyboardModel` and at least one layout. Creating a project silently installs the built-in Ergodox model and a default layout, which makes Ergodox special and obscures the intended user flow: create project, upload KLE, then create or import layouts.

# Product Integration

- Existing product model: qmk-viz is a browser-local keymap project editor with project, model, layout, editor, and export surfaces.
- New requirement's real intent: a project is a container first; keyboard model and layouts are user-provided assets, not mandatory hidden defaults.
- Cleanest integrated model: allow `SavedKeyboardProject.model` to be `null`, allow `layouts` to be empty, and render missing-model/missing-layout setup states instead of faking data.
- Existing pieces that should move, change, or disappear: new-project creation should not reference Ergodox, layout deletion should not protect the final layout, and legacy normalization should not silently replace missing models with Ergodox.
- Architecture impact: nullable active model/layout guards through app model helpers, editor actions, project model controls, and export actions.
- Why this is better than a local patch: it makes the data model match the real project hierarchy and prevents hidden keyboard/layout state from leaking into new projects.

# Decisions

- Keep the built-in Ergodox project as optional starter/fallback data for a brand-new install, but do not use Ergodox to populate newly created projects or malformed imported projects.
- Disable layout creation/import until a KLE model exists because layout reconciliation needs slot IDs.
- Allow deleting the final layout; the Editor page then becomes a setup state prompting layout creation/import.
- Project JSON export may represent `model: null` and `layouts: []`.
- Starter projects live as normal `qmk-viz-project` JSON files under `default-projects/`; fresh installs seed from those files, but `Create Project` still creates an empty project shell.
- Ergodox is no longer a starter default. The starter set should cover common keyboard shapes without making any one keyboard special.
- Keyboard bounds are computed from transformed key corners. The model keeps 100px left/right padding for visual breathing room, but top/bottom padding is only 10px.
- Deleting the final project is allowed; because the app requires an active workspace, it deletes the selected project and opens a fresh empty shell with undo history preserved.

# Implementation Steps

1. [x] Make project model nullable in `appModel`.
2. [x] Stop `createKeyboardProject` from auto-creating layouts.
3. [x] Add an empty project factory for new projects.
4. [x] Allow active layout lookup to return `null`.
5. [x] Guard editor/export functions when model or layout is missing.
6. [x] Render Projects/Editor/Export empty states.
7. [x] Add starter sample project JSON files.
8. [x] Update keyboard bounding-box padding to 100px left/right and 10px top/bottom.
9. [x] Update `DEVELOPMENT_LOG.md`.
10. [x] Validate build/browser behavior.
11. [x] Checkpoint.
12. [x] Allow deleting the final project by replacing it with a fresh empty shell.

# Learning Log

- A keyboard project can exist before a keyboard model; treating KLE as mandatory made the sample Ergodox model leak into project creation semantics.
- Starter projects are data, not code branches: loading them through `parseProjectFile` keeps sample keyboards out of the app model.
- The keyboard viewer needs separate horizontal and vertical model padding. A single `padding` value forced the requested 100px side gutter to also consume too much vertical space.
- The editor still needs one active project object. A final-project delete should remove the selected project and create a blank shell rather than introducing a zero-project app state across every page.

# Work Log

- [x] 2026-06-21 17:15 - Created this plan after the user clarified new projects should start without KLE, layouts can be deleted entirely, and Ergodox should not be special.
- [x] 2026-06-21 17:37 - Added starter project JSON loading, three sample project files, and separate horizontal/vertical keyboard model padding.
- [x] 2026-06-21 17:41 - Validated build and browser smoke behavior, then prepared this plan for checkpoint.
- [x] 2026-06-21 17:42 - Removed the final-project delete guard and made last deletion open a fresh empty project shell.

# Unfinished Work

N/A
