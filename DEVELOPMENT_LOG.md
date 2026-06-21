# Development Log

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
