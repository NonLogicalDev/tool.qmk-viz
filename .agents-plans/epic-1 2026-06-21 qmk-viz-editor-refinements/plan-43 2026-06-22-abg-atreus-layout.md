---
date: 2026-06-22
status: complete
subject: abg-atreus-layout
---

# Goal

Decode `abhinav/home`'s Chrysalis Atreus config into a Keyboardio-specific Atreus starter variant while preserving the generic 42-key Atreus starter.

# Context

The source config lives at `https://github.com/abhinav/home/blob/master/etc/atreus/config.json`. The local source clone existed at `~/Projects/remote/github.com/abhinav/home`, but `origin/master` had moved, so the conversion should read from `origin/master:etc/atreus/config.json`.

# Decisions

- Keep `default-projects/atreus.json` as the generic 42-key Atreus starter with only its QMK `Default` layout.
- Fork the Keyboardio-specific hardware into `default-projects/keyboardio-atreus.json` instead of stretching the generic Atreus sample.
- Model the two Keyboardio split inner keys as `A42` above `A15` and `A43` above `A36`, yielding 44 KLE identifiers.
- Add `ABG` to the Keyboardio Atreus starter and keep a 44-key `Default` layout there with the extra keys as no-op/transparent placeholders.
- Convert Chrysalis `ShiftTo #N` actions to QMK-style `MO(<layer-name>)`.
- Convert transparent source keys to `KC_TRNS`; blocked source positions remain omitted because they are not physical keys.

# Implementation Steps

1. [x] Fetch the source repo and inspect `origin/master:etc/atreus/config.json`.
2. [x] Inspect the existing qmk-viz Atreus project/layout schema.
3. [x] Build the Chrysalis numeric-code to QMK expression mapping.
4. [x] Create a separate `Keyboardio Atreus` starter with 44 KLE identifiers.
5. [x] Move the decoded `ABG` layout onto the Keyboardio variant and restore generic Atreus to `Default` only.
6. [x] Update `DEVELOPMENT_LOG.md` with the corrected hardware mapping notes.
7. [x] Validate JSON and build.
8. [x] Checkpoint the result.

# Learning Log

- The fetched source config has nine 48-position layers.
- The generic qmk-viz Atreus model exposes 42 slots, while the Keyboardio Atreus source has 44 physical keys plus four blocked matrix positions.
- User clarification: source positions `29` and `30` are real Keyboardio split keys above `A15` and `A36`, not unsupported keys.
- The Keyboardio variant maps source position `29` to `A42` and source position `30` to `A43`. Those restore `` KC_GRV `` / `KC_BSLS` on `BASE` and `KC_VOLU` / `KC_MPLY` on `FUN`.
- Source layers 4-8 contain no usable mappings, so omitting them preserves behavior while avoiding five empty layer tabs in the starter example.
- The bottom-row mapping is not a straight source-order-to-KLE-order mapping; it follows the existing Atreus starter's KLE slot labels so layer shifts, modifiers, space, tab, enter, escape, and backspace stay on matching physical slots.

# Work Log

- [x] 2026-06-22 10:27 - Created the ABG Atreus layout import plan and refreshed the source clone.
- [x] 2026-06-22 10:31 - Decoded the source config into four qmk-viz layers and appended the `ABG` layout to the Atreus starter.
- [x] 2026-06-22 10:34 - Updated the development log with stale-source and unsupported-position notes.
- [x] 2026-06-22 10:34 - Verified all default project JSON parses, `git diff --check` passes, and `npm run build` passes with the existing large-chunk warning.
- [x] 2026-06-22 10:45 - Forked the Keyboardio-specific hardware into a separate 44-key starter and restored the generic Atreus starter to one default layout.

# Unfinished Work

N/A
