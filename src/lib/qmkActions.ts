export type SimpleComposerKind =
  | "plain"
  | "transparent"
  | "mo"
  | "lt"
  | "tg"
  | "tt"
  | "ctl_t"
  | "sft_t"
  | "alt_t"
  | "gui_t"
  | "hypr_t"
  | "meh_t";

export type SimpleComposerAction = {
  kind: SimpleComposerKind;
  label: string;
  fields: Array<"keycode" | "layer">;
  keycodeLabel?: string;
  layerLabel?: string;
  help: string;
};

export const simpleComposerActions: SimpleComposerAction[] = [
  { kind: "plain", label: "Plain keycode", fields: ["keycode"], keycodeLabel: "Keycode", help: "Emits the keycode as-is." },
  { kind: "transparent", label: "Transparent", fields: [], help: "Emits ~ and lets lower layers pass through." },
  { kind: "mo", label: "Momentary layer", fields: ["layer"], layerLabel: "Layer", help: "MO(layer) while held." },
  { kind: "lt", label: "Tap key, hold layer", fields: ["keycode", "layer"], keycodeLabel: "Tap keycode", layerLabel: "Hold layer", help: "LT(layer,key): tap for key, hold for layer." },
  { kind: "tg", label: "Toggle layer", fields: ["layer"], layerLabel: "Layer", help: "TG(layer) toggles a layer on or off." },
  { kind: "tt", label: "Tap-toggle layer", fields: ["layer"], layerLabel: "Layer", help: "TT(layer): hold momentarily, tap repeatedly to toggle." },
  { kind: "ctl_t", label: "Mod-tap Ctrl", fields: ["keycode"], keycodeLabel: "Tap keycode", help: "Tap key, hold Ctrl." },
  { kind: "sft_t", label: "Mod-tap Shift", fields: ["keycode"], keycodeLabel: "Tap keycode", help: "Tap key, hold Shift." },
  { kind: "alt_t", label: "Mod-tap Alt", fields: ["keycode"], keycodeLabel: "Tap keycode", help: "Tap key, hold Alt." },
  { kind: "gui_t", label: "Mod-tap Gui/Cmd", fields: ["keycode"], keycodeLabel: "Tap keycode", help: "Tap key, hold Gui/Cmd." },
  { kind: "hypr_t", label: "Mod-tap Hyper", fields: ["keycode"], keycodeLabel: "Tap keycode", help: "Tap key, hold Hyper." },
  { kind: "meh_t", label: "Mod-tap Meh", fields: ["keycode"], keycodeLabel: "Tap keycode", help: "Tap key, hold Meh." }
];

const eventKeyAliases: Record<string, string> = {
  " ": "KC_SPC",
  Enter: "KC_ENT",
  Escape: "KC_ESC",
  Backspace: "KC_BSPC",
  Tab: "KC_TAB",
  Delete: "KC_DEL",
  Insert: "KC_INS",
  Home: "KC_HOME",
  End: "KC_END",
  PageUp: "KC_PGUP",
  PageDown: "KC_PGDN",
  ArrowLeft: "KC_LEFT",
  ArrowRight: "KC_RGHT",
  ArrowUp: "KC_UP",
  ArrowDown: "KC_DOWN"
};

const punctuationKeyAliases: Record<string, string> = {
  "-": "KC_MINS",
  "=": "KC_EQL",
  "[": "KC_LBRC",
  "]": "KC_RBRC",
  "\\": "KC_BSLS",
  ";": "KC_SCLN",
  "'": "KC_QUOT",
  ",": "KC_COMM",
  ".": "KC_DOT",
  "/": "KC_SLSH",
  "`": "KC_GRV"
};

function modifierKeycode(event: KeyboardEvent): string {
  const side = event.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT ? "R" : "L";

  switch (event.key) {
    case "Control":
      return `KC_${side}CTL`;
    case "Shift":
      return `KC_${side}SFT`;
    case "Alt":
      return `KC_${side}ALT`;
    case "Meta":
      return `KC_${side}GUI`;
    default:
      return "";
  }
}

export function qmkKeycodeFromEvent(event: KeyboardEvent): string {
  const modifier = modifierKeycode(event);
  if (modifier) return modifier;
  if (/^F\d{1,2}$/.test(event.key)) return `KC_${event.key}`;
  if (/^[a-zA-Z]$/.test(event.key)) return `KC_${event.key.toUpperCase()}`;
  if (/^\d$/.test(event.key)) return `KC_${event.key}`;

  return eventKeyAliases[event.key] ?? punctuationKeyAliases[event.key] ?? "";
}

export function composeSimpleAction(kind: SimpleComposerKind, keycode: string, layer: string): string {
  const cleanKeycode = keycode.trim();
  const cleanLayer = layer.trim();

  switch (kind) {
    case "transparent":
      return "~";
    case "plain":
      return cleanKeycode || "KC_NO";
    case "mo":
      return `MO(${cleanLayer || "SYMB"})`;
    case "lt":
      return `LT(${cleanLayer || "SYMB"},${cleanKeycode || "KC_SPC"})`;
    case "tg":
      return `TG(${cleanLayer || "SYMB"})`;
    case "tt":
      return `TT(${cleanLayer || "SYMB"})`;
    case "ctl_t":
      return `CTL_T(${cleanKeycode || "KC_ESC"})`;
    case "sft_t":
      return `SFT_T(${cleanKeycode || "KC_NO"})`;
    case "alt_t":
      return `ALT_T(${cleanKeycode || "KC_NO"})`;
    case "gui_t":
      return `GUI_T(${cleanKeycode || "KC_NO"})`;
    case "hypr_t":
      return `HYPR_T(${cleanKeycode || "KC_NO"})`;
    case "meh_t":
      return `MEH_T(${cleanKeycode || "KC_NO"})`;
  }
}
