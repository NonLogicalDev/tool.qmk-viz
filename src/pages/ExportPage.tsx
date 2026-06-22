import type { ReactNode } from "react";
import MonacoEditor from "@monaco-editor/react";
import { useAppWorkspace } from "../hooks/useAppWorkspace";

export type ExportPreviewTab = "keymap" | "json";

type KeymapTemplateEditorProps = {
  projectName: string;
  template: string;
  onTemplateChange: (value: string) => void;
};

type ExportPreviewPanelProps = {
  activeTab: ExportPreviewTab;
  jsonOutput: string;
  renderedKeymap: string;
  renderedKeymapHasError: boolean;
  onPreviewTabChange: (tab: ExportPreviewTab) => void;
};

type ExportActionBarProps = {
  canExport: boolean;
  canCopyKeymap: boolean;
  canShare: boolean;
  layoutName: string;
  downloadsMenu: ReactNode;
  onCopyJson: () => void;
  onCopyKeymap: () => void;
  onCopyShareUrl: () => void;
};

function KeymapTemplateEditor({ projectName, template, onTemplateChange }: KeymapTemplateEditorProps) {
  return (
    <div className="editor-card export-card template-card">
      <div className="section-header">
        <div>
          <p className="eyebrow">Template source</p>
          <h2>{projectName || "No project"} / keymap.c</h2>
        </div>
        <span className="metric-pill">Project saved</span>
      </div>
      <div className="template-help-strip">
        <code>{"{{ ctx.layout.name }}"}</code>
        <code>{"{% for layer in ctx.layout.layers %}"}</code>
        <code>{"{% for slot, code in layer.keys %}"}</code>
        <span>{"Context is `{ \"ctx\": Full Layout JSON }`."}</span>
      </div>
      <div className="monaco-shell" data-testid="keymap-template-editor">
        <MonacoEditor
          height="430px"
          language="c"
          theme="vs-dark"
          value={template}
          onChange={(value) => onTemplateChange(value ?? "")}
          options={{
            automaticLayout: true,
            fontFamily: "'CommitMono', 'JetBrains Mono', monospace",
            fontSize: 12,
            minimap: { enabled: false },
            overviewRulerBorder: false,
            padding: { top: 10, bottom: 10 },
            scrollBeyondLastLine: false,
            tabSize: 4,
            wordWrap: "off"
          }}
        />
      </div>
      <p>
        The template is stored in the active project JSON. Use Nunjucks/Jinja-style variables and loops over `ctx`, the same JSON you can download from this page.
      </p>
    </div>
  );
}

function ExportPreviewPanel({
  activeTab,
  jsonOutput,
  renderedKeymap,
  renderedKeymapHasError,
  onPreviewTabChange
}: ExportPreviewPanelProps) {
  return (
    <div className="editor-card export-card output-card">
      <div className="section-header">
        <div>
          <p className="eyebrow">Rendered preview</p>
          <h2>{activeTab === "keymap" ? "keymap.c" : "Full Layout JSON"}</h2>
        </div>
        <span className={`metric-pill ${renderedKeymapHasError ? "error" : ""}`}>{renderedKeymapHasError ? "Template error" : "Live"}</span>
      </div>
      <div className="export-preview-tabs" role="tablist" aria-label="Export preview type">
        <button
          className={activeTab === "keymap" ? "active" : ""}
          data-testid="export-preview-keymap"
          onClick={() => onPreviewTabChange("keymap")}
          role="tab"
          aria-selected={activeTab === "keymap"}
          type="button"
        >
          Rendered keymap.c
        </button>
        <button
          className={activeTab === "json" ? "active" : ""}
          data-testid="export-preview-json"
          onClick={() => onPreviewTabChange("json")}
          role="tab"
          aria-selected={activeTab === "json"}
          type="button"
        >
          Full Layout JSON
        </button>
      </div>
      <pre className={`export-preview ${renderedKeymapHasError && activeTab === "keymap" ? "error" : ""}`} data-testid="export-preview-output">
        <code>{activeTab === "keymap" ? renderedKeymap : jsonOutput}</code>
      </pre>
    </div>
  );
}

function ExportActionBar({
  canExport,
  canCopyKeymap,
  canShare,
  layoutName,
  downloadsMenu,
  onCopyJson,
  onCopyKeymap,
  onCopyShareUrl
}: ExportActionBarProps) {
  return (
    <div className="export-action-bar" data-testid="export-action-bar">
      <div>
        <strong>{layoutName || "No layout"}</strong>
        <span>{canExport ? "Ready to export" : "Project, KLE model, and layout required"}</span>
      </div>
      <div className="button-row">
        <button className="action-copy" data-icon="⧉" data-testid="copy-json" disabled={!canExport} onClick={onCopyJson} type="button">Copy Layout JSON</button>
        <button className="action-copy" data-icon="⧉" data-testid="copy-keymap" disabled={!canCopyKeymap} onClick={onCopyKeymap} type="button">Copy Keymap</button>
        <button className="action-copy" data-icon="@" data-testid="copy-share-url" disabled={!canShare} onClick={onCopyShareUrl} type="button">Copy Share URL</button>
        {downloadsMenu}
      </div>
    </div>
  );
}

export function ExportPage() {
  const {
    activeSavedLayout,
    copyJson,
    copyKeymap,
    copyShareUrl,
    downloadActiveLayerKle,
    downloadJson,
    downloadKeymap,
    downloadProjectKle,
    exportPreviewTab,
    jsonOutput,
    keyboardProjectNameDraft,
    keymapTemplateDraft,
    layoutNameDraft,
    model,
    renderedKeymap,
    renderedKeymapHasError,
    renderActionMenu,
    runMenuAction,
    setExportPreviewTab,
    setKeymapTemplateDraft
  } = useAppWorkspace();
  const canExport = Boolean(model && activeSavedLayout);

  return (
    <section className="page-panel export-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Export</p>
          <h1>Keymap template</h1>
          <p>Author a project-level Jinja-style template, render it against the active layout, then copy or download the generated `keymap.c`.</p>
        </div>
      </div>
      <div className="export-workspace-grid">
        <KeymapTemplateEditor
          projectName={keyboardProjectNameDraft}
          template={keymapTemplateDraft}
          onTemplateChange={setKeymapTemplateDraft}
        />
        <ExportPreviewPanel
          activeTab={exportPreviewTab}
          jsonOutput={jsonOutput}
          renderedKeymap={renderedKeymap}
          renderedKeymapHasError={renderedKeymapHasError}
          onPreviewTabChange={setExportPreviewTab}
        />
      </div>
      <ExportActionBar
        canCopyKeymap={canExport && !renderedKeymapHasError}
        canExport={canExport}
        canShare={canExport}
        downloadsMenu={renderActionMenu("export-downloads", "Downloads", (
          <>
            <button className="action-export" data-icon="⇡" data-testid="download-keymap" disabled={!model || !activeSavedLayout || renderedKeymapHasError} onClick={() => runMenuAction(downloadKeymap)} role="menuitem" type="button">Keymap C</button>
            <button className="action-export" data-icon="⇡" data-testid="download-layout-json" disabled={!model || !activeSavedLayout} onClick={() => runMenuAction(downloadJson)} role="menuitem" type="button">Layout JSON</button>
            <button className="action-export" data-icon="⇡" data-testid="download-layer-kle" disabled={!model || !activeSavedLayout} onClick={() => runMenuAction(downloadActiveLayerKle)} role="menuitem" type="button">Layer KLE</button>
            <button className="action-export" data-icon="⇡" data-testid="download-project-kle" disabled={!model} onClick={() => runMenuAction(downloadProjectKle)} role="menuitem" type="button">Project KLE</button>
          </>
        ), { className: "action-export", icon: "⇡" })}
        layoutName={layoutNameDraft}
        onCopyJson={copyJson}
        onCopyKeymap={copyKeymap}
        onCopyShareUrl={() => { void copyShareUrl(); }}
      />
    </section>
  );
}
