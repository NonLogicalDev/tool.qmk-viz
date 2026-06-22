export type KeycodeCategoryId =
  | "letters"
  | "numbers"
  | "symbols"
  | "navigation"
  | "editing"
  | "function"
  | "modifiers"
  | "media"
  | "mouse"
  | "system";

export type KeycodeCategory = {
  id: KeycodeCategoryId;
  label: string;
  description: string;
};

export type KeycodeLibraryEntry = {
  code: string;
  label: string;
  category: KeycodeCategoryId;
  description: string;
  aliases: string[];
};

export const keycodeCategories: KeycodeCategory[] = [
  { id: "letters", label: "Letters", description: "Alphabetic keycodes." },
  { id: "numbers", label: "Numbers", description: "Number row and keypad numbers." },
  { id: "symbols", label: "Symbols", description: "Punctuation and shifted symbols." },
  { id: "navigation", label: "Navigation", description: "Arrows, paging, and cursor movement." },
  { id: "editing", label: "Editing", description: "Insert, delete, escape, and text-entry helpers." },
  { id: "function", label: "Function", description: "Function row keycodes." },
  { id: "modifiers", label: "Modifiers", description: "Ctrl, Shift, Alt, Gui, Hyper, and Meh." },
  { id: "media", label: "Media", description: "Volume, playback, and media transport." },
  { id: "mouse", label: "Mouse", description: "Mouse keys, buttons, and wheel movement." },
  { id: "system", label: "System", description: "Locks, bootloader, and system controls." }
];

const letterEntries = Array.from({ length: 26 }, (_, index): KeycodeLibraryEntry => {
  const letter = String.fromCharCode("A".charCodeAt(0) + index);
  return {
    code: `KC_${letter}`,
    label: letter,
    category: "letters",
    description: `Letter ${letter}.`,
    aliases: [`key ${letter.toLowerCase()}`, `letter ${letter.toLowerCase()}`, letter.toLowerCase()]
  };
});

const numberEntries = Array.from({ length: 10 }, (_, index): KeycodeLibraryEntry => ({
  code: `KC_${index}`,
  label: `${index}`,
  category: "numbers",
  description: `Number row ${index}.`,
  aliases: [`key ${index}`, `number ${index}`, `digit ${index}`, `${index}`]
}));

const functionEntries = Array.from({ length: 24 }, (_, index): KeycodeLibraryEntry => {
  const key = index + 1;
  return {
    code: `KC_F${key}`,
    label: `F${key}`,
    category: "function",
    description: `Function key F${key}.`,
    aliases: [`function ${key}`, `f ${key}`, `f${key}`]
  };
});

const entries = <T extends KeycodeLibraryEntry[]>(items: T) => items;

export const keycodeLibraryEntries: KeycodeLibraryEntry[] = [
  ...letterEntries,
  ...numberEntries,
  ...functionEntries,
  ...entries([
    { code: "KC_GRV", label: "`", category: "symbols", description: "Grave accent / backtick.", aliases: ["grave", "backtick", "tilde key"] },
    { code: "KC_MINS", label: "-", category: "symbols", description: "Minus / hyphen.", aliases: ["minus", "hyphen", "dash"] },
    { code: "KC_EQL", label: "=", category: "symbols", description: "Equal sign.", aliases: ["equals", "equal"] },
    { code: "KC_LBRC", label: "[", category: "symbols", description: "Left bracket.", aliases: ["left bracket", "open bracket", "square bracket"] },
    { code: "KC_RBRC", label: "]", category: "symbols", description: "Right bracket.", aliases: ["right bracket", "close bracket", "square bracket"] },
    { code: "KC_BSLS", label: "\\", category: "symbols", description: "Backslash.", aliases: ["backslash", "pipe key"] },
    { code: "KC_SCLN", label: ";", category: "symbols", description: "Semicolon.", aliases: ["semicolon", "colon key"] },
    { code: "KC_QUOT", label: "'", category: "symbols", description: "Quote / apostrophe.", aliases: ["quote", "apostrophe", "single quote", "double quote key"] },
    { code: "KC_COMM", label: ",", category: "symbols", description: "Comma.", aliases: ["comma", "less than key"] },
    { code: "KC_DOT", label: ".", category: "symbols", description: "Period.", aliases: ["period", "dot", "greater than key"] },
    { code: "KC_SLSH", label: "/", category: "symbols", description: "Slash.", aliases: ["slash", "forward slash", "question mark key"] },
    { code: "KC_EXLM", label: "!", category: "symbols", description: "Exclamation mark.", aliases: ["exclamation", "bang", "shift 1"] },
    { code: "KC_AT", label: "@", category: "symbols", description: "At sign.", aliases: ["at", "at sign", "shift 2"] },
    { code: "KC_HASH", label: "#", category: "symbols", description: "Hash / pound.", aliases: ["hash", "pound", "number sign", "shift 3"] },
    { code: "KC_DLR", label: "$", category: "symbols", description: "Dollar sign.", aliases: ["dollar", "shift 4"] },
    { code: "KC_PERC", label: "%", category: "symbols", description: "Percent sign.", aliases: ["percent", "shift 5"] },
    { code: "KC_CIRC", label: "^", category: "symbols", description: "Caret.", aliases: ["caret", "circumflex", "shift 6"] },
    { code: "KC_AMPR", label: "&", category: "symbols", description: "Ampersand.", aliases: ["ampersand", "and", "shift 7"] },
    { code: "KC_ASTR", label: "*", category: "symbols", description: "Asterisk.", aliases: ["asterisk", "star", "shift 8"] },
    { code: "KC_LPRN", label: "(", category: "symbols", description: "Left parenthesis.", aliases: ["left paren", "open paren", "shift 9"] },
    { code: "KC_RPRN", label: ")", category: "symbols", description: "Right parenthesis.", aliases: ["right paren", "close paren", "shift 0"] },
    { code: "KC_UNDS", label: "_", category: "symbols", description: "Underscore.", aliases: ["underscore", "shift minus"] },
    { code: "KC_PLUS", label: "+", category: "symbols", description: "Plus sign.", aliases: ["plus", "shift equals"] },
    { code: "KC_LCBR", label: "{", category: "symbols", description: "Left curly brace.", aliases: ["left brace", "open brace", "curly brace"] },
    { code: "KC_RCBR", label: "}", category: "symbols", description: "Right curly brace.", aliases: ["right brace", "close brace", "curly brace"] },
    { code: "KC_PIPE", label: "|", category: "symbols", description: "Pipe.", aliases: ["pipe", "bar", "vertical bar"] },
    { code: "KC_COLN", label: ":", category: "symbols", description: "Colon.", aliases: ["colon"] },
    { code: "KC_DQUO", label: "\"", category: "symbols", description: "Double quote.", aliases: ["double quote", "quote"] },
    { code: "KC_LABK", label: "<", category: "symbols", description: "Less-than sign.", aliases: ["less than", "angle bracket"] },
    { code: "KC_RABK", label: ">", category: "symbols", description: "Greater-than sign.", aliases: ["greater than", "angle bracket"] },
    { code: "KC_QUES", label: "?", category: "symbols", description: "Question mark.", aliases: ["question", "question mark"] },
    { code: "KC_TILD", label: "~", category: "symbols", description: "Tilde.", aliases: ["tilde"] },

    { code: "KC_LEFT", label: "Left", category: "navigation", description: "Left arrow.", aliases: ["arrow left", "cursor left"] },
    { code: "KC_RGHT", label: "Right", category: "navigation", description: "Right arrow.", aliases: ["arrow right", "cursor right"] },
    { code: "KC_UP", label: "Up", category: "navigation", description: "Up arrow.", aliases: ["arrow up", "cursor up"] },
    { code: "KC_DOWN", label: "Down", category: "navigation", description: "Down arrow.", aliases: ["arrow down", "cursor down"] },
    { code: "KC_HOME", label: "Home", category: "navigation", description: "Home.", aliases: ["line start", "beginning"] },
    { code: "KC_END", label: "End", category: "navigation", description: "End.", aliases: ["line end"] },
    { code: "KC_PGUP", label: "Page Up", category: "navigation", description: "Page up.", aliases: ["page up", "pgup"] },
    { code: "KC_PGDN", label: "Page Down", category: "navigation", description: "Page down.", aliases: ["page down", "pgdn"] },

    { code: "KC_ENT", label: "Enter", category: "editing", description: "Enter / return.", aliases: ["enter", "return"] },
    { code: "KC_ESC", label: "Esc", category: "editing", description: "Escape.", aliases: ["escape", "esc"] },
    { code: "KC_BSPC", label: "Backspace", category: "editing", description: "Backspace.", aliases: ["backspace", "delete backward"] },
    { code: "KC_TAB", label: "Tab", category: "editing", description: "Tab.", aliases: ["tab"] },
    { code: "KC_SPC", label: "Space", category: "editing", description: "Space.", aliases: ["space", "spacebar"] },
    { code: "KC_DEL", label: "Delete", category: "editing", description: "Forward delete.", aliases: ["delete", "del", "forward delete"] },
    { code: "KC_INS", label: "Insert", category: "editing", description: "Insert.", aliases: ["insert", "ins"] },
    { code: "KC_CAPS", label: "Caps Lock", category: "editing", description: "Caps lock.", aliases: ["caps", "caps lock"] },
    { code: "KC_PSCR", label: "Print Screen", category: "editing", description: "Print screen.", aliases: ["print screen", "screenshot", "prtsc"] },
    { code: "KC_SCRL", label: "Scroll Lock", category: "editing", description: "Scroll lock.", aliases: ["scroll lock"] },
    { code: "KC_PAUS", label: "Pause", category: "editing", description: "Pause / break.", aliases: ["pause", "break"] },

    { code: "KC_LCTL", label: "Left Ctrl", category: "modifiers", description: "Left Control.", aliases: ["control", "ctrl", "left control", "left ctrl"] },
    { code: "KC_RCTL", label: "Right Ctrl", category: "modifiers", description: "Right Control.", aliases: ["control", "ctrl", "right control", "right ctrl"] },
    { code: "KC_LSFT", label: "Left Shift", category: "modifiers", description: "Left Shift.", aliases: ["shift", "left shift"] },
    { code: "KC_RSFT", label: "Right Shift", category: "modifiers", description: "Right Shift.", aliases: ["shift", "right shift"] },
    { code: "KC_LALT", label: "Left Alt", category: "modifiers", description: "Left Alt / Option.", aliases: ["alt", "option", "left alt"] },
    { code: "KC_RALT", label: "Right Alt", category: "modifiers", description: "Right Alt / Option.", aliases: ["alt", "option", "right alt"] },
    { code: "KC_LGUI", label: "Left Gui", category: "modifiers", description: "Left Gui / Command / Windows.", aliases: ["gui", "command", "cmd", "windows", "left gui"] },
    { code: "KC_RGUI", label: "Right Gui", category: "modifiers", description: "Right Gui / Command / Windows.", aliases: ["gui", "command", "cmd", "windows", "right gui"] },
    { code: "HYPR(KC_NO)", label: "Hyper", category: "modifiers", description: "Gui + Shift + Alt + Ctrl wrapper.", aliases: ["hyper", "gui shift alt ctrl"] },
    { code: "MEH(KC_NO)", label: "Meh", category: "modifiers", description: "Shift + Alt + Ctrl wrapper.", aliases: ["meh", "shift alt ctrl"] },

    { code: "KC_MPRV", label: "Previous", category: "media", description: "Previous media track.", aliases: ["previous", "prev", "media previous", "track previous"] },
    { code: "KC_MNXT", label: "Next", category: "media", description: "Next media track.", aliases: ["next", "media next", "track next"] },
    { code: "KC_MPLY", label: "Play/Pause", category: "media", description: "Play or pause media.", aliases: ["play", "pause", "play pause", "media play"] },
    { code: "KC_MSTP", label: "Stop", category: "media", description: "Stop media playback.", aliases: ["stop", "media stop"] },
    { code: "KC_VOLU", label: "Volume Up", category: "media", description: "Increase volume.", aliases: ["volume", "volume up", "vol up", "louder"] },
    { code: "KC_VOLD", label: "Volume Down", category: "media", description: "Decrease volume.", aliases: ["volume", "volume down", "vol down", "quieter"] },
    { code: "KC_MUTE", label: "Mute", category: "media", description: "Mute audio.", aliases: ["mute", "volume mute", "audio mute"] },

    { code: "MS_LEFT", label: "Mouse Left", category: "mouse", description: "Move mouse cursor left.", aliases: ["mouse left", "cursor left", "ms left"] },
    { code: "MS_RGHT", label: "Mouse Right", category: "mouse", description: "Move mouse cursor right.", aliases: ["mouse right", "cursor right", "ms right"] },
    { code: "MS_UP", label: "Mouse Up", category: "mouse", description: "Move mouse cursor up.", aliases: ["mouse up", "cursor up", "ms up"] },
    { code: "MS_DOWN", label: "Mouse Down", category: "mouse", description: "Move mouse cursor down.", aliases: ["mouse down", "cursor down", "ms down"] },
    { code: "MS_BTN1", label: "Mouse 1", category: "mouse", description: "Mouse button 1 / left click.", aliases: ["mouse button 1", "left click", "primary click"] },
    { code: "MS_BTN2", label: "Mouse 2", category: "mouse", description: "Mouse button 2 / right click.", aliases: ["mouse button 2", "right click", "secondary click"] },
    { code: "MS_BTN3", label: "Mouse 3", category: "mouse", description: "Mouse button 3 / middle click.", aliases: ["mouse button 3", "middle click"] },
    { code: "MS_WHLU", label: "Wheel Up", category: "mouse", description: "Mouse wheel up.", aliases: ["wheel up", "scroll up"] },
    { code: "MS_WHLD", label: "Wheel Down", category: "mouse", description: "Mouse wheel down.", aliases: ["wheel down", "scroll down"] },
    { code: "MS_WHLL", label: "Wheel Left", category: "mouse", description: "Mouse wheel left.", aliases: ["wheel left", "horizontal scroll left"] },
    { code: "MS_WHLR", label: "Wheel Right", category: "mouse", description: "Mouse wheel right.", aliases: ["wheel right", "horizontal scroll right"] },

    { code: "KC_NUM", label: "Num Lock", category: "system", description: "Num lock.", aliases: ["num lock", "number lock"] },
    { code: "KC_APP", label: "Application", category: "system", description: "Application / context menu key.", aliases: ["application", "app", "menu", "context menu"] },
    { code: "KC_PWR", label: "Power", category: "system", description: "System power key.", aliases: ["power", "system power"] },
    { code: "KC_SLEP", label: "Sleep", category: "system", description: "System sleep key.", aliases: ["sleep"] },
    { code: "KC_WAKE", label: "Wake", category: "system", description: "System wake key.", aliases: ["wake"] },
    { code: "QK_BOOT", label: "Bootloader", category: "system", description: "Enter the keyboard bootloader.", aliases: ["bootloader", "flash", "reset", "dfu"] },
    { code: "EE_CLR", label: "EEPROM Clear", category: "system", description: "Clear EEPROM.", aliases: ["eeprom", "clear eeprom", "ee clear"] },
    { code: "KC_NO", label: "No-op", category: "system", description: "No key action.", aliases: ["no op", "nothing", "disabled"] },
    { code: "KC_TRNS", label: "Transparent", category: "system", description: "Transparent layer pass-through.", aliases: ["transparent", "pass through", "trans"] }
  ])
];

const categoryLabels = new Map(keycodeCategories.map((category) => [category.id, category.label]));

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function keycodeSearchText(entry: KeycodeLibraryEntry): string {
  return normalizeSearchText([
    entry.code,
    entry.label,
    entry.description,
    categoryLabels.get(entry.category) ?? "",
    ...entry.aliases
  ].join(" "));
}

export function filterKeycodeLibraryEntries(options: {
  category?: KeycodeCategoryId | "all";
  query?: string;
}): KeycodeLibraryEntry[] {
  const category = options.category ?? "all";
  const tokens = normalizeSearchText(options.query ?? "").split(/\s+/).filter(Boolean);

  return keycodeLibraryEntries.filter((entry) => {
    if (category !== "all" && entry.category !== category) return false;
    if (tokens.length === 0) return true;
    const searchText = keycodeSearchText(entry);
    return tokens.every((token) => searchText.includes(token));
  });
}
