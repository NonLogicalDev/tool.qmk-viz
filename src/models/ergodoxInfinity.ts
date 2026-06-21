import kleLayout from "../../../qmk/keyboards/input_club/ergodox_infinity/keymaps/monster/keyboard-layout.json";
import nonlogical01 from "../../../qmk/keyboards/input_club/ergodox_infinity/keymaps/monster/layout_nonlogical-01.tsv?raw";
import nonlogical02 from "../../../qmk/keyboards/input_club/ergodox_infinity/keymaps/monster/layout_nonlogical-02.tsv?raw";
import { parseKle } from "../lib/kle";

export type KeySlot = {
  slot: string;
  legend: string;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

export type KeyboardModel = {
  id: string;
  name: string;
  source: string;
  width: number;
  height: number;
  unit: number;
  keys: KeySlot[];
  layouts: Record<string, string>;
};

const visualSlots = [
  ["+", "+", "+", "+", "+", "+", "+", "+", "+", "+", "+", "+", "+", "+", "+"],
  ["LT00", "LT01", "LT02", "LT03", "LT04", "LT05", "LT06", "+", "RT06", "RT05", "RT04", "RT03", "RT02", "RT01", "RT00"],
  ["LT10", "LT11", "LT12", "LT13", "LT14", "LT15", "LT16", "+", "RT16", "RT15", "RT14", "RT13", "RT12", "RT11", "RT10"],
  ["LT20", "LT21", "LT22", "LT23", "LT24", "LT25", "#", "+", "#", "RT25", "RT24", "RT23", "RT22", "RT21", "RT20"],
  ["LT30", "LT31", "LT32", "LT33", "LT34", "LT35", "LT36", "+", "RT36", "RT35", "RT34", "RT33", "RT32", "RT31", "RT30"],
  ["LT40", "LT41", "LT42", "LT43", "LT44", "#", "#", "+", "#", "#", "RT44", "RT43", "RT42", "RT41", "RT40"],
  ["+", "+", "+", "+", "+", "+", "+", "+", "+", "+", "+", "+", "+", "+", "+"],
  ["#", "#", "#", "#", "#", "LC01", "LC02", "+", "RC02", "RC01", "#", "#", "#", "#", "#"],
  ["#", "#", "#", "#", "#", "#", "LC12", "+", "RC12", "#", "#", "#", "#", "#", "#"],
  ["#", "#", "#", "#", "LC20", "LC21", "LC22", "+", "RC22", "RC21", "RC20", "#", "#", "#", "#"],
  ["+", "+", "+", "+", "+", "+", "+", "+", "+", "+", "+", "+", "+", "+", "+"]
];

const slotCells = new Map<string, { row: number; col: number }>();
visualSlots.forEach((row, rowIndex) => {
  row.forEach((slot, colIndex) => {
    if (!["+", "#"].includes(slot)) {
      slotCells.set(slot, { row: rowIndex, col: colIndex });
    }
  });
});

const slotsByKleIndex = [
  "LT03", "RT03", "LT02", "LT04", "RT04", "RT02", "LT05", "LT06", "RT06", "RT05", "LT00", "LT01", "RT01", "RT00",
  "LT13", "RT13", "LT12", "LT14", "RT14", "RT12", "LT15", "LT16", "RT16", "RT15", "LT10", "LT11", "RT11", "RT10",
  "LT23", "RT23", "LT22", "LT24", "RT24", "RT22", "LT25", "RT25", "LT20", "LT21", "RT21", "RT20",
  "LT36", "RT36", "LT33", "RT33", "LT32", "LT34", "RT34", "RT32", "LT35", "RT35", "LT30", "LT31", "RT31", "RT30",
  "LT43", "RT43", "LT42", "LT44", "RT44", "RT42", "LT40", "LT41", "RT41", "RT40",
  "LC01", "LC02", "LC20", "LC21", "LC12", "LC22", "RC02", "RC01", "RC12", "RC21", "RC20", "RC22"
];

const thumbOverrides: Record<string, Partial<KeySlot>> = {
  LC01: { x: 7.0, y: 5.15, rotation: 30 },
  LC02: { x: 8.05, y: 5.55, rotation: 30 },
  LC12: { x: 7.55, y: 6.45, rotation: 30 },
  LC20: { x: 4.95, y: 5.6, height: 2, rotation: 30 },
  LC21: { x: 6.0, y: 6.05, height: 2, rotation: 30 },
  LC22: { x: 6.95, y: 7.25, rotation: 30 },
  RC02: { x: 11.45, y: 5.55, rotation: -30 },
  RC01: { x: 12.5, y: 5.15, rotation: -30 },
  RC12: { x: 12.05, y: 6.45, rotation: -30 },
  RC22: { x: 11.55, y: 7.25, rotation: -30 },
  RC21: { x: 12.55, y: 6.05, height: 2, rotation: -30 },
  RC20: { x: 13.6, y: 5.6, height: 2, rotation: -30 }
};

function buildKeys(): KeySlot[] {
  return parseKle(kleLayout).map((key, index) => {
    const slot = slotsByKleIndex[index];
    const cell = slotCells.get(slot);
    if (!cell) {
      throw new Error(`Missing TSV cell mapping for ${slot}.`);
    }

    const base: KeySlot = {
      slot,
      legend: key.legends.at(-1) ?? key.label,
      row: cell.row,
      col: cell.col,
      x: key.x,
      y: key.y,
      width: key.width,
      height: key.height,
      rotation: key.rotation
    };

    return { ...base, ...thumbOverrides[slot] };
  });
}

export const ergodoxInfinity: KeyboardModel = {
  id: "input_club/ergodox_infinity",
  name: "Input Club Ergodox Infinity",
  source: "keyboard-layout.json + layout_nonlogical-01.tsv",
  width: 19.6,
  height: 8.7,
  unit: 46,
  keys: buildKeys(),
  layouts: {
    "nonlogical-01": nonlogical01,
    "nonlogical-02": nonlogical02
  }
};
