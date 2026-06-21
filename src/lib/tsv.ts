import type { BehaviorSlots } from "./actions";

export type TsvLayer = {
  name: string;
  rows: string[][];
};

export type TsvDance = {
  name: string;
  slots: BehaviorSlots;
};

export type TsvExtKey = {
  name: string;
  kind: string;
  value: string;
  notes: string;
};

export type TsvDocument = {
  layers: TsvLayer[];
  dances: TsvDance[];
  extKeys: TsvExtKey[];
};

export const BORDER = "+";
export const MISSING = "#";
export const TRANSPARENT = "~";

export function parseLayoutDocumentTsv(source: string): TsvDocument {
  const layers: TsvLayer[] = [];
  const dances: TsvDance[] = [];
  const extKeys: TsvExtKey[] = [];
  let currentLayer: TsvLayer | undefined;
  let section: "layer" | "dances" | "extkeys" | undefined;

  for (const rawLine of source.split(/\r?\n/)) {
    if (!rawLine.trim()) {
      continue;
    }

    const row = rawLine.split("\t").map((cell) => cell.trim());
    const first = row[0];

    if (first?.startsWith("@LAYER/")) {
      currentLayer = { name: first.slice("@LAYER/".length), rows: [] };
      section = "layer";
      layers.push(currentLayer);
      continue;
    }

    if (first === "@DANCES") {
      currentLayer = undefined;
      section = "dances";
      continue;
    }

    if (first === "@EXTKEYS") {
      currentLayer = undefined;
      section = "extkeys";
      continue;
    }

    if (section === "layer" && currentLayer) {
      currentLayer.rows.push(row);
      continue;
    }

    if (section === "dances") {
      if (first?.toUpperCase() === "NAME") {
        continue;
      }

      if (first) {
        dances.push({
          name: first,
          slots: {
            tap: row[1] ?? "",
            hold: row[2] ?? "",
            doubleTap: row[3] ?? "",
            tapHold: row[4] ?? ""
          }
        });
      }
      continue;
    }

    if (section === "extkeys") {
      if (first?.toUpperCase() === "NAME") {
        continue;
      }

      if (first) {
        extKeys.push({
          name: first,
          kind: row[1] ?? "",
          value: row[2] ?? "",
          notes: row[3] ?? ""
        });
      }
      continue;
    }

    throw new Error("TSV rows must appear after @LAYER/<NAME>, @DANCES, or @EXTKEYS.");
  }

  if (layers.length === 0) {
    throw new Error("No @LAYER/<NAME> sections found.");
  }

  return { layers, dances, extKeys };
}

export function parseLayoutTsv(source: string): TsvLayer[] {
  return parseLayoutDocumentTsv(source).layers;
}

export function serializeLayoutDocumentTsv(document: TsvDocument): string {
  const sections = document.layers.map((layer) => (
    [`@LAYER/${layer.name}`, ...layer.rows.map((row) => row.join("\t"))].join("\n")
  ));

  if (document.extKeys.length > 0) {
    sections.push([
      "@EXTKEYS",
      ["NAME", "KIND", "VALUE", "NOTES"].join("\t"),
      ...document.extKeys.map((key) => [key.name, key.kind, key.value, key.notes].join("\t"))
    ].join("\n"));
  }

  if (document.dances.length > 0) {
    sections.push([
      "@DANCES",
      ["NAME", "TAP", "HOLD", "DOUBLE_TAP", "TAP_HOLD"].join("\t"),
      ...document.dances.map((dance) => [
        dance.name,
        dance.slots.tap,
        dance.slots.hold,
        dance.slots.doubleTap,
        dance.slots.tapHold
      ].join("\t"))
    ].join("\n"));
  }

  return sections.join("\n");
}

export function serializeLayoutTsv(layers: TsvLayer[]): string {
  return serializeLayoutDocumentTsv({ layers, dances: [], extKeys: [] });
}

export function updateCell(layers: TsvLayer[], layerName: string, row: number, col: number, value: string): TsvLayer[] {
  return layers.map((layer) => {
    if (layer.name !== layerName) {
      return layer;
    }

    return {
      ...layer,
      rows: layer.rows.map((cells, rowIndex) => (
        rowIndex === row
          ? cells.map((cell, colIndex) => (colIndex === col ? value.trim() || TRANSPARENT : cell))
          : cells
      ))
    };
  });
}
