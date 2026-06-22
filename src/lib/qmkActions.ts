import { isTransparentKeycode, TRANSPARENT } from "./keymap";

export type SimpleComposerKind =
  | "raw"
  | "plain"
  | "transparent"
  | "mo"
  | "lt"
  | "tg"
  | "tt"
  | "mod_tap";

export type SimpleComposerAction = {
  kind: SimpleComposerKind;
  label: string;
  fields: Array<"keycode" | "layer">;
  keycodeLabel?: string;
  layerLabel?: string;
  help: string;
};

export const simpleComposerActions: SimpleComposerAction[] = [
  { kind: "raw", label: "Raw QMK", fields: [], help: "Use exactly the raw expression entered below." },
  { kind: "plain", label: "Plain keycode", fields: ["keycode"], keycodeLabel: "Keycode", help: "Emits the keycode as-is." },
  { kind: "transparent", label: "Transparent", fields: [], help: "Emits KC_TRNS and lets lower layers pass through." },
  { kind: "mo", label: "Momentary layer (MO)", fields: ["layer"], layerLabel: "Layer", help: "MO(layer) while held." },
  { kind: "lt", label: "Tap key, hold layer (LT)", fields: ["keycode", "layer"], keycodeLabel: "Tap keycode", layerLabel: "Hold layer", help: "LT(layer,key): tap for key, hold for layer." },
  { kind: "tg", label: "Toggle layer (TG)", fields: ["layer"], layerLabel: "Layer", help: "TG(layer) toggles a layer on or off." },
  { kind: "tt", label: "Tap-toggle layer (TT)", fields: ["layer"], layerLabel: "Layer", help: "TT(layer): hold momentarily, tap repeatedly to toggle." },
  { kind: "mod_tap", label: "Mod-tap (MT)", fields: ["keycode"], keycodeLabel: "Tap keycode", help: "Tap one key, hold a selected modifier." }
];

export const modTapActions = [
  { value: "CTL_T", label: "Ctrl" },
  { value: "SFT_T", label: "Shift" },
  { value: "ALT_T", label: "Alt" },
  { value: "GUI_T", label: "Gui/Cmd" },
  { value: "HYPR_T", label: "Hyper" },
  { value: "MEH_T", label: "Meh" }
];

export type ParsedSimpleComposerAction = {
  kind: SimpleComposerKind;
  rawAction: string;
  keycode: string;
  keycodeModifiers: string[];
  layer: string;
  modTapModifier: string;
};

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

const eventCodeAliases: Record<string, string> = {
  Backquote: "KC_GRV",
  Backslash: "KC_BSLS",
  BracketLeft: "KC_LBRC",
  BracketRight: "KC_RBRC",
  Comma: "KC_COMM",
  Equal: "KC_EQL",
  Minus: "KC_MINS",
  Period: "KC_DOT",
  Quote: "KC_QUOT",
  Semicolon: "KC_SCLN",
  Slash: "KC_SLSH"
};

const wrapperToModifier: Record<string, string> = {
  LALT: "alt",
  RALT: "alt",
  LCTL: "ctrl",
  RCTL: "ctrl",
  LGUI: "gui",
  RGUI: "gui",
  LSFT: "shift",
  RSFT: "shift"
};

const modifierOrder = ["shift", "ctrl", "alt", "gui"];

function cleanAction(value: string): string {
  return value.trim();
}

function splitFunctionArgs(value: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      args.push(cleanAction(value.slice(start, index)));
      start = index + 1;
    }
  }

  args.push(cleanAction(value.slice(start)));
  return args;
}

function parseFunctionCall(value: string): { name: string; args: string[] } | undefined {
  const match = value.match(/^([A-Z0-9_]+)\((.*)\)$/);
  if (!match) return undefined;

  const body = match[2];
  let depth = 0;
  for (const char of body) {
    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth < 0) return undefined;
    }
  }
  if (depth !== 0) return undefined;

  return { name: match[1], args: splitFunctionArgs(body) };
}

function stripRedundantParens(value: string): string {
  let clean = cleanAction(value);

  while (clean.startsWith("(") && clean.endsWith(")")) {
    let depth = 0;
    let closesAtEnd = false;

    for (let index = 0; index < clean.length; index += 1) {
      const char = clean[index];
      if (char === "(") depth += 1;
      if (char === ")") depth -= 1;
      if (depth === 0) {
        closesAtEnd = index === clean.length - 1;
        break;
      }
    }

    if (!closesAtEnd) break;
    clean = clean.slice(1, -1).trim();
  }

  return clean;
}

function unwrapKeycodeModifiers(value: string): { keycode: string; modifiers: string[] } {
  let current = cleanAction(value);
  const modifiers: string[] = [];

  while (current) {
    const call = parseFunctionCall(current);
    const modifier = call?.name ? wrapperToModifier[call.name] : undefined;
    if (!call || !modifier || call.args.length !== 1) break;

    modifiers.push(modifier);
    current = cleanAction(call.args[0]);
  }

  const uniqueModifiers = modifierOrder.filter((modifier) => modifiers.includes(modifier));
  return { keycode: stripRedundantParens(current) || "KC_NO", modifiers: uniqueModifiers };
}

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
  if (/^Key[A-Z]$/.test(event.code)) return `KC_${event.code.slice(3)}`;
  if (/^Digit\d$/.test(event.code)) return `KC_${event.code.slice(5)}`;
  if (eventCodeAliases[event.code]) return eventCodeAliases[event.code];
  if (/^F\d{1,2}$/.test(event.key)) return `KC_${event.key}`;
  if (/^[a-zA-Z]$/.test(event.key)) return `KC_${event.key.toUpperCase()}`;
  if (/^\d$/.test(event.key)) return `KC_${event.key}`;

  return eventKeyAliases[event.key] ?? punctuationKeyAliases[event.key] ?? "";
}

export function composeSimpleAction(kind: SimpleComposerKind, keycode: string, layer: string): string {
  const cleanKeycode = keycode.trim();
  const cleanLayer = layer.trim();

  switch (kind) {
    case "raw":
      return cleanKeycode || "KC_NO";
    case "transparent":
      return TRANSPARENT;
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
    case "mod_tap":
      return cleanKeycode || "KC_NO";
  }
}

export function composeModTapAction(keycode: string, modifier: string): string {
  return `${modifier || "CTL_T"}(${keycode.trim() || "KC_ESC"})`;
}

export function parseSimpleComposerAction(action: string): ParsedSimpleComposerAction {
  const clean = cleanAction(action) || "KC_NO";
  const base = {
    kind: "raw" as SimpleComposerKind,
    rawAction: clean,
    keycode: "KC_SPC",
    keycodeModifiers: [] as string[],
    layer: "SYMB",
    modTapModifier: "CTL_T"
  };

  if (isTransparentKeycode(clean)) {
    return { ...base, kind: "transparent", rawAction: TRANSPARENT };
  }

  const call = parseFunctionCall(clean);

  if (call?.name === "LT" && call.args.length === 2) {
    const unwrapped = unwrapKeycodeModifiers(call.args[1]);
    return {
      ...base,
      kind: "lt",
      rawAction: clean,
      keycode: unwrapped.keycode,
      keycodeModifiers: unwrapped.modifiers,
      layer: call.args[0] || "SYMB"
    };
  }

  if ((call?.name === "MO" || call?.name === "TG" || call?.name === "TT") && call.args.length === 1) {
    return {
      ...base,
      kind: call.name.toLowerCase() as SimpleComposerKind,
      rawAction: clean,
      layer: call.args[0] || "SYMB"
    };
  }

  if (call?.name && modTapActions.some((candidate) => candidate.value === call.name) && call.args.length === 1) {
    const unwrapped = unwrapKeycodeModifiers(call.args[0]);
    return {
      ...base,
      kind: "mod_tap",
      rawAction: clean,
      keycode: unwrapped.keycode,
      keycodeModifiers: unwrapped.modifiers,
      modTapModifier: call.name
    };
  }

  const unwrapped = unwrapKeycodeModifiers(clean);
  if (unwrapped.keycode !== clean || unwrapped.modifiers.length > 0 || !call) {
    return {
      ...base,
      kind: "plain",
      rawAction: clean,
      keycode: unwrapped.keycode,
      keycodeModifiers: unwrapped.modifiers
    };
  }

  return base;
}
