import { cloneKleDocument, normalizeKleDocument, parseKle, type KleDocument } from "./kle";

export type KeySlot = {
  slot: string;
  kleIndex: number;
  legend: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  rotationX: number;
  rotationY: number;
};

export type KeyboardModel = {
  id: string;
  name: string;
  author?: string;
  source: string;
  width: number;
  height: number;
  unit: number;
  padding: number;
  kle: KleDocument;
  keys: KeySlot[];
};

function safeId(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "keyboard";
}

function metadataString(metadata: Record<string, unknown>, key: string): string | undefined {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function slotFromLegend(key: { legendSlots: string[]; legends: string[]; label: string }): string {
  return key.legendSlots[6] || key.legendSlots[4] || key.legends.at(-1) || key.label;
}

function maxCoordinate(keys: KeySlot[], axis: "x" | "y", size: "width" | "height") {
  return Math.max(...keys.map((key) => key[axis] + key[size]));
}

function displayUnitFor(width: number): number {
  if (width > 24) return 44;
  if (width > 20) return 50;
  return 60;
}

export function buildKeyboardModelFromKle(raw: unknown, options: {
  id?: string;
  name?: string;
  author?: string;
  source?: string;
} = {}): KeyboardModel {
  const { metadata, rows } = normalizeKleDocument(raw);
  const parsedKeys = parseKle(rows);
  const seen = new Set<string>();
  const keys: KeySlot[] = [];

  for (const key of parsedKeys) {
    const slot = slotFromLegend(key).trim();
    if (!slot || seen.has(slot)) continue;
    seen.add(slot);
    keys.push({
      slot,
      kleIndex: key.index,
      legend: key.legends[0] || slot,
      x: key.x,
      y: key.y,
      width: key.width,
      height: key.height,
      rotation: key.rotation,
      rotationX: key.rotationX,
      rotationY: key.rotationY
    });
  }

  if (keys.length === 0) {
    throw new Error("No key IDs found. Put IDs in each key's center legend entry.");
  }

  const name = options.name || metadataString(metadata, "name") || "Uploaded Keyboard";
  const author = options.author || metadataString(metadata, "author");
  const stagePadding = 1;
  const width = maxCoordinate(keys, "x", "width") + stagePadding * 2;
  const height = maxCoordinate(keys, "y", "height") + stagePadding * 2;

  return {
    id: options.id || `uploaded/${safeId(name)}`,
    name,
    author,
    source: options.source || "Keyboard Layout Editor JSON",
    width,
    height,
    unit: displayUnitFor(width),
    padding: stagePadding,
    kle: cloneKleDocument(raw),
    keys
  };
}
