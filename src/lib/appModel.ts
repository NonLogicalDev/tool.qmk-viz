import type { BehaviorSlots } from "./actions";
import { buildKeyboardModelFromKle, type KeyboardModel } from "./keyboardModel";
import {
  cloneKeymapDocument,
  createBlankKeymapDocument,
  reconcileKeymapDocumentToModel,
  type ExtKey,
  type KeymapDocument,
  type KeymapLayer
} from "./keymap";
import { cloneKleDocument } from "./kle";
import { ergodoxInfinity, ergodoxInfinityDefaultLayers } from "../models/ergodoxInfinity";

export const KEYBOARD_PROJECTS_STORAGE_KEY = "qmk-viz.keyboard-projects.v4";

export type SavedLayoutVersion = {
  id: string;
  parentId: string | null;
  label: string;
  createdAt: string;
  document: KeymapDocument;
};

export type SavedLayout = {
  id: string;
  name: string;
  document: KeymapDocument;
  versions: SavedLayoutVersion[];
  activeVersionId: string;
  updatedAt: string;
};

export type SavedDefaultLayout = {
  document: KeymapDocument;
  updatedAt: string;
};

export type SavedKeyboardProject = {
  id: string;
  name: string;
  model: KeyboardModel;
  defaultLayout: SavedDefaultLayout;
  layouts: SavedLayout[];
  activeLayoutId: string;
  updatedAt: string;
};

export type ProjectFile = {
  version: 1;
  kind: "qmk-viz-project";
  project: SavedKeyboardProject;
};

export function newEntityId(prefix: string): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}`;
}

export function formatVersionDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function createLayoutVersion(document: KeymapDocument, parentId: string | null, label: string, createdAt = new Date().toISOString()): SavedLayoutVersion {
  return {
    id: newEntityId("layout-version"),
    parentId,
    label,
    createdAt,
    document: cloneKeymapDocument(document)
  };
}

export function cloneLayoutVersion(version: SavedLayoutVersion): SavedLayoutVersion {
  return {
    ...version,
    document: cloneKeymapDocument(version.document)
  };
}

export function cloneDefaultLayout(defaultLayout: SavedDefaultLayout): SavedDefaultLayout {
  return {
    ...defaultLayout,
    document: cloneKeymapDocument(defaultLayout.document)
  };
}

export function cloneSavedLayout(layout: SavedLayout): SavedLayout {
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

export function reconcileSavedLayoutToModel(layout: SavedLayout, model: KeyboardModel): SavedLayout {
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

export function reconcileDefaultLayoutToModel(defaultLayout: SavedDefaultLayout, model: KeyboardModel): SavedDefaultLayout {
  return {
    ...defaultLayout,
    document: reconcileKeymapDocumentToModel(defaultLayout.document, model)
  };
}

export function createDefaultDocument(): KeymapDocument {
  return {
    version: 1,
    layers: ergodoxInfinityDefaultLayers.map((layer) => ({ name: layer.name, keys: { ...layer.keys } })),
    dances: {},
    extKeys: []
  };
}

export function createLayout(name: string, document: KeymapDocument): SavedLayout {
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

export function sanitizeKeyboardModel(model: KeyboardModel): KeyboardModel {
  return {
    ...model,
    kle: cloneKleDocument(model.kle)
  };
}

function createSavedDefaultLayout(document: KeymapDocument, updatedAt = new Date().toISOString()): SavedDefaultLayout {
  return {
    document: cloneKeymapDocument(document),
    updatedAt
  };
}

export function createKeyboardProject(
  name: string,
  model: KeyboardModel,
  layouts: SavedLayout[],
  defaultLayoutDocument?: KeymapDocument
): SavedKeyboardProject {
  const safeLayouts = layouts.length > 0 ? layouts : [createLayout("Default Layout", createBlankKeymapDocument(model))];
  const defaultDocument = defaultLayoutDocument
    ? reconcileKeymapDocumentToModel(defaultLayoutDocument, model)
    : cloneKeymapDocument(safeLayouts[0].document);

  return {
    id: newEntityId("keyboard-project"),
    name,
    model: sanitizeKeyboardModel(model),
    defaultLayout: createSavedDefaultLayout(defaultDocument),
    layouts: safeLayouts.map(cloneSavedLayout),
    activeLayoutId: safeLayouts[0].id,
    updatedAt: new Date().toISOString()
  };
}

export function defaultKeyboardProject(): SavedKeyboardProject {
  const monsterLayout = createLayout("Monster", createDefaultDocument());
  return createKeyboardProject(ergodoxInfinity.name, ergodoxInfinity, [monsterLayout], monsterLayout.document);
}

export function normalizeLoadedLayout(raw: Partial<SavedLayout>, model: KeyboardModel, index: number): SavedLayout {
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

function normalizeLoadedDefaultLayout(
  rawDefaultLayout: unknown,
  model: KeyboardModel,
  fallbackDocument: KeymapDocument,
  fallbackUpdatedAt: string
): SavedDefaultLayout {
  if (typeof rawDefaultLayout !== "object" || rawDefaultLayout === null) {
    return createSavedDefaultLayout(reconcileKeymapDocumentToModel(fallbackDocument, model), fallbackUpdatedAt);
  }

  const typedDefaultLayout = rawDefaultLayout as Partial<SavedDefaultLayout>;
  return createSavedDefaultLayout(
    reconcileKeymapDocumentToModel(typedDefaultLayout.document ?? fallbackDocument, model),
    typeof typedDefaultLayout.updatedAt === "string" ? typedDefaultLayout.updatedAt : fallbackUpdatedAt
  );
}

export function normalizeLoadedProject(raw: Partial<SavedKeyboardProject>, index: number): SavedKeyboardProject {
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
  const updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString();

  return {
    id: typeof raw.id === "string" ? raw.id : newEntityId("keyboard-project"),
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : `Keyboard Project ${index + 1}`,
    model: sanitizeKeyboardModel(model),
    defaultLayout: normalizeLoadedDefaultLayout(raw.defaultLayout, model, layouts[0].document, updatedAt),
    layouts,
    activeLayoutId,
    updatedAt
  };
}

export function loadKeyboardProjects(): SavedKeyboardProject[] {
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

export function activeLayoutFor(project: SavedKeyboardProject): SavedLayout {
  return project.layouts.find((layout) => layout.id === project.activeLayoutId) ?? project.layouts[0];
}

export function uniqueLayoutName(base: string, layouts: SavedLayout[], ignoreId = ""): string {
  const cleanBase = base.trim() || "Layout";
  const taken = new Set(layouts.filter((layout) => layout.id !== ignoreId).map((layout) => layout.name));
  if (!taken.has(cleanBase)) return cleanBase;

  let suffix = 1;
  while (taken.has(`${cleanBase} ${suffix}`)) {
    suffix += 1;
  }
  return `${cleanBase} ${suffix}`;
}

export function safeFileSlug(value: string, fallback: string): string {
  return value.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || fallback;
}

export function parseLayoutUpload(raw: unknown, model: KeyboardModel, fallbackName: string): SavedLayout {
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

export function parseProjectFile(raw: unknown, fallbackSource: string): SavedKeyboardProject {
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

  return createKeyboardProject(name, model, layouts, typedProject.defaultLayout?.document);
}
