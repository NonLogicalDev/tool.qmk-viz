import { useEffect, useMemo, useRef, type ComponentProps, type DragEvent, type FormEvent, type ReactNode } from "react";
import { Toaster, toast } from "sonner";
import "sonner/dist/styles.css";
import { composeBehaviorAction, describeAction, parseActionToBehaviorSlots, type BehaviorSlots } from "./lib/actions";
import { buildKeyboardModelFromKle, type KeyboardModel, type KeySlot } from "./lib/keyboardModel";
import {
  cloneKeymapDocument,
  createKeymapExportDocument,
  createEmptyKeymapDocument,
  selectedKeycode,
  transparentLayerFrom,
  updateKeycode,
  TRANSPARENT,
  type ExtKey,
  type KeymapDocument,
  type KeymapLayer
} from "./lib/keymap";
import { serializeKeyboardModelKle, serializeLayerKle } from "./lib/kleExport";
import { fitPrimaryKeyLabel, fitSecondaryKeyLabel } from "./lib/textFit";
import { AppTopbar, type AppPage } from "./components/AppTopbar";
import { ActionMenu } from "./components/ActionMenu";
import { CreateLayoutModal, JsonEditModal, KleHelpModal, RenameModal } from "./components/AppModals";
import { ContextPicker, type ContextPickerOption } from "./components/ContextPicker";
import { LayoutVersionTree } from "./components/LayoutVersionTree";
import { PreviewKeycap, actionTypeLabel } from "./components/PreviewKeycap";
import { ProjectBrowserModal, type ProjectBrowserItem, type ProjectBrowserTab } from "./components/ProjectBrowserModal";
import { ExportPage, type ExportPreviewTab } from "./pages/ExportPage";
import { ProjectPage } from "./pages/ProjectPage";
import {
  KEYBOARD_PROJECTS_STORAGE_KEY,
  activeLayoutFor,
  cloneKeyboardProjectForLibrary,
  cloneSavedLayout,
  createEmptyKeyboardProject,
  createKeyboardProject,
  createLayout,
  createLayoutVersion,
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
  DEFAULT_KEYMAP_TEMPLATE,
  normalizeKeymapTemplate,
  renderKeymapTemplate,
  type KeymapTemplateContext
} from "./lib/keymapTemplate";
import {
  composeModTapAction,
  composeSimpleAction,
  modTapActions,
  parseSimpleComposerAction,
  qmkKeycodeFromEvent,
  simpleComposerActions,
  type SimpleComposerKind
} from "./lib/qmkActions";
import {
  useAppStore,
  type CaptureTarget,
  type ComposerMode,
  type JsonEditDialog,
  type JsonEditKind,
  type RenameDialog
} from "./stores/appStore";

type BehaviorField = {
  id: keyof BehaviorSlots;
  label: string;
  placeholder: string;
  help: string;
};

type JsonValidation = {
  ok: boolean;
  message: string;
};

type ExtKeyTableKind = "macro" | "alias";

type AppSnapshot = {
  project: SavedKeyboardProject | null;
  activeLayoutId: string;
  activeLayerName: string;
  selectedSlot: string;
};

const projectBrowserPageSize = 6;

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
  const {
    activeKeyboardProjectId,
    activeLayerName,
    activeLayoutId,
    activePage,
    behaviorSlots,
    captureTarget,
    composerMode,
    createLayoutNameDraft,
    danceDraftName,
    danceDraftSlots,
    danceName,
    dances,
    draftAction,
    editingDanceName,
    editingExtKeyName,
    exampleProjects,
    exportPreviewTab,
    extraKeyNameDraft,
    extKeyDraft,
    extKeys,
    jsonEditDialog,
    keyboardProjectNameDraft,
    keyboardProjects,
    keyboardViewportSize,
    keymapTemplateDraft,
    layerColors,
    layerNameDraft,
    layers,
    layoutNameDraft,
    modTapModifier,
    model,
    openActionMenuId,
    openContextPicker,
    projectBrowserPage,
    projectBrowserTab,
    projectSearchDraft,
    redoStack,
    renameDialog,
    selectedSlot,
    selectedVersionNameDraft,
    showKleHelp,
    showProjectBrowser,
    simpleKeycode,
    simpleKeycodeModifiers,
    simpleKind,
    simpleLayer,
    simpleRawAction,
    statusMessage,
    swapSourceSlot,
    syncComposerWithSelection,
    undoStack,
    versionNameDraft,
    setActiveKeyboardProjectId,
    setActiveLayerName,
    setActiveLayoutId,
    setActivePage,
    setBehaviorSlots,
    setCaptureTarget,
    setComposerMode,
    setCreateLayoutNameDraft,
    setDanceDraftName,
    setDanceDraftSlots,
    setDanceName,
    setDances,
    setDraftAction,
    setEditingDanceName,
    setEditingExtKeyName,
    setExportPreviewTab,
    setExtraKeyNameDraft,
    setExtKeyDraft,
    setExtKeys,
    setJsonEditDialog,
    setKeyboardProjectNameDraft,
    setKeyboardProjects,
    setKeyboardViewportSize,
    setKeymapTemplateDraft,
    setLayerColors,
    setLayerNameDraft,
    setLayers,
    setLayoutNameDraft,
    setModTapModifier,
    setModel,
    setOpenActionMenuId,
    setOpenContextPicker,
    setContextPickerActiveIndex,
    setContextPickerSearch,
    setProjectBrowserPage,
    setProjectBrowserTab,
    setProjectSearchDraft,
    setRedoStack,
    setRenameDialog,
    setSelectedSlot,
    setSelectedVersionNameDraft,
    setShowKleHelp,
    setShowProjectBrowser,
    setSimpleKeycode,
    setSimpleKeycodeModifiers,
    setSimpleKind,
    setSimpleLayer,
    setSimpleRawAction,
    setStatusMessage: setStatusMessageState,
    setSwapSourceSlot,
    setSyncComposerWithSelection,
    setUndoStack,
    setVersionNameDraft
  } = useAppStore();

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
  const activeProjectStats = projectStats.find((project) => project.id === activeKeyboardProjectId) ?? null;
  const projectBrowserUserItems = useMemo<ProjectBrowserItem[]>(() => keyboardProjects.map((project) => ({
    id: project.id,
    name: project.name,
    layoutCount: project.layouts.length,
    versionCount: project.layouts.reduce((total, layout) => total + layout.versions.length, 0),
    keyCount: project.model?.keys.length ?? 0,
    project,
    source: "projects"
  })), [keyboardProjects]);
  const projectBrowserExampleItems = useMemo<ProjectBrowserItem[]>(() => exampleProjects.map((project) => ({
    id: project.id,
    name: project.name,
    layoutCount: project.layouts.length,
    versionCount: project.layouts.reduce((total, layout) => total + layout.versions.length, 0),
    keyCount: project.model?.keys.length ?? 0,
    project,
    source: "examples"
  })), [exampleProjects]);
  const projectBrowserItems = useMemo(() => {
    const query = projectSearchDraft.trim().toLowerCase();
    const sourceItems = projectBrowserTab === "projects" ? projectBrowserUserItems : projectBrowserExampleItems;
    if (!query) return sourceItems;
    return sourceItems.filter((project) => (
      project.name.toLowerCase().includes(query) ||
      `${project.layoutCount} layouts ${project.versionCount} versions ${project.keyCount} keys`.includes(query)
    ));
  }, [projectBrowserExampleItems, projectBrowserTab, projectBrowserUserItems, projectSearchDraft]);
  const projectBrowserPageCount = Math.max(1, Math.ceil(projectBrowserItems.length / projectBrowserPageSize));
  const safeProjectBrowserPage = Math.min(projectBrowserPage, projectBrowserPageCount - 1);
  const visibleProjectBrowserItems = projectBrowserItems.slice(
    safeProjectBrowserPage * projectBrowserPageSize,
    safeProjectBrowserPage * projectBrowserPageSize + projectBrowserPageSize
  );
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
  const simpleComposerPickerOptions = useMemo<ContextPickerOption[]>(() => simpleComposerActions.map((action) => ({
    value: action.kind,
    label: action.label,
    meta: action.help
  })), []);
  const modTapPickerOptions = useMemo<ContextPickerOption[]>(() => modTapActions.map((action) => ({
    value: action.value,
    label: action.label,
    meta: action.value
  })), []);
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
    const widthScale = Math.max(0.1, (measuredWidth - 8) / keyboardStageSize.width);
    const maxVisualHeight = Math.max(360, keyboardViewportSize.screenHeight * 0.68);
    const heightScale = maxVisualHeight / keyboardStageSize.height;
    const fitScale = Math.min(widthScale, heightScale);

    return clampNumber(Number.isFinite(fitScale) ? fitScale : 1, 0.2, 1.35);
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
  const exportOptions = useMemo(() => ({
    keyboardProjectId: activeKeyboardProjectId,
    keyboardProjectName: keyboardProjectNameDraft.trim() || activeKeyboardProject?.name || "Keyboard Project",
    layoutId: activeLayoutId,
    layoutName: layoutNameDraft.trim() || activeSavedLayout?.name || "Layout"
  }), [activeKeyboardProject?.name, activeKeyboardProjectId, activeLayoutId, activeSavedLayout?.name, keyboardProjectNameDraft, layoutNameDraft]);
  const keymapExportDocument = useMemo(() => (
    activeKeyboardProject && model && activeSavedLayout
      ? createKeymapExportDocument(model, keymapDocument, exportOptions)
      : null
  ), [activeKeyboardProject, activeSavedLayout, exportOptions, keymapDocument, model]);
  const jsonOutput = useMemo(() => {
    if (!keymapExportDocument) {
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

    return JSON.stringify(keymapExportDocument, null, 2);
  }, [
    activeKeyboardProject,
    activeKeyboardProjectId,
    keymapExportDocument,
    keyboardProjectNameDraft,
  ]);
  const keymapTemplateContext = useMemo<KeymapTemplateContext | null>(() => (
    keymapExportDocument ? { ctx: keymapExportDocument } : null
  ), [keymapExportDocument]);
  const renderedKeymap = useMemo(() => {
    if (!keymapTemplateContext) {
      return "/* Create or select a project, KLE model, and layout to render keymap.c. */";
    }

    try {
      return renderKeymapTemplate(keymapTemplateDraft || DEFAULT_KEYMAP_TEMPLATE, keymapTemplateContext);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown template error.";
      return `/* Template render error:\n${message}\n*/`;
    }
  }, [keymapTemplateContext, keymapTemplateDraft]);
  const renderedKeymapHasError = renderedKeymap.startsWith("/* Template render error:");
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
      keymapTemplate: normalizeKeymapTemplate(keymapTemplateDraft),
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
    setKeymapTemplateDraft(DEFAULT_KEYMAP_TEMPLATE);
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
    setKeymapTemplateDraft(normalizeKeymapTemplate(project.keymapTemplate));
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
    setKeymapTemplateDraft(normalizeKeymapTemplate(savedProject.keymapTemplate));
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

  function openProjectBrowser(tab: ProjectBrowserTab = "projects") {
    closeActionMenus();
    closeContextPicker();
    setProjectBrowserTab(tab);
    setProjectSearchDraft("");
    setProjectBrowserPage(0);
    setShowProjectBrowser(true);
  }

  function closeProjectBrowser() {
    setShowProjectBrowser(false);
    setProjectSearchDraft("");
    setProjectBrowserPage(0);
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
    closeProjectBrowser();
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

  async function copyKeymap() {
    try {
      await navigator.clipboard.writeText(renderedKeymap);
      setStatusMessage(renderedKeymapHasError ? "Copied keymap render error to clipboard." : "Copied rendered keymap.c to clipboard.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not copy keymap.c to clipboard.");
    }
  }

  function downloadText(content: string, filename: string, type = "application/json") {
    const blob = new Blob([content + "\n"], { type });
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

  function downloadKeymap() {
    if (!model || !activeSavedLayout) {
      setStatusMessage("Create or import a layout before downloading keymap.c.");
      return;
    }
    const filename = `${safeFileSlug(layoutNameDraft, "keymap")}.keymap.c`;
    downloadText(renderedKeymap, filename, "text/x-csrc");
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

  function renderContextPicker(options: ComponentProps<typeof ContextPicker>) {
    return <ContextPicker {...options} />;
  }

  function runMenuAction(action: () => void) {
    closeActionMenus();
    action();
  }

  function renderActionMenu(
    id: string,
    label: string,
    children: ReactNode,
    options: { className?: string; disabled?: boolean; icon?: string; testId?: string } = {}
  ) {
    return (
      <ActionMenu
        className={options.className}
        disabled={options.disabled}
        icon={options.icon}
        id={id}
        label={label}
        testId={options.testId}
      >
        {children}
      </ActionMenu>
    );
  }

  const simpleAction = simpleComposerActions.find((action) => action.kind === simpleKind) ?? simpleComposerActions[0];
  const composerLayerOptions = useMemo(() => layers.map((layer) => layer.name), [layers]);
  const composerLayerPickerOptions = useMemo<ContextPickerOption[]>(() => layers.map((layer, index) => ({
    value: layer.name,
    label: layer.name,
    meta: `Layer ${index}`
  })), [layers]);
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
  }, [activeKeyboardProjectId, activeLayoutId, keyboardProjectNameDraft, keymapDocument, keymapTemplateDraft, layoutNameDraft, model]);

  useEffect(() => {
    if (/\bqmk\./.test(keymapTemplateDraft) || (/\b(keyboardProject|keyboard|layout)\./.test(keymapTemplateDraft) && !/\bctx\./.test(keymapTemplateDraft))) {
      setKeymapTemplateDraft(DEFAULT_KEYMAP_TEMPLATE);
    }
  }, [keymapTemplateDraft]);

  useEffect(() => {
    if (!simpleAction.fields.includes("layer") || composerLayerOptions.length === 0) return;
    if (!composerLayerOptions.includes(simpleLayer)) {
      setSimpleLayer(composerLayerOptions[0]);
    }
  }, [composerLayerOptions, simpleAction.fields, simpleLayer]);

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
      <AppTopbar
        activePage={activePage}
        canRedo={canRedo}
        canUndo={canUndo}
        layoutPicker={renderContextPicker({
          id: "top-layout",
          label: "Layout",
          value: activeLayoutId,
          emptyLabel: "No layouts",
          choices: layoutPickerOptions,
          disabled: !activeKeyboardProject || availableLayouts.length === 0,
          onSelect: (value) => {
            if (value !== activeLayoutId) {
              loadLayout(value);
            }
          },
          triggerTestId: "top-layout-picker-trigger",
          searchTestId: "top-layout-picker-search",
          optionTestId: "top-layout-picker-option"
        })}
        projectPicker={renderContextPicker({
          id: "top-project",
          label: "Project",
          value: activeKeyboardProjectId,
          emptyLabel: "No user projects",
          choices: projectPickerOptions,
          disabled: keyboardProjects.length === 0,
          onSelect: (value) => {
            if (value !== activeKeyboardProjectId) {
              loadKeyboardProject(value);
            }
          },
          triggerTestId: "top-project-picker-trigger",
          searchTestId: "top-project-picker-search",
          optionTestId: "top-project-picker-option"
        })}
        workspaceMenu={renderActionMenu("workspace-actions", "Workspace", (
          <>
            <button className="action-export" data-icon="⇡" data-testid="backup-workspace" onClick={() => runMenuAction(downloadWorkspaceBackup)} role="menuitem" type="button">Backup Workspace</button>
            <label className="file-import action-import" data-icon="⇣" role="menuitem" title="Restore a full qmk-viz workspace backup">
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
                  closeActionMenus();
                  event.target.value = "";
                }}
                type="file"
              />
            </label>
          </>
        ), { icon: "▦" })}
        onPageChange={setActivePage}
        onRedo={redoApp}
        onUndo={undoApp}
      />

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
              {renderContextPicker({
                id: "editor-layout",
                label: "Layout",
                value: activeLayoutId,
                emptyLabel: "No layouts",
                choices: layoutPickerOptions,
                disabled: !activeSavedLayout,
                onSelect: (value) => {
                  if (value !== activeLayoutId) {
                    loadLayout(value);
                  }
                },
                className: "field-picker editor-layout-picker",
                triggerTestId: "layout-select",
                searchTestId: "layout-select-search",
                optionTestId: "layout-select-option"
              })}
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
                {renderContextPicker({
                  id: "simple-kind",
                  label: "Action type",
                  value: simpleKind,
                  emptyLabel: "Choose action",
                  choices: simpleComposerPickerOptions,
                  disabled: false,
                  onSelect: (value) => setSimpleKind(value as SimpleComposerKind),
                  className: "field-picker composer-picker",
                  triggerTestId: "simple-composer-kind",
                  searchTestId: "simple-composer-kind-search",
                  optionTestId: "simple-composer-kind-option"
                })}
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
                    renderContextPicker({
                      id: "mod-tap-modifier",
                      label: "Hold modifier",
                      value: modTapModifier,
                      emptyLabel: "Choose modifier",
                      choices: modTapPickerOptions,
                      disabled: false,
                      onSelect: setModTapModifier,
                      className: "field-picker composer-picker",
                      triggerTestId: "mod-tap-modifier",
                      searchTestId: "mod-tap-modifier-search",
                      optionTestId: "mod-tap-modifier-option"
                    })
                  )}
                  {simpleAction.fields.includes("layer") && (
                    renderContextPicker({
                      id: "simple-layer",
                      label: simpleAction.layerLabel ?? "Layer",
                      value: simpleLayer,
                      emptyLabel: "No layers",
                      choices: composerLayerPickerOptions,
                      disabled: composerLayerPickerOptions.length === 0,
                      onSelect: setSimpleLayer,
                      className: "field-picker composer-picker",
                      triggerTestId: "simple-layer",
                      searchTestId: "simple-layer-search",
                      optionTestId: "simple-layer-option"
                    })
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
        <ProjectPage
          activeProjectStats={activeProjectStats}
          createProjectMenu={renderActionMenu("create-project-actions", "Create Project", (
            <>
              <button className="action-create" data-icon="+" data-testid="new-project" onClick={() => runMenuAction(createBlankKeyboardProject)} role="menuitem" type="button">Blank Project</button>
              <button className="action-default" data-icon="★" data-testid="new-project-from-example" onClick={() => runMenuAction(() => openProjectBrowser("examples"))} role="menuitem" type="button">From Example</button>
            </>
          ), { className: "action-create", icon: "+", testId: "create-project-menu" })}
          hasActiveProject={Boolean(activeKeyboardProject)}
          model={model}
          modelActionsMenu={renderActionMenu("model-actions", "KLE model", (
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
          ), { disabled: !activeKeyboardProject && !model, testId: "model-actions-menu" })}
          onOpenProjectBrowser={() => openProjectBrowser("projects")}
          onShowKleHelp={() => setShowKleHelp(true)}
          projectActionsMenu={renderActionMenu("project-actions", "Project actions", (
            <>
              <button className="action-rename" data-icon="✎" data-testid="rename-project" disabled={!activeKeyboardProject} onClick={() => runMenuAction(openProjectRenameDialog)} role="menuitem" type="button">Rename Project</button>
              <button className="action-copy" data-icon="⧉" data-testid="duplicate-project" disabled={!activeKeyboardProject} onClick={() => runMenuAction(duplicateKeyboardProject)} role="menuitem" type="button">Duplicate Project</button>
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
              <button className="danger-button action-danger" data-icon="!" data-testid="delete-project" disabled={!activeKeyboardProject} onClick={() => runMenuAction(deleteKeyboardProject)} role="menuitem" type="button">Delete Project</button>
            </>
          ), { testId: "project-actions-menu" })}
          projectName={keyboardProjectNameDraft}
          userProjectCount={keyboardProjects.length}
        />
      )}

      {activePage === "export" && (
        <ExportPage
          activeTab={exportPreviewTab}
          canCopyKeymap={Boolean(model && activeSavedLayout && !renderedKeymapHasError)}
          canExport={Boolean(model && activeSavedLayout)}
          downloadsMenu={renderActionMenu("export-downloads", "Downloads", (
            <>
              <button className="action-export" data-icon="⇡" data-testid="download-keymap" disabled={!model || !activeSavedLayout || renderedKeymapHasError} onClick={() => runMenuAction(downloadKeymap)} role="menuitem" type="button">Keymap C</button>
              <button className="action-export" data-icon="⇡" data-testid="download-layout-json" disabled={!model || !activeSavedLayout} onClick={() => runMenuAction(downloadJson)} role="menuitem" type="button">Layout JSON</button>
              <button className="action-export" data-icon="⇡" data-testid="download-layer-kle" disabled={!model || !activeSavedLayout} onClick={() => runMenuAction(downloadActiveLayerKle)} role="menuitem" type="button">Layer KLE</button>
              <button className="action-export" data-icon="⇡" data-testid="download-project-kle" disabled={!model} onClick={() => runMenuAction(downloadProjectKle)} role="menuitem" type="button">Project KLE</button>
            </>
          ), { className: "action-export", icon: "⇡" })}
          jsonOutput={jsonOutput}
          layoutName={layoutNameDraft}
          onCopyJson={copyJson}
          onCopyKeymap={copyKeymap}
          onPreviewTabChange={setExportPreviewTab}
          onTemplateChange={setKeymapTemplateDraft}
          projectName={keyboardProjectNameDraft}
          renderedKeymap={renderedKeymap}
          renderedKeymapHasError={renderedKeymapHasError}
          template={keymapTemplateDraft}
        />
      )}

      {showProjectBrowser && (
        <ProjectBrowserModal
          activeProjectId={activeKeyboardProjectId}
          exampleProjectCount={exampleProjects.length}
          items={visibleProjectBrowserItems}
          page={safeProjectBrowserPage}
          pageCount={projectBrowserPageCount}
          searchDraft={projectSearchDraft}
          tab={projectBrowserTab}
          totalResults={projectBrowserItems.length}
          userProjectCount={keyboardProjects.length}
          onClose={closeProjectBrowser}
          onNextPage={() => setProjectBrowserPage((page) => Math.min(projectBrowserPageCount - 1, page + 1))}
          onPreviousPage={() => setProjectBrowserPage((page) => Math.max(0, page - 1))}
          onSearchChange={(value) => {
            setProjectSearchDraft(value);
            setProjectBrowserPage(0);
          }}
          onSelectExample={loadExampleProject}
          onSelectProject={(id) => {
            loadKeyboardProject(id);
            closeProjectBrowser();
          }}
          onTabChange={(nextTab) => {
            setProjectBrowserTab(nextTab);
            setProjectBrowserPage(0);
          }}
        />
      )}

      {jsonEditDialog && (
        <JsonEditModal
          dialog={jsonEditDialog}
          validation={jsonEditValidation}
          onChange={(value) => setJsonEditDialog((current) => (
            current ? { ...current, value } : current
          ))}
          onClose={() => setJsonEditDialog(null)}
          onSubmit={submitJsonEditDialog}
        />
      )}

      {createLayoutNameDraft !== null && (
        <CreateLayoutModal
          value={createLayoutNameDraft}
          onChange={setCreateLayoutNameDraft}
          onClose={() => setCreateLayoutNameDraft(null)}
          onSubmit={submitCreateLayoutDialog}
        />
      )}

      {showKleHelp && (
        <KleHelpModal onClose={() => setShowKleHelp(false)} />
      )}

      {renameDialog && (
        <RenameModal
          dialog={renameDialog}
          onChange={(value) => setRenameDialog((current) => (
            current ? { ...current, value } : current
          ))}
          onClose={() => setRenameDialog(null)}
          onSubmit={submitRenameDialog}
        />
      )}
    </main>
  );
}
