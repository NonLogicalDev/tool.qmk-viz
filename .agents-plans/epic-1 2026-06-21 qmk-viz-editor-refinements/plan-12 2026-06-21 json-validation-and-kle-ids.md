---
date: 2026-06-21
status: complete
subject: json-validation-and-kle-ids
---

# Goal

Add live JSON/schema validation so users cannot save invalid Project/Layout/KLE JSON, and reject KLE models that contain duplicate key identifiers.

# Context

Project/Layout JSON edit modals already parse JSON on submit, but the user should get immediate feedback and a disabled save action before committing invalid content. KLE import currently builds key slots from KLE legends but silently skips duplicate identifiers, which can hide broken keyboard models.

# Product Integration

- Existing product model: JSON modals are direct editing/import surfaces for app-owned structured data.
- New requirement's real intent: make validation visible and preventative, not just a failed submit toast.
- Cleanest integrated model: centralize validation into modal-level checks that parse JSON and run the same schema/model parsers already used for save/import, then disable save/update buttons until validation passes.
- Existing pieces that should move, change, or disappear: KLE duplicate ID handling should stop deduplicating silently and throw a clear model-validation error.
- Architecture impact: add validation helpers for KLE/project/layout JSON strings, expose validation results in modal UI, disable invalid submit buttons, and update KLE model parsing to reject duplicates.
- Why this is better than a local patch: the validation path matches actual save/import behavior, so the UI cannot say JSON is valid when the real parser would reject it.

# Decisions

- Use the existing import parsers as schema validators rather than maintaining a separate schema definition.
- Show a compact OK/error line inside JSON modals.
- Disable `Save JSON` and `Update KLE` while JSON is invalid or schema checks fail.
- Treat duplicate KLE identifiers as a hard model error, including the duplicated identifier in the message.

# Implementation Steps

1. [x] Reject duplicate KLE key identifiers in `buildKeyboardModelFromKle`.
2. [x] Add modal JSON validation helpers for KLE, Project, and Layout JSON.
3. [x] Render validation state in the JSON modal UI.
4. [x] Disable save/update buttons when validation fails.
5. [x] Update `DEVELOPMENT_LOG.md`.
6. [x] Validate build/browser behavior.
7. [x] Checkpoint.

# Learning Log

- Duplicate KLE identifiers are a model integrity problem. Silently skipping duplicates can make the rendered keyboard appear to work while mappings point at the wrong physical key.
- Parser-backed validation avoids drift between “looks valid” UI state and what the save/import handlers actually accept.

# Work Log

- [x] 2026-06-21 16:19 - Created this plan after the user requested JSON checks and duplicate KLE ID validation.
- [x] 2026-06-21 16:24 - Build and browser validation passed for invalid layout JSON and duplicate KLE ID rejection.

# Unfinished Work

N/A
