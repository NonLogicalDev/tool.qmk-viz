# Development Log

## 2026-06-21: qmk-viz action menu consolidation

Goal: reduce repeated button clutter by keeping primary actions visible and moving secondary/destructive/file actions into compact hamburger-style action menus.

What worked:

- Added a shared action-menu helper with one-open-menu state, outside-click closing, and Escape-key closing.
- Kept primary actions visible:
  - Create Layout
  - Apply raw
  - Create Project
  - Copy JSON
  - Save Version
- Moved secondary actions into grouped menus:
  - Layout actions: duplicate, import, edit JSON, download, rename, save as default, delete
  - Layer actions: rename, add, move left/right, remove
  - Key actions: transparent, no-op, start/cancel swap
  - Support data row actions: edit/delete for dances, macros, and aliases
  - Version actions: rename/delete
  - Project file: import, edit JSON, download
  - Project actions: rename, duplicate, delete
  - KLE model: upload/update, edit JSON, download
  - Export downloads: layout JSON, layer KLE, project KLE
- File upload entries inside menus close after file selection instead of on label click.
- Added compact popover menu styling with full-width left-aligned menu commands.
- Tightened `.page-actions` primary-button selector to direct children so menu entries do not accidentally inherit black primary styling.

What did not work:

- The first screenshot pass showed `.page-actions button:first-child` leaking into nested menu triggers and menu entries. Changing it to `.page-actions > button:first-child` fixed the bleed.
- Table-row action menus may still be constrained by the table scroll container in very dense data sets; current starter-project screenshots do not expose clipping.
- Vite still reports the existing warning that the built JavaScript chunk is larger than 500 kB after minification.

Validation:

- `git diff --check` passed.
- `just build` passed.
- Screenshot capture produced:
  - `/private/tmp/qmk-viz-action-menu-editor-layout.png`
  - `/private/tmp/qmk-viz-action-menu-project-file.png`
  - `/private/tmp/qmk-viz-action-menu-export-downloads.png`

## 2026-06-21: qmk-viz UI validation and polish

Goal: validate that the standalone qmk-viz app runs and make a systematic polish pass over the visible UI controls without changing the data model.

What worked:

- `just build` passed before and after UI polish.
- The Vite dev server ran on `http://127.0.0.1:5181/`.
- Direct HTTP validation confirmed the dev server returned HTTP 200 and served the Vite app shell.
- Source/test-hook audit covered:
  - top navigation, context chips, and undo/redo controls
  - editor layout selector and create/duplicate/import/edit/download/rename/default/delete actions
  - keyboard layer tabs, layer toolbar, color palette, keycaps, selection, and drag-swap affordances
  - selected-key raw editor, capture, transparent/no-op/apply/swap actions
  - Simple and Dance composers
  - support data tables for dances, macros, and aliases
  - version save/rename/delete controls and version tree
  - Projects page create/import/edit/download/select/rename/duplicate/delete and KLE upload/edit/download controls
  - Export page copy/download controls and read-only JSON output
  - JSON edit, create layout, and rename modals
- Added a compact global status strip so Project and Export actions report success/failure outside the Editor side panel.
- Download actions now report the filename that was downloaded.
- Copy JSON now reports clipboard success or failure.
- Export page buttons and Project KLE header button now use the same compact action styles and icons as the rest of the app.
- Disabled file-import labels now stay visually disabled instead of being recolored by the later import action rule.
- Screenshot validation exposed standalone icon buttons outside button rows, so `button[data-icon]` now has a generic compact control baseline.
- Context chips, keycaps, color swatches, JSON output, and JSON validation messages now expose clearer accessibility labels or live-region behavior.
- Section-header buttons now have normalized base, hover, disabled, and focus styling.

What did not work:

- In-app Browser automation could connect to the browser session, but `tab.goto("http://127.0.0.1:5181/")` timed out and reset the control session.
- Retrying with `http://localhost:5181/` also timed out and reset the control session.
- After both navigation attempts, the selected in-app browser tab remained on `about:blank`, even though the local Vite server responded correctly.
- Because of that browser-control failure, this pass used direct server checks, TypeScript/Vite builds, `git diff --check`, and source/test-hook audits instead of completed visual click-through validation.
- Vite still reports the existing warning that the built JavaScript chunk is larger than 500 kB after minification.

Validation:

- `curl -I http://127.0.0.1:5181/` returned HTTP 200.
- `curl -s http://127.0.0.1:5181/` returned the Vite HTML app shell.
- `git diff --check` passed.
- `just build` passed after polish.
- Screenshot capture produced:
  - `/private/tmp/qmk-viz-editor-polish.png`
  - `/private/tmp/qmk-viz-export-polish.png`
  - `/private/tmp/qmk-viz-disabled-import-polish.png`

## 2026-06-21: qmk-viz repository extraction

Goal: split qmk-viz out of the parent keyboard repository into its own local repository while preserving qmk-viz history and moving qmk-viz agent plans with it.

What worked:

- Cloned the parent repository into the new local project path before any history rewrite.
- Ran `git filter-repo` only inside the clone.
- Filtered the new repo down to:
  - qmk-viz app source rewritten to repository root
  - `default-projects/`
  - qmk-viz `.agents-plans/`
  - `DEVELOPMENT_LOG.md`
- Preserved qmk-viz history; `src/App.tsx` has 21 filtered commits.
- Added a root `.gitignore` for `dist/`, `node_modules/`, and local noise.
- Added a root `Justfile` with `dev`, `build`, and `preview`, plus compatibility aliases `viz-dev` and `viz-build`.
- Updated the starter project import glob from the old parent-repo-relative path to the new root-relative path.
- Rewrote qmk-viz plan/log file path references from the old `qmk-viz/src/...` shape to `src/...`.
- Deleted the stale `src/models/ergodoxInfinity.ts` module because it imported KLE JSON from the old parent repo and is no longer used.

What did not work:

- `git-filter-repo` was not on PATH, so it had to be run through Nix.
- The first standalone build failed because TypeScript still compiled the unused Ergodox module with an import that pointed outside the new repo.
- `git-filter-repo` removed the clone's local `origin` remote, which is expected and safer than retaining a remote pointing back at the source repository.

Validation:

- `just build` passed from the new repo root.
- Source repo status remained unchanged except for the pre-existing untracked `kle-library/`.

## 2026-06-21: qmk-viz starter projects and empty project shell

Goal: replace hidden built-in default data with normal starter project JSON files, keep newly created projects empty until the user supplies a KLE model, and reduce keyboard viewer vertical padding while preserving side gutters.

What worked:

- Added `default-projects/` with three normal `qmk-viz-project` JSON starter files:
  - ANSI 60%
  - Corne 42-key Split
  - Planck 4x12
- Fresh browser storage now seeds from those project files through the same `parseProjectFile` path used for imported project backups.
- `Create Project` still creates an empty project shell with `model: null`, zero layouts, and the `No KLE` setup state.
- Existing browser-local projects remain authoritative; starter files are only fallback data when storage is empty or unusable.
- Removed the implicit Ergodox fallback from the generic project lifecycle.
- Keyboard model bounds now keep 100px left/right padding and only 10px top/bottom padding.
- The rotated-key bounding-box calculation remains in place, so split/thumb clusters still get measured by transformed key corners rather than raw KLE coordinates.
- Added disabled styling for label-based file import controls and sized empty-state cards explicitly.
- Project deletion now allows deleting the final project. The deleted project is removed and the app opens a new empty project shell because the editor still needs an active workspace.
- Final-project deletion records undo history before replacing the active workspace.

What did not work:

- Treating a built-in keyboard as fallback data made Ergodox special and leaked sample state into new projects.
- A single `KeyboardModel.padding` value could not satisfy both requirements: wide left/right gutters and compact top/bottom space.
- The existing `localhost` browser origin already had the user's Ergodox project in localStorage, so it correctly masked the starter-project fallback during validation.
- `127.0.0.1:5176` failed because the existing Vite server was bound to `localhost`; a second dev server bound to `127.0.0.1:5177` was used for a clean-origin smoke test.
- Blocking deletion of the final project conflicted with the empty-project model. A literal zero-project app state would require every page to handle no active project, so the pragmatic fix is deleting the requested project and opening a blank shell.
- Browser automation timed out while trying to exercise the final-project confirmation dialog, likely because an open `window.confirm` blocked later reload/evaluate calls. The final-delete path was validated by source inspection and `just viz-build`, not by a completed browser click-through.

Validation:

- `just viz-build` passed.
- In-app browser validation at `http://127.0.0.1:5177/` confirmed:
  - fresh storage seeds `ANSI 60%`, `Corne 42-key Split`, and `Planck 4x12`
  - ANSI 60% renders 61 keycaps and one `Default` layout
  - Projects page shows each starter with one layout and one normalized initial version
  - `Create Project` adds `Untitled Keyboard Project` with `No KLE`, zero layouts, zero versions, zero keys, and disabled KLE download
- Source inspection confirmed the project delete button is no longer disabled for the final project, final delete records history, removes the selected project, and opens a new empty `Untitled Keyboard Project` shell.

## 2026-06-21: qmk-viz KLE edit modal and responsive keyboard stage

Goal: make KLE JSON editable through the same Save/Close modal as Project/Layout JSON, and make the editor keyboard stage automatically grow or shrink with available screen space while reducing wasted vertical padding.

What worked:

- Reused the existing JSON edit modal for KLE by adding `kle` as a `JsonEditKind`.
- `Edit KLE JSON` now opens prefilled with the current serialized KLE model rather than a blank paste field.
- KLE JSON edits validate live through `buildKeyboardModelFromKle`, including duplicate key identifier checks.
- Saving edited KLE JSON goes through the existing keyboard-model update/reconcile path and keeps the project name unchanged.
- Removed the old paste-only KLE modal state, validation path, submit handler, and UI.
- Added a measured keyboard stage viewport in the editor.
- The keyboard model still uses the same KLE-derived coordinates and unit; only the rendered stage is visually scaled.
- The keyboard now scales up to fill wider editor panels, scales down on constrained screens, and keeps horizontal scrolling below the readable minimum.
- Tightened top/bottom padding around layer tabs, the layer toolbar, and the keyboard viewport.

What did not work:

- A blank KLE paste modal was inconsistent with Project/Layout JSON editing and made it impossible to inspect the active KLE before editing.
- Changing `KeyboardModel.unit` would have coupled responsive display behavior to KLE geometry and export semantics, so scaling had to stay in the presentation layer.
- Letting the panel own horizontal overflow made the fixed-size stage feel disconnected from the editor surface; a dedicated stage viewport gives cleaner sizing behavior.

Validation:

- `just viz-build` passed.
- In-app browser validation at `http://localhost:5174/` confirmed:
  - the editor keyboard stage scaled to fill the available panel width
  - key selection still targets the intended key after stage scaling
  - the KLE edit modal opens prefilled with valid KLE JSON
  - duplicate KLE key identifier `DUP` disables Save and shows the duplicate identifier error
  - restoring valid KLE JSON re-enables Save

## 2026-06-21: qmk-viz JSON validation and KLE identifier checks

Goal: prevent invalid Project/Layout/KLE JSON from being saved or applied, and reject KLE models that reuse the same key identifier.

What worked:

- Added live validation for JSON modal contents.
- Project/Layout JSON edit modals now parse and schema-check via the same parsers used by save/import.
- KLE paste/update now validates through the real keyboard model builder before enabling `Update KLE`.
- `Save JSON` and `Update KLE` are disabled until JSON parses and passes the relevant schema/model checks.
- KLE model building now throws on duplicate non-empty key identifiers instead of silently dropping repeated IDs.
- Validation messages appear inline inside the modal, with OK/error styling.

What did not work:

- Submit-time-only validation was too late for an edit modal; users could still press a save button that had no chance of succeeding.
- The old KLE builder used `seen.has(slot)` to skip duplicate identifiers, which hid malformed keyboard models and could make mappings silently target the wrong key.

Validation:

- `just viz-build` passed.
- In-app browser validation at `http://localhost:5174/` confirmed:
  - invalid Layout JSON disables `Save JSON` and shows the parse error
  - pasted KLE JSON with duplicate identifier `DUP` disables `Update KLE`
  - duplicate KLE validation message includes the duplicated identifier

## 2026-06-21: qmk-viz terse chord labels and composer selection isolation

Goal: make modifier-wrapper keys read like user-facing shortcuts, prevent editor-key selection from mutating Action Composer state by default, add an explicit composer sync toggle, replace Project/Layout paste JSON with edit/save JSON modals, and persist layer colors from a fixed palette.

What worked:

- Nested modifier wrappers now render as compact chords on keycaps, e.g. `LGUI(LSFT(KC_5))` displays as `Gui+Shift+5`.
- Redundant extra parentheses around base keycodes are stripped before display, so malformed-looking inputs like `LGUI(LSFT((KC_5)))` still display cleanly.
- Chord labels carry soft break points after `+` and primary key text can wrap to three lines.
- Primary key labels opt out of uppercase inheritance so modifier names preserve `Gui+Shift+5` casing.
- Selecting a keyboard key now updates only the selected-key raw editor. It no longer rehydrates Simple/Dance composer fields from the selected key.
- Added a `Follow selected` toggle in Action Composer. When enabled, selected-key mappings are unparsed into Simple composer controls where possible.
- Known tap dances referenced by `TD(name)` or `DANCE_N` sync into Dance composer if their dance entry exists.
- Unknown or unsupported complex expressions fall back to Raw QMK mode rather than being forced into a lossy structured composer state.
- Replaced Project/Layout paste JSON buttons with Edit JSON modals that open the current JSON, then Save or Close.
- Layout JSON save replaces the active layout document while preserving the layout version tree.
- Project JSON save replaces the active project and keeps undo/redo able to restore a previous project even if the edited JSON changes its ID.
- Added `layerColors` layout metadata and a compact 16-color palette in the layer toolbar.
- Layer tab dots, layer action dots, layout export JSON, and project backup JSON all use persisted layer colors when set.

What did not work:

- One-line fitting with ellipsis hid useful shortcut information and made `LGUI(LSFT(...))` look like a raw implementation detail.
- Allowing arbitrary `overflow-wrap: anywhere` created bad breaks such as orphaned `+5`.
- Coupling selected-key parsing to the composer caused double-wrapped output when clicking a key that already had modifiers while modifier checkboxes were still enabled.
- Treating Project/Layout JSON as one-shot paste/import did not fit the new workflow; users need to inspect and edit the current JSON in place.
- Derived-only layer colors were not enough once color became user-controlled; colors needed to become layout metadata.
- Browser console retained stale hot-reload errors from earlier development iterations, so runtime validation used fresh DOM checks after reload rather than treating old console history as current failure.

Validation:

- `just viz-build` passed.
- `git diff --check` passed.
- Source scan confirmed no stale `Paste Project JSON`, `Paste Layout JSON`, `modifierWrapperActions`, `layerComposerKinds`, or `isCapturingKey` references remain.
- In-app browser validation at `http://localhost:5174/` confirmed:
  - `LGUI(LSFT((KC_5)))` displays on the key as `Gui+Shift+5` with normal casing
  - composer sync off preserves scratch composer state while selecting keys
  - composer sync on imports selected `LGUI(LSFT(KC_5))` as `KC_5` plus Shift and Gui modifiers
  - selecting a layer color updates the active layer tab dot
  - edited layout JSON includes `layerColors` and saves/close cleanly
  - edited project JSON opens as a full `qmk-viz-project` file and saves/close cleanly

## 2026-06-21: qmk-viz paste imports, compact composer, and editable support data

Goal: make import/edit flows faster and denser: paste JSON directly, keep project stats compact, show and edit support data, improve complex action rendering, and let composer output feed either a key or an extra key alias.

What worked:

- Added paste JSON imports for:
  - full qmk-viz project JSON
  - KLE keyboard model JSON
  - layout JSON
- File upload and paste import now share parsed-object helpers, so validation and normalization stay consistent.
- Merged project stats into the Active project card as compact project rows; removed the standalone stats card.
- Added Editor support-data tables for:
  - key dances
  - macros
  - extra key aliases
- Added inline Add/Edit/Delete controls for all support-data tables.
- Added Simple composer `Raw QMK` mode so arbitrary expressions can use the same generated-action pipeline.
- Composer output can now be saved as an extra key alias without applying it to the selected keyboard key.
- Collapsed mod-tap options into one `Mod-tap (MT)` action with a hold-modifier parameter.
- Kept Simple composer compact: no separate layer-action or modifier-wrapper sections.
- Added QMK function hints to dropdown labels: `(MO)`, `(LT)`, `(TG)`, `(TT)`, `(MT)`.
- Keycode inputs in Simple composer now include compact Shift/Ctrl/Alt/Gui modifier checkboxes plus Capture.
- Simple composer Capture now captures shortcuts as base keycode plus modifier checkboxes:
  - `Meta+Shift+K` -> `KC_K` with Gui and Shift checked
  - `Shift+9` -> `KC_9` with Shift checked
- `LT(...)` and other layer actions expose layer metadata for colored key dots.
- Nested modifier wrappers render with readable modifier stacks, e.g. `Cmd + Shift`, while preserving raw QMK output.
- Complex `FUNC(args)` mappings now show parser validation notes for recognized, malformed, unknown, or risky compositions.

What did not work:

- A separate Layer Actions section made Simple composer too busy. QMK function names in the dropdown are enough.
- A dedicated Modifier Wrapper composer also made Simple composer too complex. Raw QMK plus keycode modifier checkboxes covers the immediate need without another section.
- The first shortcut-capture implementation captured the first modifier key (`KC_LGUI`) before the actual key arrived. Simple capture now ignores standalone modifier keydown events and waits for the base key.
- Browser validation of project paste modal cancellation hit multiple visible `Cancel` buttons, so modal presence was validated with targeted DOM checks rather than a generic Cancel click.

Validation:

- `just viz-build` passed.
- `git diff --check` passed.
- Source scan confirmed no stale `composer-section`, modifier-wrapper, or layer-composer controls remain.
- In-app browser validation at `http://localhost:5174/` confirmed:
  - paste layout JSON imports a layout with dances, macros, aliases, and `LT(...)`
  - support-data tables render the imported dance, macro, and alias
  - `LT(...)` renders a layer-color key dot
  - Simple composer has no extra layer/wrapper sections
  - dropdown labels include QMK function names
  - `LT` and `MT` render keycode first and hold action second
  - shortcut Capture populates base keycode plus modifier checkboxes
  - Raw QMK composer can save `RGUI(LSFT(KC_9))` as an extra key alias
  - inline alias edit updates the saved extra key value
  - inline Add/Save works for new dances and macros

## 2026-06-21: qmk-viz layout creation names and KLE project-name preservation

Goal: make layout creation ask for a name, and make KLE upload/update preserve the keyboard project name.

What worked:

- `Create Layout` now opens a `Create layout` modal instead of silently creating `New Layout`.
- The modal suggests a unique `New Layout` name but lets the user replace it before creation.
- Creating from the modal still uses the project Default template as the source document.
- KLE upload/update no longer assigns `importedModel.name` to the project.
- KLE upload/update still replaces the keyboard model and reconciles matching slot IDs.

What did not work:

- Silent `New Layout` creation made layout names cleanup work after the fact. The modal makes naming intentional before the layout exists.
- KLE metadata is not the same concept as the user's project name. Importing a KLE model should not rename the user's project organization label.

Validation:

- `just viz-build` passed.
- `git diff --check` passed.
- Source scan confirmed `Create Layout` opens `openCreateLayoutDialog`, the modal has `create-layout-modal-input`, and no `name: importedModel.name` assignment remains in KLE upload.

## 2026-06-21: qmk-viz version rename and delete boundary

Goal: allow saved versions to be renamed or deleted while keeping the saved keymap document and KLE snapshot immutable.

What worked:

- Added `Selected version name` to the version tree card.
- Added `Rename Version` for the currently selected version.
- Added guarded `Delete Version` for the currently selected version.
- Kept version payload immutability intact:
  - rename changes only `name`
  - delete removes the version record
  - direct children of a deleted version are reconnected to the deleted version's parent
  - saved `document`, `keyboardModel`, and `createdAt` values are not rewritten
- Deleting the selected version falls back to the selected version's parent when available, otherwise the newest remaining version.
- Deleting the only saved version is blocked.

What did not work:

- Leaving children orphaned after deleting a parent made the graph less useful. Delete now collapses the removed vertex by connecting direct children to the deleted version's parent.
- Browser automation did not reliably surface the `window.confirm` dialog metadata for the final destructive click, so confirmation was validated by source scan plus the browser delete flow.

Validation:

- `just viz-build` passed.
- `git diff --check` passed.
- Source scan confirmed `selected-version-name-input`, `rename-version`, `delete-version`, `renameActiveVersion`, `deleteActiveVersion`, and explicit `window.confirm(...)` for version deletion.
- In-app browser validation at `http://localhost:5174/` confirmed:
  - one selected-version name input
  - one rename-version button
  - one delete-version button
  - saving a temporary version increases the version count
  - renaming changes the visible version node name without changing the count
  - deleting removes the renamed version and falls back to `Initial version`
  - source scan confirmed delete rewires direct children to the deleted version's parent
  - undo restored the browser test edits
  - timestamp-filtered console check had no new errors.

## 2026-06-21: qmk-viz named immutable version branches

Goal: make layout versions behave more like Git commits: named snapshots, immutable history, KLE provenance per saved version, and branch lanes instead of a diagonal tree.

What worked:

- Added a `New version name` field directly above the version tree.
- Moved the single `Save Version` action out of the active-layout button row and into the version tree card.
- Saved versions now store:
  - user-visible `name`
  - immutable keymap document snapshot
  - KLE keyboard model snapshot used when the version was created
  - parent version ID and creation timestamp
- KLE model updates now reconcile only the mutable layout working copy. Historical version snapshots keep their own KLE/document pair.
- Hardened the clone path so existing in-memory older version objects without `keyboardModel` normalize instead of throwing.
- Replaced the old depth/row tree layout with branch lanes:
  - first child continues on the same lane
  - forks from the same parent move to separate vertical lanes
  - time/depth advances left-to-right
- Version nodes now show the version name, timestamp, and KLE model name.

What did not work:

- The original React Flow placement was a valid tree, but visually it read as "new versions drift down-right" rather than branch history.
- Treating versions as documents that get reconciled whenever the KLE changes violated the immutability model. Versions now carry the KLE they were created against.
- The first browser pass exposed a hot-reload/session-state edge case where older version objects lacked `keyboardModel`. The clone path now fills that from the current model.

Validation:

- `just viz-build` passed.
- `git diff --check` passed.
- Source scan found no remaining `version.label` or `activeLayoutVersion.label` usage.
- In-app browser validation at `http://localhost:5174/` confirmed:
  - one `version-name-input`
  - one `save-layout-version`
  - no `save-layout-version` remains in the active-layout action row
  - saving a named mainline version renders that name in the tree
  - loading `Initial version` and saving another named version creates a fork
  - sibling fork nodes render in the same time column but different vertical lanes
  - version nodes display `Input Club Ergodox Infinity` as KLE provenance
  - timestamp-filtered console check had no new errors after the hardening fix.

## 2026-06-21: qmk-viz merges Layouts into Editor

Goal: remove the separate Layouts page and make Editor the single place for choosing, managing, versioning, and editing the active layout.

What worked:

- Removed `Layouts` from top-level navigation.
- Routed the layout context chip to `Editor`.
- Added a compact `Active layout` card at the top of Editor with:
  - layout selector and explicit rename action
  - `Create Layout`, `Duplicate Layout`, `Import Layout`, and `Download Layout`
  - `Save as Default` and destructive `Delete Layout`
- Moved the version tree into Editor as a supporting card below the key editor/composer.
- Moved project and layout renaming into a shared modal so selects are no longer paired with duplicate name inputs.
- Added key swapping in Editor:
  - drag one key onto another to swap their mappings on the active layer
  - use `Start swap` from the selected-key panel as a non-drag fallback
  - highlight the active swap source directly on the keyboard
- Added semantic icon/color treatments for create, duplicate, import, export, rename, save, default, move, capture, transparent, no-op, swap, and destructive buttons.
- Removed the old Layouts page JSX.
- Removed the Layouts-only read-only preview state and CSS.
- Updated the top navigation grid from four columns to three columns.

What did not work:

- Keeping Layouts as a separate page created navigation overhead for controls that are really part of editing the current layout.
- The read-only Layouts preview duplicated the editable keyboard surface. Once layout management lives in Editor, the keyboard itself is the preview.
- Preserving the old Layouts-page preview state would have kept dead route-specific complexity, so it was removed rather than hidden.
- Inline `Project name` and `Layout name` fields competed with the project/layout selectors. A rename modal makes name edits deliberate and keeps the page denser.
- The first swap implementation only had a button flow. That worked, but did not match the intended direct-manipulation UX, so drag/drop became the primary path.
- The in-app browser coordinate drag did not trigger a native HTML5 drop event during validation. The keycaps have drag/drop handlers, but the browser-proven path is the `Start swap` fallback.
- Too many compact buttons looked equivalent after merging pages. Icons and semantic colors became necessary to preserve scanability without making controls larger.

Validation:

- `just viz-build` passed.
- `git diff --check` passed.
- Source scan found no stale `layouts` app page route, Layouts nav id, `activePage === "layouts"`, `setActivePage("layouts")`, preview-source state, read-only preview selectors, Layouts-only CSS, or inline project/layout name inputs.
- In-app browser validation at `http://localhost:5176/` confirmed:
  - top navigation is `Projects`, `Editor`, `Export`
  - no `Layouts` navigation item exists
  - Editor is the active page after selecting Editor
  - Editor actions include `Create Layout`, `Duplicate Layout`, `Import Layout`, `Download Layout`, `Rename Layout`, `Save as Default`, and `Delete Layout`
  - exactly one layout selector exists and no inline layout-name input remains
  - project and layout rename modals open from their action buttons
  - keyboard renders 76 keys
  - source scan confirmed keycaps are draggable and wired to drag/drop swap handlers
  - the selected-key `Start swap` fallback marks a swap source and swaps on the next key click
  - action buttons expose semantic icon/color treatments
  - exactly one version tree exists inside Editor
  - no Layouts read-only preview DOM remains
  - the layout context chip routes to Editor
  - browser console has no errors.

## 2026-06-21: qmk-viz Layouts action language cleanup

Goal: make the Layouts page action language consistent, put the active layout controls at the top, and remove the oversized Default layout section.

What worked:

- Changed the Layouts page header actions to `Create Layout`, `Duplicate Layout`, `Import Layout`, and `Download Layout`.
- Moved the duplicate action into the Layouts page header so the core layout actions live together.
- Renamed the first Layouts card to `Active layout`, matching the Projects page `Active project` structure.
- Put `Active layout` first, then the full-width read-only keyboard preview, then supporting version-tree details.
- Replaced the standalone Default layout card with a single `Save as Default` button inside the Active layout card.
- Kept `Save Version` and destructive layout delete inside the Active layout card, because those operate on the selected layout state rather than file import/export.
- Wired `Download Layout` to the existing layout JSON download path.

What did not work:

- The old mix of `New Layout`, card-level `Duplicate`, and `Upload Layout` made related layout actions look like different concepts.
- A standalone Default layout section was too heavy for a bootstrapping action now that the read-only preview tabs already expose the Default layout.

Validation:

- `just viz-build` passed.
- `git diff --check` passed.
- Source scan found no stale visible `New Layout`, `Upload Layout`, `Preview Default`, `Default layout`, `Read-only bootstrap`, `template-updated`, or `formatVersionDate` references.
- In-app browser validation at `http://localhost:5176/` confirmed:
  - Layouts page actions are `Create Layout`, `Duplicate Layout`, `Import Layout`, and `Download Layout`
  - `Duplicate Layout` exists once in the page header and no longer exists in the active-layout card
  - `Download Layout` exists once
  - `Active layout` is the first card
  - the full-width read-only preview renders below `Active layout`
  - the version tree renders below the preview
  - `Save as Default` exists as a single button in the Active layout card
  - the standalone Default section is gone
  - browser console has no errors.

## 2026-06-21: qmk-viz KLE marker label cleanup

Goal: simplify the Ergodox Infinity KLE model so key labels are plain marker IDs such as `LT03` instead of multiline KLE legend strings like `\n\n\n\n\n\nLT03`.

What worked:

- Collapsed all `LT/RT/LC/RC` marker labels in `qmk/keyboards/input_club/ergodox_infinity/keymaps/monster/keyboard-layout.json` to plain identifiers.
- Preserved all KLE geometry and key property objects.
- Verified the file still parses as JSON.
- Verified the file contains 76 marker IDs and zero multiline key strings.

What did not work:

- Keeping IDs in the seventh KLE legend slot made the raw file harder to review and edit by hand. For qmk-viz, the marker ID itself is the useful label.

Validation:

- JSON parse passed.
- Marker scan returned `markers: 76`, `multiline: 0`, `rows: 26`.

## 2026-06-21: qmk-viz project polish and KLE-backed layout export

Goal: clean up qmk-viz project-page controls, make project metadata easier to scan, and make the layout JSON export carry the KLE keyboard model used to produce the layout.

What worked:

- Collapsed project backup into one `Download Project` button beside `Import Project`.
- Removed the duplicate backup card and duplicate `Full Project` action.
- Removed the `Full Project` button from the Export page so project backup has one obvious home.
- Standardized ordinary buttons and file-import labels around compact control variables.
- Stopped first-child buttons in arbitrary rows from becoming primary actions just because of DOM position.
- Restyled project stats as compact stat cards while keeping them clickable for project switching.
- Replaced the low-value keyboard model `Source` fact with `Keys`, keeping `Canvas` and `Author`.
- Added `keyboard.kle` to layout JSON export so the layout file carries the original KLE model.
- Removed the derived `keyboard.keys` array from layout JSON export after adding KLE, avoiding duplicate geometry sources.

What did not work:

- A separate Backup card made the Projects page noisier and duplicated the project download affordance.
- Export-page `Full Project` mixed backup/import concerns into the keymap-template export flow.
- The first shared-button CSS pass still allowed mixed file-label/button rows to stretch a button taller than the baseline. Setting shared control rows to `align-items: center` fixed that.
- Keeping both `keyboard.kle` and `keyboard.keys` in layout JSON would create two geometry sources. KLE is the canonical user-editable keyboard model, so derived placement should be rebuilt from it.

Validation:

- `just viz-build` passed.
- `git diff --check` passed.
- Source scan found no stale `download-full-project`, Backup heading, or project-page `Source` fact.
- In-app browser validation at `http://localhost:5176/` confirmed:
  - Projects page actions are `Create Project`, `Import Project`, `Download Project`
  - exactly one `download-project` control exists
  - no `download-full-project` controls exist on Projects or Export
  - no Backup section text is present on Projects
  - model facts are `Keys`, `Canvas`, and `Author`
  - compact mixed controls measure 30-32px tall with the same 7px radius and font sizing
  - Export JSON parses
  - Export JSON `keyboard` keys are `id`, `name`, `source`, and `kle`
  - Export JSON includes `keyboard.kle`, omits `keyboard.keys`, and preserves three layout layers
  - browser console has no errors

## 2026-06-21: qmk-viz folds KLE model into Projects

Goal: remove the standalone `KLE Model` top-level page, make KLE model management part of project configuration, and keep keyboard editor/viewer surfaces as full-width primary page surfaces.

What worked:

- Removed `KLE Model` from top-level navigation.
- Moved KLE model facts, `Upload/Update KLE`, and `Download KLE` into the Projects page.
- Kept the visual marker preview on Projects as the main way to understand the current keyboard model.
- Kept Export focused on generated outputs; it still offers the Project KLE export beside layout JSON.
- Changed the model context chip to route to Projects, since model ownership now lives there.
- Made the Editor workspace full-width so the keyboard panel owns the page width and selected-key/composer controls sit below it.
- Made the Layouts read-only preview the first full-width row, with named layout, Default, and version controls below it.

What did not work:

- Keeping KLE as a top-level page was too granular. It created a separate navigation concept for what is really project settings.
- The first folded pass had two duplicate KLE download buttons in the Projects model card. Reduced that to one visible `Download KLE` action.
- The Editor page already avoided a side-by-side keyboard split, but the workspace still had a max-width container. Removed that cap for the editor-specific workspace.
- The Layouts page still had the keyboard preview in a right-side grid column. Moved it to a full-width first row so layout controls no longer constrain the preview.

Validation:

- `just viz-build` passed.
- `git diff --check` passed.
- Source scan found no stale `KLE Model`, `activePage === "model"`, `setActivePage("model")`, `id: "model"`, or five-tab nav references.
- In-app browser validation at `http://localhost:5176/` confirmed:
  - top navigation is `Projects`, `Layouts`, `Editor`, `Export`
  - no `KLE Model` nav item exists
  - Projects contains project select, model readout, KLE upload, KLE download, project stats, and a 76-key marker preview
  - Editor keyboard panel and editor controls span the full available workspace width
  - Editor renders 76 keys with horizontal keyboard scrolling inside the full-width panel on narrow viewports
  - Layouts preview spans the full page grid width above the layout/default/version controls at both the default narrow viewport and a 1440px desktop viewport
  - Projects has no horizontal overflow
  - browser console has no errors

## 2026-06-21: qmk-viz key label clipping fix

Goal: stop compact key labels such as `Space` from rendering as ellipsized text like `Spa...`.

What worked:

- Used the in-app browser to measure rendered `.key-primary` and `.key-secondary` labels by `scrollWidth` vs `clientWidth`.
- Found the fit calculation was using the outer key width minus 16px, while CSS left the primary label with about 18px less than the outer key width before browser rounding.
- Made primary label fitting more conservative so compact thumb keys scale down before CSS ellipsis can activate.

What did not work:

- Relying only on Pretext's predicted width was not enough because the rendered DOM box was slightly narrower than the width passed to the fit helper.

Validation:

- `just viz-build` passed.
- `git diff --check` passed.
- In-app browser scan on the Editor page found 76 keycaps and no labels where `scrollWidth > clientWidth`.
- In-app browser scan on the Layouts preview found 76 read-only keycaps and no labels where `scrollWidth > clientWidth`.
- `Space` now renders at `9.75px` on the compact thumb key instead of ellipsizing.

## 2026-06-21: qmk-viz layout history, Default template, and project marker preview

Goal: finish the paused qmk-viz pass by making Layouts a read-only history/template surface, making destructive actions safer, and rendering the Projects page as a keyboard marker preview instead of raw KLE JSON.

What worked:

- Split the remaining non-UI helpers out of `App.tsx`:
  - `src/lib/appModel.ts` owns project/layout/default-template normalization, import/export, version creation, and KLE-model reconciliation.
  - `src/lib/qmkActions.ts` owns simple composer action metadata and key-capture conversion.
  - `src/components/PreviewKeycap.tsx` owns graphical key previews.
  - `src/components/LayoutVersionTree.tsx` owns the React Flow version tree.
- Added a project-level read-only Default layout template:
  - New layouts copy from Default by value.
  - Saving the current layout as Default replaces only the project template.
  - Default remains separate from normal named layouts and is not represented as a tag.
- Added per-layout saved versions:
  - `Save Version` creates a dated child of the currently active version.
  - Loading an older version makes the next save fork from that node.
  - Layouts renders the saved-version graph with `@xyflow/react`.
- Added destructive-action safety:
  - Project and layout delete controls use danger styling.
  - Project and layout delete handlers both require `window.confirm(...)`.
- Reworked the Projects page so it shows:
  - per-project layout/version/key stats
  - a visual keyboard marker preview using the current KLE model
  - a KLE download action instead of displaying raw KLE JSON inline
- Preserved the Default template timestamp when a full project file is re-imported.

What did not work:

- Raw KLE JSON on the Projects page was technically useful but product-wrong. The project page should answer "what keyboard model is this project using?" visually; raw KLE belongs behind download/import/export flows.
- Browser automation reached the delete-confirm path, but the in-app tab became unstable before a clean dismissed-dialog assertion could be captured. The source still has explicit `window.confirm(...)` guards for both destructive handlers.
- `App.tsx` is smaller than before, but it still contains page orchestration and many handlers. Future large qmk-viz work should continue splitting page components instead of adding more JSX to `App.tsx`.

Validation:

- `just viz-build` passed after the helper extraction and version-tree work.
- `just viz-build` passed after the Default-template and Projects marker-preview work.
- In-app browser validation at `http://localhost:5174/` confirmed:
  - top navigation order is `Projects`, `KLE Model`, `Layouts`, `Editor`, `Export`
  - Editor renders 76 keys
  - Projects renders project stats and a 76-key marker preview
  - Projects no longer renders the raw KLE textarea
  - Layouts renders Default controls, selected/default preview source tabs, the version tree, and 76-key read-only previews
  - `Save Version` increments version nodes
  - `Save Current as Default` switches the preview to Default
  - `New Layout` creates a layout from the Default template
  - browser console had no errors before the confirm-dialog instability

## 2026-06-21: qmk-viz paused WIP for layout history, Default template, and App split

Goal: stop implementation immediately and preserve the current plan, scope, and unfinished work before turning the loose qmk-viz items into a proper goal.

What worked:

- Captured the active WIP in `.agents-plans/epic-1 2026-06-21 qmk-viz-editor-refinements/plan-6 2026-06-21 layout-version-tree-and-safe-deletes.md`.
- Recorded the expanded scope:
  - layout version tree with dated forkable versions
  - destructive layout/project confirmation and danger styling
  - project-level read-only Default layout template for bootstrapping future layouts
  - Projects-page KLE preview and layout/version stats
  - topbar order `Projects -> KLE Model -> Layouts -> Editor -> Export`
  - `App.tsx` split before more feature work
- Added the intended data model direction: Default is a separate project-owned template document, not a tag or marker on a normal layout.

What did not work:

- Continuing to add features inside `App.tsx` is no longer sustainable. It has too much data-model, import/export, rendering, and page orchestration code in one file.
- Implementation was paused mid-refactor. `src/lib/appModel.ts` was created, but `App.tsx` has not yet been rewired to import it and delete duplicate local helpers.
- The current uncommitted checkout should be assumed not build-clean until the split is finished and validated.

Validation:

- Not run after the mid-refactor pause.
- Last clean checkpoint before this WIP: `d002e03 2026-06-21T09:30:00Z :: checkpoint :: qmk-viz layers stay in editor`.
- Current WIP files include `package.json`, `package-lock.json`, `src/App.tsx`, `src/lib/appModel.ts`, and the active plan file.

Follow-up stabilization:

- Reconciled `src/App.tsx` with `src/lib/appModel.ts` so app-model helpers are no longer duplicated.
- `just viz-build` passed after the split reconciliation.
- Extracted QMK action helpers, preview keycap rendering, and React Flow version tree rendering into separate modules.
- Added the Layouts-page version tree card with `Save Version` and clickable saved-version nodes.
- `just viz-build` passed after the helper extraction and version tree rendering.
- Remaining loose items are still open: Default template UI, Projects KLE/stats page, danger styling, browser validation, and final checkpoint.

## 2026-06-21: qmk-viz layer ownership correction

Goal: keep layer editing inside the Editor page while making the Layouts page a read-only preview/browser for named layouts.

What worked:

- Restored layer rename/add/reorder/remove controls directly under the Editor layer tabs.
- Kept Layouts focused on named layout CRUD.
- Added a read-only keyboard preview to Layouts so users can inspect the selected layout without editing keys there.
- Added preview layer pills on Layouts to switch the viewed layer without exposing layer CRUD there.

What did not work:

- Moving layer creation/renaming/reordering/removal to Layouts was too literal. Layers are part of editing the active layout, so splitting them away from the keyboard made the model less coherent.

Validation:

- `just viz-build` passed.
- In-app browser validation:
  - Editor has layer rename/add controls and 76 editable keycaps
  - Layouts has layout selection and 76 read-only preview keycaps
  - Layouts has no layer rename/add controls
  - layout preview keycaps are not clickable editor buttons
  - no horizontal overflow at 1440px
  - browser console has no errors

## 2026-06-21: qmk-viz app navigation redesign

Goal: fix the overloaded qmk-viz header by splitting project, model, layout, and export administration into focused app pages instead of continuing to compress controls into the top of the editor.

What worked:

- Replaced the large hero/admin slab with a compact topbar.
- Added first-class pages:
  - Editor: keyboard, layer tabs, selected key, and action composer
  - Projects: project selection, rename, create, duplicate, delete, import, and backup
  - KLE Model: model facts, KLE upload/update, and KLE download
  - Layouts: layout CRUD plus active layout layer management
  - Export: layout JSON, active-layer KLE, project KLE, and full project downloads
- Kept undo/redo in the topbar because history is app-wide.
- Kept current project/layout/model as compact context chips instead of editable header fields.
- Preserved existing handlers and test IDs where practical while moving controls to their owning pages.
- Kept the editor page focused: no project select, no KLE upload, no layout select, and no export textarea above or beside the keyboard.

What did not work:

- Header compaction alone was the wrong direction. The issue was not button size; it was that unrelated jobs were all competing for the same surface.
- The first build after moving JSX caught a stale `activeLayout` reference from the old header context. Replaced it with the active layout name lookup.
- The old responsive breakpoint only knew about `.hero`; it had to be replaced with topbar, nav, context-chip, and admin-grid breakpoints.

Validation:

- `just viz-build` passed after the navigation/page redesign.
- `git diff --check` passed.
- In-app browser validation at `http://127.0.0.1:5178/`:
  - header height is about 58px
  - old `.hero` is gone
  - topbar has no inputs, selects, or file controls
  - app nav shows Editor, Projects, KLE Model, Layouts, and Export
  - Editor page renders 76 keyboard keys
  - Projects page owns project selection
  - KLE Model page owns KLE upload
  - Layouts page owns layout selection and layer management
  - Export page owns the JSON textarea
  - no horizontal overflow at the 1440px viewport
  - browser console has no errors

## 2026-06-21: qmk-viz JSON project and KLE model workflow

Goal: move qmk-viz from a TSV-first single-layout editor to a browser-local keyboard-project editor with uploadable KLE models, multiple named layouts, JSON exports, and KLE downloads.

What worked:

- Changed the app hierarchy to Keyboard Project > Named Layouts.
- Added browser-local project storage with a no-backcompat storage namespace.
- Added project controls for create, duplicate, delete, full-project download, and full-project import.
- Added KLE model controls for upload/update and canonical KLE download.
- Added layout controls for create, duplicate, delete, and layout JSON upload.
- Added active layout JSON export shaped for a future `keymap.c` template generator.
- Added full project JSON export that includes the KLE-backed keyboard model and every named layout.
- Added KLE-compatible exports:
  - project KLE with source geometry and matrix IDs embedded
  - active-layer KLE with current layer identifiers written on key tops
- Made KLE model replacement preserve layouts by stable slot ID.
- Moved undo/redo snapshots to project scope so layout mutations and KLE updates are undoable.
- Normalized the Ergodox KLE source to use ID-only marker labels:
  - `LT##` for left top
  - `RT##` for right top
  - `LC##` for left cluster
  - `RC##` for right cluster
- Removed KLE `a` alignment properties from the Ergodox model because they break display when pasted into the Keyboard Layout Editor website.
- Updated qmk-viz KLE cloning/export paths to strip `a` properties from stored and downloaded KLE documents.
- Updated the built-in Ergodox default layers to use `LT/RT/LC/RC` keys instead of older `L/R` and legend-derived key IDs.

What did not work:

- The old TSV-centered app model made it awkward to represent projects, uploads, full backups, and KLE model replacement.
- The first JSON refactor used a flat project-with-one-document shape; that did not match the desired Keyboard Project > Named Layouts hierarchy.
- Keeping ordinary KLE legends such as `Q`, `3`, and punctuation in the source KLE made qmk-viz derive ambiguous IDs. The source KLE is now ID-only.
- Preserving KLE `a` alignment fields made the JSON less portable to the Keyboard Layout Editor website. The app now tolerates uploaded `a` fields for parsing but drops them from canonical/exported KLE documents.
- Vite hot module replacement preserved stale React state during the storage migration and wrote old `L03/R03` models into new localStorage keys. Stopping Vite before the final storage-key bump avoided repopulating the fresh namespace with stale state.
- Browser file upload automation is still limited in the current in-app browser API, so upload paths were compile-validated and UI-presence-validated rather than end-to-end file-input automated.

Validation:

- `just viz-build` passed after the JSON project/KLE workflow changes.
- `just viz-build` passed again after adding the KLE `a`-property sanitizer.
- `just build nonlogical-01` still passed after sanitizing the KLE model; firmware size remained `50072` bytes (`0xc398`).
- Source KLE validation found 76 key labels, all with exactly one non-empty marker in the ID slot and no leftover visual legends.
- Source KLE validation found no remaining `a` alignment properties after sanitizing the checked-in model.
- Source scan found no remaining KLE-style `"a":` alignment fields in `src` or the canonical Ergodox model.
- In-app browser validation after restarting Vite: project, project upload, KLE upload, layout selector, layout upload, KLE download, and full-project download controls are present.
- In-app browser validation: fresh model export has 76 keyboard keys, `baseLT03 == KC_3`, no `baseL03`, and no old `L/R` or letter-derived key IDs.
- In-app browser validation: creating a new layout adds it, enables undo, and undo removes it while preserving the `LT03` mapping and 76-key model.
- In-app browser validation after sanitizing KLE alignment fields: app reloads with 76 keys, the Monster layout, and KLE/full-project download controls present.

## 2026-06-21: qmk-viz keyboard-first dense editor pass

Goal: keep the keyboard viewer as the primary surface, dynamically fit key identifiers, and make the rest of the UI denser without losing hierarchy.

What worked:

- Installed `@chenglou/pretext` and used its `prepareWithSegments`, `measureNaturalWidth`, and `layout` APIs to measure labels before rendering them.
- Added browser-measured dynamic key label fitting with a max font size and step-down behavior for both primary identifiers and bottom action-type labels.
- Kept the keyboard viewer full width and increased the display unit to `60`, which makes the KLE-sourced geometry readable while still avoiding horizontal overflow at the 1440px in-app browser viewport.
- Condensed the global header into a compact toolbar while preserving the model/layout selectors.
- Merged selected-key context and manual identifier editing into one compact card.
- Made the action composer contextual: plain/mod-tap actions show keycode fields, layer actions show layer fields, layer-tap shows both, and transparent shows no input fields.
- Expanded the TSV viewer into a full-width bottom card so the tabular output has enough horizontal room.
- Replaced large pill-style buttons with smaller, lower-radius controls.

What did not work:

- The old side-by-side editor layout wasted width that the keyboard needed.
- Fixed CSS font sizes worked for common labels but did not handle long identifiers consistently.
- A first size-bucket approach was too blunt; the better fit is to calculate the largest usable font size per label.
- The generic composer with the same two fields for every action type made simple actions and layer actions harder to understand.
- Keeping the TSV viewer in a normal card column made the output feel cramped and visually over-important beside the composer.

Validation:

- `just viz-build` passed after the Pretext, layout, composer, and density changes.
- In-app browser desktop viewport `1440x950`: all 76 keycaps visible, keyboard panel had no horizontal overflow, and page `scrollWidth == clientWidth == 1440`.
- In-app browser label measurement: `clippedPrimary == 0` and `clippedSecondary == 0`.
- In-app browser editor layout: selected-key and composer cards render as the compact upper dock; export card spans the full editor width.
- In-app browser interaction check: composing `LT(NAVI,KC_SPC)` updated the selected key, action input, status message, and TSV output.

## 2026-06-21: qmk-viz behavior-slot preview and undo pass

Goal: make the selected key editor closer to the Oryx mental model while keeping the existing TSV/QMK pipeline honest.

What worked:

- Added a graphical mini keycap preview for the raw QMK identifier field.
- Added a graphical mini keycap preview for the generated behavior-slot action.
- Added an undo stack for key edits. Undo restores the last edited layer/key cell, reselects that key, and updates the TSV output.
- Kept a raw QMK identifier input for full power users who know the exact string they want.
- Replaced the old macro dropdown with four behavior slots:
  - when tapped
  - when held
  - when double tapped
  - when tapped and held
- Parsed existing identifiers back into behavior slots where possible. For example, `LT(NAVI,KC_SPC)` becomes tapped `KC_SPC` and held `NAVI`.
- Generated compile-ready QMK identifiers for the simple cases the current one-cell TSV format can represent: plain key, momentary layer, layer-tap, and mod-tap.

What did not work:

- A full Oryx-style four-behavior model cannot honestly compile through the current TSV format, because each key cell currently stores exactly one QMK identifier.
- Double-tap and tap-then-hold need generated QMK support such as custom keycodes, tap dance, or per-key state handling. Pretending those fit into a single TSV identifier would produce misleading UI.
- VIA-style dynamic editing and arbitrary tap-dance/custom logic are different capability layers. The visual editor can collect intent, but QMK still needs generated C code for advanced behavior.

Validation:

- `just viz-build` passed after the behavior-slot, graphical-preview, raw-input, and undo changes.
- In-app browser desktop viewport `1440x950`: all four behavior fields rendered, both previews rendered as keycaps, no key label clipping, and no horizontal overflow.
- In-app browser interaction check: tapped `KC_SPC` plus held `NAVI` generated `LT(NAVI,KC_SPC)` and applied it to the selected key/TSV output.
- In-app browser interaction check: raw input `HYPR_T(KC_ESC)` applied directly and rendered the mini keycap as `Esc hold Hyper`.
- In-app browser interaction check: undo restored the previous `LT(NAVI,KC_SPC)` value and removed the raw `HYPR_T(KC_ESC)` from TSV.
- In-app browser interaction check: setting a double-tap slot disabled `Use generated` and displayed the custom-QMK/tap-dance limitation instead of writing a fake TSV identifier.

Next likely architecture:

- Keep TSV as the low-level raw keymap interchange.
- Add a richer behavior schema if we want true Oryx-style editing.
- Extend `scripts/render-layout.py` or add a sibling generator that emits both `layout_selected.h` and custom QMK C for behavior slots that need more than one QMK identifier.

## 2026-06-21: qmk-viz in-app browser validation and fit pass

Goal: make `qmk-viz` usable as a visual TSV editor for the Ergodox Infinity layout and validate it through the Codex in-app browser.

What worked:

- Started the Vite app with `npm run dev -- --host 127.0.0.1 --port 5178`.
- Reconnected the Codex in-app browser using the installed browser bundle at `~/.codex/plugins/cache/openai-bundled/browser/26.616.51431/`.
- Loaded `http://127.0.0.1:5178/` in the in-app browser and verified the page title, DOM, screenshot, key count, and TSV output.
- Verified browser-side selection flow: switch to `SYMB`, select `RT14`, and confirm the editor shows `KC_P7`.
- Verified the TSV export area still emits three `@LAYER/...` sections with tabs plus the expected `#` missing-key markers and `~` transparent markers.

What did not work:

- The earlier browser skill path from prior context pointed at `26.616.41845`; that bundle no longer existed locally. The live browser bundle was `26.616.51431`.
- A first browser bridge attempt in prior context failed before any browser code ran with missing sandbox metadata. Retrying after tool discovery exposed the usable Node-backed browser bridge and showed complete request metadata.
- `browser.tabs.selected()` failed because there was no active controlled in-app tab.
- `browser.tabs.new()` initially timed out while waiting for the webview, then a retry accidentally navigated a stale tab handle.
- Fresh tab creation in the `singleTab` in-app browser mode briefly produced handles that were rejected as outside the current browser session. Reacquiring `agent.browsers.get("iab")`, setting visibility, then creating and using the returned handle directly fixed the session attachment.
- The first UI locator for the `SYMB` layer was ambiguous because `SYMB` appears both as a layer tab and as key labels. Scoping the locator to `.layer-tabs button` fixed the edit-flow test.

Changes made:

- Reduced the Ergodox visual unit from `58` to `46` so the full keyboard fits beside the editor at a 1440px desktop viewport.
- Removed the global `body` minimum width and changed the workspace grid to `minmax(0, 1fr) minmax(340px, 390px)` so the editor does not force keyboard clipping.
- Let the keyboard panel align to its content height instead of stretching to the taller editor column.
- Enabled horizontal overflow only when needed so narrower layouts do not clip the keyboard.
- Shortened cramped key labels such as `KC_ENT` to `Ent` and layer secondary labels like `momentary layer` to `momentary`.

Validation:

- In-app browser desktop viewport `1440x950`: all 76 keycaps visible, keyboard stage fits inside the panel, no horizontal scroll needed.
- In-app browser narrow viewport `1024x900`: layout stacks into one column and all 76 keycaps remain visible.
- In-app browser edit-flow validation: `SYMB` layer tab + `P7 RT14` selection showed `KC_P7` in the editor.
- In-app browser TSV sanity: output starts with `@LAYER/BASE`, has three layers, contains tab separators, contains `#`, and contains `~`.

## 2026-06-21: qmk-viz exact KLE geometry pass

Goal: stop approximating the Ergodox thumb clusters and place keys from `keyboard-layout.json` exactly.

What did not work:

- The previous `qmk-viz` renderer still made the thumb clusters look wrong because `src/lib/kle.ts` ignored KLE `rx` and `ry` rotation-origin fields.
- `src/models/ergodoxInfinity.ts` compensated with a hand-written `thumbOverrides` table. That made the page usable, but it was not the exact JSON placement the keyboard model was supposed to express.
- With exact KLE transform bounds at unit `46`, the keyboard produced a small horizontal overflow in the card. Dropping only the scale to unit `45` fixed the overflow without changing relative key placement.

Changes made:

- Extended the KLE parser to carry `x`, `y`, `r`, `rx`, and `ry` state across rows according to KLE semantics.
- Added `rotationX` and `rotationY` to every visual key and set CSS `transform-origin` from the JSON rotation origin.
- Removed the manual thumb override table.
- Compute the keyboard stage bounds from rotated key corners and normalize the exact KLE geometry into the card.
- Kept the visual scale at `unit: 45` so the exact placement fits the desktop in-app browser viewport without horizontal scroll.

Validation:

- `just viz-build` passed after the parser/model changes.
- In-app browser desktop viewport `1440x950`: all 76 keycaps visible.
- In-app browser desktop viewport `1440x950`: keyboard panel had no horizontal overflow after unit `45` (`scrollWidth == clientWidth == 956`).
- In-app browser screenshot confirmed rotated thumb clusters are now driven by the JSON placement rather than the old override table.

## 2026-06-21: qmk-viz raw KLE coordinate pass

Goal: simplify the visual renderer further and render `keyboard-layout.json` coordinates directly.

What did not work:

- The exact KLE geometry pass still computed rotated key bounds and normalized/transformed the whole layout into the card. That made the layout fit, but it was still more interpretation than needed.
- Display scale `45`, `44`, and `43` each left some horizontal overflow once rotated keys were included in the browser's scroll width.

Changes made:

- Removed rotated-bound normalization from `src/models/ergodoxInfinity.ts`.
- Kept the KLE parser's `x`, `y`, `w`, `h`, `r`, `rx`, and `ry` values as the source of truth for key placement.
- Added a fixed `padding` field to the keyboard model and applied it only at render time in `src/App.tsx`.
- Set display scale to `unit: 42` so the raw JSON layout fits the desktop editor card without horizontal scrolling.

Validation:

- `just viz-build` passed before browser validation.
- In-app browser desktop viewport `1440x950`: all 76 keycaps visible.
- In-app browser desktop viewport `1440x950`: raw KLE render had no horizontal overflow at unit `42` (`scrollWidth == clientWidth == 956`).
- In-app browser screenshot confirmed key clusters are rendered from direct KLE placement plus only fixed padding/scale.

## 2026-06-21: qmk-viz right thumb KLE group fix

Goal: explain and fix why the left thumb cluster looked correct but the right thumb cluster was vertically misplaced.

What did not work:

- The parser handled the left thumb cluster because the JSON starts that group with `rx` and `ry`.
- The right thumb cluster starts with `rx` but omits `ry`, relying on the active KLE rotation origin. The parser changed x but kept the row y cursor after the left thumb rows, so the right cluster inherited the wrong vertical cursor.

Changes made:

- In `src/lib/kle.ts`, when a new `rx` starts a group and no `ry` is supplied, reset the row y cursor to the active `rotationY` before applying the row's `y` offset.
- Kept placement otherwise raw: KLE `x`, `y`, `w`, `h`, `r`, `rx`, and `ry` still drive rendering.

Validation:

- `just viz-build` passed after the parser change.
- In-app browser desktop viewport `1440x950`: all 76 keycaps visible.
- In-app browser measurement showed left and right thumb bounds now match vertically: both top `537.4` and bottom `688.5`.
- In-app browser screenshot confirmed the right thumb cluster now mirrors the left cluster's vertical placement.

## 2026-06-21: qmk-viz key editor polish pass

Goal: make the visual editor feel more like an editing tool and less like a debug render.

What did not work:

- Key ids were rendered as normal content inside each keycap, competing with the actual key action label.
- Layer buttons were styled as pills, so they looked like filters rather than tabs that switch the active layer.
- The action input used `draftAction || currentAction`. That made the field look controlled, but the write path could silently fall back to the current saved action when the draft was empty or stale.
- Switching layers cleared the draft instead of explicitly loading the selected cell for the new active layer. The visible value and the value written by `Apply` could feel disconnected.

Changes made:

- Moved key ids into absolute-positioned, tiny top-left debug text in each keycap.
- Reduced keycap radius to `4px` so keys look more square and less like rounded UI cards.
- Restyled layer controls as connected tabs with selected, hover, and focus states.
- Added explicit draft synchronization from the selected key/layer cell.
- Added editor status feedback after key selection, layer switching, manual apply, transparent/no-op presets, and generated action apply.
- Added stable `data-testid` hooks for keycaps, layer tabs, the action input, composer controls, and write buttons to make browser validation precise.

Validation:

- `just viz-build` passed after the TypeScript/CSS changes.
- In-app browser desktop viewport `1440x950`: all 76 keycaps visible, no horizontal overflow (`scrollWidth == clientWidth == 956`).
- In-app browser style measurement: key ids are `absolute` at top `3px` / left `4px`, font size about `6px`; keycap radius is `4px`; active layer tab radius is `11px 11px 0 0` with no bottom border.
- In-app browser interaction check: selecting `LT01`, entering `KC_F13`, and clicking `Apply` updated the preview, selected keycap, TSV output, and status message.
- In-app browser interaction check: clicking `Transparent` updated the selected key to `~`, applied the `transparent` tone, and refreshed the draft input.
- In-app browser interaction check: switching to `SYMB` refreshed the selected `LT01` draft to that layer's cell (`KC_F1` before edit).
- In-app browser interaction check: composing `LT(NAVI,KC_SPC)` and clicking `Use generated` updated the selected key, preview, TSV output, and status message.

## 2026-06-21: qmk-viz key label density and transparent ghosting

Goal: make keycap labels smaller and make transparent cells visually recede.

What did not work:

- Primary key labels measured `14.4px` in the in-app browser, which was too large for the 42px KLE unit.
- Secondary key labels measured `9.92px`, still large enough to compete with the primary action labels.
- Transparent cells rendered as `~transparent`, which made transparent-heavy layers noisy and made the absence of an action look like content.

Changes made:

- Reduced `.key-primary` to `clamp(0.56rem, 0.72vw, 0.7rem)`, measuring `10.368px` in the browser.
- Reduced `.key-secondary` to `clamp(0.42rem, 0.55vw, 0.5rem)`, measuring `7.92px` in the browser.
- Changed transparent action metadata so transparent keycaps no longer render the secondary `transparent` label.
- Added transparent keycap ghost styling: pale striped fill, dashed border, hidden primary/secondary text, and a small diagonal marker.

Validation:

- `just viz-build` passed after the TypeScript/CSS changes.
- In-app browser desktop viewport `1440x950`: all 76 keycaps visible, no horizontal overflow (`scrollWidth == clientWidth == 956`).
- In-app browser `SYMB` layer check: 43 transparent keycaps used dashed ghost styling, with `.key-primary` hidden and no full `transparent` label visible.
- In-app browser screenshot confirmed transparent cells now recede while active labels stay scannable.

## 2026-06-21: qmk-viz app-wide editing, dances, and raw key capture

Goal: turn the visual editor into a practical layout authoring surface with app-wide undo/redo, editable layers, Oryx-like tap-dance modeling, and a raw-input capture button for common QMK identifiers.

What did not work:

- Key-only undo was too narrow once layer add/remove/reorder and generated dance rows were introduced. A single user action can now change both the selected key and generated support tables, so undo needs to snapshot the full TSV document.
- Per-dance `@DANCE/<name>` sections made the TSV format harder to paste into sheets and conflicted with the greenfield direction. The canonical shape is now one `@DANCES` table.
- Enabling `TAP_DANCE_ENABLE = yes` without any dances caused QMK's `quantum/keymap_introspection.c` to fail because it still expects a global `tap_dance_actions` array.
- A copied temp-script probe for `render-layout.py` did not work because the script intentionally resolves the keymap directory from `__file__`.

Changes made:

- Added a `Capture` button beside the selected key raw QMK identifier field.
- Capture mode listens for the next keydown globally and writes a draft identifier such as `KC_A`, `KC_LCTL`, `KC_ENT`, `KC_LEFT`, or punctuation keycodes without immediately changing the layout.
- Converted undo/redo to bounded app-wide TSV document snapshots so raw edits, generated actions, layer edits, and generated support rows undo together.
- Added layer add/remove/rename/reorder controls with tabs rendered as `$index: $name`.
- Split the action composer into Simple and Dance modes.
- Made Dance mode emit `TD(DANCE_N)` in the keymap and a single row in `@DANCES` with `NAME`, `TAP`, `HOLD`, `DOUBLE_TAP`, and `TAP_HOLD` columns.
- Added `@EXTKEYS` table parsing/rendering for future custom keycodes and aliases.
- Updated `scripts/render-layout.py` to generate `layout_selected_extras.h` with custom keycode enums, alias defines, and tap-dance support.
- Added a generated dummy `tap_dance_actions` array when no `@DANCES` rows exist so the keymap still compiles with `TAP_DANCE_ENABLE` enabled.

Validation:

- `just viz-build` passed after the React/TypeScript changes.
- `just use-layout nonlogical-01` regenerated `layout_selected.h`, `layout_selected.txt`, and `layout_selected_extras.h`.
- Import-based renderer probe passed with a temporary TSV containing both `@EXTKEYS` and `@DANCES`.
- `just build nonlogical-01` initially failed because `tap_dance_actions` was undeclared when the default TSV had no dances.
- After the dummy generated tap-dance array fix, `just build nonlogical-01` passed and produced `input_club_ergodox_infinity_monster.bin`.
- In-app browser validation: `Capture` + `A` filled `KC_A` as draft only; `Apply raw` changed the selected key; undo restored the original key; redo restored `KC_A`.
- In-app browser validation: `Capture` + `Control` filled `KC_LCTL`.
- In-app browser validation: Dance composer wrote `TD(DANCE_0)` and one `@DANCES` row; undo/redo removed/restored both the selected key action and support row.
- In-app browser validation: adding a layer changed both tabs and TSV layer count; undo/redo removed/restored the layer.

## 2026-06-21: qmk-viz top-level undo/redo icons

Goal: move Undo/Redo out of the selected-key editor card and make them top-level app controls.

What did not work:

- Text Undo/Redo buttons inside the selected-key button row made the app-wide history feature look scoped to the selected key.
- Keeping history controls near `Apply raw`, `Transparent`, and `No-op` visually mixed global state navigation with key-edit operations.

Changes made:

- Moved the existing app-wide `undoApp()` and `redoApp()` controls into the header.
- Replaced text buttons with compact SVG icon buttons using the same `data-testid` hooks and disabled/title behavior.
- Removed the old selected-key-card Undo/Redo buttons.
- Added a small header history toolbar style that wraps cleanly beside the keyboard/layout selectors.

Validation:

- `just viz-build` passed after the React/CSS changes.
- In-app browser validation: exactly one `undo-action` and one `redo-action` exist, both inside `.history-controls`.
- In-app browser validation: no Undo/Redo text buttons remain in `.key-editor-card .button-row`.
- In-app browser validation: editing `LT00` to `KC_F13`, pressing the header Undo icon, and pressing the header Redo icon correctly changed the selected key and history disabled states.

## 2026-06-21: qmk-viz active project library rework

Goal: make the user project library first-class, keep examples separate, move active Project/Layout picking into the top bar, and stop using inline status rows for transient feedback.

What did not work:

- The first implementation interpretation treated `Project / Layout / Export` as page tabs to reduce, but the intended target was the adjacent active-name fields. The page tabs now remain `Project`, `Layout`, and `Export`.
- The old storage loader silently injected starter projects whenever localStorage was empty, which made example data indistinguishable from user-owned projects.
- The initial composer layer dropdown still carried the old `SYMB` default into layouts that only had `BASE`. It now clamps choices to actual current layer names.
- The in-app browser read-only evaluate scope does not expose `localStorage`, so zero-project validation used a fresh dev-server origin/port instead of direct storage mutation.

Changes made:

- `loadKeyboardProjects()` now returns only saved user projects. No saved projects is a valid state.
- Added explicit example-project loading from bundled `default-projects/`; loading an example clones it into the user library with fresh IDs.
- Added a top-bar Project selector and Layout selector, and removed the model context field.
- Removed the duplicate Project page active-project dropdown and replaced it with project-name search plus a selectable project list.
- Added Workspace Backup export for all current user projects and active selection metadata.
- Added KLE website link and a KLE mapping help modal explaining center-legend identifiers and uniqueness.
- Installed `sonner` and routed transient status messages through toasts; removed visible inline global/editor status rows.
- Changed Simple composer layer actions (`MO`, `TG`, `TT`, `LT`) to use a layer dropdown.
- Removed redundant Layer Actions `Rename`; the layer-name field is the rename path.
- Layer renames now reject duplicate names and rewrite layer references in mappings, dances, and extra key values.

Validation:

- `npm run build` passed after the state/UI changes. Existing Vite chunk-size warning remains.
- In-app browser validation on `http://127.0.0.1:5182/`: fresh origin renders zero user projects, Project picker disabled, three example templates visible, and no inline status rows present.
- In-app browser validation: loading `ANSI 60%` example switches to Layout, top Project picker shows `ANSI 60%`, and top Layout picker shows `Default`.
- In-app browser validation: Simple composer `MO` layer field is a `select` with only current layer options.
- In-app browser validation: applying `MO(BASE)` then renaming `BASE` to `NAVI` rewrites the selected key action to `MO(NAVI)`.
- In-app browser validation: adding `LAYER_1` and attempting to rename it to existing `NAVI` is rejected and restores the input to `LAYER_1`.
- In-app browser validation: Project search filters the user project list and KLE help opens with the expected instructions and KLE link.

## 2026-06-21: qmk-viz top-nav combobox pickers

Goal: replace native top-nav Project/Layout selects with compact searchable pickers that support keyboard navigation.

What did not work:

- Native selects could switch Project/Layout, but they could not filter and did not match the requested result-list interaction model.
- Reusing the existing action menu directly would have mixed command menus with state-selection controls, so the picker uses a dedicated listbox/search presentation while keeping similar outside-click and Escape behavior.

Changes made:

- Replaced the top Project/Layout `<select>` controls with custom searchable picker popovers.
- Added one shared picker path for Project and Layout with search text, highlighted result index, selected-result badge, outside-click close, and Escape close.
- Added keyboard behavior: the search field receives focus when opened, Arrow Up/Down moves the highlighted result, and Enter selects the highlighted result.
- Kept the existing `loadKeyboardProject()` and `loadLayout()` data flow so selection still resets editor state the same way.

Validation:

- `npm run build` passed. The existing Vite large-chunk warning remains.
- In-app browser validation on `http://127.0.0.1:5182/`: top context strip has zero native selects.
- In-app browser validation: Project picker search focused automatically, filtering `ansi` showed one active result, and Enter selected `ANSI 60%`.
- In-app browser validation: reopening Project picker, pressing ArrowDown, then Enter selected `Corne 42-key Split`.
- In-app browser validation: Escape closed the Project picker.
- In-app browser validation: Layout picker opened with the same search/listbox UI and showed the active selected layout.

## 2026-06-21: qmk-viz workspace restore

Goal: add the missing Restore Workspace operation to pair with Backup Workspace.

What did not work:

- Backup Workspace downloaded the full `qmk-viz-workspace` local-state file, but the app only had additive single-project import.
- Overloading Import Project would blur two different operations: adding one project versus replacing the whole browser-local workspace.

Changes made:

- Added `parseWorkspaceFile()` for `kind: "qmk-viz-workspace"` backup files.
- Restore Workspace now validates and normalizes backed-up projects before changing state.
- Restore asks for confirmation and replaces all current user projects with the backup projects.
- Restore preserves the backed-up active project/layout when valid and falls back to the first project/layout otherwise.
- Empty workspace backups restore to the no-project state.
- Added a top-level Restore Workspace JSON upload control beside Backup Workspace.

Validation:

- `npm run build` passed. The existing Vite large-chunk warning remains.
- In-app browser validation on `http://127.0.0.1:5182/`: Project page shows `Backup Workspace`, `Restore Workspace`, and `Project file` as separate actions.
- In-app browser validation: Restore Workspace is a JSON file input with `accept="application/json,.json"`.

## 2026-06-21: qmk-viz header Workspace menu

Goal: move workspace-level actions out of the Project page and into a global header action menu next to Undo/Redo.

What did not work:

- Backup Workspace and Restore Workspace were global local-state actions, but they were rendered as always-visible Project page actions.
- Keeping them beside project-level controls made the Project page feel like an everything drawer.

Changes made:

- Added a header Workspace action menu beside Undo/Redo.
- Moved Backup Workspace and Restore Workspace into that menu.
- Removed Backup Workspace and Restore Workspace from the Project page action row.
- Narrowed header history button CSS so Workspace menu items keep normal action-menu sizing.

Validation:

- `npm run build` passed. The existing Vite large-chunk warning remains.
- In-app browser validation on `http://127.0.0.1:5182/`: header Workspace menu opens and contains Backup Workspace and Restore Workspace.
- In-app browser validation: Project page actions now show only `Create Project` and `Project file`; Backup/Restore are no longer directly visible there.

## 2026-06-21: qmk-viz Project Browser modal

Goal: keep the Project page focused on the active project, while moving project/example browsing into a compact modal that appears only when needed.

What did not work:

- The Project page had become a mixed dashboard, browser, example gallery, and file-action surface.
- Showing all examples inline made rare setup actions compete with active-project work.
- The first compact pass still duplicated actions by adding `Browse Projects` and `Examples` shortcut buttons inside the active-project card while the page action bar already had `Project Browser` and `Create Project -> From Example`.

Changes made:

- Added a Project Browser modal with `My Projects` and `Examples` tabs, search, paging, and compact single-line result rows.
- Replaced the embedded Project page project list and examples card with a compact active-project readout and model preview.
- Merged project mutation/file actions into one `Project actions` menu.
- Changed `Create Project` into a menu with `Blank Project` and `From Example`; `From Example` opens Project Browser on the Examples tab.
- Removed duplicate active-project-card project/example shortcut buttons so the page has one browser entry, one create menu, and one project actions menu.

Validation:

- `npm run build` passed. Existing Vite large-chunk warning remains.
- In-app browser validation on `http://127.0.0.1:5182/`: Project page actions render as `Project Browser`, `Create Project`, and `Project actions`.
- In-app browser validation: no `browse-projects`, `browse-examples`, embedded `project-stats`, or embedded `example-projects` controls remain on the Project page.
- In-app browser validation: `Create Project -> From Example` opens Project Browser with `Examples` selected and three example rows visible.
