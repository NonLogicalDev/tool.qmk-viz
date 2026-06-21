export type TsvLayer = {
  name: string;
  rows: string[][];
};

export const BORDER = "+";
export const MISSING = "#";
export const TRANSPARENT = "~";

export function parseLayoutTsv(source: string): TsvLayer[] {
  const layers: TsvLayer[] = [];
  let current: TsvLayer | undefined;

  for (const rawLine of source.split(/\r?\n/)) {
    if (!rawLine.trim()) {
      continue;
    }

    const row = rawLine.split("\t").map((cell) => cell.trim());
    const first = row[0];

    if (first?.startsWith("@LAYER/")) {
      current = { name: first.slice("@LAYER/".length), rows: [] };
      layers.push(current);
      continue;
    }

    if (!current) {
      throw new Error("TSV key rows must appear after an @LAYER/<NAME> marker.");
    }

    current.rows.push(row);
  }

  if (layers.length === 0) {
    throw new Error("No @LAYER/<NAME> sections found.");
  }

  return layers;
}

export function serializeLayoutTsv(layers: TsvLayer[]): string {
  return layers
    .map((layer) => [`@LAYER/${layer.name}`, ...layer.rows.map((row) => row.join("\t"))].join("\n"))
    .join("\n");
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
