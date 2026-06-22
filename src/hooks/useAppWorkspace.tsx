import { useEffect, useMemo, useRef, type ComponentProps, type DragEvent, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { composeBehaviorAction, describeAction, parseActionToBehaviorSlots, type BehaviorSlots } from "../lib/actions";
import { buildKeyboardModelFromKle, keyboardGeometryForModel, type KeySlot } from "../lib/keyboardModel";
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
} from "../lib/keymap";
import { serializeKeyboardModelKle, serializeLayerKle } from "../lib/kleExport";
import { keyboardScaleForViewport, keyboardStageSizeForGeometry } from "../lib/keyboardStage";
import { ActionMenu } from "../components/ActionMenu";
import { ContextPicker, type ContextPickerOption } from "../components/ContextPicker";
import type { ProjectBrowserItem, ProjectBrowserTab } from "../components/ProjectBrowserModal";
import type { ExportPreviewTab } from "../pages/ExportPage";
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
  serializeKeyboardProject,
  uniqueLayoutName,
  type ProjectFile,
  type SavedKeyboardProject,
  type SavedLayout,
  type SerializedWorkspaceFile
} from "../lib/appModel";
import {
  DEFAULT_KEYMAP_TEMPLATE,
  normalizeKeymapTemplate,
  renderKeymapTemplate,
  type KeymapTemplateContext
} from "../lib/keymapTemplate";
import {
  composeModTapAction,
  composeSimpleAction,
  modTapActions,
  parseSimpleComposerAction,
  qmkKeycodeFromEvent,
  simpleComposerActions,
  type SimpleComposerKind
} from "../lib/qmkActions";
import { applySimpleKeycodeModifiers, layerPalette, simpleKeycodeMods } from "../lib/editorConfig";
import {
  useAppStore,
  type JsonEditKind
} from "../stores/appStore";

type UseAppWorkspaceOptions = {
  enableGlobalEffects?: boolean;
  enableEditorEffects?: boolean;
};

type JsonValidation = {
  ok: boolean;
  message: string;
};

type ExtKeyTableKind = "macro" | "alias" | "keycode";

type AppSnapshot = {
  project: SavedKeyboardProject | null;
  activeLayoutId: string;
  activeLayerName: string;
  selectedSlot: string;
};

const projectBrowserPageSize = 6;

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

function normalizeSupportIdentifier(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
}

function isMacroExtKey(key: ExtKey): boolean {
  return `${key.kind} ${key.name}`.toLowerCase().includes("macro");
}

function isCustomKeycodeExtKey(key: ExtKey): boolean {
  return key.kind === "keycode";
}

function supportEntryLabel(kind: string): string {
  switch (kind) {
    case "macro":
      return "macro";
    case "keycode":
      return "custom keycode";
    default:
      return "custom key alias";
  }
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

export function useAppWorkspace(options: UseAppWorkspaceOptions = {}) {
  const { enableGlobalEffects = false, enableEditorEffects = false } = options;
  const keyboardViewportRef = useRef<HTMLDivElement | null>(null);
  const {
    activeKeyboardProjectId,
    activeLayerName,
    activeLayoutId,
    activePage,
    behaviorSlots,
    captureTarget,
    composerMode,
    copiedKeyAction,
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
    showSaveAliasDialog,
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
    setCopiedKeyAction,
    setProjectBrowserPage,
    setProjectBrowserTab,
    setProjectSearchDraft,
    setRedoStack,
    setRenameDialog,
    setSelectedSlot,
    setSelectedVersionNameDraft,
    setShowKleHelp,
    setShowProjectBrowser,
    setShowSaveAliasDialog,
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
  const keyboardGeometry = useMemo(() => model ? keyboardGeometryForModel(model) : null, [model]);
  const keyboardStageSize = useMemo(() => keyboardStageSizeForGeometry(keyboardGeometry), [keyboardGeometry]);
  const keyboardScale = useMemo(() => keyboardScaleForViewport(keyboardStageSize, keyboardViewportSize), [keyboardStageSize, keyboardViewportSize]);
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
    if (!enableEditorEffects) return undefined;

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
  }, [activePage, enableEditorEffects]);

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

  function copySelectedKeyAction() {
    if (copiedKeyAction) {
      setCopiedKeyAction(null);
      setStatusMessage("Canceled copied key.");
      return;
    }

    if (!selectedKey) {
      setStatusMessage("Select a key before copying.");
      return;
    }

    setCopiedKeyAction({
      action: currentAction,
      layerName: activeLayer.name,
      slot: selectedKey.slot
    });
    setStatusMessage(`Copied ${selectedKey.slot} on ${activeLayer.name}.`);
  }

  function pasteCopiedKeyAction() {
    if (!copiedKeyAction) {
      setStatusMessage("Copy a key before pasting.");
      return;
    }
    if (!selectedKey || !activeSavedLayout) {
      setStatusMessage("Create or import a layout and select a key before pasting.");
      return;
    }

    const before = selectedKeycode(activeLayer, selectedKey.slot);
    if (before !== copiedKeyAction.action) {
      recordHistory();
      setLayers((current) => updateKeycode(current, activeLayer.name, selectedKey.slot, copiedKeyAction.action));
    }
    setDraftAction(copiedKeyAction.action);
    setSwapSourceSlot(null);
    setStatusMessage(`Pasted ${copiedKeyAction.slot} from ${copiedKeyAction.layerName} into ${selectedKey.slot} on ${activeLayer.name}.`);
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

  function openSaveAliasDialog() {
    setExtraKeyNameDraft(extraKeyNameDraft.trim() || "ALIAS_CUSTOM");
    setShowSaveAliasDialog(true);
  }

  function saveGeneratedActionAsExtraKey() {
    const name = normalizeSupportIdentifier(extraKeyNameDraft);
    if (!name) {
      setStatusMessage("Enter a custom key alias name before saving the generated action.");
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
    setShowSaveAliasDialog(false);
    setStatusMessage(`Saved ${name} as a custom key alias for ${generatedAction}.`);
  }

  function submitSaveAliasDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveGeneratedActionAsExtraKey();
  }

  async function copyGeneratedAction() {
    try {
      await navigator.clipboard.writeText(generatedAction);
      setStatusMessage(`Copied ${generatedAction} to clipboard.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not copy generated QMK expression to clipboard.");
    }
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
      name: kind === "macro" ? "MACRO_CUSTOM" : kind === "keycode" ? "NL_CUSTOM" : "ALIAS_CUSTOM",
      kind,
      value: kind === "macro" ? "SEND_STRING(\"\")" : kind === "keycode" ? "SAFE_RANGE" : "KC_NO",
      notes: ""
    });
  }

  function startEditExtKey(key: ExtKey) {
    setEditingExtKeyName(key.name);
    setExtKeyDraft({ ...key });
  }

  function saveExtKeyDraft() {
    const name = normalizeSupportIdentifier(extKeyDraft.name);
    if (!name) {
      setStatusMessage(`Enter a ${supportEntryLabel(extKeyDraft.kind)} name before saving.`);
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
    setStatusMessage(`Saved ${supportEntryLabel(nextKey.kind)} ${name}.`);
  }

  function deleteExtKey(name: string) {
    const entry = extKeys.find((key) => key.name === name);
    if (!window.confirm(`Delete ${supportEntryLabel(entry?.kind ?? "alias")} "${name}"?`)) return;
    recordHistory();
    setExtKeys((current) => current.filter((key) => key.name !== name));
    if (editingExtKeyName === name) {
      setEditingExtKeyName(null);
    }
    setStatusMessage(`Deleted ${supportEntryLabel(entry?.kind ?? "alias")} ${name}.`);
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
      project: serializeKeyboardProject(project)
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
    const backup: SerializedWorkspaceFile = {
      version: 1,
      kind: "qmk-viz-workspace",
      exportedAt: new Date().toISOString(),
      activeProjectId: activeKeyboardProjectId || null,
      activeLayoutId: activeLayoutId || null,
      projects: activeKeyboardProject
        ? keyboardProjects.map((project) => serializeKeyboardProject(project.id === activeKeyboardProject.id ? projectWithEditorState() ?? project : project))
        : keyboardProjects.map(serializeKeyboardProject)
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
  const customKeycodeRows = extKeyRows.filter(isCustomKeycodeExtKey);
  const aliasRows = extKeyRows.filter((key) => !isMacroExtKey(key) && !isCustomKeycodeExtKey(key));
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
    if (!enableGlobalEffects) return;
    localStorage.setItem(KEYBOARD_PROJECTS_STORAGE_KEY, JSON.stringify(keyboardProjects.map(serializeKeyboardProject)));
  }, [enableGlobalEffects, keyboardProjects]);

  useEffect(() => {
    if (!enableGlobalEffects) return;
    persistActiveKeyboardProject();
  }, [activeKeyboardProjectId, activeLayoutId, enableGlobalEffects, keyboardProjectNameDraft, keymapDocument, keymapTemplateDraft, layoutNameDraft, model]);

  useEffect(() => {
    if (!enableGlobalEffects) return;
    if (/\bqmk\./.test(keymapTemplateDraft) || (/\b(keyboardProject|keyboard|layout)\./.test(keymapTemplateDraft) && !/\bctx\./.test(keymapTemplateDraft))) {
      setKeymapTemplateDraft(DEFAULT_KEYMAP_TEMPLATE);
    }
  }, [enableGlobalEffects, keymapTemplateDraft]);

  useEffect(() => {
    if (!enableEditorEffects) return;
    if (!simpleAction.fields.includes("layer") || composerLayerOptions.length === 0) return;
    if (!composerLayerOptions.includes(simpleLayer)) {
      setSimpleLayer(composerLayerOptions[0]);
    }
  }, [composerLayerOptions, enableEditorEffects, simpleAction.fields, simpleLayer]);

  useEffect(() => {
    if (!enableGlobalEffects) return;
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
  }, [enableGlobalEffects, openActionMenuId, openContextPicker]);

  useEffect(() => {
    if (!enableEditorEffects) return;
    setSelectedVersionNameDraft(activeLayoutVersion?.name ?? "");
  }, [activeLayoutVersion?.id, activeLayoutVersion?.name, enableEditorEffects]);

  useEffect(() => {
    if (!enableEditorEffects) return;
    setDraftAction(currentAction);
    if (syncComposerWithSelection) {
      syncComposerFromAction(currentAction);
    }
  }, [activeLayer.name, currentAction, dances, enableEditorEffects, selectedKey?.slot, syncComposerWithSelection]);

  useEffect(() => {
    if (!enableEditorEffects) return;
    setLayerNameDraft(activeLayer.name);
  }, [activeLayer.name, enableEditorEffects]);

  useEffect(() => {
    if (!enableEditorEffects || !captureTarget) return;

    function captureKey(event: KeyboardEvent) {
      event.preventDefault();
      event.stopPropagation();

      if (isModifierKeyEvent(event)) {
        setStatusMessage("Hold modifiers, then press the key to capture for Simple composer.");
        return;
      }

      const keycode = qmkKeycodeFromEvent(event);
      if (keycode) {
        setSimpleKeycode(keycode);
        setSimpleKeycodeModifiers(simpleModifiersFromEvent(event));
        setStatusMessage(`Captured ${keycode} with modifiers for Simple composer.`);
      } else {
        setStatusMessage(`Could not map "${event.key}" to a QMK keycode; type the raw identifier manually.`);
      }
      setCaptureTarget(null);
    }

    window.addEventListener("keydown", captureKey, { capture: true });
    return () => window.removeEventListener("keydown", captureKey, { capture: true });
  }, [captureTarget, enableEditorEffects]);


  return {
    keyboardViewportRef,
    activeKeyboardProjectId,
    activeLayerName,
    activeLayoutId,
    activePage,
    behaviorSlots,
    captureTarget,
    composerMode,
    copiedKeyAction,
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
    showSaveAliasDialog,
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
    setCopiedKeyAction,
    setProjectBrowserPage,
    setProjectBrowserTab,
    setProjectSearchDraft,
    setRedoStack,
    setRenameDialog,
    setSelectedSlot,
    setSelectedVersionNameDraft,
    setShowKleHelp,
    setShowProjectBrowser,
    setShowSaveAliasDialog,
    setSimpleKeycode,
    setSimpleKeycodeModifiers,
    setSimpleKind,
    setSimpleLayer,
    setSimpleRawAction,
    setStatusMessageState,
    setSwapSourceSlot,
    setSyncComposerWithSelection,
    setUndoStack,
    setVersionNameDraft,
    activeKeyboardProject,
    availableLayouts,
    activeSavedLayout,
    activeLayoutVersion,
    hasModel,
    hasLayout,
    projectStats,
    activeProjectStats,
    projectBrowserUserItems,
    projectBrowserExampleItems,
    projectBrowserItems,
    projectBrowserPageCount,
    safeProjectBrowserPage,
    visibleProjectBrowserItems,
    projectPickerOptions,
    layoutPickerOptions,
    simpleComposerPickerOptions,
    modTapPickerOptions,
    foundLayerIndex,
    activeLayerIndex,
    activeLayer,
    layerColorMap,
    selectedKey,
    currentAction,
    keyboardGeometry,
    keyboardStageSize,
    keyboardScale,
    keyboardVisualSize,
    keymapDocument,
    exportOptions,
    keymapExportDocument,
    jsonOutput,
    keymapTemplateContext,
    renderedKeymap,
    renderedKeymapHasError,
    jsonEditValidation,
    simpleAction,
    composerLayerOptions,
    composerLayerPickerOptions,
    simpleDecoratedKeycode,
    simpleGeneratedAction,
    danceComposition,
    generatedAction,
    composerNote,
    selectedDetails,
    draftDetails,
    danceRows,
    extKeyRows,
    macroRows,
    customKeycodeRows,
    aliasRows,
    canUndo,
    canRedo,
    setStatusMessage,
    projectWithEditorState,
    snapshot,
    loadEmptyWorkspace,
    loadLayoutObject,
    loadKeyboardProjectObject,
    applySnapshot,
    recordHistory,
    loadKeyboardProject,
    loadLayout,
    selectKey,
    startKeySwap,
    cancelKeySwap,
    copySelectedKeyAction,
    pasteCopiedKeyAction,
    swapKeySlots,
    swapKeyWithSource,
    handleKeyDragStart,
    handleKeyDragOver,
    handleKeyDrop,
    handleKeyDragEnd,
    handleKeyClick,
    writeAction,
    applyGeneratedAction,
    openSaveAliasDialog,
    saveGeneratedActionAsExtraKey,
    submitSaveAliasDialog,
    copyGeneratedAction,
    startNewDance,
    startEditDance,
    saveDanceDraft,
    deleteDance,
    startNewExtKey,
    startEditExtKey,
    saveExtKeyDraft,
    deleteExtKey,
    updateBehaviorSlot,
    renameActiveLayer,
    addLayer,
    removeActiveLayer,
    setActiveLayerColor,
    moveActiveLayer,
    undoApp,
    redoApp,
    persistActiveKeyboardProject,
    openProjectRenameDialog,
    openLayoutRenameDialog,
    openCreateLayoutDialog,
    submitRenameDialog,
    createBlankKeyboardProject,
    duplicateKeyboardProject,
    deleteKeyboardProject,
    createBlankLayoutForActiveProject,
    submitCreateLayoutDialog,
    duplicateLayout,
    deleteLayout,
    saveLayoutVersion,
    loadLayoutVersion,
    renameActiveVersion,
    deleteActiveVersion,
    saveCurrentLayoutAsDefault,
    updateActiveKeyboardModelFromJson,
    updateActiveKeyboardModel,
    uploadLayoutFromJson,
    uploadLayout,
    importFullProjectFromJson,
    importFullProject,
    openProjectBrowser,
    closeProjectBrowser,
    restoreWorkspaceFromJson,
    restoreWorkspace,
    loadExampleProject,
    currentProjectFileJson,
    openJsonEditDialog,
    submitJsonEditDialog,
    copyJson,
    copyKeymap,
    downloadText,
    downloadJson,
    downloadKeymap,
    downloadFullProject,
    downloadWorkspaceBackup,
    downloadProjectKle,
    downloadActiveLayerKle,
    closeActionMenus,
    closeContextPicker,
    renderContextPicker,
    runMenuAction,
    renderActionMenu,
    syncComposerFromAction,
  };
}
