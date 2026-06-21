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

function parseLegends(label: string): string[] {
  return label.split("\n").map((part) => part.trim()).filter(Boolean);
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

      const legends = parseLegends(item);
      keys.push({
        index: keys.length,
        label: legends[0] ?? "",
        legends,
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
