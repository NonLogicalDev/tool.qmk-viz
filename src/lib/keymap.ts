import type { BehaviorSlots } from "./actions";
import type { KeyboardModel } from "./keyboardModel";

export const TRANSPARENT = "KC_TRNS";

const legacyTransparentValues = new Set(["~", "KC_TRANSPARENT"]);

export function isTransparentKeycode(value: string | null | undefined): boolean {
  const clean = (value ?? "").trim();
  return clean === TRANSPARENT || legacyTransparentValues.has(clean);
}

export function normalizeKeycode(value: string | null | undefined): string {
  const clean = (value ?? "").trim();
  if (!clean || isTransparentKeycode(clean)) return TRANSPARENT;
  return clean;
}

export function normalizeActionIdentifier(value: string | null | undefined): string {
  const clean = (value ?? "").trim();
  if (isTransparentKeycode(clean)) return TRANSPARENT;
  return clean;
}

export type KeymapLayer = {
  name: string;
  keys: Record<string, string>;
};

export type ExtKey = {
  name: string;
  kind: string;
  value: string;
  notes: string;
};

export type KeymapDocument = {
  version: 1;
  layers: KeymapLayer[];
  dances: Record<string, BehaviorSlots>;
  extKeys: ExtKey[];
  layerColors?: Record<string, string>;
};

export type KeymapExport = {
  version: 1;
  keyboardProject: {
    id: string;
    name: string;
  };
  keyboard: {
    id: string;
    name: string;
    source: string;
    kle: KeyboardModel["kle"];
  };
  layout: {
    id: string;
    name: string;
    layerColors: Record<string, string>;
    layers: Array<{
      name: string;
      keys: Record<string, string>;
    }>;
    dances: Record<string, BehaviorSlots>;
    extKeys: ExtKey[];
    macros: ExtKey[];
    customKeyAliases: ExtKey[];
    customKeycodes: ExtKey[];
  };
};

function cloneBehaviorSlots(slots: BehaviorSlots): BehaviorSlots {
  return {
    tap: normalizeActionIdentifier(slots.tap),
    hold: normalizeActionIdentifier(slots.hold),
    doubleTap: normalizeActionIdentifier(slots.doubleTap),
    tapHold: normalizeActionIdentifier(slots.tapHold)
  };
}

function cloneDances(dances: Record<string, BehaviorSlots>): Record<string, BehaviorSlots> {
  return Object.fromEntries(
    Object.entries(dances).map(([name, slots]) => [name, cloneBehaviorSlots(slots)])
  );
}

function cloneExtKeys(extKeys: ExtKey[]): ExtKey[] {
  return extKeys.map((key) => ({
    ...key,
    value: key.kind === "keycode" ? "" : normalizeActionIdentifier(key.value)
  }));
}

function isMacroExtKey(key: ExtKey): boolean {
  return `${key.kind} ${key.name}`.toLowerCase().includes("macro");
}

function isCustomKeycodeExtKey(key: ExtKey): boolean {
  return key.kind === "keycode";
}

export function selectedKeycode(layer: KeymapLayer, slot: string): string {
  return normalizeKeycode(layer.keys[slot]);
}

export function createEmptyKeymapDocument(layerName = "BASE"): KeymapDocument {
  return {
    version: 1,
    layers: [{
      name: layerName,
      keys: {}
    }],
    dances: {},
    extKeys: [],
    layerColors: {}
  };
}

export function createBlankKeymapDocument(model: KeyboardModel, layerName = "BASE"): KeymapDocument {
  return {
    version: 1,
    layers: [{
      name: layerName,
      keys: Object.fromEntries(model.keys.map((key) => [key.slot, TRANSPARENT]))
    }],
    dances: {},
    extKeys: [],
    layerColors: {}
  };
}

export function reconcileKeymapDocumentToModel(document: KeymapDocument, model: KeyboardModel): KeymapDocument {
  const layerNames = new Set(document.layers.map((layer) => layer.name));

  return {
    version: 1,
    layers: document.layers.map((layer) => ({
      name: layer.name,
      keys: Object.fromEntries(
        model.keys.map((key) => [key.slot, normalizeKeycode(layer.keys[key.slot])])
      )
    })),
    dances: cloneDances(document.dances),
    extKeys: cloneExtKeys(document.extKeys),
    layerColors: Object.fromEntries(
      Object.entries(document.layerColors ?? {}).filter(([layerName]) => layerNames.has(layerName))
    )
  };
}

export function cloneKeymapDocument(document: KeymapDocument): KeymapDocument {
  return {
    version: 1,
    layers: document.layers.map((layer) => ({
      name: layer.name,
      keys: Object.fromEntries(
        Object.entries(layer.keys).map(([slot, value]) => [slot, normalizeKeycode(value)])
      )
    })),
    dances: cloneDances(document.dances),
    extKeys: cloneExtKeys(document.extKeys),
    layerColors: { ...(document.layerColors ?? {}) }
  };
}

export function updateKeycode(layers: KeymapLayer[], layerName: string, slot: string, value: string): KeymapLayer[] {
  return layers.map((layer) => {
    if (layer.name !== layerName) return layer;
    return {
      ...layer,
      keys: {
        ...layer.keys,
        [slot]: normalizeKeycode(value)
      }
    };
  });
}

export function transparentLayerFrom(layer: KeymapLayer, name: string): KeymapLayer {
  return {
    name,
    keys: Object.fromEntries(Object.keys(layer.keys).map((slot) => [slot, TRANSPARENT]))
  };
}

export function createKeymapExportDocument(
  model: KeyboardModel,
  document: KeymapDocument,
  options: {
    keyboardProjectId: string;
    keyboardProjectName: string;
    layoutId: string;
    layoutName: string;
  }
): KeymapExport {
  const extKeys = cloneExtKeys(document.extKeys);

  return {
    version: 1,
    keyboardProject: {
      id: options.keyboardProjectId,
      name: options.keyboardProjectName
    },
    keyboard: {
      id: model.id,
      name: model.name,
      source: model.source,
      kle: model.kle
    },
    layout: {
      id: options.layoutId,
      name: options.layoutName,
      layerColors: { ...(document.layerColors ?? {}) },
      layers: document.layers.map((layer) => ({
        name: layer.name,
        keys: Object.fromEntries(
          model.keys.map((key) => [key.slot, selectedKeycode(layer, key.slot)])
        )
      })),
      dances: cloneDances(document.dances),
      extKeys,
      macros: extKeys.filter(isMacroExtKey),
      customKeyAliases: extKeys.filter((key) => !isMacroExtKey(key) && !isCustomKeycodeExtKey(key)),
      customKeycodes: extKeys.filter(isCustomKeycodeExtKey)
    }
  };
}

export function serializeKeymapExport(
  model: KeyboardModel,
  document: KeymapDocument,
  options: {
    keyboardProjectId: string;
    keyboardProjectName: string;
    layoutId: string;
    layoutName: string;
  }
): string {
  return JSON.stringify(createKeymapExportDocument(model, document, options), null, 2);
}
