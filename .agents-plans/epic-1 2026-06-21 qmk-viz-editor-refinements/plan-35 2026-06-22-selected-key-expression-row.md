---
date: 2026-06-22
status: complete
subject: selected-key-expression-row
---

# Goal

Reshape the Selected Key card into the requested compact two-row pattern:

```text
|Selected Key:                         Key $ID / $LAYER|
|[EXPR ......]  [Edit]|
```

Then make `Edit` switch the expression from read-only display into edit mode, where the action area becomes `Cancel` plus `Save`, and make the card span the full editor row.

Finally, replace the inline validation sentence with validation-colored expression input outlines.

Also ensure recognized stock QMK keycodes and layout-local support identifiers get the green validation outline, and put the Action Composer generated-helper sentence on its own line above action buttons.

Model the Layout page header after the Project page header: no duplicate layout picker, page-heading structure, and page-level layout actions.

Remove sticky UI behavior so controls remain in document flow while scrolling.

# Context

The previous compact row still exposed separate cells for key id, layer/current action, raw label, and apply button. The user wants one header line for identity and one expression-editing row.

# Decisions

- Keep the expression input bound to the current raw mapping.
- Keep the expression input read-only until `Edit` is clicked.
- In edit mode, expose `Cancel` and `Save`; `Cancel` restores the current mapping without writing.
- Put `Key <slot> / <layer>` in the top-right header.
- Avoid extra labels and preview duplication inside Selected Key.
- Let Selected Key occupy the full editor-panel width above the heavier composer/support sections.
- Show expression validation state through the input border instead of a text paragraph.
- Treat recognized stock keycodes, known composition expressions, and layout support identifiers as green/valid.
- Keep Action Composer helper copy on a separate line from the action buttons.
- Interpret "model after project page" as a verb: make the Layout page follow the Project page pattern, not add a separate Model page.
- Avoid sticky UI; layer tabs and export actions should scroll normally with the page.

# Implementation Steps

1. [x] Replace the Selected Key JSX with a compact header plus expression row.
2. [x] Replace the old selected-key CSS with two-row styling.
3. [x] Add read-only/edit-mode behavior with `Edit`, `Cancel`, and `Save`.
4. [x] Make Selected Key span the full editor-panel row.
5. [x] Move expression validation from inline text to input outline styling.
6. [x] Mark recognized keycodes and layout support identifiers green.
7. [x] Put Action Composer generated-helper copy on its own line.
8. [x] Model the Layout page header after the Project page and remove the duplicate layout picker.
9. [x] Validate build and in-app browser geometry/text.
10. [x] Remove remaining sticky UI rules.
11. [x] Update `DEVELOPMENT_LOG.md`.
12. [x] Create a local checkpoint without pushing.

# Learning Log

- The Selected Key expression should display the live `currentAction` outside edit mode, not a stale draft buffer.
- Validation text inside the compact Selected Key card adds noise; green/red input outlines preserve the signal without consuming a row.
- Plain recognized keycodes need explicit validation because `describeAction()` previously only validated parsed function expressions.
- "Model after Project page" was a wording ambiguity; the correct product fix is to mirror Project page structure on Layout, not create a Model nav page.

# Work Log

- [x] 2026-06-22 02:38 - Created plan for the Selected Key expression-row redesign.
- [x] 2026-06-22 02:42 - Added read-only/edit-mode behavior and full-row placement.
- [x] 2026-06-22 02:44 - Replaced inline selected-key validation text with validation input outlines.
- [x] 2026-06-22 02:46 - Added green validation for recognized keycodes/support identifiers and moved generated-helper copy to its own row.
- [x] 2026-06-22 02:53 - Removed the duplicate Active Layout dropdown and reshaped Layout header after Project page.
- [x] 2026-06-22 02:54 - Restored Project model/KLE content after rejecting the accidental separate Model page interpretation.
- [x] 2026-06-22 02:55 - Browser-validated Layout header, Project model sections, and right-aligned composer helper row.
- [x] 2026-06-22 02:56 - Removed sticky positioning from layer tabs and export action bar.
- [x] 2026-06-22 02:57 - `rg` confirmed no sticky CSS remains; `git diff --check` and `npm run build` passed.

# Unfinished Work

N/A
