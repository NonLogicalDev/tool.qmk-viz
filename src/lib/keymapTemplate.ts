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
{% for layer in ctx.layout.layers %}    {{ layer.name }}{% if not loop.last %},{% endif %}{{ "\n" }}{% endfor %}
};

{% if ctx.layout.customKeycodes | length %}
enum custom_keycodes {
{% for key in ctx.layout.customKeycodes %}    {{ key.name }}{% if loop.first %} = SAFE_RANGE{% endif %}{% if not loop.last %},{% endif %}{{ "\n" }}{% endfor %}
};
{% endif %}

{% for key in ctx.layout.customKeyAliases %}#define {{ key.name }} {{ key.value }}{{ "\n" }}{% endfor %}

const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
{% for layer in ctx.layout.layers %}    [{{ layer.name }}] = LAYOUT(
{% for slot, code in layer.keys %}        {{ code }}{% if not loop.last %},{% endif %} // {{ slot }}{{ "\n" }}{% endfor %}    ){% if not loop.last %},{% endif %}{{ "\n" }}{% endfor %}
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
