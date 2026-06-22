import type { ReactNode } from "react";
import { appPages, type AppPage } from "../lib/appNavigation";

type AppTopbarProps = {
  activePage: AppPage;
  canRedo: boolean;
  canUndo: boolean;
  layoutPicker: ReactNode;
  projectPicker: ReactNode;
  workspaceMenu: ReactNode;
  onPageChange: (page: AppPage) => void;
  onRedo: () => void;
  onUndo: () => void;
};

export function AppTopbar({
  activePage,
  canRedo,
  canUndo,
  layoutPicker,
  projectPicker,
  workspaceMenu,
  onPageChange,
  onRedo,
  onUndo
}: AppTopbarProps) {
  return (
    <header className="app-topbar">
      <div className="brand-lockup">
        <span className="brand-kicker">QMK-VIZ</span>
        <strong>Keymap Studio</strong>
      </div>
      <nav className="app-nav" aria-label="App pages">
        {appPages.map((page) => (
          <button
            aria-current={activePage === page.id ? "page" : undefined}
            className={activePage === page.id ? "active" : ""}
            key={page.id}
            onClick={() => onPageChange(page.id)}
            title={page.description}
            type="button"
          >
            <span>{page.label}</span>
          </button>
        ))}
      </nav>
      <div className="context-strip" aria-label="Current context">
        {projectPicker}
        {layoutPicker}
      </div>
      <div className="history-controls" aria-label="History">
        <button
          aria-label="Undo"
          data-testid="undo-action"
          disabled={!canUndo}
          onClick={onUndo}
          title={canUndo ? "Undo last app change" : "No changes to undo"}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M9 7H5v4" />
            <path d="M5 11c2.2-3.4 5.6-5 9.4-4.2 3.1.6 5.4 3.2 5.6 6.4.2 3.8-2.7 7-6.5 7-2.2 0-4.1-1-5.3-2.6" />
          </svg>
        </button>
        <button
          aria-label="Redo"
          data-testid="redo-action"
          disabled={!canRedo}
          onClick={onRedo}
          title={canRedo ? "Redo app change" : "No changes to redo"}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M15 7h4v4" />
            <path d="M19 11c-2.2-3.4-5.6-5-9.4-4.2-3.1.6-5.4 3.2-5.6 6.4-.2 3.8 2.7 7 6.5 7 2.2 0 4.1-1 5.3-2.6" />
          </svg>
        </button>
        {workspaceMenu}
      </div>
    </header>
  );
}
