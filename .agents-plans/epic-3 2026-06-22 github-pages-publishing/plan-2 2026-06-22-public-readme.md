---
date: 2026-06-22
status: complete
subject: public-readme
---

# Goal

Make the qmk-viz repository README more enticing and useful for new users, and include the provided interface screenshot as a GitHub-rendered example image.

# Context

The previous README was accurate but mostly operational. Now that the repo is public and deployed through GitHub Pages, the README should explain the product value, the local-first model, KLE identifier flow, export formats, and development commands.

# Decisions

- Copy the provided screenshot into `docs/qmk-viz-interface.png` so it renders from GitHub instead of referencing a local filesystem path.
- Keep the README product-facing first and developer-facing second.
- Explain that KLE is the source of truth and qmk-viz reconciles layouts by stable key IDs.
- Highlight both generation paths: built-in template rendering and external generation from exported layout JSON.
- Highlight the full-interface Action Composer as a core product feature, not just an implementation detail.
- Explicitly state that qmk-viz accepts raw Keyboard Layout Editor JSON output files as project keyboard models.
- Add interface copy explaining that KLE stands for Keyboard Layout Editor where users upload/edit models.
- Do not push unless explicitly requested after this checkpoint.

# Implementation Steps

1. [x] Add the screenshot asset to the repo.
2. [x] Rewrite README around the product pitch, screenshot, workflow, exports, and local development commands.
3. [x] Update `DEVELOPMENT_LOG.md`.
4. [x] Validate links/build and create a checkpoint.

# Learning Log

- A GitHub README cannot use the original local screenshot path, so the asset must live in the repo with a stable relative path.
- The README should avoid sounding like an internal implementation log; lead with "what it is" and "why use it."

# Work Log

- [x] 2026-06-22 03:18 - Copied interface screenshot into `docs/qmk-viz-interface.png`.
- [x] 2026-06-22 03:18 - Replaced README with public-facing product documentation.
- [x] 2026-06-22 03:18 - Added Action Composer and custom-template examples to README.
- [x] 2026-06-22 03:18 - Clarified that Keyboard Layout Editor JSON output files are the model input.
- [x] 2026-06-22 03:18 - Added Project page and help modal hints spelling out Keyboard Layout Editor.
- [x] 2026-06-22 03:18 - Verified screenshot path, diff whitespace, and production build.
- [x] 2026-06-22 03:18 - Browser-verified Project page KLE expansion copy.

# Unfinished Work

N/A
