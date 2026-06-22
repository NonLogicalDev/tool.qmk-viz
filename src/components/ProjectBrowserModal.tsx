import type { SavedKeyboardProject } from "../lib/appModel";

export type ProjectBrowserTab = "projects" | "examples";

export type ProjectBrowserItem = {
  id: string;
  name: string;
  layoutCount: number;
  versionCount: number;
  keyCount: number;
  project: SavedKeyboardProject;
  source: ProjectBrowserTab;
};

type ProjectBrowserModalProps = {
  activeProjectId: string;
  exampleProjectCount: number;
  items: ProjectBrowserItem[];
  page: number;
  pageCount: number;
  searchDraft: string;
  tab: ProjectBrowserTab;
  totalResults: number;
  userProjectCount: number;
  onClose: () => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onSearchChange: (value: string) => void;
  onSelectExample: (project: SavedKeyboardProject) => void;
  onSelectProject: (id: string) => void;
  onTabChange: (tab: ProjectBrowserTab) => void;
};

export function ProjectBrowserModal({
  activeProjectId,
  exampleProjectCount,
  items,
  page,
  pageCount,
  searchDraft,
  tab,
  totalResults,
  userProjectCount,
  onClose,
  onNextPage,
  onPreviousPage,
  onSearchChange,
  onSelectExample,
  onSelectProject,
  onTabChange
}: ProjectBrowserModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="rename-modal project-browser-modal"
        aria-labelledby="project-browser-title"
        role="dialog"
        aria-modal="true"
      >
        <div className="section-header">
          <div>
            <p className="eyebrow">Project Browser</p>
            <h2 id="project-browser-title">Switch projects or load examples</h2>
          </div>
          <button className="action-disable" data-icon="×" data-testid="close-project-browser" onClick={onClose} type="button">Close</button>
        </div>
        <div className="project-browser-tabs" role="tablist" aria-label="Project browser sections">
          <button
            className={tab === "projects" ? "active" : ""}
            data-testid="project-browser-tab-projects"
            onClick={() => onTabChange("projects")}
            role="tab"
            aria-selected={tab === "projects"}
            type="button"
          >
            My Projects <span>{userProjectCount}</span>
          </button>
          <button
            className={tab === "examples" ? "active" : ""}
            data-testid="project-browser-tab-examples"
            onClick={() => onTabChange("examples")}
            role="tab"
            aria-selected={tab === "examples"}
            type="button"
          >
            Examples <span>{exampleProjectCount}</span>
          </button>
        </div>
        <label className="project-browser-search">
          Search
          <input
            autoFocus
            data-testid="project-browser-search"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={tab === "projects" ? "Filter user projects" : "Filter starter templates"}
            value={searchDraft}
          />
        </label>
        <div className="project-browser-list" data-testid="project-browser-list">
          {items.length > 0 ? items.map((item) => {
            const isActiveProject = item.source === "projects" && item.id === activeProjectId;
            return (
              <button
                className={`project-browser-row ${isActiveProject ? "active" : ""}`.trim()}
                data-testid={item.source === "projects" ? "project-browser-project" : "project-browser-example"}
                key={`${item.source}-${item.id}`}
                onClick={() => {
                  if (item.source === "projects") {
                    onSelectProject(item.id);
                  } else {
                    onSelectExample(item.project);
                  }
                }}
                type="button"
              >
                <span className="project-browser-row-main">
                  <strong>{item.name}</strong>
                  <em>{isActiveProject ? "active" : item.source === "examples" ? "example" : "project"}</em>
                </span>
                <span className="project-browser-row-metrics">
                  <span>{item.layoutCount} layouts</span>
                  <span>{item.versionCount} versions</span>
                  <span>{item.keyCount} keys</span>
                </span>
              </button>
            );
          }) : (
            <div className="empty-support-data" data-testid="project-browser-empty">
              {tab === "projects"
                ? "No user projects match. Create a project or import one from Project Actions."
                : "No examples match that search."}
            </div>
          )}
        </div>
        <div className="project-browser-footer">
          <span>{totalResults} results / page {page + 1} of {pageCount}</span>
          <div className="button-row">
            <button
              className="action-move"
              data-icon="←"
              data-testid="project-browser-prev"
              disabled={page <= 0}
              onClick={onPreviousPage}
              type="button"
            >
              Previous
            </button>
            <button
              className="action-move"
              data-icon="→"
              data-testid="project-browser-next"
              disabled={page >= pageCount - 1}
              onClick={onNextPage}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
