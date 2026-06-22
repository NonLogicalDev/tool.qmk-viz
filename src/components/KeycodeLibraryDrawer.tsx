import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  filterKeycodeLibraryEntries,
  keycodeCategories,
  type KeycodeCategory,
  type KeycodeLibraryEntry
} from "../lib/keycodeLibrary";

function keycodesForCategory(category: KeycodeCategory, query: string): KeycodeLibraryEntry[] {
  return filterKeycodeLibraryEntries({ category: category.id, query });
}

async function writeClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function KeycodeLibraryDrawer() {
  const [copiedCode, setCopiedCode] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const categoryGroups = useMemo(() => (
    keycodeCategories.map((category) => ({
      category,
      entries: keycodesForCategory(category, query)
    })).filter((group) => group.entries.length > 0)
  ), [query]);

  const resultCount = categoryGroups.reduce((total, group) => total + group.entries.length, 0);
  const hasQuery = query.trim().length > 0;

  async function copyKeycode(code: string) {
    try {
      await writeClipboard(code);
      setCopiedCode(code);
      toast.success(`Copied ${code}`);
      window.setTimeout(() => {
        setCopiedCode((current) => current === code ? "" : current);
      }, 1400);
    } catch {
      toast.error(`Could not copy ${code}.`);
    }
  }

  return (
    <div className={`keycode-library ${isOpen ? "open" : ""}`}>
      <button
        aria-expanded={isOpen}
        className="keycode-library-trigger"
        data-testid="keycode-library-trigger"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span aria-hidden="true">?</span>
        <strong>Keycodes</strong>
      </button>

      {isOpen && (
        <aside className="keycode-library-drawer" data-testid="keycode-library-drawer" aria-label="QMK keycode library">
          <header className="keycode-library-header">
            <div>
              <p className="eyebrow">QMK reference</p>
              <h2>Keycode library</h2>
            </div>
            <button
              aria-label="Close keycode library"
              className="icon-button"
              data-testid="keycode-library-close"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              ×
            </button>
          </header>

          <label className="keycode-library-search">
            <span>Search keycodes</span>
            <input
              autoComplete="off"
              data-testid="keycode-library-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try key a, volume, print screen..."
              spellCheck={false}
              type="search"
              value={query}
            />
          </label>

          <div className="keycode-library-meta">
            <span>{resultCount} matches</span>
            {hasQuery && (
              <button className="text-action" onClick={() => setQuery("")} type="button">
                Clear
              </button>
            )}
          </div>

          <div className="keycode-category-list">
            {categoryGroups.length > 0 ? (
              categoryGroups.map(({ category, entries }) => (
                <details className="keycode-category" key={category.id} open={hasQuery || category.id === "letters"}>
                  <summary>
                    <span>
                      <strong>{category.label}</strong>
                      <small>{category.description}</small>
                    </span>
                    <b>{entries.length}</b>
                  </summary>
                  <div className="keycode-result-list">
                    {entries.map((entry) => (
                      <article className="keycode-result" key={entry.code}>
                        <div>
                          <code>{entry.code}</code>
                          <strong>{entry.label}</strong>
                          <span>{entry.description}</span>
                        </div>
                        <button
                          className={copiedCode === entry.code ? "action-save" : "action-copy"}
                          data-testid={`copy-keycode-${entry.code}`}
                          onClick={() => void copyKeycode(entry.code)}
                          type="button"
                        >
                          {copiedCode === entry.code ? "Copied" : "Copy"}
                        </button>
                      </article>
                    ))}
                  </div>
                </details>
              ))
            ) : (
              <p className="keycode-library-empty">No keycodes match that search.</p>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
