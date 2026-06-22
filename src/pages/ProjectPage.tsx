import { KeyboardModelPreview } from "../components/KeyboardModelPreview";
import { useAppWorkspace } from "../hooks/useAppWorkspace";

export function ProjectPage() {
  const {
    activeKeyboardProject,
    activeProjectStats,
    closeActionMenus,
    createBlankKeyboardProject,
    deleteKeyboardProject,
    downloadFullProject,
    downloadProjectKle,
    duplicateKeyboardProject,
    importFullProject,
    keyboardProjectNameDraft,
    keyboardProjects,
    model,
    openJsonEditDialog,
    openProjectBrowser,
    openProjectRenameDialog,
    renderActionMenu,
    runMenuAction,
    setShowKleHelp,
    setStatusMessage,
    updateActiveKeyboardModel
  } = useAppWorkspace();
  const hasActiveProject = Boolean(activeKeyboardProject);
  const projectName = keyboardProjectNameDraft;
  const userProjectCount = keyboardProjects.length;

  return (
    <section className="page-panel project-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Project</p>
          <h1>{projectName || "No active project"}</h1>
          <p>Configure the active keyboard project here. Use Project Browser when you need to switch projects or load examples.</p>
        </div>
        <div className="page-actions">
          <button className="action-import" data-icon="⌘" data-testid="open-project-browser" onClick={() => openProjectBrowser("projects")} type="button">Project Browser</button>
          {renderActionMenu("create-project-actions", "Create Project", (
            <>
              <button className="action-create" data-icon="+" data-testid="new-project" onClick={() => runMenuAction(createBlankKeyboardProject)} role="menuitem" type="button">Blank Project</button>
              <button className="action-default" data-icon="★" data-testid="new-project-from-example" onClick={() => runMenuAction(() => openProjectBrowser("examples"))} role="menuitem" type="button">From Example</button>
            </>
          ), { className: "action-create", icon: "+", testId: "create-project-menu" })}
          {renderActionMenu("project-actions", "Project actions", (
            <>
              <button className="action-rename" data-icon="✎" data-testid="rename-project" disabled={!activeKeyboardProject} onClick={() => runMenuAction(openProjectRenameDialog)} role="menuitem" type="button">Rename Project</button>
              <button className="action-copy" data-icon="⧉" data-testid="duplicate-project" disabled={!activeKeyboardProject} onClick={() => runMenuAction(duplicateKeyboardProject)} role="menuitem" type="button">Duplicate Project</button>
              <label className="file-import action-import" data-icon="⇣" role="menuitem" title="Import a full qmk-viz project JSON backup">
                Import Project
                <input
                  data-testid="project-upload"
                  accept="application/json,.json"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void importFullProject(file).catch((error: unknown) => {
                        setStatusMessage(error instanceof Error ? error.message : "Failed to import project JSON.");
                      });
                    }
                    closeActionMenus();
                    event.target.value = "";
                  }}
                  type="file"
                />
              </label>
              <button className="action-rename" data-icon="{}" data-testid="edit-project-json" disabled={!activeKeyboardProject} onClick={() => runMenuAction(() => openJsonEditDialog("project"))} role="menuitem" type="button">Edit Project JSON</button>
              <button className="action-export" data-icon="⇡" data-testid="download-project" disabled={!activeKeyboardProject} onClick={() => runMenuAction(downloadFullProject)} role="menuitem" type="button">Download Project</button>
              <button className="danger-button action-danger" data-icon="!" data-testid="delete-project" disabled={!activeKeyboardProject} onClick={() => runMenuAction(deleteKeyboardProject)} role="menuitem" type="button">Delete Project</button>
            </>
          ), { testId: "project-actions-menu" })}
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
            {renderActionMenu("model-actions", "KLE model", (
              <>
                <label
                  aria-disabled={!activeKeyboardProject}
                  className={`file-import action-import ${!activeKeyboardProject ? "disabled" : ""}`}
                  data-icon="⇣"
                  role="menuitem"
                  title={activeKeyboardProject ? "Upload or replace the active project's KLE JSON model" : "Create or import a project before uploading KLE"}
                >
                  Upload/Update KLE
                  <input
                    data-testid="keyboard-upload"
                    accept="application/json,.json"
                    disabled={!activeKeyboardProject}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void updateActiveKeyboardModel(file).catch((error: unknown) => {
                          setStatusMessage(error instanceof Error ? error.message : "Failed to update KLE JSON.");
                        });
                      }
                      closeActionMenus();
                      event.target.value = "";
                    }}
                    type="file"
                  />
                </label>
                <button className="action-rename" data-icon="{}" data-testid="edit-kle-json" disabled={!activeKeyboardProject} onClick={() => runMenuAction(() => openJsonEditDialog("kle"))} role="menuitem" type="button">Edit KLE JSON</button>
                <button className="action-export" data-icon="⇡" data-testid="download-kle" disabled={!model} onClick={() => runMenuAction(downloadProjectKle)} role="menuitem" type="button">Download KLE</button>
              </>
            ), { disabled: !activeKeyboardProject && !model, testId: "model-actions-menu" })}
            <a className="action-link action-import" data-icon="↗" href="https://www.keyboard-layout-editor.com/#/" rel="noreferrer" target="_blank">Open KLE</a>
            <button className="action-default" data-icon="?" data-testid="kle-help" onClick={() => setShowKleHelp(true)} type="button">Mapping Help</button>
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
