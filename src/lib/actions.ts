const keyLabels: Record<string, string> = {
  KC_BSPC: "Bksp",
  KC_BSLS: "\\",
  KC_CAPS: "Caps",
  KC_COMM: ",",
  KC_DEL: "Del",
  KC_DOT: ".",
  KC_DOWN: "↓",
  KC_END: "End",
  KC_ENT: "Enter",
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
  KC_VOLU: "Vol+"
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
    return { primary: "~", secondary: "transparent", tone: "transparent" };
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
    return { primary: momentary[1], secondary: "momentary layer", tone: "layer" };
  }

  const toggle = value.match(/^(TG|TT)\(([^)]+)\)$/);
  if (toggle) {
    return { primary: toggle[2], secondary: toggle[1] === "TT" ? "tap-toggle layer" : "toggle layer", tone: "layer" };
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
