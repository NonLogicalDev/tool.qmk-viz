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
    activeLayoutId,
    activePage,
    availableLayouts,
    canRedo,
    canUndo,
    closeActionMenus,
    closeProjectBrowser,
    createLayoutNameDraft,
    downloadWorkspaceBackup,
    exampleProjects,
    jsonEditDialog,
    jsonEditValidation,
    keyboardProjects,
    layoutPickerOptions,
    loadExampleProject,
    loadKeyboardProject,
    loadLayout,
    projectBrowserItems,
    projectBrowserPageCount,
    projectBrowserTab,
    projectPickerOptions,
    projectSearchDraft,
    redoApp,
    renderActionMenu,
    renderContextPicker,
    renameDialog,
    restoreWorkspace,
    runMenuAction,
    safeProjectBrowserPage,
    setActivePage,
    setCreateLayoutNameDraft,
    setJsonEditDialog,
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
    visibleProjectBrowserItems,
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

      {activePage === "projects" && <ProjectPage />}

      {activePage === "export" && <ExportPage />}

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
