const keyLabels: Record<string, string> = {
  EE_CLR: "EeClr",
  KK_BSPC: "Bksp",
  KK_DQOT: "\"",
  KK_LACT: "LAct",
  KK_LBKT: "[",
  KK_LCBR: "{",
  KK_LCTL: "LCtrl",
  KK_LPRN: "(",
  KK_MDIA: "MDIA",
  KK_QUOT: "'",
  KK_RACT: "RAct",
  KK_RBKT: "]",
  KK_RCBR: "}",
  KK_RCTL: "RCtrl",
  KK_RPRN: ")",
  KK_SPC: "Space",
  KK_SYMB: "SYMB",
  KC_BSPC: "Bksp",
  KC_BSLS: "\\",
  KC_CAPS: "Caps",
  KC_COMM: ",",
  KC_DEL: "Del",
  KC_DOT: ".",
  KC_DOWN: "↓",
  KC_END: "End",
  KC_ENT: "Ent",
  KC_ESC: "Esc",
  KC_GRV: "`",
  KC_HOME: "Home",
  KC_INS: "Ins",
  KC_LALT: "LAlt",
  KC_LBRC: "[",
  KC_LCTL: "LCtrl",
  KC_LEFT: "←",
  KC_LGUI: "LGui",
  KC_LSFT: "LShift",
  KC_MNXT: "Next",
  KC_MPLY: "Play",
  KC_MPRV: "Prev",
  KC_MSTP: "Stop",
  KC_MINS: "-",
  KC_NO: "No",
  KC_PGDN: "PgDn",
  KC_PGUP: "PgUp",
  KC_QUOT: "'",
  KC_RALT: "RAlt",
  KC_RBRC: "]",
  KC_RCTL: "RCtrl",
  KC_RGHT: "→",
  KC_RGUI: "RGui",
  KC_RSFT: "RShift",
  KC_SCLN: ";",
  KC_SLSH: "/",
  KC_SPC: "Space",
  KC_TAB: "Tab",
  KC_UP: "↑",
  KC_VOLD: "Vol-",
  KC_VOLU: "Vol+",
  MS_BTN1: "M1",
  MS_BTN2: "M2",
  MS_DOWN: "Ms↓",
  MS_LEFT: "Ms←",
  MS_RGHT: "Ms→",
  MS_UP: "Ms↑",
  NL_MS_D5: "Ms↓5",
  NL_MS_L5: "Ms←5",
  NL_MS_R5: "Ms→5",
  NL_MS_U5: "Ms↑5",
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

export type ActionDetails = {
  primary: string;
  secondary?: string;
  tone: "plain" | "transparent" | "layer" | "modifier" | "special";
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
  return /^[A-Z][A-Z0-9_]*$/.test(value) && !value.startsWith("KC_") && !value.startsWith("KK_");
}

function layerNameFromHold(value: string): string | undefined {
  const hold = cleanSlot(value);
  const momentary = hold.match(/^MO\(([^)]+)\)$/);
  if (momentary) return cleanSlot(momentary[1]);
  if (looksLikeLayerName(hold)) return hold;
  return undefined;
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
  const value = identifier.trim();
  if (!value) return "";
  if (value === "~" || value === "KC_TRNS") return "~";
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

  if (value === "~" || value === "KC_TRNS") {
    return { primary: "~", tone: "transparent" };
  }

  const tapDance = value.match(/^TD\((DANCE_\d+)\)$/);
  if (tapDance) {
    return { primary: tapDance[1], secondary: "tap dance", tone: "special" };
  }

  if (/^DANCE_\d+$/.test(value)) {
    return { primary: value, secondary: "tap dance", tone: "special" };
  }

  const layerTap = value.match(/^LT\(([^,]+),\s*([^)]+)\)$/);
  if (layerTap) {
    return {
      primary: displayKeycode(layerTap[2]),
      secondary: `hold ${layerTap[1]}`,
      tone: "layer"
    };
  }

  const momentary = value.match(/^MO\(([^)]+)\)$/);
  if (momentary) {
    return { primary: momentary[1], secondary: "momentary", tone: "layer" };
  }

  const toggle = value.match(/^(TG|TT)\(([^)]+)\)$/);
  if (toggle) {
    return { primary: toggle[2], secondary: toggle[1] === "TT" ? "tap-toggle" : "toggle", tone: "layer" };
  }

  const modTap = value.match(/^([A-Z_]+)\(([^)]+)\)$/);
  if (modTap?.[1] && modTapLabels[modTap[1]]) {
    return {
      primary: displayKeycode(modTap[2]),
      secondary: `hold ${modTapLabels[modTap[1]]}`,
      tone: "modifier"
    };
  }

  if (value.startsWith("QK_") || value.startsWith("NL_") || value.startsWith("MS_")) {
    return { primary: displayKeycode(value), tone: "special" };
  }

  return { primary: displayKeycode(value), tone: "plain" };
}

export function composeAction(kind: string, tap: string, hold: string): string {
  const cleanTap = tap.trim();
  const cleanHold = hold.trim();

  switch (kind) {
    case "transparent":
      return "~";
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
      note: `${note} Oryx-style advanced behavior maps to TD(${normalizedDanceName}) plus an @DANCES TSV row.`,
      dance: { name: normalizedDanceName, slots },
      supportCode: generateDanceSupportCode(slots, normalizedDanceName)
    };
  }

  return { identifier, compileReady: true, note };
}
