import { useEffect, useMemo, useState } from "react";
import ReactFlow, { Background, Controls, MiniMap, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { composeBehaviorAction, describeAction, parseActionToBehaviorSlots, type BehaviorSlots } from "./lib/actions";
import { buildKeyboardModelFromKle, type KeyboardModel, type KeySlot } from "./lib/keyboardModel";
import {
  cloneKeymapDocument,
  createBlankKeymapDocument,
  reconcileKeymapDocumentToModel,
  selectedKeycode,
  serializeKeymapExport,
  transparentLayerFrom,
  updateKeycode,
  TRANSPARENT,
  type ExtKey,
  type KeymapDocument,
  type KeymapLayer
} from "./lib/keymap";
import { cloneKleDocument } from "./lib/kle";
import { serializeKeyboardModelKle, serializeLayerKle } from "./lib/kleExport";
import { fitPrimaryKeyLabel, fitSecondaryKeyLabel } from "./lib/textFit";
import { ergodoxInfinity, ergodoxInfinityDefaultLayers } from "./models/ergodoxInfinity";

const KEYBOARD_PROJECTS_STORAGE_KEY = "qmk-viz.keyboard-projects.v4";

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

type SavedLayoutVersion = {
  id: string;
  parentId: string | null;
  label: string;
  createdAt: string;
  document: KeymapDocument;
};

type SavedLayout = {
  id: string;
  name: string;
  document: KeymapDocument;
  versions: SavedLayoutVersion[];
  activeVersionId: string;
  updatedAt: string;
};

type SavedDefaultLayout = {
  document: KeymapDocument;
  updatedAt: string;
};

type SavedKeyboardProject = {
  id: string;
  name: string;
  model: KeyboardModel;
  defaultLayout: SavedDefaultLayout;
  layouts: SavedLayout[];
  activeLayoutId: string;
  updatedAt: string;
};

type ProjectFile = {
  version: 1;
  kind: "qmk-viz-project";
  project: SavedKeyboardProject;
};

type AppPage = "editor" | "projects" | "model" | "layouts" | "export";

type AppPageDefinition = {
  id: AppPage;
  label: string;
  description: string;
};

const appPages: AppPageDefinition[] = [
  { id: "projects", label: "Projects", description: "Backups and project library" },
  { id: "model", label: "KLE Model", description: "Physical keyboard geometry" },
  { id: "layouts", label: "Layouts", description: "Named layouts and read-only preview" },
  { id: "editor", label: "Editor", description: "Keyboard and key actions" },
  { id: "export", label: "Export", description: "JSON and KLE downloads" }
];

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

function normalizeLayerName(value: string, fallback: string): string {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  if (!normalized) return fallback;
  return /^\d/.test(normalized) ? `L_${normalized}` : normalized;
}

function uniqueLayerName(base: string, layers: KeymapLayer[], ignoreIndex = -1): string {
  const taken = new Set(layers.map((layer, index) => (index === ignoreIndex ? "" : layer.name)));
  if (!taken.has(base)) return base;

  let suffix = 1;
  while (taken.has(`${base}_${suffix}`)) {
    suffix += 1;
  }
  return `${base}_${suffix}`;
}

function actionTypeLabel(details: ReturnType<typeof describeAction>): string {
  return details.secondary ?? (details.tone === "plain" ? "key" : details.tone);
}

function newEntityId(prefix: string): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}`;
}

function formatVersionDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function createLayoutVersion(document: KeymapDocument, parentId: string | null, label: string, createdAt = new Date().toISOString()): SavedLayoutVersion {
  return {
    id: newEntityId("layout-version"),
    parentId,
    label,
    createdAt,
    document: cloneKeymapDocument(document)
  };
}

function cloneLayoutVersion(version: SavedLayoutVersion): SavedLayoutVersion {
  return {
    ...version,
    document: cloneKeymapDocument(version.document)
  };
}

function cloneSavedLayout(layout: SavedLayout): SavedLayout {
  const document = cloneKeymapDocument(layout.document);
  const versions = layout.versions.length > 0
    ? layout.versions.map(cloneLayoutVersion)
    : [createLayoutVersion(document, null, "Initial version", layout.updatedAt)];
  const activeVersionId = versions.some((version) => version.id === layout.activeVersionId)
    ? layout.activeVersionId
    : versions[versions.length - 1].id;

  return {
    ...layout,
    document,
    versions,
    activeVersionId
  };
}

function reconcileSavedLayoutToModel(layout: SavedLayout, model: KeyboardModel): SavedLayout {
  const document = reconcileKeymapDocumentToModel(layout.document, model);
  const versions = layout.versions.map((version) => ({
    ...version,
    document: reconcileKeymapDocumentToModel(version.document, model)
  }));

  return cloneSavedLayout({
    ...layout,
    document,
    versions
  });
}

function createDefaultDocument(): KeymapDocument {
  return {
    version: 1,
    layers: ergodoxInfinityDefaultLayers.map((layer) => ({ name: layer.name, keys: { ...layer.keys } })),
    dances: {},
    extKeys: []
  };
}

function createLayout(name: string, document: KeymapDocument): SavedLayout {
  const now = new Date().toISOString();
  const clonedDocument = cloneKeymapDocument(document);
  const initialVersion = createLayoutVersion(clonedDocument, null, "Initial version", now);

  return {
    id: newEntityId("layout"),
    name,
    document: clonedDocument,
    versions: [initialVersion],
    activeVersionId: initialVersion.id,
    updatedAt: now
  };
}

function sanitizeKeyboardModel(model: KeyboardModel): KeyboardModel {
  return {
    ...model,
    kle: cloneKleDocument(model.kle)
  };
}

function createKeyboardProject(name: string, model: KeyboardModel, layouts: SavedLayout[]): SavedKeyboardProject {
  const safeLayouts = layouts.length > 0 ? layouts : [createLayout("Default Layout", createBlankKeymapDocument(model))];

  return {
    id: newEntityId("keyboard-project"),
    name,
    model: sanitizeKeyboardModel(model),
    layouts: safeLayouts.map(cloneSavedLayout),
    activeLayoutId: safeLayouts[0].id,
    updatedAt: new Date().toISOString()
  };
}

function defaultKeyboardProject(): SavedKeyboardProject {
  return createKeyboardProject(ergodoxInfinity.name, ergodoxInfinity, [
    createLayout("Monster", createDefaultDocument())
  ]);
}

function normalizeLoadedLayout(raw: Partial<SavedLayout>, model: KeyboardModel, index: number): SavedLayout {
  const fallbackDocument = createBlankKeymapDocument(model);
  const document = reconcileKeymapDocumentToModel(raw.document ?? fallbackDocument, model);
  const updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString();
  const rawVersions = Array.isArray(raw.versions) ? raw.versions : [];
  const versions = rawVersions.length > 0
    ? rawVersions.map((version, versionIndex) => ({
      id: typeof version.id === "string" ? version.id : newEntityId("layout-version"),
      parentId: typeof version.parentId === "string" ? version.parentId : null,
      label: typeof version.label === "string" ? version.label : `Version ${versionIndex + 1}`,
      createdAt: typeof version.createdAt === "string" ? version.createdAt : updatedAt,
      document: reconcileKeymapDocumentToModel(version.document ?? document, model)
    }))
    : [createLayoutVersion(document, null, "Initial version", updatedAt)];
  const activeVersionId = typeof raw.activeVersionId === "string" && versions.some((version) => version.id === raw.activeVersionId)
    ? raw.activeVersionId
    : versions[versions.length - 1].id;

  return cloneSavedLayout({
    id: typeof raw.id === "string" ? raw.id : newEntityId("layout"),
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : `Layout ${index + 1}`,
    document,
    versions,
    activeVersionId,
    updatedAt
  });
}

function normalizeLoadedProject(raw: Partial<SavedKeyboardProject>, index: number): SavedKeyboardProject {
  const model = raw.model?.kle
    ? buildKeyboardModelFromKle(raw.model.kle, {
      id: raw.model.id,
      name: raw.model.name,
      author: raw.model.author,
      source: raw.model.source
    })
    : ergodoxInfinity;
  const sourceLayouts = Array.isArray(raw.layouts) ? raw.layouts : [];
  const layouts = sourceLayouts.length > 0
    ? sourceLayouts.map((layout, layoutIndex) => normalizeLoadedLayout(layout, model, layoutIndex))
    : [createLayout("Default Layout", createBlankKeymapDocument(model))];
  const activeLayoutId = typeof raw.activeLayoutId === "string" && layouts.some((layout) => layout.id === raw.activeLayoutId)
    ? raw.activeLayoutId
    : layouts[0].id;

  return {
    id: typeof raw.id === "string" ? raw.id : newEntityId("keyboard-project"),
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : `Keyboard Project ${index + 1}`,
    model: sanitizeKeyboardModel(model),
    layouts,
    activeLayoutId,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString()
  };
}

function loadKeyboardProjects(): SavedKeyboardProject[] {
  const fallback = [defaultKeyboardProject()];
  try {
    const raw = localStorage.getItem(KEYBOARD_PROJECTS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Array<Partial<SavedKeyboardProject>>;
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed.map((project, index) => normalizeLoadedProject(project, index))
      : fallback;
  } catch {
    return fallback;
  }
}

function activeLayoutFor(project: SavedKeyboardProject): SavedLayout {
  return project.layouts.find((layout) => layout.id === project.activeLayoutId) ?? project.layouts[0];
}

function uniqueLayoutName(base: string, layouts: SavedLayout[], ignoreId = ""): string {
  const cleanBase = base.trim() || "Layout";
  const taken = new Set(layouts.filter((layout) => layout.id !== ignoreId).map((layout) => layout.name));
  if (!taken.has(cleanBase)) return cleanBase;

  let suffix = 1;
  while (taken.has(`${cleanBase} ${suffix}`)) {
    suffix += 1;
  }
  return `${cleanBase} ${suffix}`;
}

function safeFileSlug(value: string, fallback: string): string {
  return value.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || fallback;
}

function parseLayoutUpload(raw: unknown, model: KeyboardModel, fallbackName: string): SavedLayout {
  const layout = typeof raw === "object" && raw !== null && "layout" in raw
    ? (raw as { layout: unknown }).layout
    : undefined;

  if (typeof layout !== "object" || layout === null || !Array.isArray((layout as { layers?: unknown }).layers)) {
    throw new Error("Layout JSON must contain a layout object with layers.");
  }

  const typedLayout = layout as {
    name?: unknown;
    layers: KeymapLayer[];
    dances?: unknown;
    extKeys?: unknown;
  };
  const document = reconcileKeymapDocumentToModel({
    version: 1,
    layers: typedLayout.layers.map((layer) => ({
      name: layer.name,
      keys: { ...layer.keys }
    })),
    dances: typeof typedLayout.dances === "object" && typedLayout.dances !== null
      ? typedLayout.dances as Record<string, BehaviorSlots>
      : {},
    extKeys: Array.isArray(typedLayout.extKeys)
      ? typedLayout.extKeys.map((key) => ({ ...key })) as ExtKey[]
      : []
  }, model);
  const name = typeof typedLayout.name === "string" && typedLayout.name.trim()
    ? typedLayout.name.trim()
    : fallbackName;

  return createLayout(name, document);
}

function parseProjectFile(raw: unknown, fallbackSource: string): SavedKeyboardProject {
  if (typeof raw !== "object" || raw === null || (raw as { kind?: unknown }).kind !== "qmk-viz-project") {
    throw new Error("Project JSON must be a qmk-viz project file.");
  }

  const project = (raw as { project?: unknown }).project;
  if (typeof project !== "object" || project === null) {
    throw new Error("Project JSON is missing a project object.");
  }

  const typedProject = project as Partial<SavedKeyboardProject>;
  if (!typedProject.model?.kle) {
    throw new Error("Project JSON is missing the KLE keyboard model.");
  }

  const model = buildKeyboardModelFromKle(typedProject.model.kle, {
    id: typedProject.model.id,
    name: typedProject.model.name,
    author: typedProject.model.author,
    source: typedProject.model.source || fallbackSource
  });
  const sourceLayouts = Array.isArray(typedProject.layouts) ? typedProject.layouts : [];
  const layouts = sourceLayouts.map((layout, index) => normalizeLoadedLayout(layout, model, index));
  const name = typeof typedProject.name === "string" && typedProject.name.trim()
    ? typedProject.name
    : model.name;

  return createKeyboardProject(name, model, layouts);
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

function buildLayoutVersionGraph(layout: SavedLayout): { nodes: Node[]; edges: Edge[] } {
  const knownIds = new Set(layout.versions.map((version) => version.id));
  const childrenByParent = new Map<string | null, SavedLayoutVersion[]>();

  for (const version of layout.versions) {
    const parentId = version.parentId && knownIds.has(version.parentId) ? version.parentId : null;
    const children = childrenByParent.get(parentId) ?? [];
    children.push(version);
    childrenByParent.set(parentId, children);
  }

  for (const children of childrenByParent.values()) {
    children.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  const positioned: Array<{ version: SavedLayoutVersion; depth: number; row: number }> = [];
  let row = 0;
  const walk = (parentId: string | null, depth: number) => {
    for (const version of childrenByParent.get(parentId) ?? []) {
      positioned.push({ version, depth, row });
      row += 1;
      walk(version.id, depth + 1);
    }
  };
  walk(null, 0);

  const nodes: Node[] = positioned.map(({ version, depth, row: nodeRow }) => ({
    id: version.id,
    position: { x: depth * 260, y: nodeRow * 104 },
    className: version.id === layout.activeVersionId ? "version-node active" : "version-node",
    selected: version.id === layout.activeVersionId,
    data: {
      label: (
        <div className="version-node-label">
          <strong>{version.label}</strong>
          <span>{formatVersionDate(version.createdAt)}</span>
        </div>
      )
    }
  }));
  const edges: Edge[] = layout.versions
    .filter((version) => version.parentId && knownIds.has(version.parentId))
    .map((version) => ({
      id: `${version.parentId}-${version.id}`,
      source: version.parentId as string,
      target: version.id,
      type: "smoothstep",
      animated: version.id === layout.activeVersionId
    }));

  return { nodes, edges };
}

export function App() {
  const [keyboardProjects, setKeyboardProjects] = useState<SavedKeyboardProject[]>(loadKeyboardProjects);
  const initialKeyboardProject = keyboardProjects[0];
  const initialLayout = activeLayoutFor(initialKeyboardProject);
  const [activePage, setActivePage] = useState<AppPage>("editor");
  const [activeKeyboardProjectId, setActiveKeyboardProjectId] = useState(initialKeyboardProject.id);
  const [activeLayoutId, setActiveLayoutId] = useState(initialLayout.id);
  const [keyboardProjectNameDraft, setKeyboardProjectNameDraft] = useState(initialKeyboardProject.name);
  const [layoutNameDraft, setLayoutNameDraft] = useState(initialLayout.name);
  const [model, setModel] = useState<KeyboardModel>(initialKeyboardProject.model);
  const [layers, setLayers] = useState<KeymapLayer[]>(() => cloneKeymapDocument(initialLayout.document).layers);
  const [activeLayerName, setActiveLayerName] = useState(layers[0]?.name ?? "BASE");
  const [layerNameDraft, setLayerNameDraft] = useState(layers[0]?.name ?? "BASE");
  const [selectedSlot, setSelectedSlot] = useState(model.keys[0]?.slot ?? "");
  const [draftAction, setDraftAction] = useState("");
  const [behaviorSlots, setBehaviorSlots] = useState<BehaviorSlots>(() => parseActionToBehaviorSlots(""));
  const [composerMode, setComposerMode] = useState<ComposerMode>("simple");
  const [simpleKind, setSimpleKind] = useState<SimpleComposerKind>("plain");
  const [simpleKeycode, setSimpleKeycode] = useState("KC_SPC");
  const [simpleLayer, setSimpleLayer] = useState("SYMB");
  const [danceName, setDanceName] = useState("DANCE_0");
  const [dances, setDances] = useState<Record<string, BehaviorSlots>>(() => ({ ...initialLayout.document.dances }));
  const [extKeys, setExtKeys] = useState<ExtKey[]>(() => initialLayout.document.extKeys.map((key) => ({ ...key })));
  const [statusMessage, setStatusMessage] = useState("Select a key, edit an identifier, then apply it.");
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [isCapturingKey, setIsCapturingKey] = useState(false);

  const activeKeyboardProject = keyboardProjects.find((project) => project.id === activeKeyboardProjectId) ?? keyboardProjects[0];
  const availableLayouts = activeKeyboardProject.layouts;
  const activeSavedLayout = availableLayouts.find((layout) => layout.id === activeLayoutId) ?? availableLayouts[0];
  const activeLayoutVersion = activeSavedLayout.versions.find((version) => version.id === activeSavedLayout.activeVersionId) ?? activeSavedLayout.versions[0];
  const versionGraph = useMemo(() => buildLayoutVersionGraph(activeSavedLayout), [activeSavedLayout]);
  const foundLayerIndex = layers.findIndex((layer) => layer.name === activeLayerName);
  const activeLayerIndex = foundLayerIndex >= 0 ? foundLayerIndex : 0;
  const activeLayer = layers[activeLayerIndex] ?? layers[0];
  const selectedKey = model.keys.find((key) => key.slot === selectedSlot) ?? model.keys[0];
  const currentAction = selectedKey ? selectedKeycode(activeLayer, selectedKey.slot) : TRANSPARENT;
  const keymapDocument = useMemo<KeymapDocument>(() => ({
    version: 1,
    layers,
    dances,
    extKeys
  }), [dances, extKeys, layers]);
  const jsonOutput = useMemo(() => serializeKeymapExport(model, keymapDocument, {
    keyboardProjectId: activeKeyboardProjectId,
    keyboardProjectName: keyboardProjectNameDraft.trim() || activeKeyboardProject.name,
    layoutId: activeLayoutId,
    layoutName: layoutNameDraft.trim() || "Layout"
  }), [
    activeKeyboardProject.name,
    activeKeyboardProjectId,
    activeLayoutId,
    keyboardProjectNameDraft,
    keymapDocument,
    layoutNameDraft,
    model
  ]);

  function projectWithEditorState(): SavedKeyboardProject {
    const now = new Date().toISOString();
    const layoutName = layoutNameDraft.trim() || availableLayouts.find((layout) => layout.id === activeLayoutId)?.name || "Layout";
    const nextLayouts = availableLayouts.map((layout) => (
      layout.id === activeLayoutId
        ? cloneSavedLayout({
          ...layout,
          name: layoutName,
          document: cloneKeymapDocument(keymapDocument),
          updatedAt: now
        })
        : cloneSavedLayout(layout)
    ));

    return {
      ...activeKeyboardProject,
      name: keyboardProjectNameDraft.trim() || activeKeyboardProject.name,
      model: sanitizeKeyboardModel(model),
      layouts: nextLayouts,
      activeLayoutId,
      updatedAt: now
    };
  }

  function snapshot() {
    return JSON.stringify({
      project: projectWithEditorState(),
      activeLayoutId,
      activeLayerName,
      selectedSlot
    });
  }

  function loadLayoutObject(project: SavedKeyboardProject, layout: SavedLayout, options: {
    resetHistory?: boolean;
    selectedSlot?: string;
    activeLayerName?: string;
  } = {}) {
    const document = cloneKeymapDocument(layout.document);
    const nextLayerName = options.activeLayerName && document.layers.some((layer) => layer.name === options.activeLayerName)
      ? options.activeLayerName
      : document.layers[0]?.name ?? "BASE";
    const nextSelectedSlot = options.selectedSlot && project.model.keys.some((key) => key.slot === options.selectedSlot)
      ? options.selectedSlot
      : project.model.keys[0]?.slot ?? "";

    setActiveKeyboardProjectId(project.id);
    setActiveLayoutId(layout.id);
    setKeyboardProjectNameDraft(project.name);
    setLayoutNameDraft(layout.name);
    setModel(project.model);
    setLayers(document.layers);
    setDances(document.dances);
    setExtKeys(document.extKeys);
    setActiveLayerName(nextLayerName);
    setLayerNameDraft(nextLayerName);
    setSelectedSlot(nextSelectedSlot);
    setDraftAction("");
    if (options.resetHistory !== false) {
      setUndoStack([]);
      setRedoStack([]);
    }
  }

  function loadKeyboardProjectObject(project: SavedKeyboardProject, layoutId = project.activeLayoutId, options: {
    resetHistory?: boolean;
    selectedSlot?: string;
    activeLayerName?: string;
  } = {}) {
    const layout = project.layouts.find((item) => item.id === layoutId) ?? activeLayoutFor(project);
    loadLayoutObject(project, layout, options);
  }

  function applySnapshot(source: string) {
    const saved = JSON.parse(source) as {
      project: SavedKeyboardProject;
      activeLayoutId: string;
      activeLayerName: string;
      selectedSlot: string;
    };
    const layout = saved.project.layouts.find((item) => item.id === saved.activeLayoutId) ?? activeLayoutFor(saved.project);
    const document = cloneKeymapDocument(layout.document);
    const nextLayerName = document.layers.find((layer) => layer.name === saved.activeLayerName)?.name ?? document.layers[0]?.name ?? "BASE";
    const nextSelectedSlot = saved.project.model.keys.some((key) => key.slot === saved.selectedSlot)
      ? saved.selectedSlot
      : saved.project.model.keys[0]?.slot ?? "";

    setKeyboardProjects((current) => current.map((project) => (
      project.id === saved.project.id ? saved.project : project
    )));
    setActiveKeyboardProjectId(saved.project.id);
    setActiveLayoutId(layout.id);
    setKeyboardProjectNameDraft(saved.project.name);
    setLayoutNameDraft(layout.name);
    setModel(saved.project.model);
    setLayers(document.layers);
    setDances(document.dances);
    setExtKeys(document.extKeys);
    setActiveLayerName(nextLayerName);
    setLayerNameDraft(nextLayerName);
    setSelectedSlot(nextSelectedSlot);
    setDraftAction("");
  }

  function recordHistory() {
    setUndoStack((current) => [...current.slice(-49), snapshot()]);
    setRedoStack([]);
  }

  function loadKeyboardProject(projectId: string) {
    const project = keyboardProjects.find((item) => item.id === projectId);
    if (!project) return;
    loadKeyboardProjectObject(project);
    setStatusMessage(`Loaded keyboard project ${project.name}.`);
  }

  function loadLayout(layoutId: string) {
    const layout = availableLayouts.find((item) => item.id === layoutId);
    if (!layout) return;
    loadLayoutObject(activeKeyboardProject, layout);
    setStatusMessage(`Loaded layout ${layout.name}.`);
  }

  function selectKey(key: KeySlot) {
    setSelectedSlot(key.slot);
    setDraftAction(selectedKeycode(activeLayer, key.slot));
  }

  function writeAction(value: string) {
    const before = selectedKeycode(activeLayer, selectedKey.slot);
    if (before !== value) {
      recordHistory();
    }
    setLayers((current) => updateKeycode(current, activeLayer.name, selectedKey.slot, value));
    setDraftAction(value);
  }

  function applyGeneratedAction() {
    const dance = danceComposition.dance;
    const actionChanged = selectedKeycode(activeLayer, selectedKey.slot) !== generatedAction;
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

    setLayers((current) => updateKeycode(current, activeLayer.name, selectedKey.slot, generatedAction));
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

  function persistActiveKeyboardProject() {
    const nextProject = projectWithEditorState();
    setKeyboardProjects((current) => current.map((project) => (
      project.id === nextProject.id ? nextProject : project
    )));
  }

  function createBlankKeyboardProject() {
    const project = createKeyboardProject("Untitled Keyboard Project", ergodoxInfinity, [
      createLayout("Default Layout", createBlankKeymapDocument(ergodoxInfinity))
    ]);
    setKeyboardProjects((current) => [...current, project]);
    loadKeyboardProjectObject(project);
    setStatusMessage("Created a keyboard project. Upload a KLE file to replace the default model.");
  }

  function duplicateKeyboardProject() {
    const project = createKeyboardProject(`${keyboardProjectNameDraft || "Keyboard Project"} copy`, model, availableLayouts);
    setKeyboardProjects((current) => [...current, project]);
    loadKeyboardProjectObject(project);
    setStatusMessage(`Duplicated keyboard project as ${project.name}.`);
  }

  function deleteKeyboardProject() {
    if (keyboardProjects.length <= 1) {
      setStatusMessage("Cannot delete the last keyboard project.");
      return;
    }

    const layoutCount = activeKeyboardProject.layouts.length;
    const versionCount = activeKeyboardProject.layouts.reduce((total, layout) => total + layout.versions.length, 0);
    if (!window.confirm(`Delete project "${keyboardProjectNameDraft}" with ${layoutCount} layouts and ${versionCount} saved versions?`)) {
      return;
    }

    const remaining = keyboardProjects.filter((project) => project.id !== activeKeyboardProjectId);
    setKeyboardProjects(remaining);
    loadKeyboardProjectObject(remaining[0]);
    setStatusMessage("Deleted keyboard project.");
  }

  function createBlankLayoutForActiveProject() {
    recordHistory();
    const layout = createLayout(
      uniqueLayoutName("New Layout", availableLayouts),
      createBlankKeymapDocument(model)
    );
    const baseProject = projectWithEditorState();
    const project = {
      ...baseProject,
      layouts: [...baseProject.layouts, layout],
      activeLayoutId: layout.id,
      updatedAt: new Date().toISOString()
    };
    setKeyboardProjects((current) => current.map((item) => (
      item.id === project.id ? project : item
    )));
    loadLayoutObject(project, layout, { resetHistory: false });
    setStatusMessage(`Created layout ${layout.name}.`);
  }

  function duplicateLayout() {
    recordHistory();
    const layout = createLayout(
      uniqueLayoutName(`${layoutNameDraft || "Layout"} copy`, availableLayouts),
      keymapDocument
    );
    const baseProject = projectWithEditorState();
    const project = {
      ...baseProject,
      layouts: [...baseProject.layouts, layout],
      activeLayoutId: layout.id,
      updatedAt: new Date().toISOString()
    };
    setKeyboardProjects((current) => current.map((item) => (
      item.id === project.id ? project : item
    )));
    loadLayoutObject(project, layout, { resetHistory: false });
    setStatusMessage(`Duplicated layout as ${layout.name}.`);
  }

  function deleteLayout() {
    if (availableLayouts.length <= 1) {
      setStatusMessage("Cannot delete the last layout.");
      return;
    }

    if (!window.confirm(`Delete layout "${layoutNameDraft}" and its ${activeSavedLayout.versions.length} saved versions?`)) {
      return;
    }

    recordHistory();
    const baseProject = projectWithEditorState();
    const remaining = baseProject.layouts.filter((layout) => layout.id !== activeLayoutId);
    const nextLayout = remaining[0];
    const project = {
      ...baseProject,
      layouts: remaining,
      activeLayoutId: nextLayout.id,
      updatedAt: new Date().toISOString()
    };
    setKeyboardProjects((current) => current.map((item) => (
      item.id === project.id ? project : item
    )));
    loadLayoutObject(project, nextLayout, { resetHistory: false });
    setStatusMessage("Deleted layout.");
  }

  function saveLayoutVersion() {
    recordHistory();
    const baseProject = projectWithEditorState();
    const layout = baseProject.layouts.find((item) => item.id === activeLayoutId) ?? baseProject.layouts[0];
    const version = createLayoutVersion(
      keymapDocument,
      layout.activeVersionId,
      `Version ${layout.versions.length + 1}`
    );
    const nextLayout = cloneSavedLayout({
      ...layout,
      document: cloneKeymapDocument(keymapDocument),
      versions: [...layout.versions, version],
      activeVersionId: version.id,
      updatedAt: version.createdAt
    });
    const project = {
      ...baseProject,
      layouts: baseProject.layouts.map((item) => item.id === nextLayout.id ? nextLayout : item),
      activeLayoutId: nextLayout.id,
      updatedAt: version.createdAt
    };

    setKeyboardProjects((current) => current.map((item) => (
      item.id === project.id ? project : item
    )));
    loadLayoutObject(project, nextLayout, { resetHistory: false, selectedSlot, activeLayerName });
    setStatusMessage(`Saved ${nextLayout.name} ${version.label} from ${activeLayoutVersion.label}.`);
  }

  function loadLayoutVersion(versionId: string) {
    const version = activeSavedLayout.versions.find((item) => item.id === versionId);
    if (!version) return;

    recordHistory();
    const now = new Date().toISOString();
    const baseProject = projectWithEditorState();
    const layout = baseProject.layouts.find((item) => item.id === activeLayoutId) ?? baseProject.layouts[0];
    const nextLayout = cloneSavedLayout({
      ...layout,
      document: cloneKeymapDocument(version.document),
      activeVersionId: version.id,
      updatedAt: now
    });
    const project = {
      ...baseProject,
      layouts: baseProject.layouts.map((item) => item.id === nextLayout.id ? nextLayout : item),
      activeLayoutId: nextLayout.id,
      updatedAt: now
    };

    setKeyboardProjects((current) => current.map((item) => (
      item.id === project.id ? project : item
    )));
    loadLayoutObject(project, nextLayout, { resetHistory: false, selectedSlot, activeLayerName });
    setStatusMessage(`Loaded ${nextLayout.name} ${version.label}; the next saved version will fork from it.`);
  }

  async function updateActiveKeyboardModel(file: File) {
    const raw = JSON.parse(await file.text()) as unknown;
    const importedModel = buildKeyboardModelFromKle(raw, { source: file.name });
    recordHistory();

    const baseProject = projectWithEditorState();
    const nextLayouts = baseProject.layouts.map((layout) => reconcileSavedLayoutToModel({
      ...layout,
      updatedAt: new Date().toISOString()
    }, importedModel));
    const nextLayout = nextLayouts.find((layout) => layout.id === activeLayoutId) ?? nextLayouts[0];
    const nextProject = {
      ...baseProject,
      name: importedModel.name,
      model: importedModel,
      layouts: nextLayouts,
      activeLayoutId: nextLayout.id,
      updatedAt: new Date().toISOString()
    };

    setKeyboardProjects((current) => current.map((project) => (
      project.id === nextProject.id ? nextProject : project
    )));
    loadLayoutObject(nextProject, nextLayout, {
      resetHistory: false,
      selectedSlot,
      activeLayerName
    });
    setStatusMessage(`Updated KLE model to ${importedModel.name}; matching slot IDs kept their mappings.`);
  }

  async function uploadLayout(file: File) {
    const raw = JSON.parse(await file.text()) as unknown;
    const fallbackName = file.name.replace(/\.json$/i, "") || "Uploaded Layout";
    const layout = parseLayoutUpload(raw, model, uniqueLayoutName(fallbackName, availableLayouts));
    recordHistory();

    const baseProject = projectWithEditorState();
    const project = {
      ...baseProject,
      layouts: [...baseProject.layouts, layout],
      activeLayoutId: layout.id,
      updatedAt: new Date().toISOString()
    };
    setKeyboardProjects((current) => current.map((item) => (
      item.id === project.id ? project : item
    )));
    loadLayoutObject(project, layout, { resetHistory: false });
    setStatusMessage(`Uploaded layout ${layout.name}.`);
  }

  async function importFullProject(file: File) {
    const raw = JSON.parse(await file.text()) as unknown;
    const project = parseProjectFile(raw, file.name);
    setKeyboardProjects((current) => [...current, project]);
    loadKeyboardProjectObject(project);
    setStatusMessage(`Imported project ${project.name} with ${project.layouts.length} layouts.`);
  }

  async function copyJson() {
    await navigator.clipboard.writeText(jsonOutput);
  }

  function downloadText(content: string, filename: string) {
    const blob = new Blob([content + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function downloadJson() {
    downloadText(jsonOutput, `${safeFileSlug(layoutNameDraft, "qmk-layout")}.json`);
  }

  function downloadFullProject() {
    const projectFile: ProjectFile = {
      version: 1,
      kind: "qmk-viz-project",
      project: projectWithEditorState()
    };
    downloadText(JSON.stringify(projectFile, null, 2), `${safeFileSlug(keyboardProjectNameDraft, "qmk-viz-project")}.qmk-viz-project.json`);
  }

  function downloadProjectKle() {
    downloadText(serializeKeyboardModelKle(model), `${safeFileSlug(keyboardProjectNameDraft, "keyboard")}.kle.json`);
  }

  function downloadActiveLayerKle() {
    downloadText(serializeLayerKle(model, activeLayer), `${safeFileSlug(layoutNameDraft, "layout")}-${safeFileSlug(activeLayer.name, "layer")}.kle.json`);
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
    localStorage.setItem(KEYBOARD_PROJECTS_STORAGE_KEY, JSON.stringify(keyboardProjects));
  }, [keyboardProjects]);

  useEffect(() => {
    persistActiveKeyboardProject();
  }, [activeKeyboardProjectId, activeLayoutId, keyboardProjectNameDraft, keymapDocument, layoutNameDraft, model]);

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
    <main className={`app-shell page-${activePage}`}>
      <header className="app-topbar">
        <div className="brand-lockup">
          <span className="brand-kicker">QMK-VIZ</span>
          <strong>Keymap Studio</strong>
        </div>
        <nav className="app-nav" aria-label="App pages">
          {appPages.map((page) => (
            <button
              aria-current={activePage === page.id ? "page" : undefined}
              className={activePage === page.id ? "active" : ""}
              key={page.id}
              onClick={() => setActivePage(page.id)}
              title={page.description}
              type="button"
            >
              <span>{page.label}</span>
            </button>
          ))}
        </nav>
        <div className="context-strip" aria-label="Current context">
          <button className="context-chip" onClick={() => setActivePage("projects")} type="button">
            <span>Project</span>
            <strong>{keyboardProjectNameDraft || activeKeyboardProject.name}</strong>
          </button>
          <button className="context-chip" onClick={() => setActivePage("layouts")} type="button">
            <span>Layout</span>
            <strong>{layoutNameDraft || availableLayouts.find((layout) => layout.id === activeLayoutId)?.name || "Layout"}</strong>
          </button>
          <button className="context-chip" onClick={() => setActivePage("model")} type="button">
            <span>Model</span>
            <strong>{model.keys.length} keys</strong>
          </button>
        </div>
        <div className="history-controls" aria-label="History">
          <button
            aria-label="Undo"
            data-testid="undo-action"
            disabled={!canUndo}
            onClick={undoApp}
            title={canUndo ? "Undo last app change" : "No changes to undo"}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M9 7H5v4" />
              <path d="M5 11c2.2-3.4 5.6-5 9.4-4.2 3.1.6 5.4 3.2 5.6 6.4.2 3.8-2.7 7-6.5 7-2.2 0-4.1-1-5.3-2.6" />
            </svg>
          </button>
          <button
            aria-label="Redo"
            data-testid="redo-action"
            disabled={!canRedo}
            onClick={redoApp}
            title={canRedo ? "Redo app change" : "No changes to redo"}
            type="button"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M15 7h4v4" />
              <path d="M19 11c-2.2-3.4-5.6-5-9.4-4.2-3.1.6-5.4 3.2-5.6 6.4-.2 3.8 2.7 7 6.5 7 2.2 0 4.1-1 5.3-2.6" />
            </svg>
          </button>
        </div>
      </header>

      {activePage === "editor" && (
        <section className="workspace editor-workspace">
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
              const action = selectedKeycode(activeLayer, key.slot);
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
                  ? `Apply TD(${danceName || "DANCE_0"}) and add or update its dances JSON entry.`
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
          </aside>
        </section>
      )}

      {activePage === "projects" && (
        <section className="page-panel">
          <div className="page-heading">
            <div>
              <p className="eyebrow">Project library</p>
              <h1>Keyboard projects</h1>
              <p>Browser-local workspaces. Back up the whole project whenever the layout starts mattering.</p>
            </div>
            <div className="page-actions">
              <button data-testid="new-project" onClick={createBlankKeyboardProject} type="button">Create Project</button>
              <label className="file-import">
                Import Project
                <input
                  data-testid="project-upload"
                  accept="application/json,.json"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void importFullProject(file).catch((error: unknown) => {
                        setStatusMessage(error instanceof Error ? error.message : "Failed to import project JSON.");
                      });
                    }
                    event.target.value = "";
                  }}
                  type="file"
                />
              </label>
            </div>
          </div>
          <div className="admin-grid two-column">
            <div className="editor-card admin-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Active project</p>
                  <h2>{keyboardProjectNameDraft}</h2>
                </div>
                <span className="metric-pill">{keyboardProjects.length} projects</span>
              </div>
              <label>
                Keyboard project
                <select
                  data-testid="project-select"
                  value={activeKeyboardProjectId}
                  onChange={(event) => loadKeyboardProject(event.target.value)}
                >
                  {keyboardProjects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Project name
                <input
                  data-testid="project-name"
                  value={keyboardProjectNameDraft}
                  onBlur={persistActiveKeyboardProject}
                  onChange={(event) => setKeyboardProjectNameDraft(event.target.value)}
                  spellCheck={false}
                />
              </label>
              <div className="button-row">
                <button data-testid="duplicate-project" onClick={duplicateKeyboardProject} type="button">Duplicate</button>
                <button
                  className="danger-button"
                  data-testid="delete-project"
                  disabled={keyboardProjects.length <= 1}
                  onClick={deleteKeyboardProject}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="editor-card admin-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Backup</p>
                  <h2>Full project file</h2>
                </div>
              </div>
              <p>
                A full project export contains the KLE model plus every named layout. Use it as the portable
                backup and re-import format.
              </p>
              <div className="button-row">
                <button data-testid="download-project" onClick={downloadFullProject} type="button">Download Project</button>
                <button data-testid="download-full-project" onClick={downloadFullProject} type="button">Full Project</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {activePage === "model" && (
        <section className="page-panel">
          <div className="page-heading">
            <div>
              <p className="eyebrow">Keyboard model</p>
              <h1>KLE geometry and IDs</h1>
              <p>The model defines physical key placement and matrix IDs. Layouts stay attached by stable slot ID.</p>
            </div>
          </div>
          <div className="admin-grid two-column">
            <div className="editor-card admin-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">KLE model</p>
                  <h2>{model.name}</h2>
                </div>
                <span className="metric-pill">{model.keys.length} keys</span>
              </div>
              <dl className="model-facts" data-testid="model-readout">
                <div>
                  <dt>Source</dt>
                  <dd>{model.source}</dd>
                </div>
                <div>
                  <dt>Canvas</dt>
                  <dd>{model.width.toFixed(1)}u × {model.height.toFixed(1)}u</dd>
                </div>
                <div>
                  <dt>Author</dt>
                  <dd>{model.author || "Not specified"}</dd>
                </div>
              </dl>
            </div>
            <div className="editor-card admin-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Model files</p>
                  <h2>Upload or download KLE</h2>
                </div>
              </div>
              <p>
                Updating the KLE model is undoable. Existing layout keys survive when their slot IDs still exist in
                the new KLE file.
              </p>
              <div className="button-row">
                <label className="file-import">
                  Upload/Update KLE
                  <input
                    data-testid="keyboard-upload"
                    accept="application/json,.json"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void updateActiveKeyboardModel(file).catch((error: unknown) => {
                          setStatusMessage(error instanceof Error ? error.message : "Failed to update KLE JSON.");
                        });
                      }
                      event.target.value = "";
                    }}
                    type="file"
                  />
                </label>
                <button data-testid="download-kle" onClick={downloadProjectKle} type="button">Download KLE</button>
                <button data-testid="download-project-kle" onClick={downloadProjectKle} type="button">Project KLE</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {activePage === "layouts" && (
        <section className="page-panel">
          <div className="page-heading">
            <div>
              <p className="eyebrow">Named layouts</p>
              <h1>{layoutNameDraft}</h1>
              <p>Manage layout files and preview the selected layout without editing keys or layers here.</p>
            </div>
            <div className="page-actions">
              <button data-testid="new-layout" onClick={createBlankLayoutForActiveProject} type="button">New Layout</button>
              <label className="file-import">
                Upload Layout
                <input
                  data-testid="layout-upload"
                  accept="application/json,.json"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void uploadLayout(file).catch((error: unknown) => {
                        setStatusMessage(error instanceof Error ? error.message : "Failed to upload layout JSON.");
                      });
                    }
                    event.target.value = "";
                  }}
                  type="file"
                />
              </label>
            </div>
          </div>
          <div className="admin-grid layout-page-grid">
            <div className="editor-card admin-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Named layout</p>
                  <h2>{layoutNameDraft}</h2>
                </div>
                <span className="metric-pill">{availableLayouts.length} layouts</span>
              </div>
              <label>
                Layout
                <select
                  data-testid="layout-select"
                  value={activeLayoutId}
                  onChange={(event) => loadLayout(event.target.value)}
                >
                  {availableLayouts.map((layout) => (
                    <option key={layout.id} value={layout.id}>{layout.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Layout name
                <input
                  data-testid="layout-name"
                  value={layoutNameDraft}
                  onBlur={persistActiveKeyboardProject}
                  onChange={(event) => setLayoutNameDraft(event.target.value)}
                  spellCheck={false}
                />
              </label>
              <div className="button-row">
                <button data-testid="duplicate-layout" onClick={duplicateLayout} type="button">Duplicate</button>
                <button
                  className="danger-button"
                  data-testid="delete-layout"
                  disabled={availableLayouts.length <= 1}
                  onClick={deleteLayout}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="editor-card admin-card layout-preview-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Read-only preview</p>
                  <h2>{activeLayerIndex}: {activeLayer.name}</h2>
                </div>
                <span className="metric-pill">{layers.length} layers</span>
              </div>
              <div className="preview-layer-tabs" aria-label="Preview layer">
                {layers.map((layer, index) => (
                  <button
                    className={layer.name === activeLayer.name ? "active" : ""}
                    key={`${layer.name}-${index}`}
                    onClick={() => {
                      setActiveLayerName(layer.name);
                      setLayerNameDraft(layer.name);
                    }}
                    type="button"
                  >
                    {index}: {layer.name}
                  </button>
                ))}
              </div>
              <div className="layout-preview-viewport" aria-label={`${layoutNameDraft} ${activeLayer.name} read-only preview`}>
                <div
                  className="keyboard-stage read-only-stage"
                  style={{ width: model.width * model.unit, height: model.height * model.unit }}
                >
                  {model.keys.map((key) => {
                    const action = selectedKeycode(activeLayer, key.slot);
                    const details = describeAction(action);
                    const keyWidth = key.width * model.unit;
                    const actionType = actionTypeLabel(details);
                    const primaryFit = fitPrimaryKeyLabel(details.primary, keyWidth);
                    const secondaryFit = fitSecondaryKeyLabel(actionType, keyWidth);
                    return (
                      <div
                        className={`keycap read-only ${details.tone}`}
                        key={key.slot}
                        style={{
                          left: (key.x + model.padding) * model.unit,
                          top: (key.y + model.padding) * model.unit,
                          width: key.width * model.unit,
                          height: key.height * model.unit,
                          transform: `rotate(${key.rotation}deg)`,
                          transformOrigin: `${(key.rotationX - key.x) * model.unit}px ${(key.rotationY - key.y) * model.unit}px`
                        }}
                        title={`${key.slot}: ${action}`}
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
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {activePage === "export" && (
        <section className="page-panel export-page">
          <div className="page-heading">
            <div>
              <p className="eyebrow">Export</p>
              <h1>Structured output</h1>
              <p>Use Layout JSON for templating. Use KLE exports for visual previews or model portability.</p>
            </div>
            <div className="page-actions">
              <button onClick={copyJson} type="button">Copy JSON</button>
              <button data-testid="download-layout-json" onClick={downloadJson} type="button">Layout JSON</button>
              <button data-testid="download-layer-kle" onClick={downloadActiveLayerKle} type="button">Layer KLE</button>
              <button data-testid="download-full-project" onClick={downloadFullProject} type="button">Full Project</button>
            </div>
          </div>
          <div className="editor-card export-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Current layout JSON</p>
                <h2>{keyboardProjectNameDraft} / {layoutNameDraft}</h2>
              </div>
              <button data-testid="download-project-kle" onClick={downloadProjectKle} type="button">Project KLE</button>
            </div>
            <textarea
              readOnly
              value={jsonOutput}
              spellCheck={false}
            />
            <p>
              Layout JSON is the `keymap.c` template input. Full Project JSON is the backup/import format.
              Project KLE preserves the uploaded keyboard geometry and slot IDs; Layer KLE adds the active layer labels.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
