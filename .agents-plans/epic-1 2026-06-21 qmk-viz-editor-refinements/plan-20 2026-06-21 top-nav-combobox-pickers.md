---
date: 2026-06-21
status: complete
subject: top-nav-combobox-pickers
---

# Goal

Replace native top-nav Project/Layout selects with compact custom dropdown pickers that support optional filtering and keyboard navigation.

# Context

The current top context fields use native `<select>` controls. They work, but they cannot filter and do not match the intended custom result-list behavior:

```text
[optional search]
Result <auto selected>
Result
Result
```

# Product Integration

- Existing product model: the top bar owns global Project/Layout selection across Project, Layout, and Export pages.
- New requirement's real intent: make active Project/Layout switching searchable and keyboard-friendly without moving the control out of the top nav.
- Cleanest integrated model: a small shared top-nav combobox helper for Project and Layout options, with one open picker at a time.
- Existing pieces that should move, change, or disappear: remove native select UI from the context strip while preserving the same `loadKeyboardProject` and `loadLayout` behavior.
- Architecture impact: local React state for open picker, search text, highlighted result index, and shared keyboard handlers.
- Why this is better than a library here: the scope is narrow, avoids adding another dependency, and keeps styling/behavior aligned with the existing compact action-menu system.

# Decisions

- Implement locally instead of adding a dropdown library.
- Always show a search field when a picker is open.
- Arrow Up/Down moves the highlighted result.
- Enter selects the highlighted result.
- Escape closes the picker.
- Outside click closes the picker.
- The currently selected Project/Layout is marked with a check.

# Implementation Steps

1. [x] Add shared combobox state and render helper.
2. [x] Replace top native selects with custom Project/Layout pickers.
3. [x] Add filtering and keyboard navigation.
4. [x] Add compact combobox styling.
5. [x] Update `DEVELOPMENT_LOG.md`.
6. [x] Build and browser-validate mouse + keyboard flows.
7. [x] Checkpoint.

# Learning Log

- The top context controls are state selectors, not action menus. Keeping them as dedicated listbox popovers avoids mixing command-menu affordances with project/layout selection.
- Opening a picker with the first filtered result highlighted matches the requested result-list model and keeps Enter useful immediately after filtering.
- Selecting the already-active Project/Layout now only closes the picker instead of reloading the same workspace.

# Work Log

- [x] 2026-06-21 21:25 - Created top-nav combobox picker plan after the user requested custom filtered dropdowns with keyboard navigation.
- [x] 2026-06-21 21:33 - Implemented top-nav custom Project/Layout pickers with search, highlighted results, keyboard selection, Escape close, and compact styling.
- [x] 2026-06-21 21:33 - Validated `npm run build` and in-app browser keyboard flows for filter+Enter, ArrowDown+Enter, Escape, and Layout picker open.
- [x] 2026-06-21 21:33 - Marked the plan ready for checkpoint after verification.

# Unfinished Work

N/A
