export type KleRawLayout = Array<Array<string | Record<string, unknown>>>;

export type KleKey = {
  index: number;
  label: string;
  legends: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

type KleState = {
  width: number;
  height: number;
  rotation: number;
};

function numeric(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseLegends(label: string): string[] {
  return label.split("\n").map((part) => part.trim()).filter(Boolean);
}

export function parseKle(raw: KleRawLayout): KleKey[] {
  const keys: KleKey[] = [];
  let cursorY = 0;

  for (const row of raw) {
    let cursorX = 0;
    let rowY = cursorY;
    let state: KleState = { width: 1, height: 1, rotation: 0 };

    for (const item of row) {
      if (typeof item === "object" && item !== null) {
        cursorX += numeric(item.x, 0);
        rowY += numeric(item.y, 0);
        state = {
          width: numeric(item.w, state.width),
          height: numeric(item.h, state.height),
          rotation: numeric(item.r, state.rotation)
        };
        continue;
      }

      const legends = parseLegends(item);
      keys.push({
        index: keys.length,
        label: legends[0] ?? "",
        legends,
        x: cursorX,
        y: rowY,
        width: state.width,
        height: state.height,
        rotation: state.rotation
      });

      cursorX += state.width;
      state = { ...state, width: 1, height: 1 };
    }

    cursorY = rowY + 1;
  }

  return keys;
}
