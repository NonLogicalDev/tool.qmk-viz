import { Toaster } from "sonner";
import "sonner/dist/styles.css";
import { AppTopbar } from "./components/AppTopbar";
import { CreateLayoutModal, JsonEditModal, KleHelpModal, RenameModal } from "./components/AppModals";
import { ProjectBrowserModal } from "./components/ProjectBrowserModal";
import { EditorPage } from "./pages/EditorPage";
import { ExportPage } from "./pages/ExportPage";
import { ProjectPage } from "./pages/ProjectPage";
import { useAppWorkspace } from "./hooks/useAppWorkspace";

export function App() {
  const {
    activeKeyboardProject,
    activeKeyboardProjectId,
    activeLayer,
    activeLayoutId,
    activePage,
    activeProjectStats,
    activeSavedLayout,
    availableLayouts,
    canRedo,
    canUndo,
    closeActionMenus,
    closeProjectBrowser,
    copyJson,
    copyKeymap,
    createBlankKeyboardProject,
    createLayoutNameDraft,
    deleteKeyboardProject,
    downloadActiveLayerKle,
    downloadFullProject,
    downloadJson,
    downloadKeymap,
    downloadProjectKle,
    downloadWorkspaceBackup,
    duplicateKeyboardProject,
    exampleProjects,
    exportPreviewTab,
    importFullProject,
    jsonEditDialog,
    jsonEditValidation,
    keyboardProjectNameDraft,
    keyboardProjects,
    keymapTemplateDraft,
    layoutNameDraft,
    layoutPickerOptions,
    loadExampleProject,
    loadKeyboardProject,
    loadLayout,
    model,
    openJsonEditDialog,
    openLayoutRenameDialog,
    openProjectBrowser,
    openProjectRenameDialog,
    projectBrowserItems,
    projectBrowserPageCount,
    projectBrowserTab,
    projectPickerOptions,
    projectSearchDraft,
    redoApp,
    renderedKeymap,
    renderedKeymapHasError,
    renderActionMenu,
    renderContextPicker,
    renameDialog,
    restoreWorkspace,
    runMenuAction,
    safeProjectBrowserPage,
    setActivePage,
    setCreateLayoutNameDraft,
    setExportPreviewTab,
    setJsonEditDialog,
    setKeymapTemplateDraft,
    setProjectBrowserPage,
    setProjectBrowserTab,
    setProjectSearchDraft,
    setRenameDialog,
    setShowKleHelp,
    setStatusMessage,
    showKleHelp,
    showProjectBrowser,
    submitCreateLayoutDialog,
    submitJsonEditDialog,
    submitRenameDialog,
    undoApp,
    updateActiveKeyboardModel,
    visibleProjectBrowserItems,
    jsonOutput
  } = useAppWorkspace({ enableGlobalEffects: true });

  return (
    <main className={`app-shell page-${activePage}`}>
      <Toaster closeButton position="bottom-right" richColors />
      <AppTopbar
        activePage={activePage}
        canRedo={canRedo}
        canUndo={canUndo}
        layoutPicker={renderContextPicker({
          id: "top-layout",
          label: "Layout",
          value: activeLayoutId,
          emptyLabel: "No layouts",
          choices: layoutPickerOptions,
          disabled: !activeKeyboardProject || availableLayouts.length === 0,
          onSelect: (value) => {
            if (value !== activeLayoutId) {
              loadLayout(value);
            }
          },
          triggerTestId: "top-layout-picker-trigger",
          searchTestId: "top-layout-picker-search",
          optionTestId: "top-layout-picker-option"
        })}
        projectPicker={renderContextPicker({
          id: "top-project",
          label: "Project",
          value: activeKeyboardProjectId,
          emptyLabel: "No user projects",
          choices: projectPickerOptions,
          disabled: keyboardProjects.length === 0,
          onSelect: (value) => {
            if (value !== activeKeyboardProjectId) {
              loadKeyboardProject(value);
            }
          },
          triggerTestId: "top-project-picker-trigger",
          searchTestId: "top-project-picker-search",
          optionTestId: "top-project-picker-option"
        })}
        workspaceMenu={renderActionMenu("workspace-actions", "Workspace", (
          <>
            <button className="action-export" data-icon="⇡" data-testid="backup-workspace" onClick={() => runMenuAction(downloadWorkspaceBackup)} role="menuitem" type="button">Backup Workspace</button>
            <label className="file-import action-import" data-icon="⇣" role="menuitem" title="Restore a full qmk-viz workspace backup">
              Restore Workspace
              <input
                data-testid="workspace-restore-upload"
                accept="application/json,.json"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void restoreWorkspace(file).catch((error: unknown) => {
                      setStatusMessage(error instanceof Error ? error.message : "Failed to restore workspace backup.");
                    });
                  }
                  closeActionMenus();
                  event.target.value = "";
                }}
                type="file"
              />
            </label>
          </>
        ), { icon: "▦" })}
        onPageChange={setActivePage}
        onRedo={redoApp}
        onUndo={undoApp}
      />

      {activePage === "editor" && <EditorPage />}

      {activePage === "projects" && (
        <ProjectPage
          activeProjectStats={activeProjectStats}
          createProjectMenu={renderActionMenu("create-project-actions", "Create Project", (
            <>
              <button className="action-create" data-icon="+" data-testid="new-project" onClick={() => runMenuAction(createBlankKeyboardProject)} role="menuitem" type="button">Blank Project</button>
              <button className="action-default" data-icon="★" data-testid="new-project-from-example" onClick={() => runMenuAction(() => openProjectBrowser("examples"))} role="menuitem" type="button">From Example</button>
            </>
          ), { className: "action-create", icon: "+", testId: "create-project-menu" })}
          hasActiveProject={Boolean(activeKeyboardProject)}
          model={model}
          modelActionsMenu={renderActionMenu("model-actions", "KLE model", (
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
          onOpenProjectBrowser={() => openProjectBrowser("projects")}
          onShowKleHelp={() => setShowKleHelp(true)}
          projectActionsMenu={renderActionMenu("project-actions", "Project actions", (
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
          projectName={keyboardProjectNameDraft}
          userProjectCount={keyboardProjects.length}
        />
      )}

      {activePage === "export" && (
        <ExportPage
          activeTab={exportPreviewTab}
          canCopyKeymap={Boolean(model && activeSavedLayout && !renderedKeymapHasError)}
          canExport={Boolean(model && activeSavedLayout)}
          downloadsMenu={renderActionMenu("export-downloads", "Downloads", (
            <>
              <button className="action-export" data-icon="⇡" data-testid="download-keymap" disabled={!model || !activeSavedLayout || renderedKeymapHasError} onClick={() => runMenuAction(downloadKeymap)} role="menuitem" type="button">Keymap C</button>
              <button className="action-export" data-icon="⇡" data-testid="download-layout-json" disabled={!model || !activeSavedLayout} onClick={() => runMenuAction(downloadJson)} role="menuitem" type="button">Layout JSON</button>
              <button className="action-export" data-icon="⇡" data-testid="download-layer-kle" disabled={!model || !activeSavedLayout} onClick={() => runMenuAction(downloadActiveLayerKle)} role="menuitem" type="button">Layer KLE</button>
              <button className="action-export" data-icon="⇡" data-testid="download-project-kle" disabled={!model} onClick={() => runMenuAction(downloadProjectKle)} role="menuitem" type="button">Project KLE</button>
            </>
          ), { className: "action-export", icon: "⇡" })}
          jsonOutput={jsonOutput}
          layoutName={layoutNameDraft}
          onCopyJson={copyJson}
          onCopyKeymap={copyKeymap}
          onPreviewTabChange={setExportPreviewTab}
          onTemplateChange={setKeymapTemplateDraft}
          projectName={keyboardProjectNameDraft}
          renderedKeymap={renderedKeymap}
          renderedKeymapHasError={renderedKeymapHasError}
          template={keymapTemplateDraft}
        />
      )}

      {showProjectBrowser && (
        <ProjectBrowserModal
          activeProjectId={activeKeyboardProjectId}
          exampleProjectCount={exampleProjects.length}
          items={visibleProjectBrowserItems}
          page={safeProjectBrowserPage}
          pageCount={projectBrowserPageCount}
          searchDraft={projectSearchDraft}
          tab={projectBrowserTab}
          totalResults={projectBrowserItems.length}
          userProjectCount={keyboardProjects.length}
          onClose={closeProjectBrowser}
          onNextPage={() => setProjectBrowserPage((page) => Math.min(projectBrowserPageCount - 1, page + 1))}
          onPreviousPage={() => setProjectBrowserPage((page) => Math.max(0, page - 1))}
          onSearchChange={(value) => {
            setProjectSearchDraft(value);
            setProjectBrowserPage(0);
          }}
          onSelectExample={loadExampleProject}
          onSelectProject={(id) => {
            loadKeyboardProject(id);
            closeProjectBrowser();
          }}
          onTabChange={(nextTab) => {
            setProjectBrowserTab(nextTab);
            setProjectBrowserPage(0);
          }}
        />
      )}

      {jsonEditDialog && (
        <JsonEditModal
          dialog={jsonEditDialog}
          validation={jsonEditValidation}
          onChange={(value) => setJsonEditDialog((current) => (
            current ? { ...current, value } : current
          ))}
          onClose={() => setJsonEditDialog(null)}
          onSubmit={submitJsonEditDialog}
        />
      )}

      {createLayoutNameDraft !== null && (
        <CreateLayoutModal
          value={createLayoutNameDraft}
          onChange={setCreateLayoutNameDraft}
          onClose={() => setCreateLayoutNameDraft(null)}
          onSubmit={submitCreateLayoutDialog}
        />
      )}

      {showKleHelp && (
        <KleHelpModal onClose={() => setShowKleHelp(false)} />
      )}

      {renameDialog && (
        <RenameModal
          dialog={renameDialog}
          onChange={(value) => setRenameDialog((current) => (
            current ? { ...current, value } : current
          ))}
          onClose={() => setRenameDialog(null)}
          onSubmit={submitRenameDialog}
        />
      )}
    </main>
  );
}
