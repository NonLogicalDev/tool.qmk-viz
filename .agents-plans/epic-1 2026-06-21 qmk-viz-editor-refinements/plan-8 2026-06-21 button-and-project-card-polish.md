---
date: 2026-06-21
status: complete
subject: button-and-project-card-polish
---

# Goal

Normalize qmk-viz button styling, improve the Projects page stats/model cards, and include the source KLE document in the active layout JSON export.

# Context

Button styling has drifted across `.page-actions`, `.button-row`, `.generated`, `.raw-input-row`, file labels, tabs, and project-stat buttons. Some controls are large pill-like actions while others are tiny, and primary styling is sometimes based on DOM position. The Projects page also has a bulky project-stats button list, and the keyboard model card spends space on a low-value source filename. Separately, the active layout JSON export currently includes derived keyboard geometry but not the original KLE document used to build that geometry.

# Product Integration

- Existing product model: qmk-viz is now organized into Projects, Layouts, Editor, and Export, with keyboard viewers as full-width primary surfaces.
- New requirement's real intent: make the control system feel deliberate and compact, make project metadata easier to scan, and make exported layout JSON more self-contained.
- Cleanest integrated model: define a shared compact button baseline with small semantic variants; make project stats read as a compact stat panel rather than a fake project-switching table; make keyboard model facts show useful dimensions/counts instead of source filename; embed canonical KLE in the layout export.
- Existing pieces that should move, change, or disappear: remove position-based primary button styling where practical, align file labels/buttons with the same size language, restyle `.project-stat-list`, remove source from `model-facts`, and extend `KeymapExport.keyboard`.
- Architecture impact: mostly CSS and small JSX/export type changes; no storage or import schema changes.
- Why this is better than a local patch: it reduces visual inconsistency at the shared control layer and makes the export more durable without adding another page or flow.

# Decisions

- Use one compact button baseline for ordinary buttons and file-import labels.
- Keep tab-like controls visually distinct, but align their font sizing/radius with the baseline.
- Project stats should stay clickable for project switching but read like compact stat cards.
- Remove `Source` from the model facts card; keep dimensions, author, and key count.
- Add `keyboard.kle` to layout JSON export so generated layout files carry the original KLE document; omit the derived `keyboard.keys` array to avoid duplicate geometry sources.
- Keep project backup as one `Download Project` button beside `Import Project`; do not maintain a separate backup card or duplicate backup action.

# Implementation Steps

1. [x] Create shared compact button CSS variables/baseline.
2. [x] Apply baseline to page actions, button rows, generated/raw controls, and file-import labels.
3. [x] Restyle project stats into a cleaner compact stat panel.
4. [x] Remove the low-value source filename from the keyboard model card.
5. [x] Add canonical KLE to the active layout JSON export.
6. [x] Update `DEVELOPMENT_LOG.md`.
7. [x] Validate with `just viz-build`, `git diff --check`, and in-app browser checks.
8. [x] Checkpoint the completed pass.

# Learning Log

- Button semantics should come from classes or context, not DOM position. Positional primary styling makes unrelated controls look important just because they are first.
- Layout JSON should carry the original KLE document, not derived geometry, because KLE is the user-editable keyboard model artifact and derived key placement can be rebuilt from it.
- A backup flow should have one obvious primary location. Putting full-project download beside project import makes the import/export pair legible and avoids turning project settings into a repeated backup panel.

# Work Log

- [x] 2026-06-21 13:23 - Created this plan after identifying button drift, weak Projects stats, useless source-name display, and missing KLE in layout JSON.
- [x] 2026-06-21 13:31 - Implemented compact button styling, cleaner project stats/model facts, single project backup action, and `keyboard.kle` layout JSON export.
- [x] 2026-06-21 13:32 - Removed redundant `keyboard.keys` from layout JSON export after adding canonical KLE.
- [x] 2026-06-21 13:35 - Updated `DEVELOPMENT_LOG.md`; validated with `just viz-build`, `git diff --check`, source scans, and in-app browser checks.
- [x] 2026-06-21 13:36 - Prepared the completed slice for checkpoint.

# Unfinished Work

N/A
