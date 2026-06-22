import type { BehaviorSlots } from "./actions";
import { buildKeyboardModelFromKle, type KeyboardModel } from "./keyboardModel";
import {
  cloneKeymapDocument,
  createEmptyKeymapDocument,
  createBlankKeymapDocument,
  reconcileKeymapDocumentToModel,
  type ExtKey,
  type KeymapDocument,
  type KeymapLayer
} from "./keymap";
import { cloneKleDocument } from "./kle";

export const KEYBOARD_PROJECTS_STORAGE_KEY = "qmk-viz.keyboard-projects.v4";
const starterProjectModules = import.meta.glob("../../default-projects/*.json", {
  eager: true,
  import: "default"
}) as Record<string, unknown>;

export type VersionKeyboardModel = {
  id: string;
  name: string;
  author?: string;
  source: string;
  kle: KeyboardModel["kle"];
};

export type SavedLayoutVersion = {
  id: string;
  parentId: string | null;
  name: string;
  createdAt: string;
  keyboardModel: VersionKeyboardModel;
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
  model: KeyboardModel | null;
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

export type WorkspaceFile = {
  version: 1;
  kind: "qmk-viz-workspace";
  exportedAt: string | null;
  activeProjectId: string | null;
  activeLayoutId: string | null;
  projects: SavedKeyboardProject[];
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

function cloneVersionKeyboardModel(model: VersionKeyboardModel): VersionKeyboardModel {
  return {
    ...model,
    kle: cloneKleDocument(model.kle)
  };
}

function snapshotVersionKeyboardModel(model: KeyboardModel): VersionKeyboardModel {
  return {
    id: model.id,
    name: model.name,
    author: model.author,
    source: model.source,
    kle: cloneKleDocument(model.kle)
  };
}

function normalizeVersionKeyboardModel(raw: unknown, fallback: KeyboardModel): VersionKeyboardModel {
  if (typeof raw === "object" && raw !== null && "kle" in raw) {
    const typed = raw as Partial<VersionKeyboardModel>;
    const model = buildKeyboardModelFromKle(typed.kle, {
      id: typed.id,
      name: typed.name,
      author: typed.author,
      source: typed.source
    });
    return snapshotVersionKeyboardModel(model);
  }

  return snapshotVersionKeyboardModel(fallback);
}

export function createLayoutVersion(
  document: KeymapDocument,
  parentId: string | null,
  name: string,
  model: KeyboardModel,
  createdAt = new Date().toISOString()
): SavedLayoutVersion {
  return {
    id: newEntityId("layout-version"),
    parentId,
    name: name.trim() || "Version",
    createdAt,
    keyboardModel: snapshotVersionKeyboardModel(model),
    document: cloneKeymapDocument(document)
  };
}

export function cloneLayoutVersion(version: SavedLayoutVersion, fallbackModel: KeyboardModel): SavedLayoutVersion {
  const keyboardModel = (version as Partial<SavedLayoutVersion>).keyboardModel;
  return {
    ...version,
    keyboardModel: keyboardModel
      ? cloneVersionKeyboardModel(keyboardModel)
      : snapshotVersionKeyboardModel(fallbackModel),
    document: cloneKeymapDocument(version.document)
  };
}

export function cloneDefaultLayout(defaultLayout: SavedDefaultLayout): SavedDefaultLayout {
  return {
    ...defaultLayout,
    document: cloneKeymapDocument(defaultLayout.document)
  };
}

export function cloneSavedLayout(layout: SavedLayout, fallbackModel: KeyboardModel): SavedLayout {
  const document = cloneKeymapDocument(layout.document);
  const versions = layout.versions.length > 0
    ? layout.versions.map((version) => cloneLayoutVersion(version, fallbackModel))
    : [createLayoutVersion(document, null, "Initial version", fallbackModel, layout.updatedAt)];
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

export function cloneKeyboardProjectForLibrary(project: SavedKeyboardProject, name = project.name): SavedKeyboardProject {
  const now = new Date().toISOString();
  const model = project.model ? sanitizeKeyboardModel(project.model) : null;
  const layoutIdMap = new Map(project.layouts.map((layout) => [layout.id, newEntityId("layout")]));
  const layouts = model
    ? project.layouts.map((layout) => {
      const clonedLayout = cloneSavedLayout(layout, model);
      const versionIdMap = new Map(clonedLayout.versions.map((version) => [version.id, newEntityId("layout-version")]));
      const firstVersionId = clonedLayout.versions[0] ? versionIdMap.get(clonedLayout.versions[0].id) ?? "" : "";

      return {
        ...clonedLayout,
        id: layoutIdMap.get(layout.id) ?? newEntityId("layout"),
        versions: clonedLayout.versions.map((version) => ({
          ...version,
          id: versionIdMap.get(version.id) ?? newEntityId("layout-version"),
          parentId: version.parentId ? versionIdMap.get(version.parentId) ?? null : null,
          keyboardModel: cloneVersionKeyboardModel(version.keyboardModel),
          document: cloneKeymapDocument(version.document)
        })),
        activeVersionId: versionIdMap.get(clonedLayout.activeVersionId) ?? firstVersionId,
        updatedAt: now
      };
    })
    : [];

  return {
    ...project,
    id: newEntityId("keyboard-project"),
    name,
    model,
    defaultLayout: cloneDefaultLayout(project.defaultLayout),
    layouts,
    activeLayoutId: project.activeLayoutId ? layoutIdMap.get(project.activeLayoutId) ?? layouts[0]?.id ?? "" : layouts[0]?.id ?? "",
    updatedAt: now
  };
}

export function reconcileSavedLayoutToModel(layout: SavedLayout, model: KeyboardModel): SavedLayout {
  const document = reconcileKeymapDocumentToModel(layout.document, model);
  const versions = layout.versions.map((version) => cloneLayoutVersion(version, model));

  return cloneSavedLayout({
    ...layout,
    document,
    versions
  }, model);
}

export function reconcileDefaultLayoutToModel(defaultLayout: SavedDefaultLayout, model: KeyboardModel): SavedDefaultLayout {
  return {
    ...defaultLayout,
    document: reconcileKeymapDocumentToModel(defaultLayout.document, model)
  };
}

export function createLayout(name: string, document: KeymapDocument, model: KeyboardModel): SavedLayout {
  const now = new Date().toISOString();
  const clonedDocument = cloneKeymapDocument(document);
  const initialVersion = createLayoutVersion(clonedDocument, null, "Initial version", model, now);

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
  model: KeyboardModel | null,
  layouts: SavedLayout[],
  defaultLayoutDocument?: KeymapDocument,
  defaultLayoutUpdatedAt?: string
): SavedKeyboardProject {
  const safeLayouts = model ? layouts : [];
  const defaultDocument = defaultLayoutDocument && model
    ? reconcileKeymapDocumentToModel(defaultLayoutDocument, model)
    : defaultLayoutDocument
      ? cloneKeymapDocument(defaultLayoutDocument)
      : safeLayouts[0]
        ? cloneKeymapDocument(safeLayouts[0].document)
        : createEmptyKeymapDocument();

  return {
    id: newEntityId("keyboard-project"),
    name,
    model: model ? sanitizeKeyboardModel(model) : null,
    defaultLayout: createSavedDefaultLayout(defaultDocument, defaultLayoutUpdatedAt),
    layouts: model ? safeLayouts.map((layout) => cloneSavedLayout(layout, model)) : [],
    activeLayoutId: safeLayouts[0]?.id ?? "",
    updatedAt: new Date().toISOString()
  };
}

export function createEmptyKeyboardProject(name = "Untitled Keyboard Project"): SavedKeyboardProject {
  return createKeyboardProject(name, null, [], createEmptyKeymapDocument());
}

export function normalizeLoadedLayout(raw: Partial<SavedLayout>, model: KeyboardModel, index: number): SavedLayout {
  const fallbackDocument = createBlankKeymapDocument(model);
  const document = reconcileKeymapDocumentToModel(raw.document ?? fallbackDocument, model);
  const updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString();
  const rawVersions = Array.isArray(raw.versions) ? raw.versions : [];
  const versions = rawVersions.length > 0
    ? rawVersions.map((version, versionIndex) => {
      const rawVersion = version as Partial<SavedLayoutVersion> & { label?: unknown; keyboard?: unknown };
      const versionKeyboardModel = normalizeVersionKeyboardModel(rawVersion.keyboardModel ?? rawVersion.keyboard, model);
      const versionModel = buildKeyboardModelFromKle(versionKeyboardModel.kle, {
        id: versionKeyboardModel.id,
        name: versionKeyboardModel.name,
        author: versionKeyboardModel.author,
        source: versionKeyboardModel.source
      });
      return {
        id: typeof rawVersion.id === "string" ? rawVersion.id : newEntityId("layout-version"),
        parentId: typeof rawVersion.parentId === "string" ? rawVersion.parentId : null,
        name: typeof rawVersion.name === "string" && rawVersion.name.trim()
          ? rawVersion.name
          : typeof rawVersion.label === "string" && rawVersion.label.trim()
            ? rawVersion.label
            : `Version ${versionIndex + 1}`,
        createdAt: typeof rawVersion.createdAt === "string" ? rawVersion.createdAt : updatedAt,
        keyboardModel: versionKeyboardModel,
        document: reconcileKeymapDocumentToModel(rawVersion.document ?? document, versionModel)
      };
    })
    : [createLayoutVersion(document, null, "Initial version", model, updatedAt)];
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
  }, model);
}

function normalizeLoadedDefaultLayout(
  rawDefaultLayout: unknown,
  model: KeyboardModel | null,
  fallbackDocument: KeymapDocument,
  fallbackUpdatedAt: string
): SavedDefaultLayout {
  if (typeof rawDefaultLayout !== "object" || rawDefaultLayout === null) {
    return createSavedDefaultLayout(model ? reconcileKeymapDocumentToModel(fallbackDocument, model) : fallbackDocument, fallbackUpdatedAt);
  }

  const typedDefaultLayout = rawDefaultLayout as Partial<SavedDefaultLayout>;
  const sourceDocument = typedDefaultLayout.document ?? fallbackDocument;
  return createSavedDefaultLayout(
    model ? reconcileKeymapDocumentToModel(sourceDocument, model) : sourceDocument,
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
    : null;
  const sourceLayouts = Array.isArray(raw.layouts) ? raw.layouts : [];
  const layouts = model && sourceLayouts.length > 0
    ? sourceLayouts.map((layout, layoutIndex) => normalizeLoadedLayout(layout, model, layoutIndex))
    : [];
  const activeLayoutId = typeof raw.activeLayoutId === "string" && layouts.some((layout) => layout.id === raw.activeLayoutId)
    ? raw.activeLayoutId
    : layouts[0]?.id ?? "";
  const updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString();
  const defaultDocument = layouts[0]?.document ?? createEmptyKeymapDocument();

  return {
    id: typeof raw.id === "string" ? raw.id : newEntityId("keyboard-project"),
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name : `Keyboard Project ${index + 1}`,
    model: model ? sanitizeKeyboardModel(model) : null,
    defaultLayout: normalizeLoadedDefaultLayout(raw.defaultLayout, model, defaultDocument, updatedAt),
    layouts,
    activeLayoutId,
    updatedAt
  };
}

export function loadKeyboardProjects(): SavedKeyboardProject[] {
  try {
    const raw = localStorage.getItem(KEYBOARD_PROJECTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Partial<SavedKeyboardProject>>;
    return Array.isArray(parsed)
      ? parsed.map((project, index) => normalizeLoadedProject(project, index))
      : [];
  } catch {
    return [];
  }
}

export function loadExampleProjects(): SavedKeyboardProject[] {
  return Object.entries(starterProjectModules)
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([source, raw]) => {
      try {
        return [parseProjectFile(raw, source)];
      } catch (error) {
        console.warn(`Skipping invalid starter project ${source}.`, error);
        return [];
      }
    });
}

export function activeLayoutFor(project: SavedKeyboardProject | null | undefined): SavedLayout | null {
  if (!project) return null;
  return project.layouts.find((layout) => layout.id === project.activeLayoutId) ?? project.layouts[0] ?? null;
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
    layerColors?: unknown;
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
      : [],
    layerColors: typeof typedLayout.layerColors === "object" && typedLayout.layerColors !== null
      ? typedLayout.layerColors as Record<string, string>
      : {}
  }, model);
  const name = typeof typedLayout.name === "string" && typedLayout.name.trim()
    ? typedLayout.name.trim()
    : fallbackName;

  return createLayout(name, document, model);
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
  const model = typedProject.model?.kle
    ? buildKeyboardModelFromKle(typedProject.model.kle, {
      id: typedProject.model.id,
      name: typedProject.model.name,
      author: typedProject.model.author,
      source: typedProject.model.source || fallbackSource
    })
    : null;
  const sourceLayouts = Array.isArray(typedProject.layouts) ? typedProject.layouts : [];
  const safeLayouts = model ? sourceLayouts.map((layout, index) => normalizeLoadedLayout(layout, model, index)) : [];
  const name = typeof typedProject.name === "string" && typedProject.name.trim()
    ? typedProject.name
    : model?.name ?? "Keyboard Project";
  const updatedAt = typeof typedProject.updatedAt === "string" ? typedProject.updatedAt : new Date().toISOString();
  const activeLayoutId = typeof typedProject.activeLayoutId === "string" && safeLayouts.some((layout) => layout.id === typedProject.activeLayoutId)
    ? typedProject.activeLayoutId
    : safeLayouts[0]?.id ?? "";
  const defaultDocument = safeLayouts[0]?.document ?? createEmptyKeymapDocument();

  return {
    id: typeof typedProject.id === "string" ? typedProject.id : newEntityId("keyboard-project"),
    name,
    model: model ? sanitizeKeyboardModel(model) : null,
    defaultLayout: normalizeLoadedDefaultLayout(
      typedProject.defaultLayout,
      model,
      defaultDocument,
      updatedAt
    ),
    layouts: safeLayouts,
    activeLayoutId,
    updatedAt
  };
}

export function parseWorkspaceFile(raw: unknown, sourceName: string): WorkspaceFile {
  if (typeof raw !== "object" || raw === null || (raw as { kind?: unknown }).kind !== "qmk-viz-workspace") {
    throw new Error(`${sourceName} must be a qmk-viz workspace backup file.`);
  }

  const typedWorkspace = raw as {
    version?: unknown;
    exportedAt?: unknown;
    activeProjectId?: unknown;
    activeLayoutId?: unknown;
    projects?: unknown;
  };

  if (!Array.isArray(typedWorkspace.projects)) {
    throw new Error("Workspace backup JSON is missing a projects array.");
  }

  const projects = typedWorkspace.projects.map((project, index) => normalizeLoadedProject(project as Partial<SavedKeyboardProject>, index));
  const seenProjectIds = new Set<string>();
  for (const project of projects) {
    if (seenProjectIds.has(project.id)) {
      throw new Error(`Workspace backup contains duplicate project id "${project.id}".`);
    }
    seenProjectIds.add(project.id);
  }

  const activeProjectId = typeof typedWorkspace.activeProjectId === "string" && projects.some((project) => project.id === typedWorkspace.activeProjectId)
    ? typedWorkspace.activeProjectId
    : null;
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null;
  const activeLayoutId = activeProject && typeof typedWorkspace.activeLayoutId === "string" && activeProject.layouts.some((layout) => layout.id === typedWorkspace.activeLayoutId)
    ? typedWorkspace.activeLayoutId
    : null;

  return {
    version: 1,
    kind: "qmk-viz-workspace",
    exportedAt: typeof typedWorkspace.exportedAt === "string" ? typedWorkspace.exportedAt : null,
    activeProjectId,
    activeLayoutId,
    projects
  };
}
