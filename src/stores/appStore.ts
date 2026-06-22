import { create } from "zustand";
import type { BehaviorSlots } from "../lib/actions";
import type { KeyboardModel } from "../lib/keyboardModel";
import { createEmptyKeymapDocument, type ExtKey, type KeymapLayer } from "../lib/keymap";
import { loadExampleProjects, loadKeyboardProjects, type SavedKeyboardProject, type WorkspaceFile } from "../lib/appModel";
import { DEFAULT_KEYMAP_TEMPLATE, normalizeKeymapTemplate } from "../lib/keymapTemplate";
import { pathForPage, type AppPage } from "../lib/appNavigation";
import type { ProjectBrowserTab } from "../components/ProjectBrowserModal";
import type { ExportPreviewTab } from "../pages/ExportPage";
import type { SimpleComposerKind } from "../lib/qmkActions";

export type ComposerMode = "simple" | "dance";

export type RenameDialog = {
  kind: "project" | "layout";
  value: string;
};

export type JsonEditKind = "project" | "layout" | "kle";

export type JsonEditDialog = {
  kind: JsonEditKind;
  value: string;
};

export type ConfirmDialog =
  | { kind: "deleteDance"; name: string }
  | { kind: "deleteExtKey"; name: string; label: string }
  | { kind: "deleteProject"; projectId: string; name: string; layoutCount: number; versionCount: number }
  | { kind: "deleteLayout"; layoutId: string; name: string; versionCount: number }
  | { kind: "loadLayoutVersion"; versionId: string; name: string }
  | { kind: "deleteVersion"; versionId: string; name: string }
  | { kind: "restoreWorkspace"; sourceName: string; workspace: WorkspaceFile; currentProjectCount: number; currentLayoutCount: number; nextProjectCount: number; nextLayoutCount: number };

export type CaptureTarget = "simple";

export type ContextPickerId = "top-project" | "top-layout" | "editor-layout" | "simple-kind" | "mod-tap-modifier" | "simple-layer";

export type CopiedKeyAction = {
  action: string;
  layerName: string;
  slot: string;
};

export type KeyboardViewportSize = {
  width: number;
  screenHeight: number;
};

type Setter<T> = (next: T | ((current: T) => T)) => void;

type AppStoreValues = {
  activeKeyboardProjectId: string;
  activeLayerName: string;
  activeLayoutId: string;
  activePage: AppPage;
  behaviorSlots: BehaviorSlots;
  captureTarget: CaptureTarget | null;
  composerMode: ComposerMode;
  contextPickerActiveIndex: number;
  contextPickerSearch: string;
  confirmDialog: ConfirmDialog | null;
  copiedKeyAction: CopiedKeyAction | null;
  createLayoutNameDraft: string | null;
  danceDraftName: string;
  danceDraftSlots: BehaviorSlots;
  danceName: string;
  dances: Record<string, BehaviorSlots>;
  draftAction: string;
  editingDanceName: string | null;
  editingExtKeyName: string | null;
  exampleProjects: SavedKeyboardProject[];
  exportPreviewTab: ExportPreviewTab;
  extraKeyNameDraft: string;
  extKeyDraft: ExtKey;
  extKeys: ExtKey[];
  jsonEditDialog: JsonEditDialog | null;
  keyboardProjectNameDraft: string;
  keyboardProjects: SavedKeyboardProject[];
  keyboardViewportSize: KeyboardViewportSize;
  keymapTemplateDraft: string;
  layerColors: Record<string, string>;
  layerNameDraft: string;
  layers: KeymapLayer[];
  layoutNameDraft: string;
  modTapModifier: string;
  model: KeyboardModel | null;
  openActionMenuId: string | null;
  openContextPicker: ContextPickerId | null;
  projectBrowserPage: number;
  projectBrowserTab: ProjectBrowserTab;
  projectSearchDraft: string;
  redoStack: string[];
  renameDialog: RenameDialog | null;
  selectedSlot: string;
  selectedVersionNameDraft: string;
  showKleHelp: boolean;
  showProjectBrowser: boolean;
  showSaveAliasDialog: boolean;
  simpleKeycode: string;
  simpleKeycodeModifiers: string[];
  simpleKind: SimpleComposerKind;
  simpleLayer: string;
  simpleRawAction: string;
  statusMessage: string;
  swapSourceSlot: string | null;
  syncComposerWithSelection: boolean;
  undoStack: string[];
  versionNameDraft: string;
};

type AppStoreSetters = {
  [K in keyof AppStoreValues as `set${Capitalize<string & K>}`]: Setter<AppStoreValues[K]>;
};

export type AppStore = AppStoreValues & AppStoreSetters;

function activeLayoutForProject(project: SavedKeyboardProject | null) {
  if (!project) return null;
  return project.layouts.find((layout) => layout.id === project.activeLayoutId) ?? project.layouts[0] ?? null;
}

function createInitialValues(): AppStoreValues {
  const keyboardProjects = loadKeyboardProjects();
  const exampleProjects = loadExampleProjects();
  const initialKeyboardProject = keyboardProjects[0] ?? null;
  const initialLayout = activeLayoutForProject(initialKeyboardProject);
  const initialDocument = initialLayout ? initialLayout.document : createEmptyKeymapDocument();
  const initialVersion = initialLayout?.versions.find((version) => version.id === initialLayout.activeVersionId) ?? initialLayout?.versions[0];
  const initialModel = initialKeyboardProject?.model ?? null;
  const initialLayerName = initialDocument.layers[0]?.name ?? "BASE";

  return {
    activeKeyboardProjectId: initialKeyboardProject?.id ?? "",
    activeLayerName: initialLayerName,
    activeLayoutId: initialLayout?.id ?? "",
    activePage: initialKeyboardProject ? "editor" : "projects",
    behaviorSlots: { tap: "", hold: "", doubleTap: "", tapHold: "" },
    captureTarget: null,
    composerMode: "simple",
    contextPickerActiveIndex: 0,
    contextPickerSearch: "",
    confirmDialog: null,
    copiedKeyAction: null,
    createLayoutNameDraft: null,
    danceDraftName: "DANCE_0",
    danceDraftSlots: { tap: "", hold: "", doubleTap: "", tapHold: "" },
    danceName: "DANCE_0",
    dances: { ...initialDocument.dances },
    draftAction: "",
    editingDanceName: null,
    editingExtKeyName: null,
    exampleProjects,
    exportPreviewTab: "keymap",
    extraKeyNameDraft: "ALIAS_CUSTOM",
    extKeyDraft: { name: "ALIAS_CUSTOM", kind: "alias", value: "KC_NO", notes: "" },
    extKeys: initialDocument.extKeys.map((key) => ({ ...key })),
    jsonEditDialog: null,
    keyboardProjectNameDraft: initialKeyboardProject?.name ?? "",
    keyboardProjects,
    keyboardViewportSize: {
      width: 0,
      screenHeight: typeof window === "undefined" ? 900 : window.innerHeight
    },
    keymapTemplateDraft: normalizeKeymapTemplate(initialKeyboardProject?.keymapTemplate),
    layerColors: initialDocument.layerColors ?? {},
    layerNameDraft: initialLayerName,
    layers: initialDocument.layers,
    layoutNameDraft: initialLayout?.name ?? "",
    modTapModifier: "CTL_T",
    model: initialModel,
    openActionMenuId: null,
    openContextPicker: null,
    projectBrowserPage: 0,
    projectBrowserTab: "projects",
    projectSearchDraft: "",
    redoStack: [],
    renameDialog: null,
    selectedSlot: initialModel?.keys[0]?.slot ?? "",
    selectedVersionNameDraft: initialVersion?.name ?? "",
    showKleHelp: false,
    showProjectBrowser: false,
    showSaveAliasDialog: false,
    simpleKeycode: "KC_SPC",
    simpleKeycodeModifiers: [],
    simpleKind: "plain",
    simpleLayer: "SYMB",
    simpleRawAction: "KC_NO",
    statusMessage: "",
    swapSourceSlot: null,
    syncComposerWithSelection: false,
    undoStack: [],
    versionNameDraft: ""
  };
}

function resolveNext<T>(next: T | ((current: T) => T), current: T): T {
  return typeof next === "function" ? (next as (current: T) => T)(current) : next;
}

function createSetter<K extends keyof AppStoreValues>(
  set: (updater: (state: AppStore) => Partial<AppStore>) => void,
  key: K
): Setter<AppStoreValues[K]> {
  return (next) => set((state) => ({
    [key]: resolveNext(next, state[key])
  } as Pick<AppStoreValues, K>));
}

function routeHashForPage(page: AppPage) {
  return `#${pathForPage(page)}`;
}

function hashPath(hash: string) {
  const cleanHash = hash.startsWith("#") ? hash.slice(1) : hash;
  return cleanHash.split("?", 1)[0] || "/";
}

function setLocationHashForPage(page: AppPage) {
  if (typeof window === "undefined") return;
  const nextPath = pathForPage(page);
  if (hashPath(window.location.hash) === nextPath) return;

  const nextHash = routeHashForPage(page);
  window.location.hash = nextHash;
}

function createActivePageSetter(
  set: (updater: (state: AppStore) => Partial<AppStore>) => void
): Setter<AppPage> {
  return (next) => set((state) => {
    const activePage = resolveNext(next, state.activePage);
    setLocationHashForPage(activePage);
    return { activePage };
  });
}

export const useAppStore = create<AppStore>((set) => ({
  ...createInitialValues(),
  setActiveKeyboardProjectId: createSetter(set, "activeKeyboardProjectId"),
  setActiveLayerName: createSetter(set, "activeLayerName"),
  setActiveLayoutId: createSetter(set, "activeLayoutId"),
  setActivePage: createActivePageSetter(set),
  setBehaviorSlots: createSetter(set, "behaviorSlots"),
  setCaptureTarget: createSetter(set, "captureTarget"),
  setComposerMode: createSetter(set, "composerMode"),
  setContextPickerActiveIndex: createSetter(set, "contextPickerActiveIndex"),
  setContextPickerSearch: createSetter(set, "contextPickerSearch"),
  setConfirmDialog: createSetter(set, "confirmDialog"),
  setCopiedKeyAction: createSetter(set, "copiedKeyAction"),
  setCreateLayoutNameDraft: createSetter(set, "createLayoutNameDraft"),
  setDanceDraftName: createSetter(set, "danceDraftName"),
  setDanceDraftSlots: createSetter(set, "danceDraftSlots"),
  setDanceName: createSetter(set, "danceName"),
  setDances: createSetter(set, "dances"),
  setDraftAction: createSetter(set, "draftAction"),
  setEditingDanceName: createSetter(set, "editingDanceName"),
  setEditingExtKeyName: createSetter(set, "editingExtKeyName"),
  setExampleProjects: createSetter(set, "exampleProjects"),
  setExportPreviewTab: createSetter(set, "exportPreviewTab"),
  setExtraKeyNameDraft: createSetter(set, "extraKeyNameDraft"),
  setExtKeyDraft: createSetter(set, "extKeyDraft"),
  setExtKeys: createSetter(set, "extKeys"),
  setJsonEditDialog: createSetter(set, "jsonEditDialog"),
  setKeyboardProjectNameDraft: createSetter(set, "keyboardProjectNameDraft"),
  setKeyboardProjects: createSetter(set, "keyboardProjects"),
  setKeyboardViewportSize: createSetter(set, "keyboardViewportSize"),
  setKeymapTemplateDraft: createSetter(set, "keymapTemplateDraft"),
  setLayerColors: createSetter(set, "layerColors"),
  setLayerNameDraft: createSetter(set, "layerNameDraft"),
  setLayers: createSetter(set, "layers"),
  setLayoutNameDraft: createSetter(set, "layoutNameDraft"),
  setModTapModifier: createSetter(set, "modTapModifier"),
  setModel: createSetter(set, "model"),
  setOpenActionMenuId: createSetter(set, "openActionMenuId"),
  setOpenContextPicker: createSetter(set, "openContextPicker"),
  setProjectBrowserPage: createSetter(set, "projectBrowserPage"),
  setProjectBrowserTab: createSetter(set, "projectBrowserTab"),
  setProjectSearchDraft: createSetter(set, "projectSearchDraft"),
  setRedoStack: createSetter(set, "redoStack"),
  setRenameDialog: createSetter(set, "renameDialog"),
  setSelectedSlot: createSetter(set, "selectedSlot"),
  setSelectedVersionNameDraft: createSetter(set, "selectedVersionNameDraft"),
  setShowKleHelp: createSetter(set, "showKleHelp"),
  setShowProjectBrowser: createSetter(set, "showProjectBrowser"),
  setShowSaveAliasDialog: createSetter(set, "showSaveAliasDialog"),
  setSimpleKeycode: createSetter(set, "simpleKeycode"),
  setSimpleKeycodeModifiers: createSetter(set, "simpleKeycodeModifiers"),
  setSimpleKind: createSetter(set, "simpleKind"),
  setSimpleLayer: createSetter(set, "simpleLayer"),
  setSimpleRawAction: createSetter(set, "simpleRawAction"),
  setStatusMessage: createSetter(set, "statusMessage"),
  setSwapSourceSlot: createSetter(set, "swapSourceSlot"),
  setSyncComposerWithSelection: createSetter(set, "syncComposerWithSelection"),
  setUndoStack: createSetter(set, "undoStack"),
  setVersionNameDraft: createSetter(set, "versionNameDraft")
}));
