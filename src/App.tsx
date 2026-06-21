import { useMemo, useState } from "react";
import { describeAction, displayKeycode, composeAction } from "./lib/actions";
import { parseLayoutTsv, serializeLayoutTsv, updateCell, TRANSPARENT, type TsvLayer } from "./lib/tsv";
import { ergodoxInfinity, type KeySlot } from "./models/ergodoxInfinity";

const models = [ergodoxInfinity];

function selectedCell(layer: TsvLayer, key: KeySlot): string {
  return layer.rows[key.row]?.[key.col] ?? TRANSPARENT;
}

function initialLayers(layoutName: string): TsvLayer[] {
  return parseLayoutTsv(ergodoxInfinity.layouts[layoutName]);
}

export function App() {
  const [model] = useState(models[0]);
  const [layoutName, setLayoutName] = useState("nonlogical-01");
  const [layers, setLayers] = useState(() => initialLayers("nonlogical-01"));
  const [activeLayerName, setActiveLayerName] = useState(layers[0]?.name ?? "BASE");
  const [selectedSlot, setSelectedSlot] = useState("LT00");
  const [draftAction, setDraftAction] = useState("");
  const [tapDraft, setTapDraft] = useState("KC_SPC");
  const [holdDraft, setHoldDraft] = useState("SYMB");
  const [composerKind, setComposerKind] = useState("plain");

  const activeLayer = layers.find((layer) => layer.name === activeLayerName) ?? layers[0];
  const selectedKey = model.keys.find((key) => key.slot === selectedSlot) ?? model.keys[0];
  const currentAction = selectedCell(activeLayer, selectedKey);
  const tsvOutput = useMemo(() => serializeLayoutTsv(layers), [layers]);

  function loadLayout(name: string) {
    const nextLayers = initialLayers(name);
    setLayoutName(name);
    setLayers(nextLayers);
    setActiveLayerName(nextLayers[0]?.name ?? "BASE");
    setDraftAction("");
  }

  function selectKey(key: KeySlot) {
    setSelectedSlot(key.slot);
    setDraftAction(selectedCell(activeLayer, key));
  }

  function writeAction(value: string) {
    setLayers((current) => updateCell(current, activeLayer.name, selectedKey.row, selectedKey.col, value));
    setDraftAction(value);
  }

  async function copyTsv() {
    await navigator.clipboard.writeText(tsvOutput);
  }

  function downloadTsv() {
    const blob = new Blob([tsvOutput + "\n"], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `layout_${layoutName}.tsv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const generatedAction = composeAction(composerKind, tapDraft, holdDraft);
  const selectedDetails = describeAction(currentAction);

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">qmk-viz</p>
          <h1>Visual TSV editor for QMK keymaps</h1>
          <p>
            Edit the Ergodox Infinity layout visually, then export the exact TSV identifiers consumed by
            <code> scripts/render-layout.py</code>.
          </p>
        </div>
        <div className="hero-controls">
          <label>
            Keyboard model
            <select value={model.id} disabled>
              <option value={model.id}>{model.name}</option>
            </select>
          </label>
          <label>
            Source layout
            <select value={layoutName} onChange={(event) => loadLayout(event.target.value)}>
              {Object.keys(model.layouts).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="workspace">
        <div className="keyboard-panel">
          <div className="layer-tabs" role="tablist" aria-label="Layers">
            {layers.map((layer) => (
              <button
                className={layer.name === activeLayer.name ? "active" : ""}
                key={layer.name}
                onClick={() => {
                  setActiveLayerName(layer.name);
                  setDraftAction("");
                }}
              >
                {layer.name}
              </button>
            ))}
          </div>

          <div className="keyboard-stage" style={{ width: model.width * model.unit, height: model.height * model.unit }}>
            {model.keys.map((key) => {
              const action = selectedCell(activeLayer, key);
              const details = describeAction(action);
              return (
                <button
                  className={`keycap ${details.tone} ${key.slot === selectedSlot ? "selected" : ""}`}
                  key={key.slot}
                  onClick={() => selectKey(key)}
                  style={{
                    left: key.x * model.unit,
                    top: key.y * model.unit,
                    width: key.width * model.unit,
                    height: key.height * model.unit,
                    transform: `rotate(${key.rotation}deg)`
                  }}
                  title={`${key.slot}: ${action}`}
                >
                  <span className="key-primary">{details.primary}</span>
                  {details.secondary && <span className="key-secondary">{details.secondary}</span>}
                  <span className="key-slot">{key.slot}</span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="editor-panel">
          <div className="editor-card selected-summary">
            <p className="eyebrow">Selected key</p>
            <h2>{selectedKey.slot}</h2>
            <div className="action-preview">
              <strong>{selectedDetails.primary}</strong>
              {selectedDetails.secondary && <span>{selectedDetails.secondary}</span>}
            </div>
            <code>{currentAction}</code>
          </div>

          <div className="editor-card">
            <label>
              Identifier for {activeLayer.name}
              <input
                value={draftAction || currentAction}
                onChange={(event) => setDraftAction(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    writeAction(draftAction || currentAction);
                  }
                }}
                spellCheck={false}
              />
            </label>
            <div className="button-row">
              <button onClick={() => writeAction(draftAction || currentAction)}>Apply</button>
              <button onClick={() => writeAction(TRANSPARENT)}>Transparent</button>
              <button onClick={() => writeAction("KC_NO")}>No-op</button>
            </div>
          </div>

          <div className="editor-card">
            <p className="eyebrow">Action composer</p>
            <label>
              Action type
              <select value={composerKind} onChange={(event) => setComposerKind(event.target.value)}>
                <option value="plain">Plain keycode</option>
                <option value="transparent">Transparent</option>
                <option value="mo">Momentary layer: MO(layer)</option>
                <option value="lt">Tap key, hold layer: LT(layer,key)</option>
                <option value="tg">Toggle layer: TG(layer)</option>
                <option value="tt">Tap-toggle layer: TT(layer)</option>
                <option value="ctl_t">Tap key, hold Ctrl</option>
                <option value="sft_t">Tap key, hold Shift</option>
                <option value="alt_t">Tap key, hold Alt</option>
                <option value="gui_t">Tap key, hold Gui/Cmd</option>
                <option value="hypr_t">Tap key, hold Hyper</option>
                <option value="meh_t">Tap key, hold Meh</option>
              </select>
            </label>
            <label>
              Tap keycode
              <input value={tapDraft} onChange={(event) => setTapDraft(event.target.value)} spellCheck={false} />
            </label>
            <label>
              Held modifier/layer
              <input value={holdDraft} onChange={(event) => setHoldDraft(event.target.value)} spellCheck={false} />
            </label>
            <div className="generated">
              <code>{generatedAction}</code>
              <button onClick={() => writeAction(generatedAction)}>Use generated</button>
            </div>
          </div>

          <div className="editor-card export-card">
            <div className="button-row">
              <button onClick={copyTsv}>Copy TSV</button>
              <button onClick={downloadTsv}>Download TSV</button>
            </div>
            <textarea readOnly value={tsvOutput} spellCheck={false} />
            <p>
              Save as <code>layout_&lt;name&gt;.tsv</code>, then run <code>just use-layout &lt;name&gt;</code>.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
