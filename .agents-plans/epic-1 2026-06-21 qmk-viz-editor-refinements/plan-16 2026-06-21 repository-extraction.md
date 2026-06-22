---
date: 2026-06-21
status: complete
subject: repository-extraction
---

# Goal

Extract qmk-viz from the `nonlogical-keyboards` repository into its own local repository while preserving qmk-viz history and moving the qmk-viz agent plans with it.

# Context

qmk-viz started inside a broader keyboard firmware/config repository. It has become its own static Vite app with starter project JSON, localStorage project management, and qmk-viz-specific development history. The split should not rewrite or damage the source repository.

# Product Integration

- Existing product model: qmk-viz is a standalone static web app, but it physically lived under a parent repository subdirectory.
- New requirement's real intent: make qmk-viz a first-class local project with its own root, history, plans, build commands, and starter data.
- Cleanest integrated model: clone the parent repo, filter only qmk-viz-owned paths in the clone, rewrite `qmk-viz/` to repository root, and then repair root-relative paths.
- Existing pieces that should move, change, or disappear: qmk-viz source, `default-projects/`, qmk-viz plans, and `DEVELOPMENT_LOG.md` move into the new repo; parent-repo QMK firmware files do not.
- Architecture impact: Vite import paths and local build commands become root-relative to the new repository.
- Why this is better than a local patch: the app no longer depends on the parent firmware repository layout and can be developed or published independently.

# Decisions

- Run `git filter-repo` only in a cloned repository at the new path, never in the source checkout.
- Preserve qmk-viz plans under `.agents-plans/` instead of moving them into a new ad hoc folder.
- Keep `just viz-build` and `just viz-dev` as compatibility aliases, while documenting `just build` and `just dev` as the new root commands.
- Keep `DEVELOPMENT_LOG.md` with qmk-viz and rewrite stale subdirectory file paths to root-relative paths.
- Delete the stale `src/models/ergodoxInfinity.ts` module because it imported a KLE JSON from the old parent repo's `qmk/` tree and is no longer used by the app.

# Implementation Steps

1. [x] Verify the source repository tracked state before cloning.
2. [x] Clone the source repository to the new local project path.
3. [x] Run `git filter-repo` only in the clone.
4. [x] Keep qmk-viz source, `default-projects/`, `.agents-plans/`, and `DEVELOPMENT_LOG.md`.
5. [x] Rewrite `qmk-viz/` paths to repository root.
6. [x] Fix root-relative starter project imports.
7. [x] Add root `.gitignore` and root `Justfile`.
8. [x] Validate build from the new repository root.
9. [x] Checkpoint the new repository.

# Learning Log

- `git-filter-repo` removes the clone's `origin` remote after filtering; that is expected and prevents accidental pushes to the source repository.
- The starter-project glob moved from `../../../default-projects/*.json` to `../../default-projects/*.json` because `src/lib/appModel.ts` is now two levels below the repository root, not three levels below the parent repository root.
- TypeScript compiles all included source files, so unused source modules with stale imports still break the standalone build.

# Work Log

- [x] 2026-06-21 19:25 - Created the repository extraction plan after filtering the qmk-viz clone and repairing root-level paths.
- [x] 2026-06-21 19:25 - Removed the stale Ergodox parent-repo import, validated `just build`, and prepared the split checkpoint.

# Unfinished Work

N/A
