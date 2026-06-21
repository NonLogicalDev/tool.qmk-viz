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
