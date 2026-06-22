---
date: 2026-06-21
status: complete
subject: edit-kle-json
---

# Goal

Make KLE JSON editing match Project/Layout JSON editing: open the current KLE JSON in an edit modal, validate live, then Save or Close.

# Context

Project and Layout JSON already use edit/save modals. KLE still uses a paste-only modal, which is inconsistent and prevents users from inspecting or tweaking the active model JSON in place.

# Product Integration

- Existing product model: JSON edit modals expose app-owned structured data for inspection and replacement.
- New requirement's real intent: KLE should be editable in the same direct, validated way as Project/Layout JSON.
- Cleanest integrated model: add `kle` as a third `JsonEditKind`, prefill it from `serializeKeyboardModelKle(model)`, validate with `buildKeyboardModelFromKle`, and save through the existing KLE update/reconcile path.
- Existing pieces that should move, change, or disappear: the separate paste-only KLE modal should disappear.
- Architecture impact: remove KLE-specific paste dialog state/submit/modal and reuse the JSON edit modal for KLE.
- Why this is better than a local patch: one JSON editor model reduces duplicated validation and makes the three JSON surfaces behave consistently.

# Decisions

- Keep file upload as `Upload/Update KLE` for adding JSON from disk.
- Use `Edit KLE JSON` for inline inspection/editing of the current KLE model.
- Reuse duplicate identifier validation from `buildKeyboardModelFromKle`.

# Implementation Steps

1. [x] Add `kle` to `JsonEditKind` and labels.
2. [x] Prefill KLE editor with current serialized KLE.
3. [x] Validate KLE edits with the real keyboard model builder.
4. [x] Save KLE edits through the existing KLE model update path.
5. [x] Remove the old paste-only KLE dialog path.
6. [x] Update `DEVELOPMENT_LOG.md`.
7. [x] Validate build/browser behavior.
8. [x] Checkpoint.

# Learning Log

- KLE is app-owned model JSON once imported; editing it should be a replacement workflow, not a blank paste workflow.
- Reusing the JSON edit modal is cleaner than maintaining KLE-specific paste state because KLE validation is just another parser/model-builder check.

# Work Log

- [x] 2026-06-21 17:03 - Created this plan after the user asked for KLE to use a similar edit workflow.
- [x] 2026-06-21 17:13 - Added KLE to the shared JSON edit modal, removed the old paste-only path, and validated duplicate identifier handling in the browser.

# Unfinished Work

N/A
