# Development Log

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
  - `qmk-viz/src/lib/appModel.ts` owns project/layout/default-template normalization, import/export, version creation, and KLE-model reconciliation.
  - `qmk-viz/src/lib/qmkActions.ts` owns simple composer action metadata and key-capture conversion.
  - `qmk-viz/src/components/PreviewKeycap.tsx` owns graphical key previews.
  - `qmk-viz/src/components/LayoutVersionTree.tsx` owns the React Flow version tree.
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
- Implementation was paused mid-refactor. `qmk-viz/src/lib/appModel.ts` was created, but `App.tsx` has not yet been rewired to import it and delete duplicate local helpers.
- The current uncommitted checkout should be assumed not build-clean until the split is finished and validated.

Validation:

- Not run after the mid-refactor pause.
- Last clean checkpoint before this WIP: `d002e03 2026-06-21T09:30:00Z :: checkpoint :: qmk-viz layers stay in editor`.
- Current WIP files include `qmk-viz/package.json`, `qmk-viz/package-lock.json`, `qmk-viz/src/App.tsx`, `qmk-viz/src/lib/appModel.ts`, and the active plan file.

Follow-up stabilization:

- Reconciled `qmk-viz/src/App.tsx` with `qmk-viz/src/lib/appModel.ts` so app-model helpers are no longer duplicated.
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
- Source scan found no remaining KLE-style `"a":` alignment fields in `qmk-viz/src` or the canonical Ergodox model.
- In-app browser validation after restarting Vite: project, project upload, KLE upload, layout selector, layout upload, KLE download, and full-project download controls are present.
- In-app browser validation: fresh model export has 76 keyboard keys, `baseLT03 == KC_3`, no `baseL03`, and no old `L/R` or letter-derived key IDs.
- In-app browser validation: creating a new layout adds it, enables undo, and undo removes it while preserving the `LT03` mapping and 76-key model.
- In-app browser validation after sanitizing KLE alignment fields: app reloads with 76 keys, the Monster layout, and KLE/full-project download controls present.

## 2026-06-21: qmk-viz keyboard-first dense editor pass

Goal: keep the keyboard viewer as the primary surface, dynamically fit key identifiers, and make the rest of the UI denser without losing hierarchy.

What worked:

- Installed `@chenglou/pretext` in `qmk-viz/` and used its `prepareWithSegments`, `measureNaturalWidth`, and `layout` APIs to measure labels before rendering them.
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

- Started the Vite app with `npm run dev -- --host 127.0.0.1 --port 5178` from `qmk-viz/`.
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

- The previous `qmk-viz` renderer still made the thumb clusters look wrong because `qmk-viz/src/lib/kle.ts` ignored KLE `rx` and `ry` rotation-origin fields.
- `qmk-viz/src/models/ergodoxInfinity.ts` compensated with a hand-written `thumbOverrides` table. That made the page usable, but it was not the exact JSON placement the keyboard model was supposed to express.
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

- Removed rotated-bound normalization from `qmk-viz/src/models/ergodoxInfinity.ts`.
- Kept the KLE parser's `x`, `y`, `w`, `h`, `r`, `rx`, and `ry` values as the source of truth for key placement.
- Added a fixed `padding` field to the keyboard model and applied it only at render time in `qmk-viz/src/App.tsx`.
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

- In `qmk-viz/src/lib/kle.ts`, when a new `rx` starts a group and no `ry` is supplied, reset the row y cursor to the active `rotationY` before applying the row's `y` offset.
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
