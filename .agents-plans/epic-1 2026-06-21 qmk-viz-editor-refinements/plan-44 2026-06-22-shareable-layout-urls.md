---
date: 2026-06-22
status: complete
subject: shareable-layout-urls
---

# Goal

Allow users to share the currently viewed qmk-viz layout by URL, encoding only the active project context plus the current layout/version snapshot.

# Context

qmk-viz is localStorage-first and already supports full project/workspace JSON export. The new behavior should be link-based and useful on GitHub Pages without requiring a backend.

# Product Integration

- Existing product model: local projects are private browser state, exports are explicit downloads/copies.
- New requirement's real intent: send someone a self-contained view/editable copy of one layout without sending the whole workspace or every layout/version.
- Cleanest integrated model: a share URL is an import format embedded in the hash route, creating a local copy of one project with one layout and one current version.
- Existing pieces that should move, change, or disappear: reuse existing project parsing/normalization instead of adding a parallel share-only model.
- Architecture impact: add small share encode/decode helpers and one global load effect; expose a Copy Share URL action near existing export actions.
- Why better than local patch: keeps URL sharing aligned with existing project import semantics and avoids leaking unrelated layouts/versions.

# Decisions

- Share URLs encode a full `qmk-viz-project` file containing the keyboard model, template, default layout, and exactly one active layout.
- The shared layout carries exactly one version snapshot: the currently active saved version name when available, with the current unsaved editor document as its document.
- Opening a share URL imports a fresh local copy with new IDs, selects it, navigates to the Layout page, then removes the `share` parameter from the URL.
- URL payloads use gzip when `CompressionStream` is available and fall back to raw JSON base64url so local tests and older browsers still work.

# Implementation Steps

1. [x] Inspect current export, project import, and router state flow.
2. [x] Add share payload encode/decode helpers.
3. [x] Wire Copy Share URL into Export actions.
4. [x] Wire share URL import into the app global effects.
5. [x] Update development log.
6. [x] Validate JSON/share helpers and build.
7. [x] Checkpoint the result.

# Learning Log

- The current `projectWithEditorState()` path already centralizes unsaved editor state into a `SavedKeyboardProject`; share URLs should build from that to include unsaved key edits.
- Encoding only the layout JSON would not be enough for a recipient because qmk-viz also needs the KLE model to render and edit the layout.
- TypeScript requires a concrete `ArrayBuffer` when writing into `CompressionStream`; copied bytes avoid the `ArrayBufferLike` mismatch.

# Work Log

- [x] 2026-06-22 11:18 - Created the shareable layout URL plan after inspecting routing/export/store structure.
- [x] 2026-06-22 11:24 - Added share URL encode/decode helpers, Export page Copy Share URL, and hash-route import flow.
- [x] 2026-06-22 11:28 - Verified `npm run build` passes after fixing the CompressionStream typing issue.
- [x] 2026-06-22 11:31 - Verified `git diff --check`, `npm run build`, and `npm run build:pages` pass before checkpointing.

# Unfinished Work

N/A
