import nunjucks from "nunjucks";
import type { KeymapExport } from "./keymap";

export const DEFAULT_KEYMAP_TEMPLATE = `#include QMK_KEYBOARD_H

/*
 * qmk-viz generated keymap.c
 * Project: {{ ctx.keyboardProject.name }}
 * Keyboard: {{ ctx.keyboard.name }}
 * Layout: {{ ctx.layout.name }}
 *
 * Edit this template to match your keyboard's QMK layout macro.
 * This template receives { ctx: <exported Full Layout JSON object> }.
 * Support tables: ctx.layout.macros, ctx.layout.customKeyAliases, ctx.layout.customKeycodes.
 */

enum layer_names {
{% for layer in ctx.layout.layers %}
    {{ layer.name }}{% if not loop.last %},{% endif %}
{% endfor %}
};

const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
{% for layer in ctx.layout.layers %}
    [{{ layer.name }}] = LAYOUT(
{% for slot, code in layer.keys %}
        {{ code }}{% if not loop.last %},{% endif %} // {{ slot }}
{% endfor %}
    ){% if not loop.last %},{% endif %}
{% endfor %}
};
`;

export type KeymapTemplateContext = {
  ctx: KeymapExport;
};

const templateEnvironment = new nunjucks.Environment(undefined, {
  autoescape: false,
  lstripBlocks: true,
  trimBlocks: true
});

export function renderKeymapTemplate(template: string, context: KeymapTemplateContext): string {
  return templateEnvironment.renderString(template, context).trimEnd();
}

export function normalizeKeymapTemplate(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return DEFAULT_KEYMAP_TEMPLATE;
  if (/\bqmk\./.test(value)) return DEFAULT_KEYMAP_TEMPLATE;
  if (/\b(keyboardProject|keyboard|layout)\./.test(value) && !/\bctx\./.test(value)) return DEFAULT_KEYMAP_TEMPLATE;
  return value;
}
