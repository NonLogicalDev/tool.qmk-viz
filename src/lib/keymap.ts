import type { BehaviorSlots } from "./actions";
import type { KeyboardModel } from "./keyboardModel";

export const TRANSPARENT = "~";

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
  };
};

export function selectedKeycode(layer: KeymapLayer, slot: string): string {
  return layer.keys[slot] ?? TRANSPARENT;
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
        model.keys.map((key) => [key.slot, layer.keys[key.slot] ?? TRANSPARENT])
      )
    })),
    dances: Object.fromEntries(
      Object.entries(document.dances).map(([name, slots]) => [name, { ...slots }])
    ),
    extKeys: document.extKeys.map((key) => ({ ...key })),
    layerColors: Object.fromEntries(
      Object.entries(document.layerColors ?? {}).filter(([layerName]) => layerNames.has(layerName))
    )
  };
}

export function cloneKeymapDocument(document: KeymapDocument): KeymapDocument {
  return {
    version: 1,
    layers: document.layers.map((layer) => ({ name: layer.name, keys: { ...layer.keys } })),
    dances: Object.fromEntries(
      Object.entries(document.dances).map(([name, slots]) => [name, { ...slots }])
    ),
    extKeys: document.extKeys.map((key) => ({ ...key })),
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
        [slot]: value.trim() || TRANSPARENT
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
      dances: document.dances,
      extKeys: document.extKeys
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
