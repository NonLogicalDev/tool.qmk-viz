import type { BehaviorSlots } from "./actions";

export type BehaviorField = {
  id: keyof BehaviorSlots;
  label: string;
  placeholder: string;
  help: string;
};

export type SimpleKeycodeModifier = {
  id: string;
  label: string;
  wrapper: string;
  group: "regular" | "exclusive";
};

export const behaviorFields: BehaviorField[] = [
  { id: "tap", label: "When tapped", placeholder: "KC_SPC", help: "Normal tap output." },
  { id: "hold", label: "When held", placeholder: "NAVI or KC_LCTL", help: "Layer name or held modifier." },
  { id: "doubleTap", label: "When double tapped", placeholder: "KC_ESC", help: "Stored for tap-dance/custom generation." },
  { id: "tapHold", label: "When tapped and held", placeholder: "TG(NAVI)", help: "Stored for tap-dance/custom generation." }
];

export const danceBehaviorFields = behaviorFields;

export const layerPalette = [
  "#0078a8",
  "#e75d3f",
  "#5c8a21",
  "#b07700",
  "#7c5cc4",
  "#00866b",
  "#c24f87",
  "#5067c7",
  "#d14a72",
  "#2f8f83",
  "#d47d00",
  "#4f7fdb",
  "#8a6a17",
  "#b457c7",
  "#37733f",
  "#9f4d2c"
];

export const simpleKeycodeMods: SimpleKeycodeModifier[] = [
  { id: "shift", label: "Shift", wrapper: "LSFT", group: "regular" },
  { id: "ctrl", label: "Ctrl", wrapper: "LCTL", group: "regular" },
  { id: "alt", label: "Alt", wrapper: "LALT", group: "regular" },
  { id: "gui", label: "Gui", wrapper: "LGUI", group: "regular" },
  { id: "meh", label: "Meh", wrapper: "MEH", group: "exclusive" },
  { id: "hyper", label: "Hyper", wrapper: "HYPR", group: "exclusive" }
];

const exclusiveModifierIds = new Set(simpleKeycodeMods.filter((modifier) => modifier.group === "exclusive").map((modifier) => modifier.id));

export function toggleSimpleKeycodeModifier(current: string[], modifierId: string): string[] {
  if (current.includes(modifierId)) {
    return current.filter((item) => item !== modifierId);
  }

  if (exclusiveModifierIds.has(modifierId)) {
    return [modifierId];
  }

  return [...current.filter((item) => !exclusiveModifierIds.has(item)), modifierId];
}

export function applySimpleKeycodeModifiers(keycode: string, modifiers: string[]): string {
  const cleanKeycode = keycode.trim() || "KC_NO";
  return simpleKeycodeMods
    .filter((modifier) => modifiers.includes(modifier.id))
    .map((modifier) => modifier.wrapper)
    .reduce((wrapped, wrapper) => `${wrapper}(${wrapped})`, cleanKeycode);
}
