---
date: 2026-06-22
status: in-progress
subject: publish-github-pages
---

# Goal

Publish qmk-viz to `NonLogicalDev/tool.qmk-viz` with an MIT license and a GitHub Actions workflow that deploys the static app to GitHub Pages on every `master` push.

# Context

The repo is currently local-only, on branch `main`, with no remote. GitHub CLI auth is available for `NonLogicalDev` with `repo` and `workflow` scopes. The target repository does not exist yet.

# Product Integration

- Existing product model: qmk-viz is a static Vite app that stores workspace data in `localStorage` and builds to `dist/`.
- New requirement's real intent: make the app public and browsable as a GitHub Pages tool, while preserving local development behavior.
- Cleanest integrated model: keep local `build` unchanged and add `build:pages` plus a dedicated Pages deployment workflow for the repository project URL.
- Existing pieces that should move, change, or disappear: local branch `main` should become `master` because the requested deploy trigger is `master` push.
- Architecture impact: release metadata and CI only; no runtime state/model changes.
- Why this is better than a local patch: publishing becomes repeatable through GitHub Actions instead of depending on manual local `dist/` uploads.

# Decisions

- Use repository name `tool.qmk-viz` under authenticated owner `NonLogicalDev`.
- Use MIT license with copyright holder `NonLogicalDev`.
- Add `npm run build:pages` with Vite base `/tool.qmk-viz/`.
- Trigger Pages deployment on `master` pushes and manual `workflow_dispatch`.

# Implementation Steps

1. [x] Add MIT license and package metadata.
2. [x] Add GitHub Pages workflow and Pages build script.
3. [x] Update README and development log with publish workflow details.
4. [x] Validate local build and Pages build.
5. [ ] Checkpoint local publishing setup.
6. [ ] Create GitHub repo, push `master`, and set remote.
7. [ ] Confirm GitHub Pages workflow/repo configuration.

# Learning Log

- GitHub CLI is authenticated as `NonLogicalDev`; the target repo did not exist before this publish slice.
- `npm install --package-lock-only --ignore-scripts` reported two audit findings, but fixing them would be separate dependency-upgrade work.
- `actions/configure-pages@v5` defaults to `enablement: false`; a new repository needs `enablement: true` or the configure step fails with "Get Pages site failed".

# Work Log

- [x] 2026-06-22 00:25 - Confirmed local repo is clean, has no remote, and GitHub auth is available for `NonLogicalDev`.
- [x] 2026-06-22 00:26 - Added MIT license, Pages workflow, `build:pages`, package metadata, README notes, and development log entry.
- [x] 2026-06-22 00:27 - Validated `git diff --check`, `npm run build`, and `npm run build:pages`.
- [x] 2026-06-22 00:28 - Created `NonLogicalDev/tool.qmk-viz`, pushed `master`, and found the initial Pages run failed before Pages enablement.

# Unfinished Work

- [ ] Push the Pages enablement fix and confirm deployment.
