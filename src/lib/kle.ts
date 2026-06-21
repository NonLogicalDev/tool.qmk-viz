export type KleRawRow = Array<string | Record<string, unknown>>;
export type KleRawLayout = Array<KleRawRow>;
export type KleDocument = Array<KleRawRow | Record<string, unknown>>;

export type KleKey = {
  index: number;
  label: string;
  legends: string[];
  legendSlots: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  rotationX: number;
  rotationY: number;
};

type KleState = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  rotationX: number;
  rotationY: number;
};

function numeric(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseLegendSlots(label: string): string[] {
  return label.split("\n").map((part) => part.trim());
}

function parseLegends(label: string): string[] {
  return parseLegendSlots(label).filter(Boolean);
}

function stripAlignmentProperties(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripAlignmentProperties);
  }

  if (typeof value === "object" && value !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      if (key === "a") continue;
      sanitized[key] = stripAlignmentProperties(nestedValue);
    }
    return sanitized;
  }

  return value;
}

export function normalizeKleDocument(raw: unknown): { metadata: Record<string, unknown>; rows: KleRawLayout } {
  if (!Array.isArray(raw)) {
    throw new Error("Keyboard Layout Editor JSON must be an array.");
  }

  const first = raw[0];
  const metadata = !Array.isArray(first) && typeof first === "object" && first !== null
    ? first as Record<string, unknown>
    : {};
  const rows = raw.filter((item): item is KleRawRow => Array.isArray(item));

  if (rows.length === 0) {
    throw new Error("Keyboard Layout Editor JSON does not contain any key rows.");
  }

  return { metadata, rows };
}

export function cloneKleDocument(raw: unknown): KleDocument {
  normalizeKleDocument(raw);
  const clone = JSON.parse(JSON.stringify(raw)) as KleDocument;
  return stripAlignmentProperties(clone) as KleDocument;
}

export function replaceKleKeyLabels(raw: KleDocument, labelsByKeyIndex: Map<number, string>): KleDocument {
  const clone = cloneKleDocument(raw);
  let keyIndex = 0;

  return clone.map((rowOrMetadata) => {
    if (!Array.isArray(rowOrMetadata)) {
      return rowOrMetadata;
    }

    return rowOrMetadata.map((item) => {
      if (typeof item !== "string") {
        return item;
      }

      const replacement = labelsByKeyIndex.get(keyIndex);
      keyIndex += 1;
      return replacement ?? item;
    });
  });
}

export function parseKle(raw: KleRawLayout): KleKey[] {
  const keys: KleKey[] = [];
  const state: KleState = {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    rotation: 0,
    rotationX: 0,
    rotationY: 0
  };

  for (const row of raw) {
    state.x = state.rotationX;

    for (const item of row) {
      if (typeof item === "object" && item !== null) {
        if (typeof item.r === "number") {
          state.rotation = item.r;
        }
        if (typeof item.rx === "number") {
          state.rotationX = item.rx;
          state.x = item.rx;
          if (typeof item.ry !== "number") {
            state.y = state.rotationY;
          }
        }
        if (typeof item.ry === "number") {
          state.rotationY = item.ry;
          state.y = item.ry;
        }

        state.x += numeric(item.x, 0);
        state.y += numeric(item.y, 0);
        state.width = numeric(item.w, state.width);
        state.height = numeric(item.h, state.height);
        continue;
      }

      const legendSlots = parseLegendSlots(item);
      const legends = legendSlots.filter(Boolean);
      keys.push({
        index: keys.length,
        label: legends[0] ?? "",
        legends,
        legendSlots,
        x: state.x,
        y: state.y,
        width: state.width,
        height: state.height,
        rotation: state.rotation,
        rotationX: state.rotationX,
        rotationY: state.rotationY
      });

      state.x += state.width;
      state.width = 1;
      state.height = 1;
    }

    state.y += 1;
  }

  return keys;
}
