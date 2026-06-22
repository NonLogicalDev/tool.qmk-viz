import type { ReactNode } from "react";
import type { KeyboardModel } from "../lib/keyboardModel";
import { KeyboardModelPreview } from "../components/KeyboardModelPreview";

export type ActiveProjectStats = {
  keyCount: number;
  layoutCount: number;
  versionCount: number;
};

type ProjectPageProps = {
  activeProjectStats: ActiveProjectStats | null;
  createProjectMenu: ReactNode;
  hasActiveProject: boolean;
  model: KeyboardModel | null;
  modelActionsMenu: ReactNode;
  projectActionsMenu: ReactNode;
  projectName: string;
  userProjectCount: number;
  onOpenProjectBrowser: () => void;
  onShowKleHelp: () => void;
};

export function ProjectPage({
  activeProjectStats,
  createProjectMenu,
  hasActiveProject,
  model,
  modelActionsMenu,
  projectActionsMenu,
  projectName,
  userProjectCount,
  onOpenProjectBrowser,
  onShowKleHelp
}: ProjectPageProps) {
  return (
    <section className="page-panel project-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Project</p>
          <h1>{projectName || "No active project"}</h1>
          <p>Configure the active keyboard project here. Use Project Browser when you need to switch projects or load examples.</p>
        </div>
        <div className="page-actions">
          <button className="action-import" data-icon="⌘" data-testid="open-project-browser" onClick={onOpenProjectBrowser} type="button">Project Browser</button>
          {createProjectMenu}
          {projectActionsMenu}
        </div>
      </div>
      <div className="admin-grid project-dashboard-grid">
        <div className="editor-card admin-card active-project-overview-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">Active project</p>
              <h2>{projectName || "No project selected"}</h2>
            </div>
            <span className="metric-pill">{userProjectCount} user projects</span>
          </div>
          {hasActiveProject ? (
            <>
              <dl className="model-facts project-facts" data-testid="active-project-readout">
                <div>
                  <dt>Layouts</dt>
                  <dd>{activeProjectStats?.layoutCount ?? 0}</dd>
                </div>
                <div>
                  <dt>Versions</dt>
                  <dd>{activeProjectStats?.versionCount ?? 0}</dd>
                </div>
                <div>
                  <dt>Keys</dt>
                  <dd>{activeProjectStats?.keyCount ?? 0}</dd>
                </div>
              </dl>
              <p>
                Project navigation is intentionally tucked away now. Browse when switching context; stay here when editing the active project's model and metadata.
              </p>
            </>
          ) : (
            <div className="setup-state-card inline" data-testid="project-page-empty-state">
              <p>No active project. Create a blank project, import a project file from Project Actions, or load an example from Project Browser.</p>
            </div>
          )}
        </div>
        <div className="editor-card admin-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">Keyboard model</p>
              <h2>{model?.name ?? "No KLE model"}</h2>
            </div>
            <span className="metric-pill">{model?.keys.length ?? 0} keys</span>
          </div>
          <dl className="model-facts" data-testid="model-readout">
            <div>
              <dt>Keys</dt>
              <dd>{model?.keys.length ?? 0}</dd>
            </div>
            <div>
              <dt>Canvas</dt>
              <dd>{model ? `${model.width.toFixed(1)}u × ${model.height.toFixed(1)}u` : "Not configured"}</dd>
            </div>
            <div>
              <dt>Author</dt>
              <dd>{model?.author || "Not specified"}</dd>
            </div>
          </dl>
          <p>
            {!hasActiveProject
              ? "Create or import a project before adding a keyboard model."
              : model
              ? "Updating the KLE model is undoable. Existing layout keys survive when their slot IDs still exist in the new KLE file."
              : "This project has no keyboard model yet. Upload a KLE file or edit KLE JSON to define the key IDs."}
          </p>
          <div className="button-row">
            {modelActionsMenu}
            <a className="action-link action-import" data-icon="↗" href="https://www.keyboard-layout-editor.com/#/" rel="noreferrer" target="_blank">Open KLE</a>
            <button className="action-default" data-icon="?" data-testid="kle-help" onClick={onShowKleHelp} type="button">Mapping Help</button>
          </div>
        </div>
        <div className="editor-card admin-card project-model-preview-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">Associated KLE model</p>
              <h2>Marker preview</h2>
            </div>
          </div>
          {model ? (
            <KeyboardModelPreview model={model} />
          ) : (
            <div className="setup-state-card inline" data-testid="project-missing-kle-preview">
              <p>No marker preview until a KLE model is configured.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
