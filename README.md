# qmk-viz

Vite + TypeScript visual editor for QMK keyboard projects.

The app is static-hostable and stores projects in `localStorage`. The intended flow is:

1. Create a Keyboard Project.
2. Upload or update a Keyboard Layout Editor JSON file.
3. Create a new layout or upload a layout JSON file.
4. Edit the layout visually.
5. Download either a single layout JSON or a full project JSON backup.

The built-in starter project is `input_club/ergodox_infinity` and reads:

- `../qmk/keyboards/input_club/ergodox_infinity/keymaps/monster/keyboard-layout.json`

## KLE Model IDs

Key IDs come from the KLE center marker slot. The Ergodox source KLE intentionally strips user-facing legends and keeps only matrix IDs:

- `LT##` for left top keys.
- `RT##` for right top keys.
- `LC##` for left thumb-cluster keys.
- `RC##` for right thumb-cluster keys.

When a project KLE is updated later, layouts are preserved by these IDs. Matching IDs keep their mappings, new IDs start transparent, and removed IDs disappear from exports.

## Exports

- `Layout JSON`: active layout only, intended as the `keymap.c` template input.
- `Full Project`: KLE model plus all named layouts, intended as the backup/re-import format.
- `Project KLE`: canonical KLE model with matrix IDs embedded.
- `Layer KLE`: active-layer KLE preview with QMK identifiers written onto key tops.

Run it from the repo root:

```bash
just viz-dev
```

Build it from the repo root:

```bash
just viz-build
```
