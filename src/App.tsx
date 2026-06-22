import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { Toaster, toast } from "sonner";
import "sonner/dist/styles.css";
import { composeBehaviorAction, describeAction, parseActionToBehaviorSlots, type BehaviorSlots } from "./lib/actions";
import { buildKeyboardModelFromKle, type KeyboardModel, type KeySlot } from "./lib/keyboardModel";
import {
  cloneKeymapDocument,
  createEmptyKeymapDocument,
  selectedKeycode,
  serializeKeymapExport,
  transparentLayerFrom,
  updateKeycode,
  TRANSPARENT,
  type ExtKey,
  type KeymapDocument,
  type KeymapLayer
} from "./lib/keymap";
import { serializeKeyboardModelKle, serializeLayerKle } from "./lib/kleExport";
import { fitPrimaryKeyLabel, fitSecondaryKeyLabel } from "./lib/textFit";
import { LayoutVersionTree } from "./components/LayoutVersionTree";
import { KeyboardModelPreview } from "./components/KeyboardModelPreview";
import { PreviewKeycap, actionTypeLabel } from "./components/PreviewKeycap";
import {
  KEYBOARD_PROJECTS_STORAGE_KEY,
  activeLayoutFor,
  cloneKeyboardProjectForLibrary,
  cloneSavedLayout,
  createEmptyKeyboardProject,
  createKeyboardProject,
  createLayout,
  createLayoutVersion,
  loadExampleProjects,
  loadKeyboardProjects,
  parseLayoutUpload,
  parseProjectFile,
  parseWorkspaceFile,
  reconcileDefaultLayoutToModel,
  reconcileSavedLayoutToModel,
  safeFileSlug,
  sanitizeKeyboardModel,
  uniqueLayoutName,
  type ProjectFile,
  type SavedKeyboardProject,
  type SavedLayout
} from "./lib/appModel";
import {
  composeModTapAction,
  composeSimpleAction,
  modTapActions,
  parseSimpleComposerAction,
  qmkKeycodeFromEvent,
  simpleComposerActions,
  type SimpleComposerKind
} from "./lib/qmkActions";

type BehaviorField = {
  id: keyof BehaviorSlots;
  label: string;
  placeholder: string;
  help: string;
};

type ComposerMode = "simple" | "dance";

type RenameDialog = {
  kind: "project" | "layout";
  value: string;
};

type JsonEditKind = "project" | "layout" | "kle";

type JsonEditDialog = {
  kind: JsonEditKind;
  value: string;
};

type JsonValidation = {
  ok: boolean;
  message: string;
};

type CaptureTarget = "raw" | "simple";

type ExtKeyTableKind = "macro" | "alias";

type AppPage = "editor" | "projects" | "export";

type AppPageDefinition = {
  id: AppPage;
  label: string;
  description: string;
};

type ContextPickerKind = "project" | "layout";

type ContextPickerOption = {
  value: string;
  label: string;
  meta: string;
};

type AppSnapshot = {
  project: SavedKeyboardProject | null;
  activeLayoutId: string;
  activeLayerName: string;
  selectedSlot: string;
};

const appPages: AppPageDefinition[] = [
  { id: "projects", label: "Project", description: "Project library and keyboard model" },
  { id: "editor", label: "Layout", description: "Layouts, keyboard, and key actions" },
  { id: "export", label: "Export", description: "JSON and KLE downloads" }
];

const behaviorFields: BehaviorField[] = [
  { id: "tap", label: "When tapped", placeholder: "KC_SPC", help: "Normal tap output." },
  { id: "hold", label: "When held", placeholder: "NAVI or KC_LCTL", help: "Layer name or held modifier." },
  { id: "doubleTap", label: "When double tapped", placeholder: "KC_ESC", help: "Stored for tap-dance/custom generation." },
  { id: "tapHold", label: "When tapped and held", placeholder: "TG(NAVI)", help: "Stored for tap-dance/custom generation." }
];

const danceBehaviorFields = behaviorFields;

const layerPalette = [
  "#0078a8",
  "#e75d3f",
  "#5c8a21",
  "#b07700",
  "#7c5cc4",
  "#00866b",
  "#c24f87",
  "#5067c7",
  "#d14a72",
  "#2f8f83",
  "#d47d00",
  "#4f7fdb",
  "#8a6a17",
  "#b457c7",
  "#37733f",
  "#9f4d2c"
];

const simpleKeycodeMods = [
  { id: "shift", label: "Shift", wrapper: "LSFT" },
  { id: "ctrl", label: "Ctrl", wrapper: "LCTL" },
  { id: "alt", label: "Alt", wrapper: "LALT" },
  { id: "gui", label: "Gui", wrapper: "LGUI" }
];

const jsonEditLabels: Record<JsonEditKind, { eyebrow: string; title: string; help: string }> = {
  project: {
    eyebrow: "Project JSON",
    title: "Edit current project JSON",
    help: "Save replaces the active project with the edited qmk-viz project JSON."
  },
  layout: {
    eyebrow: "Layout JSON",
    title: "Edit current layout JSON",
    help: "Save replaces the active layout document with the edited layout JSON and preserves its version tree."
  },
  kle: {
    eyebrow: "KLE JSON",
    title: "Edit current KLE JSON",
    help: "Save replaces the active keyboard model, reconciles matching key IDs, and keeps the project name unchanged."
  }
};

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

function isMacroExtKey(key: ExtKey): boolean {
  return `${key.kind} ${key.name}`.toLowerCase().includes("macro");
}

function applySimpleKeycodeModifiers(keycode: string, modifiers: string[]): string {
  const cleanKeycode = keycode.trim() || "KC_NO";
  return simpleKeycodeMods
    .filter((modifier) => modifiers.includes(modifier.id))
    .map((modifier) => modifier.wrapper)
    .reduce((wrapped, wrapper) => `${wrapper}(${wrapped})`, cleanKeycode);
}

function simpleModifiersFromEvent(event: KeyboardEvent): string[] {
  return [
    event.shiftKey ? "shift" : "",
    event.ctrlKey ? "ctrl" : "",
    event.altKey ? "alt" : "",
    event.metaKey ? "gui" : ""
  ].filter(Boolean);
}

function validateJsonText(value: string, emptyMessage: string, validateRaw: (raw: unknown) => void): JsonValidation {
  const clean = value.trim();
  if (!clean) {
    return { ok: false, message: emptyMessage };
  }

  try {
    validateRaw(JSON.parse(clean) as unknown);
    return { ok: true, message: "JSON is valid." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Invalid JSON."
    };
  }
}

function isModifierKeyEvent(event: KeyboardEvent): boolean {
  return event.key === "Shift" || event.key === "Control" || event.key === "Alt" || event.key === "Meta";
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rewriteLayerReference(action: string, fromLayer: string, toLayer: string): string {
  if (!action || fromLayer === toLayer) return action;

  const escapedFrom = escapeRegExp(fromLayer);
  return action
    .replace(new RegExp(`\\b(MO|TG|TT|TO|DF|OSL)\\(\\s*${escapedFrom}\\s*\\)`, "g"), `$1(${toLayer})`)
    .replace(new RegExp(`\\b(LT|LM)\\(\\s*${escapedFrom}\\s*,`, "g"), `$1(${toLayer},`);
}

export function App() {
  const keyboardViewportRef = useRef<HTMLDivElement | null>(null);
  const contextPickerSearchRef = useRef<HTMLInputElement | null>(null);
  const [keyboardProjects, setKeyboardProjects] = useState<SavedKeyboardProject[]>(loadKeyboardProjects);
  const [exampleProjects] = useState<SavedKeyboardProject[]>(loadExampleProjects);
  const initialKeyboardProject = keyboardProjects[0] ?? null;
  const initialLayout = activeLayoutFor(initialKeyboardProject);
  const initialDocument = initialLayout ? cloneKeymapDocument(initialLayout.document) : createEmptyKeymapDocument();
  const [activePage, setActivePage] = useState<AppPage>(initialKeyboardProject ? "editor" : "projects");
  const [activeKeyboardProjectId, setActiveKeyboardProjectId] = useState(initialKeyboardProject?.id ?? "");
  const [activeLayoutId, setActiveLayoutId] = useState(initialLayout?.id ?? "");
  const initialVersion = initialLayout?.versions.find((version) => version.id === initialLayout.activeVersionId) ?? initialLayout?.versions[0];
  const [keyboardProjectNameDraft, setKeyboardProjectNameDraft] = useState(initialKeyboardProject?.name ?? "");
  const [layoutNameDraft, setLayoutNameDraft] = useState(initialLayout?.name ?? "");
  const [versionNameDraft, setVersionNameDraft] = useState("");
  const [selectedVersionNameDraft, setSelectedVersionNameDraft] = useState(initialVersion?.name ?? "");
  const [model, setModel] = useState<KeyboardModel | null>(initialKeyboardProject?.model ?? null);
  const [layers, setLayers] = useState<KeymapLayer[]>(() => initialDocument.layers);
  const [layerColors, setLayerColors] = useState<Record<string, string>>(() => initialDocument.layerColors ?? {});
  const [activeLayerName, setActiveLayerName] = useState(layers[0]?.name ?? "BASE");
  const [layerNameDraft, setLayerNameDraft] = useState(layers[0]?.name ?? "BASE");
  const [selectedSlot, setSelectedSlot] = useState(model?.keys[0]?.slot ?? "");
  const [swapSourceSlot, setSwapSourceSlot] = useState<string | null>(null);
  const [draftAction, setDraftAction] = useState("");
  const [behaviorSlots, setBehaviorSlots] = useState<BehaviorSlots>(() => parseActionToBehaviorSlots(""));
  const [composerMode, setComposerMode] = useState<ComposerMode>("simple");
  const [syncComposerWithSelection, setSyncComposerWithSelection] = useState(false);
  const [simpleKind, setSimpleKind] = useState<SimpleComposerKind>("plain");
  const [simpleRawAction, setSimpleRawAction] = useState("KC_NO");
  const [simpleKeycode, setSimpleKeycode] = useState("KC_SPC");
  const [simpleKeycodeModifiers, setSimpleKeycodeModifiers] = useState<string[]>([]);
  const [simpleLayer, setSimpleLayer] = useState("SYMB");
  const [modTapModifier, setModTapModifier] = useState("CTL_T");
  const [extraKeyNameDraft, setExtraKeyNameDraft] = useState("KK_CUSTOM");
  const [danceName, setDanceName] = useState("DANCE_0");
  const [dances, setDances] = useState<Record<string, BehaviorSlots>>(() => ({ ...initialDocument.dances }));
  const [extKeys, setExtKeys] = useState<ExtKey[]>(() => initialDocument.extKeys.map((key) => ({ ...key })));
  const [editingDanceName, setEditingDanceName] = useState<string | null>(null);
  const [danceDraftName, setDanceDraftName] = useState("DANCE_0");
  const [danceDraftSlots, setDanceDraftSlots] = useState<BehaviorSlots>({ tap: "", hold: "", doubleTap: "", tapHold: "" });
  const [editingExtKeyName, setEditingExtKeyName] = useState<string | null>(null);
  const [extKeyDraft, setExtKeyDraft] = useState<ExtKey>({ name: "KK_CUSTOM", kind: "alias", value: "KC_NO", notes: "" });
  const [statusMessage, setStatusMessageState] = useState("");
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [captureTarget, setCaptureTarget] = useState<CaptureTarget | null>(null);
  const [renameDialog, setRenameDialog] = useState<RenameDialog | null>(null);
  const [createLayoutNameDraft, setCreateLayoutNameDraft] = useState<string | null>(null);
  const [jsonEditDialog, setJsonEditDialog] = useState<JsonEditDialog | null>(null);
  const [projectSearchDraft, setProjectSearchDraft] = useState("");
  const [showKleHelp, setShowKleHelp] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [openContextPicker, setOpenContextPicker] = useState<ContextPickerKind | null>(null);
  const [contextPickerSearch, setContextPickerSearch] = useState("");
  const [contextPickerActiveIndex, setContextPickerActiveIndex] = useState(0);
  const [keyboardViewportSize, setKeyboardViewportSize] = useState(() => ({
    width: 0,
    screenHeight: typeof window === "undefined" ? 900 : window.innerHeight
  }));

  const activeKeyboardProject = keyboardProjects.find((project) => project.id === activeKeyboardProjectId) ?? null;
  const availableLayouts = activeKeyboardProject?.layouts ?? [];
  const activeSavedLayout = availableLayouts.find((layout) => layout.id === activeLayoutId) ?? availableLayouts[0] ?? null;
  const activeLayoutVersion = activeSavedLayout?.versions.find((version) => version.id === activeSavedLayout.activeVersionId) ?? activeSavedLayout?.versions[0] ?? null;
  const hasModel = model !== null;
  const hasLayout = activeSavedLayout !== null;
  const projectStats = useMemo(() => keyboardProjects.map((project) => ({
    id: project.id,
    name: project.name,
    layoutCount: project.layouts.length,
    versionCount: project.layouts.reduce((total, layout) => total + layout.versions.length, 0),
    keyCount: project.model?.keys.length ?? 0
  })), [keyboardProjects]);
  const filteredProjectStats = useMemo(() => {
    const query = projectSearchDraft.trim().toLowerCase();
    if (!query) return projectStats;
    return projectStats.filter((project) => project.name.toLowerCase().includes(query));
  }, [projectSearchDraft, projectStats]);
  const projectPickerOptions = useMemo<ContextPickerOption[]>(() => keyboardProjects.map((project) => ({
    value: project.id,
    label: project.name,
    meta: `${project.layouts.length} layouts / ${project.model?.keys.length ?? 0} keys`
  })), [keyboardProjects]);
  const layoutPickerOptions = useMemo<ContextPickerOption[]>(() => availableLayouts.map((layout) => ({
    value: layout.id,
    label: layout.name,
    meta: `${layout.versions.length} versions`
  })), [availableLayouts]);
  const foundLayerIndex = layers.findIndex((layer) => layer.name === activeLayerName);
  const activeLayerIndex = foundLayerIndex >= 0 ? foundLayerIndex : 0;
  const activeLayer = layers[activeLayerIndex] ?? layers[0] ?? { name: "BASE", keys: {} };
  const layerColorMap = useMemo(() => Object.fromEntries(
    layers.map((layer, index) => [layer.name, layerColors[layer.name] ?? layerPalette[index % layerPalette.length]])
  ), [layerColors, layers]);
  const selectedKey = model?.keys.find((key) => key.slot === selectedSlot) ?? model?.keys[0] ?? null;
  const currentAction = selectedKey ? selectedKeycode(activeLayer, selectedKey.slot) : TRANSPARENT;
  const keyboardStageSize = useMemo(() => ({
    width: model ? model.width * model.unit : 0,
    height: model ? model.height * model.unit : 0
  }), [model]);
  const keyboardScale = useMemo(() => {
    if (!keyboardStageSize.width || !keyboardStageSize.height) return 1;
    const measuredWidth = keyboardViewportSize.width || keyboardStageSize.width;
    const widthScale = (measuredWidth - 4) / keyboardStageSize.width;
    const maxVisualHeight = Math.max(560, keyboardViewportSize.screenHeight * 0.72);
    const heightScale = maxVisualHeight / keyboardStageSize.height;
    const fitScale = Math.min(widthScale, heightScale);

    return clampNumber(Number.isFinite(fitScale) ? fitScale : 1, 0.68, 1.35);
  }, [keyboardStageSize.height, keyboardStageSize.width, keyboardViewportSize.screenHeight, keyboardViewportSize.width]);
  const keyboardVisualSize = useMemo(() => ({
    width: keyboardStageSize.width * keyboardScale,
    height: keyboardStageSize.height * keyboardScale
  }), [keyboardScale, keyboardStageSize.height, keyboardStageSize.width]);
  const keymapDocument = useMemo<KeymapDocument>(() => ({
    version: 1,
    layers,
    dances,
    extKeys,
    layerColors
  }), [dances, extKeys, layerColors, layers]);
  const jsonOutput = useMemo(() => {
    if (!activeKeyboardProject || !model || !activeSavedLayout) {
      return JSON.stringify({
        version: 1,
        keyboardProject: {
          id: activeKeyboardProjectId,
          name: keyboardProjectNameDraft.trim() || activeKeyboardProject?.name || null
        },
        keyboard: null,
        layout: null
      }, null, 2);
    }

    return serializeKeymapExport(model, keymapDocument, {
      keyboardProjectId: activeKeyboardProjectId,
      keyboardProjectName: keyboardProjectNameDraft.trim() || activeKeyboardProject.name,
      layoutId: activeLayoutId,
      layoutName: layoutNameDraft.trim() || activeSavedLayout.name
    });
  }, [
    activeKeyboardProject,
    activeKeyboardProjectId,
    activeSavedLayout,
    activeLayoutId,
    keyboardProjectNameDraft,
    keymapDocument,
    layoutNameDraft,
    model
  ]);
  const jsonEditValidation = useMemo<JsonValidation>(() => {
    if (!jsonEditDialog) return { ok: true, message: "" };

    return validateJsonText(jsonEditDialog.value, "JSON editor is empty.", (raw) => {
      if (jsonEditDialog.kind === "project") {
        parseProjectFile(raw, "edited-project.json");
      } else if (jsonEditDialog.kind === "layout") {
        if (!model) {
          throw new Error("Upload or edit a KLE model before editing layout JSON.");
        }
        parseLayoutUpload(raw, model, layoutNameDraft || "Edited Layout");
      } else {
        buildKeyboardModelFromKle(raw, { source: "edited-kle.json" });
      }
    });
  }, [jsonEditDialog, layoutNameDraft, model]);

  function setStatusMessage(message: string) {
    setStatusMessageState(message);
    if (message) {
      toast(message, { duration: 2800 });
    }
  }

  useEffect(() => {
    const node = keyboardViewportRef.current;
    if (!node) return undefined;

    const updateViewportSize = () => {
      const nextWidth = node.clientWidth;
      const nextHeight = window.innerHeight;
      setKeyboardViewportSize((current) => (
        Math.abs(current.width - nextWidth) < 0.5 && current.screenHeight === nextHeight
          ? current
          : { width: nextWidth, screenHeight: nextHeight }
      ));
    };

    updateViewportSize();
    window.addEventListener("resize", updateViewportSize);

    if (typeof ResizeObserver === "undefined") {
      return () => window.removeEventListener("resize", updateViewportSize);
    }

    const observer = new ResizeObserver(updateViewportSize);
    observer.observe(node);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateViewportSize);
    };
  }, [activePage]);

  function projectWithEditorState(): SavedKeyboardProject | null {
    if (!activeKeyboardProject) return null;

    const now = new Date().toISOString();
    const layoutName = layoutNameDraft.trim() || activeSavedLayout?.name || "Layout";
    const nextLayouts = model ? availableLayouts.map((layout) => (
      activeSavedLayout && layout.id === activeLayoutId
        ? cloneSavedLayout({
          ...layout,
          name: layoutName,
          document: cloneKeymapDocument(keymapDocument),
          updatedAt: now
        }, model)
        : cloneSavedLayout(layout, model)
    )) : [];

    return {
      ...activeKeyboardProject,
      name: keyboardProjectNameDraft.trim() || activeKeyboardProject.name,
      model: model ? sanitizeKeyboardModel(model) : null,
      layouts: nextLayouts,
      activeLayoutId: activeSavedLayout ? activeLayoutId : "",
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

  function loadEmptyWorkspace(options: { resetHistory?: boolean } = {}) {
    const document = createEmptyKeymapDocument();
    setActiveKeyboardProjectId("");
    setActiveLayoutId("");
    setKeyboardProjectNameDraft("");
    setLayoutNameDraft("");
    setVersionNameDraft("");
    setSelectedVersionNameDraft("");
    setModel(null);
    setLayers(document.layers);
    setLayerColors(document.layerColors ?? {});
    setDances(document.dances);
    setExtKeys(document.extKeys);
    setActiveLayerName(document.layers[0]?.name ?? "BASE");
    setLayerNameDraft(document.layers[0]?.name ?? "BASE");
    setSelectedSlot("");
    setDraftAction("");
    setSwapSourceSlot(null);
    if (options.resetHistory !== false) {
      setUndoStack([]);
      setRedoStack([]);
    }
  }

  function loadLayoutObject(project: SavedKeyboardProject, layout: SavedLayout | null, options: {
    resetHistory?: boolean;
    selectedSlot?: string;
    activeLayerName?: string;
  } = {}) {
    const document = layout ? cloneKeymapDocument(layout.document) : createEmptyKeymapDocument();
    const nextLayerName = options.activeLayerName && document.layers.some((layer) => layer.name === options.activeLayerName)
      ? options.activeLayerName
      : document.layers[0]?.name ?? "BASE";
    const nextSelectedSlot = options.selectedSlot && project.model?.keys.some((key) => key.slot === options.selectedSlot)
      ? options.selectedSlot
      : project.model?.keys[0]?.slot ?? "";

    setActiveKeyboardProjectId(project.id);
    setActiveLayoutId(layout?.id ?? "");
    setKeyboardProjectNameDraft(project.name);
    setLayoutNameDraft(layout?.name ?? "");
    setVersionNameDraft("");
    setSelectedVersionNameDraft((layout?.versions.find((version) => version.id === layout.activeVersionId) ?? layout?.versions[0])?.name ?? "");
    setModel(project.model);
    setLayers(document.layers);
    setLayerColors(document.layerColors ?? {});
    setDances(document.dances);
    setExtKeys(document.extKeys);
    setActiveLayerName(nextLayerName);
    setLayerNameDraft(nextLayerName);
    setSelectedSlot(nextSelectedSlot);
    setDraftAction("");
    setSwapSourceSlot(null);
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
    const saved = JSON.parse(source) as AppSnapshot;
    if (!saved.project) {
      loadEmptyWorkspace({ resetHistory: false });
      return;
    }

    const savedProject = saved.project;
    const layout = savedProject.layouts.find((item) => item.id === saved.activeLayoutId) ?? activeLayoutFor(savedProject);
    const document = layout ? cloneKeymapDocument(layout.document) : createEmptyKeymapDocument();
    const nextLayerName = document.layers.find((layer) => layer.name === saved.activeLayerName)?.name ?? document.layers[0]?.name ?? "BASE";
    const nextSelectedSlot = savedProject.model?.keys.some((key) => key.slot === saved.selectedSlot)
      ? saved.selectedSlot
      : savedProject.model?.keys[0]?.slot ?? "";

    setKeyboardProjects((current) => {
      const hasSnapshotProject = current.some((project) => project.id === savedProject.id);
      return hasSnapshotProject
        ? current.map((project) => project.id === savedProject.id ? savedProject : project)
        : [...current, savedProject];
    });
    setActiveKeyboardProjectId(savedProject.id);
    setActiveLayoutId(layout?.id ?? "");
    setKeyboardProjectNameDraft(savedProject.name);
    setLayoutNameDraft(layout?.name ?? "");
    setModel(savedProject.model);
    setLayers(document.layers);
    setLayerColors(document.layerColors ?? {});
    setDances(document.dances);
    setExtKeys(document.extKeys);
    setActiveLayerName(nextLayerName);
    setLayerNameDraft(nextLayerName);
    setSelectedSlot(nextSelectedSlot);
    setDraftAction("");
    setSwapSourceSlot(null);
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
    if (!activeKeyboardProject || !layout) return;
    loadLayoutObject(activeKeyboardProject, layout);
    setStatusMessage(`Loaded layout ${layout.name}.`);
  }

  function selectKey(key: KeySlot) {
    setSelectedSlot(key.slot);
    setDraftAction(selectedKeycode(activeLayer, key.slot));
  }

  function startKeySwap() {
    if (!selectedKey) {
      setStatusMessage("Upload a KLE model and select a key before starting a swap.");
      return;
    }
    setSwapSourceSlot(selectedKey.slot);
    setStatusMessage(`Select another key to swap with ${selectedKey.slot} on ${activeLayer.name}.`);
  }

  function cancelKeySwap() {
    setSwapSourceSlot(null);
    setStatusMessage("Canceled key swap.");
  }

  function swapKeySlots(sourceSlot: string, targetKey: KeySlot) {
    if (targetKey.slot === sourceSlot) {
      setStatusMessage(`Choose a different key to swap with ${sourceSlot}.`);
      return;
    }

    const sourceAction = selectedKeycode(activeLayer, sourceSlot);
    const targetAction = selectedKeycode(activeLayer, targetKey.slot);

    if (sourceAction !== targetAction) {
      recordHistory();
      setLayers((current) => current.map((layer) => {
        if (layer.name !== activeLayer.name) return layer;
        return {
          ...layer,
          keys: {
            ...layer.keys,
            [sourceSlot]: targetAction,
            [targetKey.slot]: sourceAction
          }
        };
      }));
    }

    setSelectedSlot(targetKey.slot);
    setDraftAction(sourceAction);
    setSwapSourceSlot(null);
    setStatusMessage(`Swapped ${sourceSlot} and ${targetKey.slot} on ${activeLayer.name}.`);
  }

  function swapKeyWithSource(targetKey: KeySlot) {
    if (!swapSourceSlot) return;
    swapKeySlots(swapSourceSlot, targetKey);
  }

  function handleKeyDragStart(key: KeySlot, event: DragEvent<HTMLButtonElement>) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-qmk-viz-slot", key.slot);
    event.dataTransfer.setData("text/plain", key.slot);
    setSwapSourceSlot(key.slot);
    setStatusMessage(`Drag ${key.slot} onto another key to swap mappings on ${activeLayer.name}.`);
  }

  function handleKeyDragOver(event: DragEvent<HTMLButtonElement>) {
    if (!swapSourceSlot) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleKeyDrop(targetKey: KeySlot, event: DragEvent<HTMLButtonElement>) {
    const sourceSlot = event.dataTransfer.getData("application/x-qmk-viz-slot") || swapSourceSlot;
    if (!sourceSlot) return;
    event.preventDefault();
    swapKeySlots(sourceSlot, targetKey);
  }

  function handleKeyDragEnd(key: KeySlot) {
    setSwapSourceSlot((current) => current === key.slot ? null : current);
  }

  function handleKeyClick(key: KeySlot) {
    if (swapSourceSlot) {
      swapKeyWithSource(key);
      return;
    }

    selectKey(key);
    setStatusMessage(`Selected ${key.slot} on ${activeLayer.name}.`);
  }

  function writeAction(value: string) {
    if (!selectedKey || !activeSavedLayout) {
      setStatusMessage("Create or import a layout and select a key before writing an action.");
      return;
    }
    const before = selectedKeycode(activeLayer, selectedKey.slot);
    if (before !== value) {
      recordHistory();
    }
    setLayers((current) => updateKeycode(current, activeLayer.name, selectedKey.slot, value));
    setDraftAction(value);
    setSwapSourceSlot(null);
  }

  function applyGeneratedAction() {
    if (!selectedKey || !activeSavedLayout) {
      setStatusMessage("Create or import a layout and select a key before applying an action.");
      return;
    }
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
    setSwapSourceSlot(null);
    setStatusMessage(`Applied ${generatedAction} to ${selectedKey.slot}.`);
  }

  function saveGeneratedActionAsExtraKey() {
    const name = extraKeyNameDraft.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
    if (!name) {
      setStatusMessage("Enter an extra key name before saving the generated action.");
      return;
    }

    recordHistory();
    const nextKey: ExtKey = {
      name,
      kind: "alias",
      value: generatedAction,
      notes: `Generated from ${composerMode} composer`
    };

    setExtKeys((current) => {
      const exists = current.some((key) => key.name === name);
      return exists
        ? current.map((key) => key.name === name ? nextKey : key)
        : [...current, nextKey];
    });
    setExtraKeyNameDraft(name);
    setStatusMessage(`Saved ${name} as an extra key alias for ${generatedAction}.`);
  }

  function startNewDance() {
    setEditingDanceName("");
    setDanceDraftName(`DANCE_${danceRows.length}`);
    setDanceDraftSlots({ tap: "", hold: "", doubleTap: "", tapHold: "" });
  }

  function startEditDance(name: string, slots: BehaviorSlots) {
    setEditingDanceName(name);
    setDanceDraftName(name);
    setDanceDraftSlots({ ...slots });
  }

  function saveDanceDraft() {
    const name = danceDraftName.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
    if (!name) {
      setStatusMessage("Enter a dance name before saving.");
      return;
    }

    recordHistory();
    setDances((current) => {
      const next = { ...current };
      if (editingDanceName && editingDanceName !== name) {
        delete next[editingDanceName];
      }
      next[name] = { ...danceDraftSlots };
      return next;
    });
    setEditingDanceName(null);
    setDanceDraftName(name);
    setStatusMessage(`Saved dance ${name}.`);
  }

  function deleteDance(name: string) {
    if (!window.confirm(`Delete dance "${name}"?`)) return;
    recordHistory();
    setDances((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
    if (editingDanceName === name) {
      setEditingDanceName(null);
    }
    setStatusMessage(`Deleted dance ${name}.`);
  }

  function startNewExtKey(kind: ExtKeyTableKind) {
    setEditingExtKeyName("");
    setExtKeyDraft({
      name: kind === "macro" ? "MACRO_CUSTOM" : "KK_CUSTOM",
      kind,
      value: kind === "macro" ? "SEND_STRING(\"\")" : "KC_NO",
      notes: ""
    });
  }

  function startEditExtKey(key: ExtKey) {
    setEditingExtKeyName(key.name);
    setExtKeyDraft({ ...key });
  }

  function saveExtKeyDraft() {
    const name = extKeyDraft.name.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
    if (!name) {
      setStatusMessage("Enter an extra key name before saving.");
      return;
    }

    const nextKey = {
      ...extKeyDraft,
      name,
      kind: extKeyDraft.kind || "alias",
      value: extKeyDraft.value.trim() || "KC_NO"
    };

    recordHistory();
    setExtKeys((current) => {
      const removeName = editingExtKeyName || name;
      const withoutOld = current.filter((key) => key.name !== removeName && key.name !== name);
      return [...withoutOld, nextKey];
    });
    setEditingExtKeyName(null);
    setExtKeyDraft(nextKey);
    setStatusMessage(`Saved extra key ${name}.`);
  }

  function deleteExtKey(name: string) {
    if (!window.confirm(`Delete extra key "${name}"?`)) return;
    recordHistory();
    setExtKeys((current) => current.filter((key) => key.name !== name));
    if (editingExtKeyName === name) {
      setEditingExtKeyName(null);
    }
    setStatusMessage(`Deleted extra key ${name}.`);
  }

  function updateBehaviorSlot(id: keyof BehaviorSlots, value: string) {
    setBehaviorSlots((current) => ({ ...current, [id]: value }));
  }

  function renameActiveLayer() {
    const nextName = normalizeLayerName(layerNameDraft, activeLayer.name);
    if (nextName === activeLayer.name) {
      setLayerNameDraft(nextName);
      return;
    }
    if (layers.some((layer, index) => index !== activeLayerIndex && layer.name === nextName)) {
      setStatusMessage(`Layer ${nextName} already exists. Choose a unique layer name.`);
      setLayerNameDraft(activeLayer.name);
      return;
    }

    recordHistory();
    setLayers((current) => current.map((layer, index) => (
      index === activeLayerIndex
        ? {
          ...layer,
          name: nextName,
          keys: Object.fromEntries(
            Object.entries(layer.keys).map(([slot, action]) => [
              slot,
              rewriteLayerReference(action, activeLayer.name, nextName)
            ])
          )
        }
        : {
          ...layer,
          keys: Object.fromEntries(
            Object.entries(layer.keys).map(([slot, action]) => [
              slot,
              rewriteLayerReference(action, activeLayer.name, nextName)
            ])
          )
        }
    )));
    setDances((current) => Object.fromEntries(
      Object.entries(current).map(([name, slots]) => [
        name,
        {
          tap: rewriteLayerReference(slots.tap, activeLayer.name, nextName),
          hold: rewriteLayerReference(slots.hold, activeLayer.name, nextName),
          doubleTap: rewriteLayerReference(slots.doubleTap, activeLayer.name, nextName),
          tapHold: rewriteLayerReference(slots.tapHold, activeLayer.name, nextName)
        }
      ])
    ));
    setExtKeys((current) => current.map((key) => ({
      ...key,
      value: rewriteLayerReference(key.value, activeLayer.name, nextName)
    })));
    setSimpleLayer((current) => current === activeLayer.name ? nextName : current);
    setLayerColors((current) => {
      const next = { ...current };
      if (current[activeLayer.name]) {
        next[nextName] = current[activeLayer.name];
      }
      delete next[activeLayer.name];
      return next;
    });
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
    setLayerColors((current) => {
      const next = { ...current };
      delete next[activeLayer.name];
      return next;
    });
    setActiveLayerName(nextName);
    setLayerNameDraft(nextName);
    setStatusMessage(`Removed layer ${activeLayerIndex}: ${activeLayer.name}.`);
  }

  function setActiveLayerColor(color: string) {
    recordHistory();
    setLayerColors((current) => ({
      ...current,
      [activeLayer.name]: color
    }));
    setStatusMessage(`Set ${activeLayer.name} color to ${color}.`);
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
    if (!nextProject) return;
    setKeyboardProjects((current) => current.map((project) => (
      project.id === nextProject.id ? nextProject : project
    )));
  }

  function openProjectRenameDialog() {
    if (!activeKeyboardProject) {
      setStatusMessage("Create or import a project before renaming it.");
      return;
    }
    setRenameDialog({
      kind: "project",
      value: keyboardProjectNameDraft || activeKeyboardProject.name
    });
  }

  function openLayoutRenameDialog() {
    if (!activeSavedLayout) {
      setStatusMessage("Create or import a layout before renaming it.");
      return;
    }
    setRenameDialog({
      kind: "layout",
      value: layoutNameDraft || activeSavedLayout.name
    });
  }

  function openCreateLayoutDialog() {
    if (!activeKeyboardProject || !model) {
      setStatusMessage("Create a project and add a KLE model before creating layouts.");
      return;
    }
    setCreateLayoutNameDraft(uniqueLayoutName("New Layout", availableLayouts));
  }

  function submitRenameDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!renameDialog) return;

    const name = renameDialog.value.trim();
    if (!name) {
      setStatusMessage(`Enter a ${renameDialog.kind} name before saving.`);
      return;
    }

    recordHistory();
    const now = new Date().toISOString();
    const baseProject = projectWithEditorState();
    if (!baseProject) {
      setStatusMessage("Create or import a project before renaming.");
      setRenameDialog(null);
      return;
    }

    if (renameDialog.kind === "project") {
      const nextProject = {
        ...baseProject,
        name,
        updatedAt: now
      };

      setKeyboardProjectNameDraft(name);
      setKeyboardProjects((current) => current.map((project) => (
        project.id === nextProject.id ? nextProject : project
      )));
      setStatusMessage(`Renamed project to ${name}.`);
    } else {
      if (!model || !activeSavedLayout) {
        setStatusMessage("Create or import a layout before renaming it.");
        setRenameDialog(null);
        return;
      }
      const nextLayouts = baseProject.layouts.map((layout) => (
        layout.id === activeLayoutId
          ? cloneSavedLayout({ ...layout, name, updatedAt: now }, model)
          : layout
      ));
      const nextProject = {
        ...baseProject,
        layouts: nextLayouts,
        updatedAt: now
      };

      setLayoutNameDraft(name);
      setKeyboardProjects((current) => current.map((project) => (
        project.id === nextProject.id ? nextProject : project
      )));
      setStatusMessage(`Renamed layout to ${name}.`);
    }

    setRenameDialog(null);
  }

  function createBlankKeyboardProject() {
    const project = createEmptyKeyboardProject();
    setKeyboardProjects((current) => [...current, project]);
    loadKeyboardProjectObject(project);
    setStatusMessage("Created an empty keyboard project. Upload or edit KLE JSON to configure its model.");
  }

  function duplicateKeyboardProject() {
    if (!activeKeyboardProject) {
      setStatusMessage("Create or import a project before duplicating it.");
      return;
    }
    const project = createKeyboardProject(
      `${keyboardProjectNameDraft || "Keyboard Project"} copy`,
      model,
      model ? availableLayouts : [],
      activeKeyboardProject.defaultLayout.document
    );
    setKeyboardProjects((current) => [...current, project]);
    loadKeyboardProjectObject(project);
    setStatusMessage(`Duplicated keyboard project as ${project.name}.`);
  }

  function deleteKeyboardProject() {
    if (!activeKeyboardProject) {
      setStatusMessage("No project selected to delete.");
      return;
    }
    const layoutCount = activeKeyboardProject.layouts.length;
    const versionCount = activeKeyboardProject.layouts.reduce((total, layout) => total + layout.versions.length, 0);
    if (!window.confirm(`Delete project "${keyboardProjectNameDraft || activeKeyboardProject.name}" with ${layoutCount} layouts and ${versionCount} saved versions?`)) {
      return;
    }

    recordHistory();
    const remaining = keyboardProjects.filter((project) => project.id !== activeKeyboardProjectId);
    if (remaining.length === 0) {
      setKeyboardProjects([]);
      loadEmptyWorkspace({ resetHistory: false });
      setActivePage("projects");
      setStatusMessage("Deleted the final keyboard project. No user projects remain.");
      return;
    }

    setKeyboardProjects(remaining);
    loadKeyboardProjectObject(remaining[0], remaining[0].activeLayoutId, { resetHistory: false });
    setStatusMessage("Deleted keyboard project.");
  }

  function createBlankLayoutForActiveProject(name?: string) {
    if (!activeKeyboardProject || !model) {
      setStatusMessage("Create a project and add a KLE model before creating layouts.");
      return;
    }
    recordHistory();
    const baseProject = projectWithEditorState();
    if (!baseProject) return;
    const layout = createLayout(
      uniqueLayoutName(name || "New Layout", baseProject.layouts),
      baseProject.defaultLayout.document,
      model
    );
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
    setStatusMessage(`Created layout ${layout.name} from the Default template.`);
  }

  function submitCreateLayoutDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = createLayoutNameDraft?.trim();
    if (!name) {
      setStatusMessage("Enter a layout name before creating it.");
      return;
    }

    createBlankLayoutForActiveProject(name);
    setCreateLayoutNameDraft(null);
  }

  function duplicateLayout() {
    if (!model || !activeSavedLayout) {
      setStatusMessage("Create or import a layout before duplicating it.");
      return;
    }
    recordHistory();
    const layout = createLayout(
      uniqueLayoutName(`${layoutNameDraft || "Layout"} copy`, availableLayouts),
      keymapDocument,
      model
    );
    const baseProject = projectWithEditorState();
    if (!baseProject) return;
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
    if (!activeSavedLayout) {
      setStatusMessage("No layout selected to delete.");
      return;
    }

    if (!window.confirm(`Delete layout "${layoutNameDraft}" and its ${activeSavedLayout.versions.length} saved versions?`)) {
      return;
    }

    recordHistory();
    const baseProject = projectWithEditorState();
    if (!baseProject) return;
    const remaining = baseProject.layouts.filter((layout) => layout.id !== activeLayoutId);
    const nextLayout = remaining[0];
    const project = {
      ...baseProject,
      layouts: remaining,
      activeLayoutId: nextLayout?.id ?? "",
      updatedAt: new Date().toISOString()
    };
    setKeyboardProjects((current) => current.map((item) => (
      item.id === project.id ? project : item
    )));
    loadLayoutObject(project, nextLayout ?? null, { resetHistory: false });
    setStatusMessage("Deleted layout.");
  }

  function saveLayoutVersion() {
    if (!model || !activeSavedLayout || !activeLayoutVersion) {
      setStatusMessage("Create or import a layout before saving a version.");
      return;
    }
    recordHistory();
    const baseProject = projectWithEditorState();
    if (!baseProject) return;
    const layout = baseProject.layouts.find((item) => item.id === activeLayoutId) ?? baseProject.layouts[0];
    if (!layout) return;
    const versionName = versionNameDraft.trim() || `Version ${layout.versions.length + 1}`;
    const version = createLayoutVersion(
      keymapDocument,
      layout.activeVersionId,
      versionName,
      model
    );
    const nextLayout = cloneSavedLayout({
      ...layout,
      document: cloneKeymapDocument(keymapDocument),
      versions: [...layout.versions, version],
      activeVersionId: version.id,
      updatedAt: version.createdAt
    }, model);
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
    setVersionNameDraft("");
    setStatusMessage(`Saved ${nextLayout.name} ${version.name} from ${activeLayoutVersion.name}.`);
  }

  function loadLayoutVersion(versionId: string) {
    if (!model || !activeSavedLayout) return;
    const version = activeSavedLayout.versions.find((item) => item.id === versionId);
    if (!version) return;

    recordHistory();
    const now = new Date().toISOString();
    const baseProject = projectWithEditorState();
    if (!baseProject) return;
    const layout = baseProject.layouts.find((item) => item.id === activeLayoutId) ?? baseProject.layouts[0];
    if (!layout) return;
    const nextLayout = cloneSavedLayout({
      ...layout,
      document: cloneKeymapDocument(version.document),
      activeVersionId: version.id,
      updatedAt: now
    }, model);
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
    setStatusMessage(`Loaded ${nextLayout.name} ${version.name}; the next saved version will fork from it.`);
  }

  function renameActiveVersion() {
    if (!model || !activeSavedLayout || !activeLayoutVersion) {
      setStatusMessage("Create or import a layout before renaming versions.");
      return;
    }
    const name = selectedVersionNameDraft.trim();
    if (!name) {
      setStatusMessage("Enter a version name before renaming.");
      return;
    }

    if (name === activeLayoutVersion.name) {
      setStatusMessage(`${activeLayoutVersion.name} is already the selected version name.`);
      return;
    }

    recordHistory();
    const now = new Date().toISOString();
    const baseProject = projectWithEditorState();
    if (!baseProject) return;
    const layout = baseProject.layouts.find((item) => item.id === activeLayoutId) ?? baseProject.layouts[0];
    if (!layout) return;
    const nextLayout = cloneSavedLayout({
      ...layout,
      versions: layout.versions.map((version) => (
        version.id === activeLayoutVersion.id
          ? { ...version, name }
          : version
      )),
      updatedAt: now
    }, model);
    const project = {
      ...baseProject,
      layouts: baseProject.layouts.map((item) => item.id === nextLayout.id ? nextLayout : item),
      updatedAt: now
    };

    setKeyboardProjects((current) => current.map((item) => (
      item.id === project.id ? project : item
    )));
    setSelectedVersionNameDraft(name);
    setStatusMessage(`Renamed version to ${name}.`);
  }

  function deleteActiveVersion() {
    if (!model || !activeSavedLayout || !activeLayoutVersion) {
      setStatusMessage("Create or import a layout before deleting versions.");
      return;
    }
    if (activeSavedLayout.versions.length <= 1) {
      setStatusMessage("Cannot delete the only saved version.");
      return;
    }

    if (!window.confirm(`Delete version "${activeLayoutVersion.name}"? The saved keymap and KLE snapshot will be removed.`)) {
      return;
    }

    recordHistory();
    const now = new Date().toISOString();
    const baseProject = projectWithEditorState();
    if (!baseProject) return;
    const layout = baseProject.layouts.find((item) => item.id === activeLayoutId) ?? baseProject.layouts[0];
    if (!layout) return;
    const remainingVersions = layout.versions
      .filter((version) => version.id !== activeLayoutVersion.id)
      .map((version) => (
        version.parentId === activeLayoutVersion.id
          ? { ...version, parentId: activeLayoutVersion.parentId }
          : version
      ));
    const fallbackVersion =
      remainingVersions.find((version) => version.id === activeLayoutVersion.parentId) ??
      [...remainingVersions].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
    const nextLayout = cloneSavedLayout({
      ...layout,
      document: cloneKeymapDocument(fallbackVersion.document),
      versions: remainingVersions,
      activeVersionId: fallbackVersion.id,
      updatedAt: now
    }, model);
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
    setStatusMessage(`Deleted ${activeLayoutVersion.name}; selected ${fallbackVersion.name}.`);
  }

  function saveCurrentLayoutAsDefault() {
    if (!activeSavedLayout) {
      setStatusMessage("Create or import a layout before saving it as Default.");
      return;
    }
    recordHistory();
    const now = new Date().toISOString();
    const baseProject = projectWithEditorState();
    if (!baseProject) return;
    const project = {
      ...baseProject,
      defaultLayout: {
        document: cloneKeymapDocument(keymapDocument),
        updatedAt: now
      },
      updatedAt: now
    };

    setKeyboardProjects((current) => current.map((item) => (
      item.id === project.id ? project : item
    )));
    setStatusMessage(`Saved ${layoutNameDraft || activeSavedLayout.name} as the Default template for new layouts.`);
  }

  function updateActiveKeyboardModelFromJson(raw: unknown, sourceName: string) {
    if (!activeKeyboardProject) {
      setStatusMessage("Create or import a project before adding a KLE model.");
      return;
    }
    const importedModel = buildKeyboardModelFromKle(raw, { source: sourceName });
    recordHistory();

    const baseProject = projectWithEditorState();
    if (!baseProject) return;
    const nextLayouts = baseProject.layouts.map((layout) => reconcileSavedLayoutToModel({
      ...layout,
      updatedAt: new Date().toISOString()
    }, importedModel));
    const nextLayout = nextLayouts.find((layout) => layout.id === activeLayoutId) ?? nextLayouts[0];
    const nextProject = {
      ...baseProject,
      model: importedModel,
      defaultLayout: reconcileDefaultLayoutToModel(baseProject.defaultLayout, importedModel),
      layouts: nextLayouts,
      activeLayoutId: nextLayout?.id ?? "",
      updatedAt: new Date().toISOString()
    };

    setKeyboardProjects((current) => current.map((project) => (
      project.id === nextProject.id ? nextProject : project
    )));
    loadLayoutObject(nextProject, nextLayout ?? null, {
      resetHistory: false,
      selectedSlot,
      activeLayerName
    });
    setStatusMessage(`Updated KLE model to ${importedModel.name}; project name stayed ${nextProject.name}.`);
  }

  async function updateActiveKeyboardModel(file: File) {
    updateActiveKeyboardModelFromJson(JSON.parse(await file.text()) as unknown, file.name);
  }

  function uploadLayoutFromJson(raw: unknown, fallbackName: string) {
    if (!activeKeyboardProject || !model) {
      setStatusMessage("Create a project and add a KLE model before importing layouts.");
      return;
    }
    const layout = parseLayoutUpload(raw, model, uniqueLayoutName(fallbackName, availableLayouts));
    recordHistory();

    const baseProject = projectWithEditorState();
    if (!baseProject) return;
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

  async function uploadLayout(file: File) {
    const fallbackName = file.name.replace(/\.json$/i, "") || "Uploaded Layout";
    uploadLayoutFromJson(JSON.parse(await file.text()) as unknown, fallbackName);
  }

  function importFullProjectFromJson(raw: unknown, sourceName: string) {
    const project = parseProjectFile(raw, sourceName);
    setKeyboardProjects((current) => [...current, project]);
    loadKeyboardProjectObject(project);
    setStatusMessage(`Imported project ${project.name} with ${project.layouts.length} layouts.`);
  }

  async function importFullProject(file: File) {
    importFullProjectFromJson(JSON.parse(await file.text()) as unknown, file.name);
  }

  function restoreWorkspaceFromJson(raw: unknown, sourceName: string) {
    const workspace = parseWorkspaceFile(raw, sourceName);
    const projectCount = workspace.projects.length;
    const layoutCount = workspace.projects.reduce((total, project) => total + project.layouts.length, 0);
    const currentProjectCount = keyboardProjects.length;
    const currentLayoutCount = keyboardProjects.reduce((total, project) => total + project.layouts.length, 0);
    const confirmed = window.confirm(
      `Restore workspace from "${sourceName}"?\n\n` +
      `This replaces ${currentProjectCount} current projects / ${currentLayoutCount} layouts ` +
      `with ${projectCount} restored projects / ${layoutCount} layouts.`
    );

    if (!confirmed) {
      setStatusMessage("Canceled workspace restore.");
      return;
    }

    setKeyboardProjects(workspace.projects);
    if (workspace.projects.length === 0) {
      loadEmptyWorkspace();
      setActivePage("projects");
      setStatusMessage("Restored empty workspace. No user projects remain.");
      return;
    }

    const nextProject = workspace.projects.find((project) => project.id === workspace.activeProjectId) ?? workspace.projects[0];
    const nextLayoutId = nextProject.id === workspace.activeProjectId && workspace.activeLayoutId
      ? workspace.activeLayoutId
      : nextProject.activeLayoutId;
    const nextLayout = nextProject.layouts.find((layout) => layout.id === nextLayoutId) ?? activeLayoutFor(nextProject);
    loadKeyboardProjectObject(nextProject, nextLayout?.id ?? "", { resetHistory: true });
    setStatusMessage(`Restored workspace with ${projectCount} projects and ${layoutCount} layouts.`);
  }

  async function restoreWorkspace(file: File) {
    restoreWorkspaceFromJson(JSON.parse(await file.text()) as unknown, file.name);
  }

  function loadExampleProject(project: SavedKeyboardProject) {
    const name = keyboardProjects.some((item) => item.name === project.name)
      ? `${project.name} example`
      : project.name;
    const importedProject = cloneKeyboardProjectForLibrary(project, name);
    setKeyboardProjects((current) => [...current, importedProject]);
    loadKeyboardProjectObject(importedProject);
    setActivePage("editor");
    setStatusMessage(`Loaded example project ${importedProject.name}.`);
  }

  function currentProjectFileJson() {
    const project = projectWithEditorState();
    if (!project) return "";

    const projectFile: ProjectFile = {
      version: 1,
      kind: "qmk-viz-project",
      project
    };
    return JSON.stringify(projectFile, null, 2);
  }

  function openJsonEditDialog(kind: JsonEditKind) {
    if ((kind === "project" || kind === "kle") && !activeKeyboardProject) {
      setStatusMessage("Create or import a project before editing its JSON.");
      return;
    }
    if (kind === "layout" && !activeSavedLayout) {
      setStatusMessage("Create or import a layout before editing layout JSON.");
      return;
    }

    const valueByKind: Record<JsonEditKind, string> = {
      project: currentProjectFileJson(),
      layout: activeSavedLayout ? jsonOutput : "",
      kle: model ? serializeKeyboardModelKle(model) : ""
    };

    setJsonEditDialog({
      kind,
      value: valueByKind[kind]
    });
  }

  function submitJsonEditDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!jsonEditDialog) return;

    if (!jsonEditValidation.ok) {
      setStatusMessage(jsonEditValidation.message);
      return;
    }

    const edited = jsonEditDialog.value.trim();

    try {
      const raw = JSON.parse(edited) as unknown;

      if (jsonEditDialog.kind === "kle") {
        updateActiveKeyboardModelFromJson(raw, "edited-kle.json");
        setJsonEditDialog(null);
        return;
      }

      recordHistory();

      if (jsonEditDialog.kind === "project") {
        const project = parseProjectFile(raw, "edited-project.json");
        setKeyboardProjects((current) => [
          ...current.filter((item) => item.id !== activeKeyboardProjectId && item.id !== project.id),
          project
        ]);
        loadKeyboardProjectObject(project, project.activeLayoutId, { resetHistory: false, selectedSlot, activeLayerName });
        setStatusMessage(`Saved edited project JSON for ${project.name}.`);
      } else {
        if (!model || !activeSavedLayout) {
          setStatusMessage("Create or import a layout before saving layout JSON.");
          return;
        }
        const parsedLayout = parseLayoutUpload(raw, model, layoutNameDraft || "Edited Layout");
        const now = new Date().toISOString();
        const baseProject = projectWithEditorState();
        if (!baseProject) return;
        const existingLayout = baseProject.layouts.find((layout) => layout.id === activeLayoutId) ?? baseProject.layouts[0];
        if (!existingLayout) {
          setStatusMessage("Create or import a layout before saving layout JSON.");
          return;
        }
        const nextLayout = cloneSavedLayout({
          ...existingLayout,
          name: parsedLayout.name,
          document: cloneKeymapDocument(parsedLayout.document),
          updatedAt: now
        }, model);
        const project = {
          ...baseProject,
          layouts: baseProject.layouts.map((layout) => layout.id === activeLayoutId ? nextLayout : layout),
          activeLayoutId: nextLayout.id,
          updatedAt: now
        };

        setKeyboardProjects((current) => current.map((item) => item.id === project.id ? project : item));
        loadLayoutObject(project, nextLayout, { resetHistory: false, selectedSlot, activeLayerName });
        setStatusMessage(`Saved edited layout JSON for ${nextLayout.name}.`);
      }

      setJsonEditDialog(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to save edited JSON.");
    }
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(jsonOutput);
      setStatusMessage("Copied layout JSON to clipboard.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not copy layout JSON to clipboard.");
    }
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
    if (!model || !activeSavedLayout) {
      setStatusMessage("Create or import a layout before downloading layout JSON.");
      return;
    }
    const filename = `${safeFileSlug(layoutNameDraft, "qmk-layout")}.json`;
    downloadText(jsonOutput, filename);
    setStatusMessage(`Downloaded ${filename}.`);
  }

  function downloadFullProject() {
    if (!activeKeyboardProject) {
      setStatusMessage("Create or import a project before downloading it.");
      return;
    }
    const filename = `${safeFileSlug(keyboardProjectNameDraft, "qmk-viz-project")}.qmk-viz-project.json`;
    downloadText(currentProjectFileJson(), filename);
    setStatusMessage(`Downloaded ${filename}.`);
  }

  function downloadWorkspaceBackup() {
    const backup = {
      version: 1,
      kind: "qmk-viz-workspace",
      exportedAt: new Date().toISOString(),
      activeProjectId: activeKeyboardProjectId || null,
      activeLayoutId: activeLayoutId || null,
      projects: activeKeyboardProject
        ? keyboardProjects.map((project) => project.id === activeKeyboardProject.id ? projectWithEditorState() ?? project : project)
        : keyboardProjects
    };
    const filename = `qmk-viz-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    downloadText(JSON.stringify(backup, null, 2), filename);
    setStatusMessage(`Downloaded ${filename}.`);
  }

  function downloadProjectKle() {
    if (!model) {
      setStatusMessage("Upload or edit a KLE model before downloading Project KLE.");
      return;
    }
    const filename = `${safeFileSlug(keyboardProjectNameDraft, "keyboard")}.kle.json`;
    downloadText(serializeKeyboardModelKle(model), filename);
    setStatusMessage(`Downloaded ${filename}.`);
  }

  function downloadActiveLayerKle() {
    if (!model || !activeSavedLayout) {
      setStatusMessage("Create or import a layout before downloading Layer KLE.");
      return;
    }
    const filename = `${safeFileSlug(layoutNameDraft, "layout")}-${safeFileSlug(activeLayer.name, "layer")}.kle.json`;
    downloadText(serializeLayerKle(model, activeLayer), filename);
    setStatusMessage(`Downloaded ${filename}.`);
  }

  function closeActionMenus() {
    setOpenActionMenuId(null);
  }

  function closeContextPicker() {
    setOpenContextPicker(null);
    setContextPickerSearch("");
    setContextPickerActiveIndex(0);
  }

  function openContextPickerMenu(kind: ContextPickerKind) {
    setOpenActionMenuId(null);
    setOpenContextPicker((current) => current === kind ? null : kind);
    setContextPickerSearch("");
    setContextPickerActiveIndex(0);
  }

  function selectContextPickerOption(kind: ContextPickerKind, value: string) {
    if (kind === "project" && value !== activeKeyboardProjectId) {
      loadKeyboardProject(value);
    } else if (kind === "layout" && value !== activeLayoutId) {
      loadLayout(value);
    }
    closeContextPicker();
  }

  function filteredContextPickerOptions(options: ContextPickerOption[]) {
    const query = contextPickerSearch.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => (
      option.label.toLowerCase().includes(query) ||
      option.meta.toLowerCase().includes(query)
    ));
  }

  function handleContextPickerKeyDown(
    event: ReactKeyboardEvent,
    kind: ContextPickerKind,
    filteredOptions: ContextPickerOption[]
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeContextPicker();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setContextPickerActiveIndex((current) => (
        filteredOptions.length === 0 ? 0 : (current + 1) % filteredOptions.length
      ));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setContextPickerActiveIndex((current) => (
        filteredOptions.length === 0 ? 0 : (current - 1 + filteredOptions.length) % filteredOptions.length
      ));
      return;
    }

    if (event.key === "Enter") {
      const safeActiveIndex = filteredOptions.length > 0
        ? Math.min(contextPickerActiveIndex, filteredOptions.length - 1)
        : 0;
      const option = filteredOptions[safeActiveIndex];
      if (option) {
        event.preventDefault();
        selectContextPickerOption(kind, option.value);
      }
    }
  }

  function renderContextPicker(options: {
    kind: ContextPickerKind;
    label: string;
    value: string;
    emptyLabel: string;
    choices: ContextPickerOption[];
    disabled: boolean;
  }) {
    const { kind, label, value, emptyLabel, choices, disabled } = options;
    const isOpen = openContextPicker === kind;
    const filteredOptions = filteredContextPickerOptions(choices);
    const selectedOption = choices.find((option) => option.value === value);
    const safeActiveIndex = filteredOptions.length > 0
      ? Math.min(contextPickerActiveIndex, filteredOptions.length - 1)
      : 0;
    const activeOptionId = `${kind}-context-option-${safeActiveIndex}`;
    const triggerLabel = selectedOption?.label ?? emptyLabel;
    const triggerMeta = selectedOption?.meta ?? (disabled ? "Unavailable" : "Choose one");

    return (
      <div className="context-picker" data-context-picker-root>
        <span className="context-picker-label">{label}</span>
        <button
          aria-controls={`${kind}-context-listbox`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className="context-picker-trigger"
          data-testid={`top-${kind}-picker-trigger`}
          disabled={disabled}
          onClick={() => openContextPickerMenu(kind)}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openContextPickerMenu(kind);
            }
          }}
          type="button"
        >
          <strong>{triggerLabel}</strong>
          <small>{triggerMeta}</small>
        </button>
        {isOpen && (
          <div className="context-picker-popover" onKeyDown={(event) => handleContextPickerKeyDown(event, kind, filteredOptions)}>
            <input
              aria-activedescendant={filteredOptions.length > 0 ? activeOptionId : undefined}
              aria-controls={`${kind}-context-listbox`}
              aria-label={`Filter ${label.toLowerCase()} list`}
              className="context-picker-search"
              data-testid={`top-${kind}-picker-search`}
              onChange={(event) => {
                setContextPickerSearch(event.target.value);
                setContextPickerActiveIndex(0);
              }}
              placeholder={`Search ${label.toLowerCase()}...`}
              ref={contextPickerSearchRef}
              role="combobox"
              value={contextPickerSearch}
            />
            <div className="context-picker-options" id={`${kind}-context-listbox`} role="listbox">
              {filteredOptions.length > 0 ? filteredOptions.map((option, index) => {
                const isActive = index === safeActiveIndex;
                const isSelected = option.value === value;
                return (
                  <button
                    aria-selected={isSelected}
                    className={`context-picker-option ${isActive ? "active" : ""} ${isSelected ? "selected" : ""}`.trim()}
                    data-context-picker-active={isActive ? "true" : undefined}
                    data-testid={`top-${kind}-picker-option`}
                    id={`${kind}-context-option-${index}`}
                    key={option.value}
                    onClick={() => selectContextPickerOption(kind, option.value)}
                    onMouseEnter={() => setContextPickerActiveIndex(index)}
                    role="option"
                    type="button"
                  >
                    <span className="context-picker-option-main">
                      <strong>{option.label}</strong>
                      {isSelected && <em>selected</em>}
                    </span>
                    <small>{option.meta}</small>
                  </button>
                );
              }) : (
                <div className="context-picker-empty">No matches</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  function runMenuAction(action: () => void) {
    closeActionMenus();
    action();
  }

  function renderActionMenu(
    id: string,
    label: string,
    children: ReactNode,
    options: { className?: string; disabled?: boolean; icon?: string } = {}
  ) {
    const isOpen = openActionMenuId === id;

    return (
      <div className="action-menu" data-action-menu-root>
        <button
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className={`action-menu-trigger ${options.className ?? ""}`.trim()}
          data-icon={options.icon ?? "☰"}
          disabled={options.disabled}
          onClick={() => {
            closeContextPicker();
            setOpenActionMenuId((current) => current === id ? null : id);
          }}
          type="button"
        >
          {label}
        </button>
        {isOpen && (
          <div className="action-menu-popover" role="menu">
            {children}
          </div>
        )}
      </div>
    );
  }

  const simpleAction = simpleComposerActions.find((action) => action.kind === simpleKind) ?? simpleComposerActions[0];
  const composerLayerOptions = useMemo(() => layers.map((layer) => layer.name), [layers]);
  const simpleDecoratedKeycode = applySimpleKeycodeModifiers(simpleKeycode, simpleKeycodeModifiers);
  const simpleGeneratedAction =
    simpleKind === "raw"
      ? simpleRawAction.trim() || "KC_NO"
      : simpleKind === "mod_tap"
      ? composeModTapAction(simpleDecoratedKeycode, modTapModifier)
      : composeSimpleAction(simpleKind, simpleDecoratedKeycode, simpleLayer);
  const danceComposition = composeBehaviorAction(behaviorSlots, danceName);
  const generatedAction = composerMode === "dance" ? danceComposition.identifier : simpleGeneratedAction;
  const composerNote = composerMode === "dance" ? danceComposition.note : simpleAction.help;
  const selectedDetails = describeAction(currentAction);
  const draftDetails = describeAction(draftAction);
  const danceRows = Object.entries(dances).sort(([leftName], [rightName]) => leftName.localeCompare(rightName));
  const extKeyRows = [...extKeys].sort((left, right) => left.name.localeCompare(right.name));
  const macroRows = extKeyRows.filter(isMacroExtKey);
  const aliasRows = extKeyRows.filter((key) => !isMacroExtKey(key));
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  function syncComposerFromAction(action: string) {
    const cleanAction = action.trim();
    const tapDanceName = cleanAction.match(/^TD\(([^)]+)\)$/)?.[1] ?? (/^DANCE_\d+$/.test(cleanAction) ? cleanAction : "");

    if (tapDanceName && dances[tapDanceName]) {
      setComposerMode("dance");
      setDanceName(tapDanceName);
      setBehaviorSlots(dances[tapDanceName]);
      return;
    }

    const parsed = parseSimpleComposerAction(cleanAction);
    setComposerMode("simple");
    setSimpleKind(parsed.kind);
    setSimpleRawAction(parsed.rawAction);
    setSimpleKeycode(parsed.keycode);
    setSimpleKeycodeModifiers(parsed.keycodeModifiers);
    setSimpleLayer(parsed.layer);
    setModTapModifier(parsed.modTapModifier);
  }

  useEffect(() => {
    localStorage.setItem(KEYBOARD_PROJECTS_STORAGE_KEY, JSON.stringify(keyboardProjects));
  }, [keyboardProjects]);

  useEffect(() => {
    persistActiveKeyboardProject();
  }, [activeKeyboardProjectId, activeLayoutId, keyboardProjectNameDraft, keymapDocument, layoutNameDraft, model]);

  useEffect(() => {
    if (!simpleAction.fields.includes("layer") || composerLayerOptions.length === 0) return;
    if (!composerLayerOptions.includes(simpleLayer)) {
      setSimpleLayer(composerLayerOptions[0]);
    }
  }, [composerLayerOptions, simpleAction.fields, simpleLayer]);

  useEffect(() => {
    if (!openContextPicker) return;
    const focusFrame = window.requestAnimationFrame(() => contextPickerSearchRef.current?.focus());
    return () => window.cancelAnimationFrame(focusFrame);
  }, [openContextPicker]);

  useEffect(() => {
    if (!openActionMenuId && !openContextPicker) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-action-menu-root], [data-context-picker-root]")) return;
      closeActionMenus();
      closeContextPicker();
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeActionMenus();
        closeContextPicker();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openActionMenuId, openContextPicker]);

  useEffect(() => {
    setSelectedVersionNameDraft(activeLayoutVersion?.name ?? "");
  }, [activeLayoutVersion?.id, activeLayoutVersion?.name]);

  useEffect(() => {
    setDraftAction(currentAction);
    if (syncComposerWithSelection) {
      syncComposerFromAction(currentAction);
    }
  }, [currentAction, activeLayer.name, selectedKey?.slot, syncComposerWithSelection, dances]);

  useEffect(() => {
    setLayerNameDraft(activeLayer.name);
  }, [activeLayer.name]);

  useEffect(() => {
    if (!captureTarget) return;

    function captureKey(event: KeyboardEvent) {
      event.preventDefault();
      event.stopPropagation();

      if (captureTarget === "simple" && isModifierKeyEvent(event)) {
        setStatusMessage("Hold modifiers, then press the key to capture for Simple composer.");
        return;
      }

      const keycode = qmkKeycodeFromEvent(event);
      if (keycode) {
        if (captureTarget === "simple") {
          setSimpleKeycode(keycode);
          setSimpleKeycodeModifiers(simpleModifiersFromEvent(event));
          setStatusMessage(`Captured ${keycode} with modifiers for Simple composer.`);
        } else {
          setDraftAction(keycode);
          setStatusMessage(`Captured ${keycode}. Apply raw to write it to ${selectedKey?.slot ?? "the selected key"}.`);
        }
      } else {
        setStatusMessage(`Could not map "${event.key}" to a QMK keycode; type the raw identifier manually.`);
      }
      setCaptureTarget(null);
    }

    window.addEventListener("keydown", captureKey, { capture: true });
    return () => window.removeEventListener("keydown", captureKey, { capture: true });
  }, [captureTarget, selectedKey?.slot]);

  return (
    <main className={`app-shell page-${activePage}`}>
      <Toaster closeButton position="bottom-right" richColors />
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
          {renderContextPicker({
            kind: "project",
            label: "Project",
            value: activeKeyboardProjectId,
            emptyLabel: "No user projects",
            choices: projectPickerOptions,
            disabled: keyboardProjects.length === 0
          })}
          {renderContextPicker({
            kind: "layout",
            label: "Layout",
            value: activeLayoutId,
            emptyLabel: "No layouts",
            choices: layoutPickerOptions,
            disabled: !activeKeyboardProject || availableLayouts.length === 0
          })}
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
          <div className="editor-card active-layout-card editor-layout-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Active layout</p>
                <h2>{layoutNameDraft || activeSavedLayout?.name || "No layout selected"}</h2>
              </div>
              <span className="metric-pill">{availableLayouts.length} layouts / {activeSavedLayout?.versions.length ?? 0} versions</span>
            </div>
            <div className="editor-layout-controls">
              <label>
                Layout
                <select
                  data-testid="layout-select"
                  disabled={!activeSavedLayout}
                  value={activeLayoutId}
                  onChange={(event) => loadLayout(event.target.value)}
                >
                  {availableLayouts.length > 0 ? availableLayouts.map((layout) => (
                    <option key={layout.id} value={layout.id}>{layout.name}</option>
                  )) : (
                    <option value="">No layouts</option>
                  )}
                </select>
              </label>
              <div className="button-row editor-layout-actions">
                <button className="action-create" data-icon="+" data-testid="new-layout" disabled={!model} onClick={openCreateLayoutDialog} type="button">Create Layout</button>
                {renderActionMenu("layout-actions", "Layout actions", (
                  <>
                    <button className="action-copy" data-icon="⧉" data-testid="duplicate-layout" disabled={!activeSavedLayout} onClick={() => runMenuAction(duplicateLayout)} role="menuitem" type="button">Duplicate Layout</button>
                    <label
                      aria-disabled={!model}
                      className={`file-import action-import ${!model ? "disabled" : ""}`}
                      data-icon="⇣"
                      role="menuitem"
                      title={model ? "Import a layout JSON file" : "Add a KLE model before importing layouts"}
                    >
                      Import Layout
                      <input
                        data-testid="layout-upload"
                        accept="application/json,.json"
                        disabled={!model}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void uploadLayout(file).catch((error: unknown) => {
                              setStatusMessage(error instanceof Error ? error.message : "Failed to upload layout JSON.");
                            });
                          }
                          closeActionMenus();
                          event.target.value = "";
                        }}
                        type="file"
                      />
                    </label>
                    <button className="action-rename" data-icon="{}" data-testid="edit-layout-json" disabled={!activeSavedLayout} onClick={() => runMenuAction(() => openJsonEditDialog("layout"))} role="menuitem" type="button">Edit Layout JSON</button>
                    <button className="action-export" data-icon="⇡" data-testid="download-layout" disabled={!activeSavedLayout} onClick={() => runMenuAction(downloadJson)} role="menuitem" type="button">Download Layout</button>
                    <button className="action-rename" data-icon="✎" data-testid="rename-layout" disabled={!activeSavedLayout} onClick={() => runMenuAction(openLayoutRenameDialog)} role="menuitem" type="button">Rename Layout</button>
                    <button className="action-default" data-icon="★" data-testid="save-default-layout" disabled={!activeSavedLayout} onClick={() => runMenuAction(saveCurrentLayoutAsDefault)} role="menuitem" type="button">Save as Default</button>
                    <button className="danger-button action-danger" data-icon="!" data-testid="delete-layout" disabled={!activeSavedLayout} onClick={() => runMenuAction(deleteLayout)} role="menuitem" type="button">Delete Layout</button>
                  </>
                ), { disabled: !model && !activeSavedLayout })}
              </div>
            </div>
          </div>
          {!activeKeyboardProject ? (
            <div className="editor-card setup-state-card" data-testid="missing-project-state">
              <p className="eyebrow">Project required</p>
              <h2>No user project selected</h2>
              <p>Create a project, import a project JSON file, or load one of the example projects before editing layouts.</p>
              <button className="action-create" data-icon="+" data-testid="editor-create-project" onClick={() => {
                createBlankKeyboardProject();
                setActivePage("projects");
              }} type="button">
                Create Project
              </button>
            </div>
          ) : !model ? (
            <div className="editor-card setup-state-card" data-testid="missing-kle-state">
              <p className="eyebrow">Keyboard model required</p>
              <h2>No KLE model configured</h2>
              <p>Create Project now starts with an empty project shell. Upload a KLE JSON file or use Edit KLE JSON on the Projects page to add key IDs before creating layouts.</p>
              <button className="action-rename" data-icon="{}" data-testid="editor-edit-kle-json" onClick={() => {
                setActivePage("projects");
                openJsonEditDialog("kle");
              }} type="button">
                Edit KLE JSON
              </button>
            </div>
          ) : !activeSavedLayout ? (
            <div className="editor-card setup-state-card" data-testid="missing-layout-state">
              <p className="eyebrow">Layout required</p>
              <h2>No layouts in this project</h2>
              <p>This project has a KLE model but no layouts. Create a layout from the project default template or import a saved layout JSON.</p>
              <button className="action-create" data-icon="+" data-testid="editor-create-first-layout" onClick={openCreateLayoutDialog} type="button">
                Create Layout
              </button>
            </div>
          ) : selectedKey ? (
            <>
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
                  setSwapSourceSlot(null);
                  setStatusMessage(`Editing ${layer.name}.`);
                }}
                role="tab"
                aria-controls="keyboard-stage"
                aria-selected={layer.name === activeLayer.name}
                type="button"
              >
                <span className="layer-tab-dot" style={{ backgroundColor: layerColorMap[layer.name] }} />
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
              {renderActionMenu("layer-actions", "Layer actions", (
                <>
                  <button className="action-create" data-icon="+" data-testid="add-layer" onClick={() => runMenuAction(addLayer)} role="menuitem" type="button">Add</button>
                  <button className="action-move" data-icon="←" data-testid="move-layer-left" disabled={activeLayerIndex === 0} onClick={() => runMenuAction(() => moveActiveLayer(-1))} role="menuitem" type="button">Move left</button>
                  <button className="action-move" data-icon="→" data-testid="move-layer-right" disabled={activeLayerIndex === layers.length - 1} onClick={() => runMenuAction(() => moveActiveLayer(1))} role="menuitem" type="button">Move right</button>
                  <button className="action-danger" data-icon="!" data-testid="remove-layer" disabled={layers.length <= 1} onClick={() => runMenuAction(removeActiveLayer)} role="menuitem" type="button">Remove</button>
                </>
              ))}
            </div>
            <div className="layer-color-picker" aria-label={`Color for ${activeLayer.name}`}>
              <span>Color</span>
              <div className="layer-color-swatches">
                {layerPalette.map((color) => (
                  <button
                    aria-label={`Set ${activeLayer.name} color to ${color}`}
                    aria-pressed={layerColorMap[activeLayer.name] === color}
                    className={layerColorMap[activeLayer.name] === color ? "active" : ""}
                    data-testid={`layer-color-${color.replace("#", "")}`}
                    key={color}
                    onClick={() => setActiveLayerColor(color)}
                    style={{ backgroundColor: color }}
                    title={`Set ${activeLayer.name} color to ${color}`}
                    type="button"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="keyboard-stage-viewport" ref={keyboardViewportRef}>
            <div
              className="keyboard-stage-scaler"
              style={{ width: keyboardVisualSize.width, height: keyboardVisualSize.height }}
            >
              <div
                className="keyboard-stage"
                id="keyboard-stage"
                role="tabpanel"
                aria-labelledby={`tab-${activeLayer.name}`}
                style={{
                  width: keyboardStageSize.width,
                  height: keyboardStageSize.height,
                  transform: `scale(${keyboardScale})`
                }}
              >
            {model.keys.map((key) => {
              const action = selectedKeycode(activeLayer, key.slot);
              const details = describeAction(action);
              const layerColor = details.layer ? layerColorMap[details.layer] : undefined;
              const keyWidth = key.width * model.unit;
              const actionType = actionTypeLabel(details);
              const primaryFit = fitPrimaryKeyLabel(details.primary, keyWidth);
              const secondaryFit = fitSecondaryKeyLabel(actionType, keyWidth);
              return (
                <button
                  className={`keycap ${details.tone} ${key.slot === selectedSlot ? "selected" : ""} ${key.slot === swapSourceSlot ? "swap-source" : ""}`}
                  key={key.slot}
                  data-testid={`key-${key.slot}`}
                  draggable
                  onClick={() => handleKeyClick(key)}
                  onDragStart={(event) => handleKeyDragStart(key, event)}
                  onDragOver={handleKeyDragOver}
                  onDrop={(event) => handleKeyDrop(key, event)}
                  onDragEnd={() => handleKeyDragEnd(key)}
                  aria-label={`${key.slot} on ${activeLayer.name}: ${action}`}
                  aria-pressed={key.slot === selectedSlot}
                  style={{
                    left: (key.x + model.paddingX) * model.unit,
                    top: (key.y + model.paddingY) * model.unit,
                    width: key.width * model.unit,
                    height: key.height * model.unit,
                    transform: `rotate(${key.rotation}deg)`,
                    transformOrigin: `${(key.rotationX - key.x) * model.unit}px ${(key.rotationY - key.y) * model.unit}px`
                  }}
                  title={`${key.slot}: ${action}`}
                  type="button"
                >
                  <span className="key-slot">{key.slot}</span>
                  {layerColor && (
                    <span
                      className="layer-dot"
                      style={{ backgroundColor: layerColor }}
                      title={`${details.layer} layer action`}
                    />
                  )}
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
              <PreviewKeycap action={draftAction} layerColors={layerColorMap} slot={selectedKey.slot} testId="draft-key-preview" />
              <div>
                <span>Raw string preview</span>
                <strong>{draftAction || "blank identifier"}</strong>
              </div>
            </div>
            <label>
              Raw QMK identifier for {activeLayer.name}
              <div className={`raw-input-row ${captureTarget === "raw" ? "capturing" : ""}`}>
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
                  className="action-capture"
                  data-icon="⌘"
                  data-testid="capture-key"
                  onClick={() => {
                    setCaptureTarget("raw");
                    setStatusMessage("Press a key to capture its QMK identifier.");
                  }}
                  type="button"
                >
                  {captureTarget === "raw" ? "Press key" : "Capture"}
                </button>
              </div>
            </label>
            {draftDetails.validation && (
              <p className={`action-validation ${draftDetails.validation.level}`} data-testid="action-validation">
                {draftDetails.validation.message}
              </p>
            )}
            <div className="button-row">
              <button
                className="action-save"
                data-icon="✓"
                data-testid="apply-action"
                onClick={() => {
                  writeAction(draftAction);
                  setStatusMessage(`Updated ${selectedKey.slot} on ${activeLayer.name}.`);
                }}
                type="button"
              >
                Apply raw
              </button>
              {renderActionMenu("key-actions", "Key actions", (
                <>
                  <button
                    className="action-transparent"
                    data-icon="~"
                    data-testid="transparent-action"
                    onClick={() => runMenuAction(() => {
                      writeAction(TRANSPARENT);
                      setStatusMessage(`${selectedKey.slot} is transparent on ${activeLayer.name}.`);
                    })}
                    role="menuitem"
                    type="button"
                  >
                    Transparent
                  </button>
                  <button
                    className="action-disable"
                    data-icon="×"
                    data-testid="noop-action"
                    onClick={() => runMenuAction(() => {
                      writeAction("KC_NO");
                      setStatusMessage(`${selectedKey.slot} is disabled on ${activeLayer.name}.`);
                    })}
                    role="menuitem"
                    type="button"
                  >
                    No-op
                  </button>
                  <button
                    className={swapSourceSlot ? "action-swap active" : "action-swap"}
                    data-icon="⇄"
                    data-testid="swap-action"
                    onClick={() => runMenuAction(swapSourceSlot ? cancelKeySwap : startKeySwap)}
                    role="menuitem"
                    type="button"
                  >
                    {swapSourceSlot ? "Cancel swap" : "Start swap"}
                  </button>
                </>
              ))}
            </div>
            </div>

            <div className="editor-card composer-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Action composer</p>
                <h2>{composerMode === "dance" ? "Dance composer" : "Simple composer"}</h2>
              </div>
              <div className="composer-heading-actions">
                <label className="composer-sync-toggle">
                  <input
                    checked={syncComposerWithSelection}
                    data-testid="sync-composer-selection"
                    onChange={(event) => setSyncComposerWithSelection(event.target.checked)}
                    type="checkbox"
                  />
                  Follow selected
                </label>
                <code className={composerMode === "dance" ? "needs-code" : ""}>{generatedAction}</code>
              </div>
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
              <PreviewKeycap action={generatedAction} layerColors={layerColorMap} slot={selectedKey.slot} testId="composer-key-preview" />
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
                  {simpleKind === "raw" && (
                    <label>
                      Raw QMK expression
                      <input
                        data-testid="simple-raw-action"
                        placeholder="RGUI(LSFT(KC_9))"
                        value={simpleRawAction}
                        onChange={(event) => setSimpleRawAction(event.target.value)}
                        spellCheck={false}
                      />
                    </label>
                  )}
                  {simpleAction.fields.includes("keycode") && (
                    <label>
                      Keycode
                      <div className="keycode-mod-row">
                        <span>mods</span>
                        {simpleKeycodeMods.map((modifier) => (
                          <label key={modifier.id}>
                            {modifier.label}
                            <input
                              checked={simpleKeycodeModifiers.includes(modifier.id)}
                              data-testid={`simple-keycode-mod-${modifier.id}`}
                              onChange={() => setSimpleKeycodeModifiers((current) => (
                                current.includes(modifier.id)
                                  ? current.filter((item) => item !== modifier.id)
                                  : [...current, modifier.id]
                              ))}
                              type="checkbox"
                            />
                          </label>
                        ))}
                      </div>
                      <div className={`raw-input-row ${captureTarget === "simple" ? "capturing" : ""}`}>
                        <input
                          data-testid="simple-keycode"
                          placeholder="KC_SPC"
                          value={simpleKeycode}
                          onChange={(event) => setSimpleKeycode(event.target.value)}
                          spellCheck={false}
                        />
                        <button
                          className="action-capture"
                          data-icon="⌘"
                          data-testid="simple-keycode-capture"
                          onClick={() => {
                            setCaptureTarget("simple");
                            setStatusMessage("Press a key to capture it for Simple composer.");
                          }}
                          type="button"
                        >
                          {captureTarget === "simple" ? "Press key" : "Capture"}
                        </button>
                      </div>
                    </label>
                  )}
                  {simpleKind === "mod_tap" && (
                    <label>
                      Hold modifier
                      <select
                        data-testid="mod-tap-modifier"
                        value={modTapModifier}
                        onChange={(event) => setModTapModifier(event.target.value)}
                      >
                        {modTapActions.map((action) => (
                          <option key={action.value} value={action.value}>{action.label}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  {simpleAction.fields.includes("layer") && (
                    <label>
                      {simpleAction.layerLabel ?? "Layer"}
                      <select
                        data-testid="simple-layer"
                        value={simpleLayer}
                        onChange={(event) => setSimpleLayer(event.target.value)}
                      >
                        {composerLayerOptions.map((layerName) => (
                          <option key={layerName} value={layerName}>{layerName}</option>
                        ))}
                      </select>
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
              <div className="extra-key-save-row">
                <input
                  data-testid="extra-key-name"
                  value={extraKeyNameDraft}
                  onChange={(event) => setExtraKeyNameDraft(event.target.value)}
                  placeholder="KK_CUSTOM"
                  spellCheck={false}
                />
                <button
                  className="action-default"
                  data-icon="+"
                  data-testid="save-generated-extra-key"
                  onClick={saveGeneratedActionAsExtraKey}
                  type="button"
                >
                  Extra key
                </button>
              </div>
              <button
                className="action-save"
                data-icon="✓"
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

            <div className="editor-card support-data-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Layout support data</p>
                  <h2>Dances, macros, aliases</h2>
                </div>
                <span className="metric-pill">{danceRows.length} dances / {macroRows.length} macros / {aliasRows.length} aliases</span>
              </div>
              <div className="support-table-group">
                <section>
                  <div className="mini-section-header">
                    <h3>Key dances</h3>
                    <button className="action-create mini-action" data-icon="+" data-testid="add-dance" onClick={startNewDance} type="button">Add</button>
                  </div>
                  {danceRows.length > 0 || editingDanceName !== null ? (
                    <div className="support-table-scroll">
                      <table className="support-table" data-testid="dance-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Tap</th>
                            <th>Hold</th>
                            <th>Double</th>
                            <th>Tap-hold</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editingDanceName !== null && (
                            <tr className="editing-row">
                              <th scope="row">
                                <input data-testid="dance-edit-name" value={danceDraftName} onChange={(event) => setDanceDraftName(event.target.value)} spellCheck={false} />
                              </th>
                              {danceBehaviorFields.map((field) => (
                                <td key={field.id}>
                                  <input
                                    data-testid={`dance-edit-${field.id}`}
                                    value={danceDraftSlots[field.id]}
                                    onChange={(event) => setDanceDraftSlots((current) => ({ ...current, [field.id]: event.target.value }))}
                                    spellCheck={false}
                                  />
                                </td>
                              ))}
                              <td>
                                <div className="support-row-actions">
                                  <button className="action-save" data-icon="✓" data-testid="save-dance" onClick={saveDanceDraft} type="button">Save</button>
                                  <button className="action-disable" data-icon="×" data-testid="cancel-dance-edit" onClick={() => setEditingDanceName(null)} type="button">Cancel</button>
                                </div>
                              </td>
                            </tr>
                          )}
                          {danceRows.map(([name, slots]) => (
                            <tr key={name}>
                              <th scope="row"><code>{name}</code></th>
                              <td><code>{slots.tap || "-"}</code></td>
                              <td><code>{slots.hold || "-"}</code></td>
                              <td><code>{slots.doubleTap || "-"}</code></td>
                              <td><code>{slots.tapHold || "-"}</code></td>
                              <td>
                                <div className="support-row-actions">
                                  {renderActionMenu(`dance-actions-${name}`, "Actions", (
                                    <>
                                      <button className="action-rename" data-icon="✎" data-testid={`edit-dance-${name}`} onClick={() => runMenuAction(() => startEditDance(name, slots))} role="menuitem" type="button">Edit</button>
                                      <button className="action-danger" data-icon="!" data-testid={`delete-dance-${name}`} onClick={() => runMenuAction(() => deleteDance(name))} role="menuitem" type="button">Delete</button>
                                    </>
                                  ), { icon: "⋯" })}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="empty-support-data" data-testid="dance-table-empty">No key dances in this layout.</p>
                  )}
                </section>
                <section>
                  <div className="mini-section-header">
                    <h3>Macros</h3>
                    <button className="action-create mini-action" data-icon="+" data-testid="add-macro" onClick={() => startNewExtKey("macro")} type="button">Add</button>
                  </div>
                  {macroRows.length > 0 || (editingExtKeyName !== null && extKeyDraft.kind === "macro") ? (
                    <div className="support-table-scroll">
                      <table className="support-table" data-testid="macro-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Kind</th>
                            <th>Value</th>
                            <th>Notes</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editingExtKeyName !== null && extKeyDraft.kind === "macro" && (
                            <tr className="editing-row">
                              <th scope="row"><input data-testid="macro-edit-name" value={extKeyDraft.name} onChange={(event) => setExtKeyDraft((current) => ({ ...current, name: event.target.value }))} spellCheck={false} /></th>
                              <td><code>{extKeyDraft.kind}</code></td>
                              <td><input data-testid="macro-edit-value" value={extKeyDraft.value} onChange={(event) => setExtKeyDraft((current) => ({ ...current, value: event.target.value }))} spellCheck={false} /></td>
                              <td><input data-testid="macro-edit-notes" value={extKeyDraft.notes} onChange={(event) => setExtKeyDraft((current) => ({ ...current, notes: event.target.value }))} spellCheck={false} /></td>
                              <td>
                                <div className="support-row-actions">
                                  <button className="action-save" data-icon="✓" data-testid="save-extkey" onClick={saveExtKeyDraft} type="button">Save</button>
                                  <button className="action-disable" data-icon="×" data-testid="cancel-extkey-edit" onClick={() => setEditingExtKeyName(null)} type="button">Cancel</button>
                                </div>
                              </td>
                            </tr>
                          )}
                          {macroRows.map((key) => (
                            <tr key={`${key.name}-${key.kind}-${key.value}`}>
                              <th scope="row"><code>{key.name}</code></th>
                              <td>{key.kind || "-"}</td>
                              <td><code>{key.value || "-"}</code></td>
                              <td>{key.notes || "-"}</td>
                              <td>
                                <div className="support-row-actions">
                                  {renderActionMenu(`macro-actions-${key.name}`, "Actions", (
                                    <>
                                      <button className="action-rename" data-icon="✎" data-testid={`edit-extkey-${key.name}`} onClick={() => runMenuAction(() => startEditExtKey(key))} role="menuitem" type="button">Edit</button>
                                      <button className="action-danger" data-icon="!" data-testid={`delete-extkey-${key.name}`} onClick={() => runMenuAction(() => deleteExtKey(key.name))} role="menuitem" type="button">Delete</button>
                                    </>
                                  ), { icon: "⋯" })}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="empty-support-data" data-testid="macro-table-empty">No macros in this layout.</p>
                  )}
                </section>
                <section>
                  <div className="mini-section-header">
                    <h3>Extra key aliases</h3>
                    <button className="action-create mini-action" data-icon="+" data-testid="add-alias" onClick={() => startNewExtKey("alias")} type="button">Add</button>
                  </div>
                  {aliasRows.length > 0 || (editingExtKeyName !== null && extKeyDraft.kind !== "macro") ? (
                    <div className="support-table-scroll">
                      <table className="support-table" data-testid="extkeys-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Kind</th>
                            <th>Value</th>
                            <th>Notes</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editingExtKeyName !== null && extKeyDraft.kind !== "macro" && (
                            <tr className="editing-row">
                              <th scope="row"><input data-testid="alias-edit-name" value={extKeyDraft.name} onChange={(event) => setExtKeyDraft((current) => ({ ...current, name: event.target.value }))} spellCheck={false} /></th>
                              <td><code>{extKeyDraft.kind || "alias"}</code></td>
                              <td><input data-testid="alias-edit-value" value={extKeyDraft.value} onChange={(event) => setExtKeyDraft((current) => ({ ...current, value: event.target.value }))} spellCheck={false} /></td>
                              <td><input data-testid="alias-edit-notes" value={extKeyDraft.notes} onChange={(event) => setExtKeyDraft((current) => ({ ...current, notes: event.target.value }))} spellCheck={false} /></td>
                              <td>
                                <div className="support-row-actions">
                                  <button className="action-save" data-icon="✓" data-testid="save-extkey" onClick={saveExtKeyDraft} type="button">Save</button>
                                  <button className="action-disable" data-icon="×" data-testid="cancel-extkey-edit" onClick={() => setEditingExtKeyName(null)} type="button">Cancel</button>
                                </div>
                              </td>
                            </tr>
                          )}
                          {aliasRows.map((key) => (
                            <tr key={`${key.name}-${key.kind}-${key.value}`}>
                              <th scope="row"><code>{key.name}</code></th>
                              <td>{key.kind || "-"}</td>
                              <td><code>{key.value || "-"}</code></td>
                              <td>{key.notes || "-"}</td>
                              <td>
                                <div className="support-row-actions">
                                  {renderActionMenu(`alias-actions-${key.name}`, "Actions", (
                                    <>
                                      <button className="action-rename" data-icon="✎" data-testid={`edit-extkey-${key.name}`} onClick={() => runMenuAction(() => startEditExtKey(key))} role="menuitem" type="button">Edit</button>
                                      <button className="action-danger" data-icon="!" data-testid={`delete-extkey-${key.name}`} onClick={() => runMenuAction(() => deleteExtKey(key.name))} role="menuitem" type="button">Delete</button>
                                    </>
                                  ), { icon: "⋯" })}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="empty-support-data" data-testid="extkeys-table-empty">No extra key aliases in this layout.</p>
                  )}
                </section>
              </div>
            </div>

            <div className="editor-card version-tree-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Version tree</p>
                  <h2>{activeLayoutVersion?.name ?? "No version"}</h2>
                </div>
                <span className="metric-pill">{activeSavedLayout.versions.length} versions</span>
              </div>
              <p>
                Click a saved version to load it as the fork point. The next saved version becomes a child of the
                active node. Saved versions are immutable snapshots with the KLE model used when they were created.
              </p>
              <div className="version-save-row">
                <label>
                  New version name
                  <input
                    data-testid="version-name-input"
                    onChange={(event) => setVersionNameDraft(event.target.value)}
                    placeholder={`Version ${activeSavedLayout.versions.length + 1}`}
                    spellCheck={false}
                    value={versionNameDraft}
                  />
                </label>
                <button className="action-save" data-icon="✓" data-testid="save-layout-version" onClick={saveLayoutVersion} type="button">
                  Save Version
                </button>
              </div>
              <div className="version-edit-row">
                <label>
                  Selected version name
                  <input
                    data-testid="selected-version-name-input"
                    onChange={(event) => setSelectedVersionNameDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        renameActiveVersion();
                      }
                    }}
                    spellCheck={false}
                    value={selectedVersionNameDraft}
                  />
                </label>
                <div className="button-row version-edit-actions">
                  {renderActionMenu("version-actions", "Version actions", (
                    <>
                      <button className="action-rename" data-icon="✎" data-testid="rename-version" onClick={() => runMenuAction(renameActiveVersion)} role="menuitem" type="button">Rename Version</button>
                      <button className="danger-button action-danger" data-icon="!" data-testid="delete-version" disabled={activeSavedLayout.versions.length <= 1} onClick={() => runMenuAction(deleteActiveVersion)} role="menuitem" type="button">Delete Version</button>
                    </>
                  ))}
                </div>
              </div>
              <LayoutVersionTree layout={activeSavedLayout} onSelectVersion={loadLayoutVersion} />
            </div>
          </aside>
            </>
          ) : (
            <div className="editor-card setup-state-card" data-testid="missing-key-state">
              <p className="eyebrow">Keyboard model empty</p>
              <h2>No key IDs found</h2>
              <p>The active KLE model has no selectable key IDs. Edit the KLE JSON and put unique identifiers in the center legend entries.</p>
            </div>
          )}
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
              <button className="action-create" data-icon="+" data-testid="new-project" onClick={createBlankKeyboardProject} type="button">Create Project</button>
              <button className="action-export" data-icon="⇡" data-testid="backup-workspace" onClick={downloadWorkspaceBackup} type="button">Backup Workspace</button>
              <label className="file-import action-import" data-icon="⇣" title="Restore a full qmk-viz workspace backup">
                Restore Workspace
                <input
                  data-testid="workspace-restore-upload"
                  accept="application/json,.json"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void restoreWorkspace(file).catch((error: unknown) => {
                        setStatusMessage(error instanceof Error ? error.message : "Failed to restore workspace backup.");
                      });
                    }
                    event.target.value = "";
                  }}
                  type="file"
                />
              </label>
              {renderActionMenu("project-file-actions", "Project file", (
                <>
                  <label className="file-import action-import" data-icon="⇣" role="menuitem" title="Import a full qmk-viz project JSON backup">
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
                        closeActionMenus();
                        event.target.value = "";
                      }}
                      type="file"
                    />
                  </label>
                  <button className="action-rename" data-icon="{}" data-testid="edit-project-json" disabled={!activeKeyboardProject} onClick={() => runMenuAction(() => openJsonEditDialog("project"))} role="menuitem" type="button">Edit Project JSON</button>
                  <button className="action-export" data-icon="⇡" data-testid="download-project" disabled={!activeKeyboardProject} onClick={() => runMenuAction(downloadFullProject)} role="menuitem" type="button">Download Project</button>
                </>
              ))}
            </div>
          </div>
          <div className="admin-grid two-column">
            <div className="editor-card admin-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Active project</p>
                  <h2>{keyboardProjectNameDraft || "No project selected"}</h2>
                </div>
                <span className="metric-pill">{keyboardProjects.length} projects</span>
              </div>
              <label>
                Search projects
                <input
                  data-testid="project-search"
                  onChange={(event) => setProjectSearchDraft(event.target.value)}
                  placeholder="Filter user projects by name"
                  value={projectSearchDraft}
                />
              </label>
              <div className="project-stat-list" data-testid="project-stats">
                {filteredProjectStats.length > 0 ? filteredProjectStats.map((project) => (
                  <button
                    className={project.id === activeKeyboardProjectId ? "active" : ""}
                    key={project.id}
                    onClick={() => loadKeyboardProject(project.id)}
                    type="button"
                  >
                    <strong className="project-stat-name">{project.name}</strong>
                    <span className="project-stat-metrics">
                      <span>{project.layoutCount} layouts</span>
                      <span>{project.versionCount} versions</span>
                      <span>{project.keyCount} keys</span>
                    </span>
                  </button>
                )) : (
                  <div className="empty-support-data" data-testid="project-stats-empty">
                    {keyboardProjects.length === 0
                      ? "No user projects yet. Create a project, import a project file, or load an example below."
                      : "No projects match that search."}
                  </div>
                )}
              </div>
              <div className="button-row">
                {renderActionMenu("project-actions", "Project actions", (
                  <>
                    <button className="action-rename" data-icon="✎" data-testid="rename-project" disabled={!activeKeyboardProject} onClick={() => runMenuAction(openProjectRenameDialog)} role="menuitem" type="button">Rename Project</button>
                    <button className="action-copy" data-icon="⧉" data-testid="duplicate-project" disabled={!activeKeyboardProject} onClick={() => runMenuAction(duplicateKeyboardProject)} role="menuitem" type="button">Duplicate</button>
                    <button className="danger-button action-danger" data-icon="!" data-testid="delete-project" disabled={!activeKeyboardProject} onClick={() => runMenuAction(deleteKeyboardProject)} role="menuitem" type="button">Delete</button>
                  </>
                ), { disabled: !activeKeyboardProject })}
              </div>
            </div>
            <div className="editor-card admin-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Keyboard model</p>
                  <h2>{model?.name ?? "No KLE model"}</h2>
                </div>
                <span className="metric-pill">{model?.keys.length ?? 0} keys</span>
              </div>
              <dl className="model-facts" data-testid="model-readout">
                <div>
                  <dt>Keys</dt>
                  <dd>{model?.keys.length ?? 0}</dd>
                </div>
                <div>
                  <dt>Canvas</dt>
                  <dd>{model ? `${model.width.toFixed(1)}u × ${model.height.toFixed(1)}u` : "Not configured"}</dd>
                </div>
                <div>
                  <dt>Author</dt>
                  <dd>{model?.author || "Not specified"}</dd>
                </div>
              </dl>
              <p>
                {!activeKeyboardProject
                  ? "Create or import a project before adding a keyboard model."
                  : model
                  ? "Updating the KLE model is undoable. Existing layout keys survive when their slot IDs still exist in the new KLE file."
                  : "This project has no keyboard model yet. Upload a KLE file or edit KLE JSON to define the key IDs."}
              </p>
              <div className="button-row">
                {renderActionMenu("model-actions", "KLE model", (
                  <>
                    <label
                      aria-disabled={!activeKeyboardProject}
                      className={`file-import action-import ${!activeKeyboardProject ? "disabled" : ""}`}
                      data-icon="⇣"
                      role="menuitem"
                      title={activeKeyboardProject ? "Upload or replace the active project's KLE JSON model" : "Create or import a project before uploading KLE"}
                    >
                      Upload/Update KLE
                      <input
                        data-testid="keyboard-upload"
                        accept="application/json,.json"
                        disabled={!activeKeyboardProject}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void updateActiveKeyboardModel(file).catch((error: unknown) => {
                              setStatusMessage(error instanceof Error ? error.message : "Failed to update KLE JSON.");
                            });
                          }
                          closeActionMenus();
                          event.target.value = "";
                        }}
                        type="file"
                      />
                    </label>
                    <button className="action-rename" data-icon="{}" data-testid="edit-kle-json" disabled={!activeKeyboardProject} onClick={() => runMenuAction(() => openJsonEditDialog("kle"))} role="menuitem" type="button">Edit KLE JSON</button>
                    <button className="action-export" data-icon="⇡" data-testid="download-kle" disabled={!model} onClick={() => runMenuAction(downloadProjectKle)} role="menuitem" type="button">Download KLE</button>
                  </>
                ), { disabled: !activeKeyboardProject && !model })}
                <a className="action-link action-import" data-icon="↗" href="https://www.keyboard-layout-editor.com/#/" rel="noreferrer" target="_blank">Open KLE</a>
                <button className="action-default" data-icon="?" data-testid="kle-help" onClick={() => setShowKleHelp(true)} type="button">Mapping Help</button>
              </div>
            </div>
            <div className="editor-card admin-card examples-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Examples</p>
                  <h2>Starter projects</h2>
                </div>
                <span className="metric-pill">{exampleProjects.length} templates</span>
              </div>
              <p>Examples are bundled read-only templates. Loading one copies it into your user project library.</p>
              <div className="example-project-list" data-testid="example-projects">
                {exampleProjects.map((project) => (
                  <button
                    className="example-project"
                    key={project.id}
                    onClick={() => loadExampleProject(project)}
                    type="button"
                  >
                    <strong>{project.name}</strong>
                    <span>{project.layouts.length} layouts / {project.model?.keys.length ?? 0} keys</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="editor-card admin-card project-model-preview-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Associated KLE model</p>
                  <h2>Marker preview</h2>
                </div>
              </div>
              {model ? (
                <KeyboardModelPreview model={model} />
              ) : (
                <div className="setup-state-card inline" data-testid="project-missing-kle-preview">
                  <p>No marker preview until a KLE model is configured.</p>
                </div>
              )}
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
              <button className="action-copy" data-icon="⧉" data-testid="copy-json" onClick={copyJson} type="button">Copy JSON</button>
              {renderActionMenu("export-downloads", "Downloads", (
                <>
                  <button className="action-export" data-icon="⇡" data-testid="download-layout-json" disabled={!model || !activeSavedLayout} onClick={() => runMenuAction(downloadJson)} role="menuitem" type="button">Layout JSON</button>
                  <button className="action-export" data-icon="⇡" data-testid="download-layer-kle" disabled={!model || !activeSavedLayout} onClick={() => runMenuAction(downloadActiveLayerKle)} role="menuitem" type="button">Layer KLE</button>
                  <button className="action-export" data-icon="⇡" data-testid="download-project-kle" disabled={!model} onClick={() => runMenuAction(downloadProjectKle)} role="menuitem" type="button">Project KLE</button>
                </>
              ), { className: "action-export", icon: "⇡" })}
            </div>
          </div>
          <div className="editor-card export-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Current layout JSON</p>
                <h2>{keyboardProjectNameDraft} / {layoutNameDraft || "No layout"}</h2>
              </div>
            </div>
            <textarea
              aria-label="Current layout JSON export"
              readOnly
              value={jsonOutput}
              spellCheck={false}
            />
            <p>
              Layout JSON is the `keymap.c` template input and includes the KLE model used for the keyboard.
              Project KLE preserves the uploaded keyboard geometry and slot IDs; Layer KLE adds the active layer labels.
            </p>
          </div>
        </section>
      )}

      {jsonEditDialog && (
        <div className="modal-backdrop" role="presentation">
          <form
            className="rename-modal paste-json-modal"
            aria-labelledby="edit-json-modal-title"
            onSubmit={submitJsonEditDialog}
            role="dialog"
            aria-modal="true"
          >
            <div className="section-header">
              <div>
                <p className="eyebrow">{jsonEditLabels[jsonEditDialog.kind].eyebrow}</p>
                <h2 id="edit-json-modal-title">{jsonEditLabels[jsonEditDialog.kind].title}</h2>
              </div>
            </div>
            <label>
              JSON
              <textarea
                autoFocus
                data-testid="edit-json-input"
                value={jsonEditDialog.value}
                onChange={(event) => setJsonEditDialog((current) => (
                  current ? { ...current, value: event.target.value } : current
                ))}
                spellCheck={false}
              />
            </label>
            <p className="modal-help">{jsonEditLabels[jsonEditDialog.kind].help}</p>
            <p
              aria-live="polite"
              className={`action-validation ${jsonEditValidation.ok ? "ok" : "warning"}`}
              data-testid="edit-json-validation"
            >
              {jsonEditValidation.message}
            </p>
            <div className="button-row rename-modal-actions">
              <button
                className="action-save"
                data-icon="✓"
                data-testid="save-edit-json"
                disabled={!jsonEditValidation.ok}
                type="submit"
              >
                Save JSON
              </button>
              <button className="action-disable" data-icon="×" data-testid="close-edit-json" onClick={() => setJsonEditDialog(null)} type="button">Close</button>
            </div>
          </form>
        </div>
      )}

      {createLayoutNameDraft !== null && (
        <div className="modal-backdrop" role="presentation">
          <form
            className="rename-modal"
            aria-labelledby="create-layout-modal-title"
            onSubmit={submitCreateLayoutDialog}
            role="dialog"
            aria-modal="true"
          >
            <div className="section-header">
              <div>
                <p className="eyebrow">Create layout</p>
                <h2 id="create-layout-modal-title">Layout name</h2>
              </div>
            </div>
            <label>
              Name
              <input
                autoFocus
                data-testid="create-layout-modal-input"
                value={createLayoutNameDraft}
                onChange={(event) => setCreateLayoutNameDraft(event.target.value)}
                spellCheck={false}
              />
            </label>
            <div className="button-row rename-modal-actions">
              <button className="action-create" data-icon="+" type="submit">Create Layout</button>
              <button className="action-disable" data-icon="×" onClick={() => setCreateLayoutNameDraft(null)} type="button">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {showKleHelp && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="rename-modal kle-help-modal"
            aria-labelledby="kle-help-title"
            role="dialog"
            aria-modal="true"
          >
            <div className="section-header">
              <div>
                <p className="eyebrow">KLE mapping help</p>
                <h2 id="kle-help-title">How qmk-viz reads Keyboard Layout Editor JSON</h2>
              </div>
            </div>
            <div className="help-content">
              <p>
                qmk-viz uses Keyboard Layout Editor geometry as the source of truth for key placement.
                Each physical key must expose one stable mapping identifier.
              </p>
              <ol>
                <li>Create or edit a layout at <a href="https://www.keyboard-layout-editor.com/#/" rel="noreferrer" target="_blank">keyboard-layout-editor.com</a>.</li>
                <li>Put the qmk-viz slot ID in the center legend entry for every key you want to edit, for example <code>LT00</code>, <code>RT03</code>, <code>LC21</code>, or <code>K42</code>.</li>
                <li>Keep each identifier unique. Duplicate IDs are rejected because one keymap slot cannot point at two physical keys.</li>
                <li>Decorative labels can be omitted; the app renders actions from your layout JSON after the KLE model is uploaded.</li>
                <li>If you update the KLE later, layouts survive for matching identifiers and orphaned slots are dropped during reconciliation.</li>
              </ol>
            </div>
            <div className="button-row rename-modal-actions">
              <a className="action-link action-import" data-icon="↗" href="https://www.keyboard-layout-editor.com/#/" rel="noreferrer" target="_blank">Open KLE Website</a>
              <button className="action-disable" data-icon="×" onClick={() => setShowKleHelp(false)} type="button">Close</button>
            </div>
          </section>
        </div>
      )}

      {renameDialog && (
        <div className="modal-backdrop" role="presentation">
          <form
            className="rename-modal"
            aria-labelledby="rename-modal-title"
            onSubmit={submitRenameDialog}
            role="dialog"
            aria-modal="true"
          >
            <div className="section-header">
              <div>
                <p className="eyebrow">Rename {renameDialog.kind}</p>
                <h2 id="rename-modal-title">
                  {renameDialog.kind === "project" ? "Project name" : "Layout name"}
                </h2>
              </div>
            </div>
            <label>
              Name
              <input
                autoFocus
                data-testid="rename-modal-input"
                value={renameDialog.value}
                onChange={(event) => setRenameDialog((current) => (
                  current ? { ...current, value: event.target.value } : current
                ))}
                spellCheck={false}
              />
            </label>
            <div className="button-row rename-modal-actions">
              <button className="action-rename" data-icon="✎" type="submit">
                Rename {renameDialog.kind === "project" ? "Project" : "Layout"}
              </button>
              <button className="action-disable" data-icon="×" onClick={() => setRenameDialog(null)} type="button">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
