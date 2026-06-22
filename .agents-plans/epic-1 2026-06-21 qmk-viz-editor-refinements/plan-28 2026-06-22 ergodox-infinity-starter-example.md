---
date: 2026-06-22
status: complete
subject: ergodox-infinity-starter-example
---

# Goal

Add the downloaded Input Club Ergodox Infinity qmk-viz project as a shipped starter example.

# Context

The user provided `/Users/nonlogical/Downloads/inputclub-ergodoxinfinity.qmk-viz-project.json` and wants it used as the default Ergodox Infinity setup example. The app already loads every JSON project under `default-projects/` as examples, separate from user projects.

# Product Integration

- Existing product model: starter/example projects are static full project JSON files under `default-projects/`, visible through Project Browser examples and only copied into user projects when selected.
- New requirement's real intent: make the Ergodox Infinity + monster layout available as a first-class template without requiring manual import from Downloads.
- Cleanest integrated model: add a sanitized `default-projects/inputclub-ergodox-infinity.json` starter file and leave example loading code unchanged.
- Existing pieces that should move, change, or disappear: the downloaded project had temporary names/IDs and an `LC1` marker; normalize those for a stable shipped example.
- Architecture impact: data-only starter addition plus log/plan update.
- Why this is better than a local patch: the example stays in the same loader path as all other starter projects and remains separated from localStorage user projects.

# Decisions

- Use deterministic `starter/input-club-ergodox-infinity` IDs and `Input Club Ergodox Infinity` naming.
- Rename the layout to `Monster` because the source setup is the monster keymap.
- Normalize `LC1` to `LC01` across KLE/model/layout/version/template data so the Ergodox macro template matches the model slot IDs.
- Keep the project-specific keymap template from the downloaded file.

# Implementation Steps

1. [x] Generate a sanitized starter project JSON under `default-projects/`.
2. [x] Validate starter import through the app model/build.
3. [x] Verify the Project Browser example list exposes the Ergodox starter.
4. [x] Update `DEVELOPMENT_LOG.md`.
5. [x] Checkpoint the change.

# Learning Log

- The downloaded project was structurally valid, but still had user-upload artifact names (`Uploaded Keyboard`, `keyboard-layout (4).json`) and an `LC1` slot that conflicted with the intended `LC01` marker convention and keymap template.
- Exact-token ID normalization matters for KLE marker IDs. A broad `LC1` replacement created `LC012` from `LC12`; the slot mismatch validator caught this before commit.
- Browser validation should avoid copying examples into localStorage unless the task requires it; checking the Examples list proves the starter is discoverable without mutating user data.

# Work Log

- [x] 2026-06-22 00:17 - Inspected the downloaded project JSON and confirmed it has one layout with BASE, SYMB, and MDIA layers.
- [x] 2026-06-22 00:27 - Generated `default-projects/inputclub-ergodox-infinity.json` with deterministic starter IDs, normalized naming, and `LC01` marker data.
- [x] 2026-06-22 00:32 - Validated JSON shape, slot consistency, stale artifact removal, `npm run build`, and Project Browser example visibility.

# Unfinished Work

N/A
