---
date: 2026-06-22
status: complete
subject: hash-router-pages
---

# Goal

Add TanStack Router with hash routing so qmk-viz can link directly to app pages and reload without always returning to the editor.

# Context

The app currently stores `activePage` in Zustand and initializes it from project availability. This means reloads and shared links lose the visible page. GitHub Pages also needs hash routing or equivalent static fallback behavior.

# Decisions

- Use `@tanstack/react-router` with hash history.
- Keep the existing `activePage` store for components that already consume it, but make the route path the page source on load/navigation.
- Support stable page hashes for `/project`, `/layout`, and `/export`.
- Preserve existing workflow calls that move the user to Project/Layout by making top-level page changes navigate through the router.
- No push unless explicitly requested.

# Implementation Steps

1. [x] Add TanStack Router dependency.
2. [x] Create hash router route definitions for Project, Layout, and Export.
3. [x] Wrap the app with `RouterProvider`.
4. [x] Route top-nav page changes through router navigation.
5. [x] Keep Zustand `activePage` synchronized with the route.
6. [x] Validate build and browser deep-link/reload behavior.
7. [x] Update `DEVELOPMENT_LOG.md`.
8. [x] Create a local checkpoint without pushing.

# Learning Log

- TanStack Router v1.170.16 exports `createHashHistory`, `createRouter`, `createRootRoute`, `createRoute`, `Navigate`, and `RouterProvider` from `@tanstack/react-router`.
- Store-level `setActivePage(...)` still matters because existing workflows use it; making that setter update `window.location.hash` keeps those workflows aligned with the router.
- The root hash route should redirect to `/layout`, preserving the existing "layout editor is the main workspace" behavior without overriding explicit `#/project` or `#/export` links.
- `npm install` reported 2 audit findings; no force fix was run because that would be unrelated dependency churn.

# Work Log

- [x] 2026-06-22 03:07 - Created plan for hash-routed app pages.
- [x] 2026-06-22 03:08 - Installed `@tanstack/react-router`.
- [x] 2026-06-22 03:12 - Added hash route tree, `RouterProvider`, routed page outlet, and active-page/hash synchronization.
- [x] 2026-06-22 03:14 - Browser-validated `#/export` reload retention, top-nav `#/project`, direct `#/layout`, and root `#/` redirect.
- [x] 2026-06-22 03:15 - `git diff --check`, `npm run build`, and `npm run build:pages` passed before checkpointing.

# Unfinished Work

N/A
