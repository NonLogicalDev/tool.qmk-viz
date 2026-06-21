---
date: 2026-06-21
status: complete
subject: fold-kle-model-into-projects
---

# Goal

Fold the standalone `KLE Model` page into the `Projects` page so keyboard model management lives with project configuration instead of occupying top-level navigation.

Also keep keyboard viewers as full-width primary page surfaces instead of letting surrounding controls define or constrain the keyboard width.

# Context

The app currently has five top-level pages: `Projects`, `KLE Model`, `Layouts`, `Editor`, and `Export`. The Projects page already renders the associated KLE marker preview and project stats, while the KLE Model page only owns model facts plus KLE upload/download controls. That split is now artificial. The Editor and Layouts pages also need to preserve keyboard views as full-width primary surfaces, with controls below them.

# Product Integration

- Existing product model: top-level nav separates project management, physical keyboard model management, layout management, editing, and export.
- New requirement's real intent: simplify the app mental model by treating the KLE model as project configuration rather than a separate daily workspace, and protect keyboard canvases as the main page surfaces.
- Cleanest integrated model: `Projects` owns project identity, project backup/import, model facts, KLE upload/update/download, project stats, and the marker preview. Top-level nav becomes `Projects -> Layouts -> Editor -> Export`.
- Existing pieces that should move, change, or disappear: remove the `model` app page, move `model-readout` and `keyboard-upload` controls into Projects, keep KLE download available near the marker preview, shrink nav styling from five tabs to four, and keep Editor and Layouts keyboard views full width.
- Architecture impact: update the `AppPage` union and page definitions, remove the `activePage === "model"` JSX branch, and adjust CSS grid assumptions for both nav and the Editor workspace.
- Why this is better than a local patch: it removes a redundant navigation stop and makes model configuration discoverable exactly where users manage keyboard projects.

# Decisions

- Keep `data-testid="model-readout"`, `data-testid="keyboard-upload"`, and `data-testid="download-kle"` so existing validation targets remain stable.
- Keep the marker preview full-width under the project/model cards.
- Do not change project import/export schemas; this is a UI ownership move only.

# Implementation Steps

1. [x] Remove `model` from `AppPage` and the top-level page definitions.
2. [x] Move KLE model facts and KLE upload/download controls into the Projects page.
3. [x] Remove the standalone KLE Model page JSX.
4. [x] Adjust nav/project page styling for the four-page model.
5. [x] Make the Editor keyboard panel a full-width page surface.
6. [x] Make the Layouts keyboard preview a full-width page surface.
7. [x] Update `DEVELOPMENT_LOG.md`.
8. [x] Validate with `just viz-build`, `git diff --check`, and in-app browser checks.
9. [x] Checkpoint the completed pass.

# Learning Log

- KLE model management is project configuration. Keeping it top-level adds a navigation concept without adding a distinct workflow.
- Keyboard editor/viewer surfaces should remain primary full-width page objects; side controls should never determine the keyboard canvas width.

# Work Log

- [x] 2026-06-21 13:09 - Created this plan before source edits.
- [x] 2026-06-21 13:13 - Browser-validated the folded Projects page, then expanded scope to keep the Editor keyboard surface full-width.
- [x] 2026-06-21 13:16 - Made the Editor workspace full-width, validated Projects and Editor in-browser, and updated the development log.
- [x] 2026-06-21 13:18 - Made the Layouts preview the first full-width grid row before controls.

# Unfinished Work

N/A
