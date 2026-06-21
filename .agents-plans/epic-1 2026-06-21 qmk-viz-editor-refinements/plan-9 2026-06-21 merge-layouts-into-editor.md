---
date: 2026-06-21
status: complete
subject: merge-layouts-into-editor
---

# Goal

Merge qmk-viz `Layouts` functionality into `Editor` so layout management and key editing live on one page.

# Context

The separate `Layouts` page now duplicates too much of the Editor mental model. It has layout selection, create/duplicate/import/download, version/default controls, and a read-only keyboard preview. The Editor already owns the real keyboard surface and key/layer editing, so switching between Layouts and Editor adds overhead instead of clarity.

# Product Integration

- Existing product model: Projects owns project/KLE setup, Layouts owns named layout/version management and read-only preview, Editor owns key editing, Export owns structured outputs.
- New requirement's real intent: remove navigation overhead and make "choose/manage the layout I am editing" part of the editing workflow.
- Cleanest integrated model: Projects -> Editor -> Export. Editor owns the active layout, layout file actions, version/default controls, layers, keyboard, and key composer.
- Existing pieces that should move, change, or disappear: move layout page actions and Active layout controls into Editor; keep the version tree in Editor; remove the separate Layouts nav/page and read-only preview because the editable keyboard is the preview.
- Architecture impact: `AppPage` drops `layouts`; context chip reroutes to Editor; obsolete preview-source state and Layouts-only JSX/CSS can be removed.
- Why this is better than a local patch: it collapses two tightly coupled surfaces into one coherent editing workspace instead of preserving a page split whose only job is to manage the thing being edited.

# Decisions

- Remove the `Layouts` nav item entirely.
- Put layout actions in the Editor header/management area using `Create Layout`, `Duplicate Layout`, `Import Layout`, and `Download Layout`.
- Keep layout selection, layout rename, `Save as Default`, and layout delete in an `Active layout` card inside Editor.
- Keep `Save Version` in the version tree card where the history context and version naming field live.
- Keep the version tree in Editor, below the key/composer controls.
- Remove the Layouts read-only preview rather than duplicating the editable keyboard surface.
- Move project and layout renaming into a modal instead of keeping duplicate inline name fields next to selectors.
- Make key swaps first-class in the editor: drag one key onto another to swap mappings, with a button-driven fallback for accessibility.
- Give common actions semantic icon/color treatments so destructive, import/export, save, duplicate, rename, default, transparent, capture, and swap controls stop blending together.

# Implementation Steps

1. [x] Remove `layouts` from `AppPage`, navigation, and layout context routing.
2. [x] Move Layouts page action buttons into the Editor page.
3. [x] Move Active layout controls and version tree into Editor.
4. [x] Delete the separate Layouts page JSX and unused preview-source state/CSS.
5. [x] Replace inline project/layout rename fields with modal rename actions.
6. [x] Add key-swap workflow with drag/drop and selected-key button fallback.
7. [x] Add semantic button icon/color identities.
8. [x] Update `DEVELOPMENT_LOG.md`.
9. [x] Validate with `just viz-build`, `git diff --check`, source scans, and in-app browser checks.
10. [x] Checkpoint the completed pass.

# Learning Log

- The editable keyboard can serve as the layout preview. Keeping a separate read-only preview page adds routing and duplicated UI without a separate job.
- Inline name inputs created duplicate editing states beside selects. A modal makes renaming an explicit operation and keeps the project/editor cards denser.
- Drag/drop is the right primary affordance for key swapping because it maps directly to the user's mental model. The selected-key `Start swap` button remains useful when drag/drop is awkward or unavailable.
- In-app browser coordinate dragging did not prove native HTML5 drag/drop. Keep the visible `Start swap` fallback because it is browser-verified and accessible.
- Button sameness became a usability problem once more actions landed. Semantic color and icons add scanability without increasing button size.

# Work Log

- [x] 2026-06-21 13:48 - Created this plan after deciding the Layouts page should be folded into Editor instead of preserved as a separate page.
- [x] 2026-06-21 14:10 - Moved Layouts controls and version tree into Editor, removed the Layouts route/preview state, and validated the first merge pass in the browser.
- [x] 2026-06-21 14:30 - Added project/layout rename modals and removed duplicated inline name fields.
- [x] 2026-06-21 14:45 - Added key swap state, click fallback, drag/drop handlers, and visual swap-source styling.
- [x] 2026-06-21 14:50 - Added semantic action button icons/colors across Projects and Editor.
- [x] 2026-06-21 14:31 - Final validation passed with `just viz-build`, `git diff --check`, source scans, and in-app browser checks.

# Unfinished Work

N/A
