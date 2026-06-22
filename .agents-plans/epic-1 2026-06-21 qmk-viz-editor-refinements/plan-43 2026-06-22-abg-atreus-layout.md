---
date: 2026-06-22
status: complete
subject: abg-atreus-layout
---

# Goal

Add an `ABG` layout to the Atreus starter example by decoding `abhinav/home`'s Chrysalis Atreus config.

# Context

The source config lives at `https://github.com/abhinav/home/blob/master/etc/atreus/config.json`. The local source clone existed at `~/Projects/remote/github.com/abhinav/home`, but `origin/master` had moved, so the conversion should read from `origin/master:etc/atreus/config.json`.

# Decisions

- Keep the existing Atreus KLE model as the source of available qmk-viz slots.
- Add `ABG` as a second named layout inside `default-projects/atreus.json` rather than creating a new project.
- Convert Chrysalis `ShiftTo #N` actions to QMK-style `MO(<layer-name>)`.
- Convert transparent source keys to `KC_TRNS`, blocked/missing keys to omission or `KC_NO` depending on whether the target slot exists.
- Record any source keys that cannot map to the current 42-slot Atreus KLE model.

# Implementation Steps

1. [x] Fetch the source repo and inspect `origin/master:etc/atreus/config.json`.
2. [x] Inspect the existing qmk-viz Atreus project/layout schema.
3. [x] Build the Chrysalis numeric-code to QMK expression mapping.
4. [x] Append the decoded `ABG` layout to `default-projects/atreus.json`.
5. [x] Update `DEVELOPMENT_LOG.md` with conversion notes and what did not map cleanly.
6. [x] Validate JSON and build.
7. [x] Checkpoint the result.

# Learning Log

- The fetched source config has nine 48-position layers.
- The current qmk-viz Atreus model exposes 42 slots.
- The source includes four blocked positions in the upper rows. Additional source positions need explicit mapping decisions because the source appears to represent more usable positions than the current Atreus KLE model exposes.
- The current Atreus KLE matches 42 source positions if source positions `29` and `30` are treated as unsupported. Those dropped positions are `` KC_GRV `` and `KC_BSLS` on `BASE`, and `KC_VOLU` and `KC_MPLY` on `FUN`.
- Source layers 4-8 contain no usable mappings, so omitting them preserves behavior while avoiding five empty layer tabs in the starter example.
- The bottom-row mapping is not a straight source-order-to-KLE-order mapping; it follows the existing Atreus starter's KLE slot labels so layer shifts, modifiers, space, tab, enter, escape, and backspace stay on matching physical slots.

# Work Log

- [x] 2026-06-22 10:27 - Created the ABG Atreus layout import plan and refreshed the source clone.
- [x] 2026-06-22 10:31 - Decoded the source config into four qmk-viz layers and appended the `ABG` layout to the Atreus starter.
- [x] 2026-06-22 10:34 - Updated the development log with stale-source and unsupported-position notes.
- [x] 2026-06-22 10:34 - Verified all default project JSON parses, `git diff --check` passes, and `npm run build` passes with the existing large-chunk warning.

# Unfinished Work

N/A
