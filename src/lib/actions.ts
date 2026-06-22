import { isTransparentKeycode, TRANSPARENT } from "./keymap";

const keyLabels: Record<string, string> = {
  EE_CLR: "EeClr",
  KC_AMPR: "&",
  KC_ASTR: "*",
  KC_AT: "@",
  KC_BSPC: "Bksp",
  KC_BSLS: "\\",
  KC_CAPS: "Caps",
  KC_CIRC: "^",
  KC_COLN: ":",
  KC_COMM: ",",
  KC_DEL: "Del",
  KC_DOT: ".",
  KC_DOWN: "↓",
  KC_DLR: "$",
  KC_DQUO: "\"",
  KC_END: "End",
  KC_ENT: "Ent",
  KC_ESC: "Esc",
  KC_EXLM: "!",
  KC_GRV: "`",
  KC_HASH: "#",
  KC_HOME: "Home",
  KC_INS: "Ins",
  KC_LABK: "<",
  KC_LALT: "LAlt",
  KC_LBRC: "[",
  KC_LCBR: "{",
  KC_LCTL: "LCtrl",
  KC_LEFT: "←",
  KC_LGUI: "LGui",
  KC_LPRN: "(",
  KC_LSFT: "LShift",
  KC_MNXT: "Next",
  KC_MPLY: "Play",
  KC_MPRV: "Prev",
  KC_MSTP: "Stop",
  KC_MINS: "-",
  KC_NO: "No",
  KC_PGDN: "PgDn",
  KC_PGUP: "PgUp",
  KC_PERC: "%",
  KC_PIPE: "|",
  KC_PLUS: "+",
  KC_PSCR: "PrtSc",
  KC_QUES: "?",
  KC_QUOT: "'",
  KC_RABK: ">",
  KC_RALT: "RAlt",
  KC_RBRC: "]",
  KC_RCBR: "}",
  KC_RCTL: "RCtrl",
  KC_RGHT: "→",
  KC_RGUI: "RGui",
  KC_RPRN: ")",
  KC_RSFT: "RShift",
  KC_SCLN: ";",
  KC_SCRL: "Scrl",
  KC_SLSH: "/",
  KC_SPC: "Space",
  KC_TAB: "Tab",
  KC_TILD: "~",
  KC_UNDS: "_",
  KC_UP: "↑",
  KC_PAUS: "Pause",
  KC_VOLD: "Vol-",
  KC_VOLU: "Vol+",
  MS_BTN1: "M1",
  MS_BTN2: "M2",
  MS_DOWN: "Ms↓",
  MS_LEFT: "Ms←",
  MS_RGHT: "Ms→",
  MS_UP: "Ms↑",
  QK_BOOT: "Flash"
};

const modTapLabels: Record<string, string> = {
  ALT_T: "Alt",
  CTL_T: "Ctrl",
  GUI_T: "Cmd",
  HYPR_T: "Hyper",
  MEH_T: "Meh",
  SFT_T: "Shift"
};

const modifierWrapperLabels: Record<string, string> = {
  HYPR: "Hyper",
  LALT: "Alt",
  LCTL: "Ctrl",
  LGUI: "Gui",
  LSFT: "Shift",
  MEH: "Meh",
  RALT: "RAlt",
  RCTL: "RCtrl",
  RGUI: "Gui",
  RSFT: "RShift"
};

const chordBreak = "\u200B";

export type ActionDetails = {
  primary: string;
  secondary?: string;
  tone: "plain" | "transparent" | "layer" | "modifier" | "special";
  layer?: string;
  validation?: {
    level: "ok" | "warning";
    message: string;
  };
};

export type BehaviorSlots = {
  tap: string;
  hold: string;
  doubleTap: string;
  tapHold: string;
};

export type BehaviorComposition = {
  identifier: string;
  compileReady: boolean;
  note: string;
  dance?: {
    name: string;
    slots: BehaviorSlots;
  };
  supportCode?: string;
};

const heldModifierToTapHold: Record<string, string> = {
  KC_LALT: "LALT_T",
  KC_LCTL: "LCTL_T",
  KC_LGUI: "LGUI_T",
  KC_LSFT: "LSFT_T",
  KC_RALT: "RALT_T",
  KC_RCTL: "RCTL_T",
  KC_RGUI: "RGUI_T",
  KC_RSFT: "RSFT_T"
};

const tapHoldToHeldModifier: Record<string, string> = {
  ALT_T: "KC_LALT",
  CTL_T: "KC_LCTL",
  GUI_T: "KC_LGUI",
  SFT_T: "KC_LSFT",
  LALT_T: "KC_LALT",
  LCTL_T: "KC_LCTL",
  LGUI_T: "KC_LGUI",
  LSFT_T: "KC_LSFT",
  RALT_T: "KC_RALT",
  RCTL_T: "KC_RCTL",
  RGUI_T: "KC_RGUI",
  RSFT_T: "KC_RSFT",
  HYPR_T: "Hyper",
  MEH_T: "Meh"
};

function cleanSlot(value: string): string {
  return value.trim();
}

function looksLikeLayerName(value: string): boolean {
  return /^[A-Z][A-Z0-9]*$/.test(value);
}

function layerNameFromHold(value: string): string | undefined {
  const hold = cleanSlot(value);
  const momentary = hold.match(/^MO\(([^)]+)\)$/);
  if (momentary) return cleanSlot(momentary[1]);
  if (looksLikeLayerName(hold)) return hold;
  return undefined;
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
      args.push(cleanSlot(value.slice(start, index)));
      start = index + 1;
    }
  }

  args.push(cleanSlot(value.slice(start)));
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
  let clean = value.trim();

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

function functionValidation(name: string, args: string[]): ActionDetails["validation"] {
  const expectedArgs: Record<string, number> = {
    LT: 2,
    MO: 1,
    TG: 1,
    TT: 1,
    TD: 1,
    OSL: 1,
    TO: 1,
    DF: 1,
    ALT_T: 1,
    CTL_T: 1,
    GUI_T: 1,
    SFT_T: 1,
    HYPR_T: 1,
    MEH_T: 1,
    LALT: 1,
    LCTL: 1,
    LGUI: 1,
    LSFT: 1,
    LALT_T: 1,
    LCTL_T: 1,
    LGUI_T: 1,
    LSFT_T: 1,
    RALT: 1,
    RCTL: 1,
    RGUI: 1,
    RSFT: 1,
    RALT_T: 1,
    RCTL_T: 1,
    RGUI_T: 1,
    RSFT_T: 1
  };

  const expected = expectedArgs[name];
  if (expected === undefined) {
    return { level: "warning", message: `${name}(...) is not recognized by qmk-viz; verify this raw QMK expression compiles.` };
  }

  if (args.length !== expected || args.some((arg) => !arg)) {
    return { level: "warning", message: `${name}(...) expects ${expected} non-empty argument${expected === 1 ? "" : "s"}.` };
  }

  if (name === "LT" && args.slice(1).some((arg) => parseFunctionCall(arg))) {
    return { level: "warning", message: "QMK layer-tap usually expects a basic keycode as the tap side; nested functions may not compile." };
  }

  return { level: "ok", message: `${name}(...) is a recognized qmk-viz composition.` };
}

function flattenModifierWrapper(value: string): { base: string; labels: string[] } | undefined {
  const call = parseFunctionCall(value);
  if (!call || !modifierWrapperLabels[call.name] || call.args.length !== 1) return undefined;

  const nested = flattenModifierWrapper(call.args[0]);
  return {
    base: nested?.base ?? stripRedundantParens(call.args[0]),
    labels: [modifierWrapperLabels[call.name], ...(nested?.labels ?? [])]
  };
}

function displayModifierChord(value: string): string | undefined {
  const flattened = flattenModifierWrapper(value);
  if (!flattened) return undefined;

  const base = displayKeycode(flattened.base);
  return [...flattened.labels, base].filter(Boolean).join(`+${chordBreak}`);
}

function displayActionPrimary(identifier: string): string {
  return displayModifierChord(identifier) ?? displayKeycode(identifier);
}

function actionDownStatement(value: string, fallback: string): string {
  const clean = cleanSlot(value) || fallback;
  const layer = layerNameFromHold(clean);
  if (layer) return `layer_on(${layer});`;
  return `register_code16(${clean});`;
}

function actionUpStatement(value: string, fallback: string): string {
  const clean = cleanSlot(value) || fallback;
  const layer = layerNameFromHold(clean);
  if (layer) return `layer_off(${layer});`;
  return `unregister_code16(${clean});`;
}

function tapStatement(value: string, fallback: string): string {
  const clean = cleanSlot(value) || fallback;
  const layer = layerNameFromHold(clean);
  if (layer) return `layer_on(${layer}); layer_off(${layer});`;
  return `tap_code16(${clean});`;
}

function normalizeDanceName(name: string): string {
  const clean = cleanSlot(name);
  if (!clean) return "DANCE_0";
  if (/^\d+$/.test(clean)) return `DANCE_${clean}`;
  return clean.toUpperCase().replace(/[^A-Z0-9_]+/g, "_");
}

function danceIndex(name: string): number {
  const match = normalizeDanceName(name).match(/_(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function generateDanceSupportCode(slots: BehaviorSlots, danceName = "DANCE_0"): string {
  const normalizedName = normalizeDanceName(danceName);
  const index = danceIndex(normalizedName);
  const tap = cleanSlot(slots.tap) || "KC_NO";
  const hold = cleanSlot(slots.hold) || tap;
  const doubleTap = cleanSlot(slots.doubleTap) || tap;
  const tapHold = cleanSlot(slots.tapHold) || hold;
  const prefix = normalizedName.toLowerCase();

  return `enum tap_dance_codes {
  ${normalizedName},
};

typedef struct {
  bool is_press_action;
  uint8_t step;
} tap;

enum {
  SINGLE_TAP = 1,
  SINGLE_HOLD,
  DOUBLE_TAP,
  DOUBLE_HOLD,
  DOUBLE_SINGLE_TAP,
  MORE_TAPS
};

static tap dance_state[${index + 1}];

uint8_t dance_step(tap_dance_state_t *state) {
  if (state->count == 1) {
    return (state->interrupted || !state->pressed) ? SINGLE_TAP : SINGLE_HOLD;
  }
  if (state->count == 2) {
    if (state->interrupted) return DOUBLE_SINGLE_TAP;
    return state->pressed ? DOUBLE_HOLD : DOUBLE_TAP;
  }
  return MORE_TAPS;
}

void ${prefix}_finished(tap_dance_state_t *state, void *user_data) {
  dance_state[${index}].step = dance_step(state);
  switch (dance_state[${index}].step) {
    case SINGLE_TAP: ${actionDownStatement(tap, "KC_NO")} break;
    case SINGLE_HOLD: ${actionDownStatement(hold, tap)} break;
    case DOUBLE_TAP: ${actionDownStatement(doubleTap, tap)} break;
    case DOUBLE_HOLD: ${actionDownStatement(tapHold, hold)} break;
    case DOUBLE_SINGLE_TAP: ${tapStatement(tap, "KC_NO")} ${actionDownStatement(tap, "KC_NO")} break;
  }
}

void ${prefix}_reset(tap_dance_state_t *state, void *user_data) {
  wait_ms(10);
  switch (dance_state[${index}].step) {
    case SINGLE_TAP: ${actionUpStatement(tap, "KC_NO")} break;
    case SINGLE_HOLD: ${actionUpStatement(hold, tap)} break;
    case DOUBLE_TAP: ${actionUpStatement(doubleTap, tap)} break;
    case DOUBLE_HOLD: ${actionUpStatement(tapHold, hold)} break;
    case DOUBLE_SINGLE_TAP: ${actionUpStatement(tap, "KC_NO")} break;
  }
  dance_state[${index}].step = 0;
}

tap_dance_action_t tap_dance_actions[] = {
  [${normalizedName}] = ACTION_TAP_DANCE_FN_ADVANCED(NULL, ${prefix}_finished, ${prefix}_reset),
};`;
}

export function displayKeycode(identifier: string): string {
  const value = stripRedundantParens(identifier);
  if (!value) return "";
  if (isTransparentKeycode(value)) return "TRNS";
  if (keyLabels[value]) return keyLabels[value];
  if (/^KC_[A-Z]$/.test(value)) return value.slice(3);
  if (/^KC_\d$/.test(value)) return value.slice(3);
  if (/^KC_F\d+$/.test(value)) return value.slice(3);
  if (/^KC_P\d$/.test(value)) return `P${value.slice(-1)}`;
  if (value === "KC_PDOT") return "P.";
  return value.replace(/^KC_/, "");
}

export function describeAction(identifier: string): ActionDetails {
  const value = identifier.trim();

  if (isTransparentKeycode(value)) {
    return { primary: "TRNS", tone: "transparent" };
  }

  const functionCall = parseFunctionCall(value);

  if (functionCall?.name === "TD" && functionCall.args.length === 1) {
    return {
      primary: functionCall.args[0],
      secondary: "tap dance",
      tone: "special",
      validation: functionValidation(functionCall.name, functionCall.args)
    };
  }

  if (/^DANCE_\d+$/.test(value)) {
    return { primary: value, secondary: "tap dance", tone: "special" };
  }

  if (functionCall?.name === "LT") {
    const [layer, tap] = functionCall.args;
    return {
      primary: displayActionPrimary(tap ?? ""),
      secondary: `${layer ?? "layer"} on hold`,
      tone: "layer",
      layer,
      validation: functionValidation(functionCall.name, functionCall.args)
    };
  }

  if (functionCall?.name === "MO") {
    const [layer] = functionCall.args;
    return { primary: layer, secondary: "momentary", tone: "layer", layer, validation: functionValidation(functionCall.name, functionCall.args) };
  }

  if (functionCall?.name === "TG" || functionCall?.name === "TT") {
    const [layer] = functionCall.args;
    return {
      primary: layer,
      secondary: functionCall.name === "TT" ? "tap-toggle" : "toggle",
      tone: "layer",
      layer,
      validation: functionValidation(functionCall.name, functionCall.args)
    };
  }

  if (functionCall?.name && modTapLabels[functionCall.name]) {
    return {
      primary: displayActionPrimary(functionCall.args[0] ?? ""),
      secondary: `hold ${modTapLabels[functionCall.name]}`,
      tone: "modifier",
      validation: functionValidation(functionCall.name, functionCall.args)
    };
  }

  if (functionCall?.name && modifierWrapperLabels[functionCall.name]) {
    return {
      primary: displayModifierChord(value) ?? displayKeycode(functionCall.args[0] ?? ""),
      tone: "modifier",
      validation: functionValidation(functionCall.name, functionCall.args)
    };
  }

  if (functionCall) {
    return {
      primary: functionCall.name,
      secondary: `${functionCall.args.length} arg${functionCall.args.length === 1 ? "" : "s"}`,
      tone: "special",
      validation: functionValidation(functionCall.name, functionCall.args)
    };
  }

  if (/^[A-Z0-9_]+\(/.test(value)) {
    return {
      primary: value.replace(/\(.*/, ""),
      secondary: "malformed",
      tone: "special",
      validation: { level: "warning", message: "This looks like a function mapping, but qmk-viz could not parse balanced arguments." }
    };
  }

  if (value.startsWith("QK_") || value.startsWith("MS_")) {
    return { primary: displayKeycode(value), tone: "special" };
  }

  return { primary: displayKeycode(value), tone: "plain" };
}

export function composeAction(kind: string, tap: string, hold: string): string {
  const cleanTap = tap.trim();
  const cleanHold = hold.trim();

  switch (kind) {
    case "transparent":
      return TRANSPARENT;
    case "plain":
      return cleanTap || "KC_NO";
    case "mo":
      return cleanHold ? `MO(${cleanHold})` : "MO(SYMB)";
    case "tg":
      return cleanHold ? `TG(${cleanHold})` : "TG(SYMB)";
    case "tt":
      return cleanHold ? `TT(${cleanHold})` : "TT(SYMB)";
    case "lt":
      return `LT(${cleanHold || "SYMB"},${cleanTap || "KC_SPC"})`;
    case "ctl_t":
      return `CTL_T(${cleanTap || "KC_ESC"})`;
    case "sft_t":
      return `SFT_T(${cleanTap || "KC_NO"})`;
    case "alt_t":
      return `ALT_T(${cleanTap || "KC_NO"})`;
    case "gui_t":
      return `GUI_T(${cleanTap || "KC_NO"})`;
    case "hypr_t":
      return `HYPR_T(${cleanTap || "KC_NO"})`;
    case "meh_t":
      return `MEH_T(${cleanTap || "KC_NO"})`;
    default:
      return cleanTap || "KC_NO";
  }
}

export function parseActionToBehaviorSlots(identifier: string): BehaviorSlots {
  const value = cleanSlot(identifier);

  const layerTap = value.match(/^LT\(([^,]+),\s*([^)]+)\)$/);
  if (layerTap) {
    return { tap: cleanSlot(layerTap[2]), hold: cleanSlot(layerTap[1]), doubleTap: "", tapHold: "" };
  }

  const momentary = value.match(/^MO\(([^)]+)\)$/);
  if (momentary) {
    return { tap: "", hold: cleanSlot(momentary[1]), doubleTap: "", tapHold: "" };
  }

  const modTap = value.match(/^([A-Z_]+)\(([^)]+)\)$/);
  if (modTap?.[1] && tapHoldToHeldModifier[modTap[1]]) {
    return { tap: cleanSlot(modTap[2]), hold: tapHoldToHeldModifier[modTap[1]], doubleTap: "", tapHold: "" };
  }

  return { tap: value, hold: "", doubleTap: "", tapHold: "" };
}

export function composeBehaviorAction(slots: BehaviorSlots, danceName = "DANCE_0"): BehaviorComposition {
  const tap = cleanSlot(slots.tap);
  const hold = cleanSlot(slots.hold);
  const doubleTap = cleanSlot(slots.doubleTap);
  const tapHold = cleanSlot(slots.tapHold);
  const hasAdvancedSlots = Boolean(doubleTap || tapHold);
  let identifier = tap || "KC_NO";
  let note = "Compiles as a plain QMK keycode.";

  const holdLayer = layerNameFromHold(hold);
  const holdModifierForm = heldModifierToTapHold[hold];

  if (tap && holdLayer) {
    identifier = `LT(${holdLayer},${tap})`;
    note = "Compiles as QMK layer-tap: tap key, hold layer.";
  } else if (!tap && holdLayer) {
    identifier = `MO(${holdLayer})`;
    note = "Compiles as a momentary layer key while held.";
  } else if (tap && holdModifierForm) {
    identifier = `${holdModifierForm}(${tap})`;
    note = "Compiles as QMK mod-tap: tap key, hold modifier.";
  } else if (!tap && hold) {
    identifier = hold;
    note = "Compiles as the held action keycode.";
  } else if (tap && hold) {
    note = "Only the tap side is directly compilable right now; this hold action needs custom QMK handling.";
  }

  if (hasAdvancedSlots) {
    const normalizedDanceName = normalizeDanceName(danceName);
    return {
      identifier: `TD(${normalizedDanceName})`,
      compileReady: true,
      note: `${note} Oryx-style advanced behavior maps to TD(${normalizedDanceName}) plus a dances JSON entry.`,
      dance: { name: normalizedDanceName, slots },
      supportCode: generateDanceSupportCode(slots, normalizedDanceName)
    };
  }

  return { identifier, compileReady: true, note };
}
