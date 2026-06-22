---
date: 2026-06-22
status: complete
subject: derived-keyboard-geometry
---

# Goal

Remove baked keyboard geometry from serialized keyboard/project specs. KLE remains the source of truth for physical layout, while stage size, display unit, and padding are computed dynamically from parsed KLE key positions.

# Context

The Ergodox Infinity starter project currently stores derived model fields:

- `width`
- `height`
- `unit`
- `padding`
- `paddingX`
- `paddingY`

Those values should not be project data. They are rendering concerns and must be derived from the KLE/key model every time.

The Projects page marker preview also still fails to snap/fit correctly past roughly 1252px screen width. That preview should size from the actual container and derived KLE geometry, not from baked model fields or a fixed upper scale that leaves the large Ergodox preview too small or incorrectly bounded.

# Product Integration

- Existing product model: project files stored a keyboard model containing KLE metadata, parsed key slots, and render-stage geometry.
- New requirement's real intent: keep project JSON canonical and portable by making KLE the only physical-layout source of truth.
- Cleanest integrated model: serialize keyboard models as identity/source/KLE only, keep parsed keys as runtime-only data, introduce derived geometry/stage helpers for editor/preview rendering, and normalize old imports by rebuilding from KLE.
- Existing pieces that should move, change, or disappear: remove geometry fields from `KeyboardModel`, starter JSON, project exports, and layout-version keyboard snapshots; move geometry consumption to a computed view helper.
- Architecture impact: rendering components and workspace sizing need to call the derived helper; JSON import/export paths should continue accepting old files.
- Why this is better than a local patch: removing the fields from the type prevents future one-off starter specs from reintroducing stale dimensions.

# Decisions

- Do not store display unit or stage padding in keyboard model JSON.
- Keep key dimensions/positions on individual parsed keys at runtime only; project/workspace JSON stores KLE instead.
- Keep old project files readable by ignoring any legacy geometry fields and rebuilding models from `kle`.
- Share the editor stage size/scale helper with the Project page marker preview so preview scaling matches editor scaling exactly.

# Implementation Steps

1. [x] Add a derived keyboard geometry helper in `src/lib/keyboardModel.ts`.
2. [x] Update editor, preview, and project stats to consume derived geometry.
3. [x] Remove persisted geometry fields from default starter project JSON.
4. [x] Update development log with what changed and what did not work.
5. [x] Fix and validate Projects page marker preview sizing around and above 1252px width.
6. [x] Validate build and serialized starter data.
7. [x] Checkpoint and push the fix.

# Learning Log

- The bug is architectural, not Ergodox-specific: render-stage geometry was part of `KeyboardModel`, so any project export could persist stale computed values.
- The Projects page preview has a second UI-level symptom: it still needs responsive width validation at the container breakpoint where the Ergodox marker preview stops fitting correctly.
- The Project preview spill past 1252px was caused by preview-only `margin: 0 auto` on `.model-marker-stage`. The editor stage does not auto-center the transformed stage; removing that rule makes the preview use the editor behavior exactly.
- LocalStorage persistence also needed explicit serialization; otherwise runtime-only parsed `keys` could still be saved even after exported project files were fixed.

# Work Log

- [x] 2026-06-22 00:36 - Confirmed `KeyboardModel` stores derived geometry and preview/editor/project stats read it directly.
- [x] 2026-06-22 00:42 - User reported the Projects page KLE marker preview still does not snap correctly past about 1252px viewport width.
- [x] 2026-06-22 00:48 - Added runtime-only keyboard geometry and shared editor/preview stage scaling helpers.
- [x] 2026-06-22 00:52 - Removed serialized model geometry and parsed keys from starter project JSON, project exports, workspace exports, and localStorage persistence.
- [x] 2026-06-22 00:56 - Browser-validated Ergodox Project marker preview at 1252px, 1440px, and 1600px with stage/scaler contained and no horizontal page overflow.
- [x] 2026-06-22 00:58 - Validated `git diff --check`, `npm run build`, `npm run build:pages`, starter model invariant script, and source leak search.

# Unfinished Work

N/A
