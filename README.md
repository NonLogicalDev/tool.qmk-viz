# qmk-viz

Vite + TypeScript visual editor for the QMK TSV layout files in this repo.

The first model is `input_club/ergodox_infinity`. It reads:

- `../qmk/keyboards/input_club/ergodox_infinity/keymaps/monster/keyboard-layout.json`
- `../qmk/keyboards/input_club/ergodox_infinity/keymaps/monster/layout_nonlogical-01.tsv`
- `../qmk/keyboards/input_club/ergodox_infinity/keymaps/monster/layout_nonlogical-02.tsv`

Run it from the repo root:

```bash
just viz-dev
```

Export the TSV, save it as `layout_<name>.tsv` in the keymap directory, then run:

```bash
just use-layout <name>
```
