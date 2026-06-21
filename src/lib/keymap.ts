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
    keys: Array<{
      id: string;
      legend: string;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
      rotationX: number;
      rotationY: number;
    }>;
  };
  layout: {
    id: string;
    name: string;
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

export function createBlankKeymapDocument(model: KeyboardModel, layerName = "BASE"): KeymapDocument {
  return {
    version: 1,
    layers: [{
      name: layerName,
      keys: Object.fromEntries(model.keys.map((key) => [key.slot, TRANSPARENT]))
    }],
    dances: {},
    extKeys: []
  };
}

export function reconcileKeymapDocumentToModel(document: KeymapDocument, model: KeyboardModel): KeymapDocument {
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
    extKeys: document.extKeys.map((key) => ({ ...key }))
  };
}

export function cloneKeymapDocument(document: KeymapDocument): KeymapDocument {
  return {
    version: 1,
    layers: document.layers.map((layer) => ({ name: layer.name, keys: { ...layer.keys } })),
    dances: Object.fromEntries(
      Object.entries(document.dances).map(([name, slots]) => [name, { ...slots }])
    ),
    extKeys: document.extKeys.map((key) => ({ ...key }))
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
  const exportDocument: KeymapExport = {
    version: 1,
    keyboardProject: {
      id: options.keyboardProjectId,
      name: options.keyboardProjectName
    },
    keyboard: {
      id: model.id,
      name: model.name,
      source: model.source,
      keys: model.keys.map((key) => ({
        id: key.slot,
        legend: key.legend,
        x: key.x,
        y: key.y,
        width: key.width,
        height: key.height,
        rotation: key.rotation,
        rotationX: key.rotationX,
        rotationY: key.rotationY
      }))
    },
    layout: {
      id: options.layoutId,
      name: options.layoutName,
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

  return JSON.stringify(exportDocument, null, 2);
}
