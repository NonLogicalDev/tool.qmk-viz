import { useEffect, useMemo, useState } from "react";
import { composeBehaviorAction, describeAction, parseActionToBehaviorSlots, type BehaviorSlots } from "./lib/actions";
import { fitPrimaryKeyLabel, fitSecondaryKeyLabel } from "./lib/textFit";
import { parseLayoutDocumentTsv, serializeLayoutDocumentTsv, updateCell, TRANSPARENT, type TsvExtKey, type TsvLayer } from "./lib/tsv";
import { ergodoxInfinity, type KeySlot } from "./models/ergodoxInfinity";

const models = [ergodoxInfinity];

type BehaviorField = {
  id: keyof BehaviorSlots;
  label: string;
  placeholder: string;
  help: string;
};

type ComposerMode = "simple" | "dance";

type SimpleComposerKind =
  | "plain"
  | "transparent"
  | "mo"
  | "lt"
  | "tg"
  | "tt"
  | "ctl_t"
  | "sft_t"
  | "alt_t"
  | "gui_t"
  | "hypr_t"
  | "meh_t";

type SimpleComposerAction = {
  kind: SimpleComposerKind;
  label: string;
  fields: Array<"keycode" | "layer">;
  keycodeLabel?: string;
  layerLabel?: string;
  help: string;
};

const behaviorFields: BehaviorField[] = [
  { id: "tap", label: "When tapped", placeholder: "KC_SPC", help: "Normal tap output." },
  { id: "hold", label: "When held", placeholder: "NAVI or KC_LCTL", help: "Layer name or held modifier." },
  { id: "doubleTap", label: "When double tapped", placeholder: "KC_ESC", help: "Stored for tap-dance/custom generation." },
  { id: "tapHold", label: "When tapped and held", placeholder: "TG(NAVI)", help: "Stored for tap-dance/custom generation." }
];

const danceBehaviorFields = behaviorFields;

const simpleComposerActions: SimpleComposerAction[] = [
  { kind: "plain", label: "Plain keycode", fields: ["keycode"], keycodeLabel: "Keycode", help: "Emits the keycode as-is." },
  { kind: "transparent", label: "Transparent", fields: [], help: "Emits ~ and lets lower layers pass through." },
  { kind: "mo", label: "Momentary layer", fields: ["layer"], layerLabel: "Layer", help: "MO(layer) while held." },
  { kind: "lt", label: "Tap key, hold layer", fields: ["keycode", "layer"], keycodeLabel: "Tap keycode", layerLabel: "Hold layer", help: "LT(layer,key): tap for key, hold for layer." },
  { kind: "tg", label: "Toggle layer", fields: ["layer"], layerLabel: "Layer", help: "TG(layer) toggles a layer on or off." },
  { kind: "tt", label: "Tap-toggle layer", fields: ["layer"], layerLabel: "Layer", help: "TT(layer): hold momentarily, tap repeatedly to toggle." },
  { kind: "ctl_t", label: "Mod-tap Ctrl", fields: ["keycode"], keycodeLabel: "Tap keycode", help: "Tap key, hold Ctrl." },
  { kind: "sft_t", label: "Mod-tap Shift", fields: ["keycode"], keycodeLabel: "Tap keycode", help: "Tap key, hold Shift." },
  { kind: "alt_t", label: "Mod-tap Alt", fields: ["keycode"], keycodeLabel: "Tap keycode", help: "Tap key, hold Alt." },
  { kind: "gui_t", label: "Mod-tap Gui/Cmd", fields: ["keycode"], keycodeLabel: "Tap keycode", help: "Tap key, hold Gui/Cmd." },
  { kind: "hypr_t", label: "Mod-tap Hyper", fields: ["keycode"], keycodeLabel: "Tap keycode", help: "Tap key, hold Hyper." },
  { kind: "meh_t", label: "Mod-tap Meh", fields: ["keycode"], keycodeLabel: "Tap keycode", help: "Tap key, hold Meh." }
];

const eventKeyAliases: Record<string, string> = {
  " ": "KC_SPC",
  Enter: "KC_ENT",
  Escape: "KC_ESC",
  Backspace: "KC_BSPC",
  Tab: "KC_TAB",
  Delete: "KC_DEL",
  Insert: "KC_INS",
  Home: "KC_HOME",
  End: "KC_END",
  PageUp: "KC_PGUP",
  PageDown: "KC_PGDN",
  ArrowLeft: "KC_LEFT",
  ArrowRight: "KC_RGHT",
  ArrowUp: "KC_UP",
  ArrowDown: "KC_DOWN"
};

const punctuationKeyAliases: Record<string, string> = {
  "-": "KC_MINS",
  "=": "KC_EQL",
  "[": "KC_LBRC",
  "]": "KC_RBRC",
  "\\": "KC_BSLS",
  ";": "KC_SCLN",
  "'": "KC_QUOT",
  ",": "KC_COMM",
  ".": "KC_DOT",
  "/": "KC_SLSH",
  "`": "KC_GRV"
};

function modifierKeycode(event: KeyboardEvent): string {
  const side = event.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT ? "R" : "L";

  switch (event.key) {
    case "Control":
      return `KC_${side}CTL`;
    case "Shift":
      return `KC_${side}SFT`;
    case "Alt":
      return `KC_${side}ALT`;
    case "Meta":
      return `KC_${side}GUI`;
    default:
      return "";
  }
}

function qmkKeycodeFromEvent(event: KeyboardEvent): string {
  const modifier = modifierKeycode(event);
  if (modifier) return modifier;
  if (/^F\d{1,2}$/.test(event.key)) return `KC_${event.key}`;
  if (/^[a-zA-Z]$/.test(event.key)) return `KC_${event.key.toUpperCase()}`;
  if (/^\d$/.test(event.key)) return `KC_${event.key}`;

  return eventKeyAliases[event.key] ?? punctuationKeyAliases[event.key] ?? "";
}

function composeSimpleAction(kind: SimpleComposerKind, keycode: string, layer: string): string {
  const cleanKeycode = keycode.trim();
  const cleanLayer = layer.trim();

  switch (kind) {
    case "transparent":
      return "~";
    case "plain":
      return cleanKeycode || "KC_NO";
    case "mo":
      return `MO(${cleanLayer || "SYMB"})`;
    case "lt":
      return `LT(${cleanLayer || "SYMB"},${cleanKeycode || "KC_SPC"})`;
    case "tg":
      return `TG(${cleanLayer || "SYMB"})`;
    case "tt":
      return `TT(${cleanLayer || "SYMB"})`;
    case "ctl_t":
      return `CTL_T(${cleanKeycode || "KC_ESC"})`;
    case "sft_t":
      return `SFT_T(${cleanKeycode || "KC_NO"})`;
    case "alt_t":
      return `ALT_T(${cleanKeycode || "KC_NO"})`;
    case "gui_t":
      return `GUI_T(${cleanKeycode || "KC_NO"})`;
    case "hypr_t":
      return `HYPR_T(${cleanKeycode || "KC_NO"})`;
    case "meh_t":
      return `MEH_T(${cleanKeycode || "KC_NO"})`;
  }
}

function selectedCell(layer: TsvLayer, key: KeySlot): string {
  return layer.rows[key.row]?.[key.col] ?? TRANSPARENT;
}

function initialDocument(layoutName: string) {
  return parseLayoutDocumentTsv(ergodoxInfinity.layouts[layoutName]);
}

function normalizeLayerName(value: string, fallback: string): string {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  if (!normalized) return fallback;
  return /^\d/.test(normalized) ? `L_${normalized}` : normalized;
}

function uniqueLayerName(base: string, layers: TsvLayer[], ignoreIndex = -1): string {
  const taken = new Set(layers.map((layer, index) => (index === ignoreIndex ? "" : layer.name)));
  if (!taken.has(base)) return base;

  let suffix = 1;
  while (taken.has(`${base}_${suffix}`)) {
    suffix += 1;
  }
  return `${base}_${suffix}`;
}

function transparentLayerFrom(layer: TsvLayer, name: string): TsvLayer {
  return {
    name,
    rows: layer.rows.map((row) => row.map((cell) => {
      if (cell === "+" || cell === "#") return cell;
      return TRANSPARENT;
    }))
  };
}

function actionTypeLabel(details: ReturnType<typeof describeAction>): string {
  return details.secondary ?? (details.tone === "plain" ? "key" : details.tone);
}

function PreviewKeycap({ action, slot, testId }: { action: string; slot: string; testId: string }) {
  const details = describeAction(action);
  const actionType = actionTypeLabel(details);
  const previewWidth = 92;
  const primaryFit = fitPrimaryKeyLabel(details.primary, previewWidth);
  const secondaryFit = fitSecondaryKeyLabel(actionType, previewWidth);

  return (
    <div
      className={`key-preview ${details.tone}`}
      data-testid={testId}
      title={`${slot}: ${action}`}
    >
      <span className="key-slot">{slot}</span>
      <span
        className="key-primary"
        data-font-size={primaryFit.fontSize.toFixed(2)}
        data-measured-width={primaryFit.measuredWidth.toFixed(2)}
        style={{ fontSize: primaryFit.fontSize, lineHeight: `${primaryFit.lineHeight}px` }}
      >
        {details.primary}
      </span>
      <span
        className="key-secondary"
        data-font-size={secondaryFit.fontSize.toFixed(2)}
        data-measured-width={secondaryFit.measuredWidth.toFixed(2)}
        style={{ fontSize: secondaryFit.fontSize, lineHeight: `${secondaryFit.lineHeight}px` }}
      >
        {actionType}
      </span>
    </div>
  );
}

export function App() {
  const [model] = useState(models[0]);
  const [layoutName, setLayoutName] = useState("nonlogical-01");
  const [layers, setLayers] = useState(() => initialDocument("nonlogical-01").layers);
  const [activeLayerName, setActiveLayerName] = useState(layers[0]?.name ?? "BASE");
  const [layerNameDraft, setLayerNameDraft] = useState(layers[0]?.name ?? "BASE");
  const [selectedSlot, setSelectedSlot] = useState("LT00");
  const [draftAction, setDraftAction] = useState("");
  const [behaviorSlots, setBehaviorSlots] = useState<BehaviorSlots>(() => parseActionToBehaviorSlots(""));
  const [composerMode, setComposerMode] = useState<ComposerMode>("simple");
  const [simpleKind, setSimpleKind] = useState<SimpleComposerKind>("plain");
  const [simpleKeycode, setSimpleKeycode] = useState("KC_SPC");
  const [simpleLayer, setSimpleLayer] = useState("SYMB");
  const [danceName, setDanceName] = useState("DANCE_0");
  const [dances, setDances] = useState<Record<string, BehaviorSlots>>(() => (
    Object.fromEntries(initialDocument("nonlogical-01").dances.map((dance) => [dance.name, dance.slots]))
  ));
  const [extKeys, setExtKeys] = useState<TsvExtKey[]>(() => initialDocument("nonlogical-01").extKeys);
  const [statusMessage, setStatusMessage] = useState("Select a key, edit an identifier, then apply it.");
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [isCapturingKey, setIsCapturingKey] = useState(false);

  const foundLayerIndex = layers.findIndex((layer) => layer.name === activeLayerName);
  const activeLayerIndex = foundLayerIndex >= 0 ? foundLayerIndex : 0;
  const activeLayer = layers[activeLayerIndex] ?? layers[0];
  const selectedKey = model.keys.find((key) => key.slot === selectedSlot) ?? model.keys[0];
  const currentAction = selectedCell(activeLayer, selectedKey);
  const fullTsvOutput = useMemo(() => serializeLayoutDocumentTsv({
    layers,
    dances: Object.entries(dances).map(([name, slots]) => ({ name, slots })),
    extKeys
  }), [dances, extKeys, layers]);

  function snapshot() {
    return fullTsvOutput;
  }

  function applySnapshot(source: string) {
    const document = parseLayoutDocumentTsv(source);
    const nextDances: Record<string, BehaviorSlots> = Object.fromEntries(
      document.dances.map((dance) => [dance.name, dance.slots])
    );
    const nextLayerName = document.layers.find((layer) => layer.name === activeLayerName)?.name ?? document.layers[0]?.name ?? "BASE";

    setLayers(document.layers);
    setDances(nextDances);
    setExtKeys(document.extKeys);
    setActiveLayerName(nextLayerName);
    setLayerNameDraft(nextLayerName);
  }

  function recordHistory() {
    setUndoStack((current) => [...current.slice(-49), snapshot()]);
    setRedoStack([]);
  }

  function loadLayout(name: string) {
    const document = initialDocument(name);
    setLayoutName(name);
    setLayers(document.layers);
    setDances(Object.fromEntries(document.dances.map((dance) => [dance.name, dance.slots])));
    setExtKeys(document.extKeys);
    setActiveLayerName(document.layers[0]?.name ?? "BASE");
    setLayerNameDraft(document.layers[0]?.name ?? "BASE");
    setDraftAction("");
    setUndoStack([]);
    setRedoStack([]);
  }

  function selectKey(key: KeySlot) {
    setSelectedSlot(key.slot);
    setDraftAction(selectedCell(activeLayer, key));
  }

  function writeAction(value: string) {
    const before = selectedCell(activeLayer, selectedKey);
    if (before !== value) {
      recordHistory();
    }
    setLayers((current) => updateCell(current, activeLayer.name, selectedKey.row, selectedKey.col, value));
    setDraftAction(value);
  }

  function applyGeneratedAction() {
    const dance = danceComposition.dance;
    const actionChanged = selectedCell(activeLayer, selectedKey) !== generatedAction;
    const existingDance = dance ? dances[dance.name] : undefined;
    const danceChanged = composerMode === "dance" && dance
      ? JSON.stringify(existingDance) !== JSON.stringify(dance.slots)
      : false;

    if (actionChanged || danceChanged) {
      recordHistory();
    }

    if (composerMode === "dance" && dance) {
      setDances((current) => ({
        ...current,
        [dance.name]: dance.slots
      }));
    }

    setLayers((current) => updateCell(current, activeLayer.name, selectedKey.row, selectedKey.col, generatedAction));
    setDraftAction(generatedAction);
    setStatusMessage(`Applied ${generatedAction} to ${selectedKey.slot}.`);
  }

  function updateBehaviorSlot(id: keyof BehaviorSlots, value: string) {
    setBehaviorSlots((current) => ({ ...current, [id]: value }));
  }

  function renameActiveLayer() {
    const nextName = uniqueLayerName(normalizeLayerName(layerNameDraft, activeLayer.name), layers, activeLayerIndex);
    if (nextName === activeLayer.name) {
      setLayerNameDraft(nextName);
      return;
    }

    recordHistory();
    setLayers((current) => current.map((layer, index) => (
      index === activeLayerIndex ? { ...layer, name: nextName } : layer
    )));
    setActiveLayerName(nextName);
    setLayerNameDraft(nextName);
    setStatusMessage(`Renamed layer ${activeLayerIndex} to ${nextName}.`);
  }

  function addLayer() {
    const baseName = normalizeLayerName(`LAYER_${layers.length}`, `LAYER_${layers.length}`);
    const name = uniqueLayerName(baseName, layers);
    const newLayer = transparentLayerFrom(activeLayer, name);
    const insertAt = activeLayerIndex + 1;
    recordHistory();
    setLayers((current) => [
      ...current.slice(0, insertAt),
      newLayer,
      ...current.slice(insertAt)
    ]);
    setActiveLayerName(name);
    setLayerNameDraft(name);
    setStatusMessage(`Added layer ${insertAt}: ${name}.`);
  }

  function removeActiveLayer() {
    if (layers.length <= 1) {
      setStatusMessage("Cannot remove the last layer.");
      return;
    }

    const nextLayers = layers.filter((_, index) => index !== activeLayerIndex);
    const nextIndex = Math.min(activeLayerIndex, nextLayers.length - 1);
    const nextName = nextLayers[nextIndex]?.name ?? nextLayers[0].name;
    recordHistory();
    setLayers(nextLayers);
    setActiveLayerName(nextName);
    setLayerNameDraft(nextName);
    setStatusMessage(`Removed layer ${activeLayerIndex}: ${activeLayer.name}.`);
  }

  function moveActiveLayer(delta: -1 | 1) {
    const targetIndex = activeLayerIndex + delta;
    if (targetIndex < 0 || targetIndex >= layers.length) return;

    recordHistory();
    setLayers((current) => {
      const next = [...current];
      [next[activeLayerIndex], next[targetIndex]] = [next[targetIndex], next[activeLayerIndex]];
      return next;
    });
    setStatusMessage(`Moved ${activeLayer.name} to layer ${targetIndex}.`);
  }

  function undoApp() {
    const previous = undoStack[undoStack.length - 1];
    if (!previous) return;

    setRedoStack((current) => [...current.slice(-49), snapshot()]);
    setUndoStack((current) => current.slice(0, -1));
    applySnapshot(previous);
    setStatusMessage("Undid last app change.");
  }

  function redoApp() {
    const next = redoStack[redoStack.length - 1];
    if (!next) return;

    setUndoStack((current) => [...current.slice(-49), snapshot()]);
    setRedoStack((current) => current.slice(0, -1));
    applySnapshot(next);
    setStatusMessage("Redid app change.");
  }

  async function copyTsv() {
    await navigator.clipboard.writeText(fullTsvOutput);
  }

  function downloadTsv() {
    const blob = new Blob([fullTsvOutput + "\n"], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `layout_${layoutName}.tsv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const simpleAction = simpleComposerActions.find((action) => action.kind === simpleKind) ?? simpleComposerActions[0];
  const simpleGeneratedAction = composeSimpleAction(simpleKind, simpleKeycode, simpleLayer);
  const danceComposition = composeBehaviorAction(behaviorSlots, danceName);
  const generatedAction = composerMode === "dance" ? danceComposition.identifier : simpleGeneratedAction;
  const composerNote = composerMode === "dance" ? danceComposition.note : simpleAction.help;
  const selectedDetails = describeAction(currentAction);
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  useEffect(() => {
    setDraftAction(currentAction);
    const parsedSlots = parseActionToBehaviorSlots(currentAction);
    setBehaviorSlots(parsedSlots);
    if (parsedSlots.tap) setSimpleKeycode(parsedSlots.tap);
    if (parsedSlots.hold) setSimpleLayer(parsedSlots.hold);
  }, [currentAction, activeLayer.name, selectedKey.slot]);

  useEffect(() => {
    setLayerNameDraft(activeLayer.name);
  }, [activeLayer.name]);

  useEffect(() => {
    if (!isCapturingKey) return;

    function captureKey(event: KeyboardEvent) {
      event.preventDefault();
      event.stopPropagation();

      const keycode = qmkKeycodeFromEvent(event);
      if (keycode) {
        setDraftAction(keycode);
        setStatusMessage(`Captured ${keycode}. Apply raw to write it to ${selectedKey.slot}.`);
      } else {
        setStatusMessage(`Could not map "${event.key}" to a QMK keycode; type the raw identifier manually.`);
      }
      setIsCapturingKey(false);
    }

    window.addEventListener("keydown", captureKey, { capture: true });
    return () => window.removeEventListener("keydown", captureKey, { capture: true });
  }, [isCapturingKey, selectedKey.slot]);

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
            {layers.map((layer, index) => (
              <button
                className={layer.name === activeLayer.name ? "active" : ""}
                key={`${layer.name}-${index}`}
                id={`tab-${layer.name}`}
                data-testid={`layer-tab-${layer.name}`}
                onClick={() => {
                  setActiveLayerName(layer.name);
                  setStatusMessage(`Editing ${layer.name}.`);
                }}
                role="tab"
                aria-controls="keyboard-stage"
                aria-selected={layer.name === activeLayer.name}
                type="button"
              >
                {index}: {layer.name}
              </button>
            ))}
          </div>
          <div className="layer-toolbar" aria-label="Layer management">
            <label>
              Active layer
              <input
                data-testid="layer-name-input"
                value={layerNameDraft}
                onChange={(event) => setLayerNameDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    renameActiveLayer();
                  }
                }}
                spellCheck={false}
              />
            </label>
            <div className="button-row">
              <button data-testid="rename-layer" onClick={renameActiveLayer} type="button">Rename</button>
              <button data-testid="add-layer" onClick={addLayer} type="button">Add</button>
              <button
                data-testid="move-layer-left"
                disabled={activeLayerIndex === 0}
                onClick={() => moveActiveLayer(-1)}
                type="button"
              >
                Move left
              </button>
              <button
                data-testid="move-layer-right"
                disabled={activeLayerIndex === layers.length - 1}
                onClick={() => moveActiveLayer(1)}
                type="button"
              >
                Move right
              </button>
              <button
                data-testid="remove-layer"
                disabled={layers.length <= 1}
                onClick={removeActiveLayer}
                type="button"
              >
                Remove
              </button>
            </div>
          </div>

          <div
            className="keyboard-stage"
            id="keyboard-stage"
            role="tabpanel"
            aria-labelledby={`tab-${activeLayer.name}`}
            style={{ width: model.width * model.unit, height: model.height * model.unit }}
          >
            {model.keys.map((key) => {
              const action = selectedCell(activeLayer, key);
              const details = describeAction(action);
              const keyWidth = key.width * model.unit;
              const actionType = actionTypeLabel(details);
              const primaryFit = fitPrimaryKeyLabel(details.primary, keyWidth);
              const secondaryFit = fitSecondaryKeyLabel(actionType, keyWidth);
              return (
                <button
                  className={`keycap ${details.tone} ${key.slot === selectedSlot ? "selected" : ""}`}
                  key={key.slot}
                  data-testid={`key-${key.slot}`}
                  onClick={() => {
                    selectKey(key);
                    setStatusMessage(`Selected ${key.slot} on ${activeLayer.name}.`);
                  }}
                  aria-pressed={key.slot === selectedSlot}
                  style={{
                    left: (key.x + model.padding) * model.unit,
                    top: (key.y + model.padding) * model.unit,
                    width: key.width * model.unit,
                    height: key.height * model.unit,
                    transform: `rotate(${key.rotation}deg)`,
                    transformOrigin: `${(key.rotationX - key.x) * model.unit}px ${(key.rotationY - key.y) * model.unit}px`
                  }}
                  title={`${key.slot}: ${action}`}
                  type="button"
                >
                  <span className="key-slot">{key.slot}</span>
                  <span
                    className="key-primary"
                    data-font-size={primaryFit.fontSize.toFixed(2)}
                    data-measured-width={primaryFit.measuredWidth.toFixed(2)}
                    style={{ fontSize: primaryFit.fontSize, lineHeight: `${primaryFit.lineHeight}px` }}
                  >
                    {details.primary}
                  </span>
                  <span
                    className="key-secondary"
                    data-font-size={secondaryFit.fontSize.toFixed(2)}
                    data-measured-width={secondaryFit.measuredWidth.toFixed(2)}
                    style={{ fontSize: secondaryFit.fontSize, lineHeight: `${secondaryFit.lineHeight}px` }}
                  >
                    {actionType}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="editor-panel">
          <div className="editor-card key-editor-card">
            <div className="section-header selected-summary">
              <div>
                <p className="eyebrow">Selected key</p>
                <h2>{selectedKey.slot}</h2>
              </div>
              <div className="action-preview">
                <strong>{selectedDetails.primary}</strong>
                {selectedDetails.secondary && <span>{selectedDetails.secondary}</span>}
              </div>
            </div>
            <code className="current-action">{currentAction}</code>
            <div className="preview-strip">
              <PreviewKeycap action={draftAction} slot={selectedKey.slot} testId="draft-key-preview" />
              <div>
                <span>Raw string preview</span>
                <strong>{draftAction || "blank identifier"}</strong>
              </div>
            </div>
            <label>
              Raw QMK identifier for {activeLayer.name}
              <div className={`raw-input-row ${isCapturingKey ? "capturing" : ""}`}>
                <input
                  data-testid="action-input"
                  value={draftAction}
                  onChange={(event) => setDraftAction(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      writeAction(draftAction);
                      setStatusMessage(`Updated ${selectedKey.slot} on ${activeLayer.name}.`);
                    }
                  }}
                  spellCheck={false}
                />
                <button
                  data-testid="capture-key"
                  onClick={() => {
                    setIsCapturingKey(true);
                    setStatusMessage("Press a key to capture its QMK identifier.");
                  }}
                  type="button"
                >
                  {isCapturingKey ? "Press key" : "Capture"}
                </button>
              </div>
            </label>
            <div className="button-row">
              <button
                data-testid="apply-action"
                onClick={() => {
                  writeAction(draftAction);
                  setStatusMessage(`Updated ${selectedKey.slot} on ${activeLayer.name}.`);
                }}
                type="button"
              >
                Apply raw
              </button>
              <button
                data-testid="transparent-action"
                onClick={() => {
                  writeAction(TRANSPARENT);
                  setStatusMessage(`${selectedKey.slot} is transparent on ${activeLayer.name}.`);
                }}
                type="button"
              >
                Transparent
              </button>
              <button
                data-testid="noop-action"
                onClick={() => {
                  writeAction("KC_NO");
                  setStatusMessage(`${selectedKey.slot} is disabled on ${activeLayer.name}.`);
                }}
                type="button"
              >
                No-op
              </button>
              <button
                data-testid="undo-action"
                disabled={!canUndo}
                onClick={undoApp}
                title={canUndo ? "Undo last app change" : "No changes to undo"}
                type="button"
              >
                Undo
              </button>
              <button
                data-testid="redo-action"
                disabled={!canRedo}
                onClick={redoApp}
                title={canRedo ? "Redo app change" : "No changes to redo"}
                type="button"
              >
                Redo
              </button>
            </div>
            <p className="editor-status" data-testid="editor-status" role="status">{statusMessage}</p>
          </div>

          <div className="editor-card composer-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Action composer</p>
                <h2>{composerMode === "dance" ? "Dance composer" : "Simple composer"}</h2>
              </div>
              <code className={composerMode === "dance" ? "needs-code" : ""}>{generatedAction}</code>
            </div>
            <div className="composer-mode-tabs" role="tablist" aria-label="Composer mode">
              <button
                className={composerMode === "simple" ? "active" : ""}
                onClick={() => setComposerMode("simple")}
                role="tab"
                aria-selected={composerMode === "simple"}
                type="button"
              >
                Simple
              </button>
              <button
                className={composerMode === "dance" ? "active" : ""}
                onClick={() => setComposerMode("dance")}
                role="tab"
                aria-selected={composerMode === "dance"}
                type="button"
              >
                Dance
              </button>
            </div>
            <div className={`preview-strip composer-preview ${composerMode === "dance" ? "needs-code" : ""}`}>
              <PreviewKeycap action={generatedAction} slot={selectedKey.slot} testId="composer-key-preview" />
              <div>
                <span>Graphical key preview</span>
                <strong>{composerNote}</strong>
              </div>
            </div>
            {composerMode === "simple" ? (
              <>
                <label>
                  Action type
                  <select
                    data-testid="simple-composer-kind"
                    value={simpleKind}
                    onChange={(event) => setSimpleKind(event.target.value as SimpleComposerKind)}
                  >
                    {simpleComposerActions.map((action) => (
                      <option key={action.kind} value={action.kind}>{action.label}</option>
                    ))}
                  </select>
                </label>
                <div className="behavior-grid">
                  {simpleAction.fields.includes("keycode") && (
                    <label>
                      {simpleAction.keycodeLabel ?? "Keycode"}
                      <input
                        data-testid="simple-keycode"
                        placeholder="KC_SPC"
                        value={simpleKeycode}
                        onChange={(event) => setSimpleKeycode(event.target.value)}
                        spellCheck={false}
                      />
                    </label>
                  )}
                  {simpleAction.fields.includes("layer") && (
                    <label>
                      {simpleAction.layerLabel ?? "Layer"}
                      <input
                        data-testid="simple-layer"
                        placeholder="NAVI"
                        value={simpleLayer}
                        onChange={(event) => setSimpleLayer(event.target.value)}
                        spellCheck={false}
                      />
                    </label>
                  )}
                </div>
              </>
            ) : (
              <>
              <label>
                Dance name
                <input
                  data-testid="dance-name"
                  placeholder="DANCE_0"
                  value={danceName}
                  onChange={(event) => setDanceName(event.target.value)}
                  spellCheck={false}
                />
              </label>
              <div className="behavior-grid">
                {danceBehaviorFields.map((field) => (
                  <label key={field.id}>
                    {field.label}
                    <input
                      data-testid={`behavior-${field.id}`}
                      placeholder={field.placeholder}
                      value={behaviorSlots[field.id]}
                      onChange={(event) => updateBehaviorSlot(field.id, event.target.value)}
                      spellCheck={false}
                    />
                    <small>{field.help}</small>
                  </label>
                ))}
              </div>
              </>
            )}
            <div className="generated">
              <span>
                {composerMode === "dance"
                  ? `Apply TD(${danceName || "DANCE_0"}) and append or update its @DANCES row in TSV.`
                  : `Apply this generated raw identifier to ${selectedKey.slot} on ${activeLayer.name}.`}
              </span>
              <button
                data-testid="use-generated-action"
                onClick={applyGeneratedAction}
                type="button"
              >
                Use generated
              </button>
            </div>
            {composerMode === "dance" && danceComposition.supportCode && (
              <details className="support-code-preview">
                <summary>Generated QMK support preview</summary>
                <pre>{danceComposition.supportCode}</pre>
              </details>
            )}
          </div>

          <div className="editor-card export-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Export</p>
                <h2>TSV output</h2>
              </div>
              <div className="button-row compact-actions">
                <button onClick={copyTsv} type="button">Copy</button>
                <button onClick={downloadTsv} type="button">Download</button>
              </div>
            </div>
            <textarea
              readOnly
              value={fullTsvOutput}
              spellCheck={false}
            />
            <p>
              Save as <code>layout_&lt;name&gt;.tsv</code>, then run <code>just use-layout &lt;name&gt;</code>.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
