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
  paddingX: number;
  paddingY: number;
  kle: KleDocument;
  keys: KeySlot[];
};

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
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

function displayUnitFor(width: number): number {
  if (width > 24) return 44;
  if (width > 20) return 50;
  return 60;
}

function rotatePoint(x: number, y: number, originX: number, originY: number, rotation: number) {
  const radians = rotation * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = x - originX;
  const dy = y - originY;

  return {
    x: originX + dx * cos - dy * sin,
    y: originY + dx * sin + dy * cos
  };
}

function transformedKeyBounds(key: KeySlot): Bounds {
  const corners = [
    rotatePoint(key.x, key.y, key.rotationX, key.rotationY, key.rotation),
    rotatePoint(key.x + key.width, key.y, key.rotationX, key.rotationY, key.rotation),
    rotatePoint(key.x, key.y + key.height, key.rotationX, key.rotationY, key.rotation),
    rotatePoint(key.x + key.width, key.y + key.height, key.rotationX, key.rotationY, key.rotation)
  ];

  return {
    minX: Math.min(...corners.map((corner) => corner.x)),
    minY: Math.min(...corners.map((corner) => corner.y)),
    maxX: Math.max(...corners.map((corner) => corner.x)),
    maxY: Math.max(...corners.map((corner) => corner.y))
  };
}

function keyboardBounds(keys: KeySlot[]): Bounds {
  const bounds = keys.map(transformedKeyBounds);

  return {
    minX: Math.min(...bounds.map((bound) => bound.minX)),
    minY: Math.min(...bounds.map((bound) => bound.minY)),
    maxX: Math.max(...bounds.map((bound) => bound.maxX)),
    maxY: Math.max(...bounds.map((bound) => bound.maxY))
  };
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
    if (!slot) continue;
    if (seen.has(slot)) {
      throw new Error(`Duplicate KLE key identifier "${slot}". Key identifiers must be unique.`);
    }
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
  const bounds = keyboardBounds(keys);
  const naturalWidth = bounds.maxX - bounds.minX;
  const naturalHeight = bounds.maxY - bounds.minY;
  const unit = displayUnitFor(naturalWidth);
  const stagePaddingX = 10 / unit;
  const stagePaddingY = 10 / unit;
  const normalizedKeys = keys.map((key) => ({
    ...key,
    x: key.x - bounds.minX,
    y: key.y - bounds.minY,
    rotationX: key.rotationX - bounds.minX,
    rotationY: key.rotationY - bounds.minY
  }));

  return {
    id: options.id || `uploaded/${safeId(name)}`,
    name,
    author,
    source: options.source || "Keyboard Layout Editor JSON",
    width: naturalWidth + stagePaddingX * 2,
    height: naturalHeight + stagePaddingY * 2,
    unit,
    padding: stagePaddingX,
    paddingX: stagePaddingX,
    paddingY: stagePaddingY,
    kle: cloneKleDocument(raw),
    keys: normalizedKeys
  };
}
