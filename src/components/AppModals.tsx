import type { FormEvent } from "react";
import type { JsonEditDialog, JsonEditKind, RenameDialog } from "../stores/appStore";

type JsonValidation = {
  ok: boolean;
  message: string;
};

export type ConfirmationDialogView = {
  eyebrow: string;
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "danger" | "warning";
};

const jsonEditLabels: Record<JsonEditKind, { eyebrow: string; title: string; help: string }> = {
  project: {
    eyebrow: "Project JSON",
    title: "Edit current project JSON",
    help: "Save replaces the active project with the edited qmk-viz project JSON."
  },
  layout: {
    eyebrow: "Layout JSON",
    title: "Edit current layout JSON",
    help: "Save replaces the active layout document with the edited layout JSON and preserves its version tree."
  },
  kle: {
    eyebrow: "KLE JSON",
    title: "Edit current KLE JSON",
    help: "Save replaces the active keyboard model, reconciles matching key IDs, and keeps the project name unchanged."
  }
};

type JsonEditModalProps = {
  dialog: JsonEditDialog;
  validation: JsonValidation;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function JsonEditModal({ dialog, validation, onChange, onClose, onSubmit }: JsonEditModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="rename-modal paste-json-modal"
        aria-labelledby="edit-json-modal-title"
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
      >
        <div className="section-header">
          <div>
            <p className="eyebrow">{jsonEditLabels[dialog.kind].eyebrow}</p>
            <h2 id="edit-json-modal-title">{jsonEditLabels[dialog.kind].title}</h2>
          </div>
        </div>
        <label>
          JSON
          <textarea
            autoFocus
            data-testid="edit-json-input"
            value={dialog.value}
            onChange={(event) => onChange(event.target.value)}
            spellCheck={false}
          />
        </label>
        <p className="modal-help">{jsonEditLabels[dialog.kind].help}</p>
        <p
          aria-live="polite"
          className={`action-validation ${validation.ok ? "ok" : "warning"}`}
          data-testid="edit-json-validation"
        >
          {validation.message}
        </p>
        <div className="button-row rename-modal-actions">
          <button
            className="action-save"
            data-icon="✓"
            data-testid="save-edit-json"
            disabled={!validation.ok}
            type="submit"
          >
            Save JSON
          </button>
          <button className="action-disable" data-icon="×" data-testid="close-edit-json" onClick={onClose} type="button">Close</button>
        </div>
      </form>
    </div>
  );
}

type ConfirmationModalProps = {
  dialog: ConfirmationDialogView;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmationModal({ dialog, onCancel, onConfirm }: ConfirmationModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className={`rename-modal confirmation-modal confirmation-modal-${dialog.tone ?? "warning"}`}
        aria-labelledby="confirmation-modal-title"
        role="dialog"
        aria-modal="true"
      >
        <div className="section-header">
          <div>
            <p className="eyebrow">{dialog.eyebrow}</p>
            <h2 id="confirmation-modal-title">{dialog.title}</h2>
          </div>
        </div>
        <p className="modal-help confirmation-message">{dialog.message}</p>
        <div className="button-row rename-modal-actions">
          <button
            autoFocus
            className={dialog.tone === "danger" ? "danger-button action-danger" : "action-save"}
            data-icon={dialog.tone === "danger" ? "!" : "✓"}
            data-testid="confirm-dialog-confirm"
            onClick={onConfirm}
            type="button"
          >
            {dialog.confirmLabel}
          </button>
          <button className="action-disable" data-icon="×" data-testid="confirm-dialog-cancel" onClick={onCancel} type="button">Cancel</button>
        </div>
      </section>
    </div>
  );
}

type CreateLayoutModalProps = {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function CreateLayoutModal({ value, onChange, onClose, onSubmit }: CreateLayoutModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="rename-modal"
        aria-labelledby="create-layout-modal-title"
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
      >
        <div className="section-header">
          <div>
            <p className="eyebrow">Create layout</p>
            <h2 id="create-layout-modal-title">Layout name</h2>
          </div>
        </div>
        <label>
          Name
          <input
            autoFocus
            data-testid="create-layout-modal-input"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            spellCheck={false}
          />
        </label>
        <div className="button-row rename-modal-actions">
          <button className="action-create" data-icon="+" type="submit">Create Layout</button>
          <button className="action-disable" data-icon="×" onClick={onClose} type="button">Cancel</button>
        </div>
      </form>
    </div>
  );
}

type SaveKeyAliasModalProps = {
  expression: string;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function SaveKeyAliasModal({ expression, value, onChange, onClose, onSubmit }: SaveKeyAliasModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="rename-modal save-alias-modal"
        aria-labelledby="save-key-alias-modal-title"
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
      >
        <div className="section-header">
          <div>
            <p className="eyebrow">Save key alias</p>
            <h2 id="save-key-alias-modal-title">Name this QMK expression</h2>
          </div>
        </div>
        <label>
          Alias name
          <input
            autoFocus
            data-testid="save-key-alias-name"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="ALIAS_CUSTOM"
            spellCheck={false}
          />
        </label>
        <div className="modal-expression-preview">
          <span>Expression</span>
          <code data-testid="save-key-alias-expression">{expression}</code>
        </div>
        <p className="modal-help">Aliases are saved with the active layout and exported for keymap templates.</p>
        <div className="button-row rename-modal-actions">
          <button className="action-save" data-icon="✓" data-testid="confirm-save-key-alias" type="submit">Save Key Alias</button>
          <button className="action-disable" data-icon="×" data-testid="cancel-save-key-alias" onClick={onClose} type="button">Cancel</button>
        </div>
      </form>
    </div>
  );
}

type KleHelpModalProps = {
  onClose: () => void;
};

export function KleHelpModal({ onClose }: KleHelpModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="rename-modal kle-help-modal"
        aria-labelledby="kle-help-title"
        role="dialog"
        aria-modal="true"
      >
        <div className="section-header">
          <div>
            <p className="eyebrow">KLE mapping help</p>
            <h2 id="kle-help-title">How qmk-viz reads Keyboard Layout Editor JSON</h2>
          </div>
        </div>
        <div className="help-content">
          <p>
            qmk-viz uses Keyboard Layout Editor geometry as the source of truth for key placement.
            Each physical key must expose one stable mapping identifier.
          </p>
          <ol>
            <li>Create or edit a layout at <a href="https://www.keyboard-layout-editor.com/#/" rel="noreferrer" target="_blank">keyboard-layout-editor.com</a>.</li>
            <li>Put the qmk-viz slot ID in the center legend entry for every key you want to edit, for example <code>LT00</code>, <code>RT03</code>, <code>LC21</code>, or <code>K42</code>.</li>
            <li>Keep each identifier unique. Duplicate IDs are rejected because one keymap slot cannot point at two physical keys.</li>
            <li>Decorative labels can be omitted; the app renders actions from your layout JSON after the KLE model is uploaded.</li>
            <li>If you update the KLE later, layouts survive for matching identifiers and orphaned slots are dropped during reconciliation.</li>
          </ol>
        </div>
        <div className="button-row rename-modal-actions">
          <a className="action-link action-import" data-icon="↗" href="https://www.keyboard-layout-editor.com/#/" rel="noreferrer" target="_blank">Open KLE Website</a>
          <button className="action-disable" data-icon="×" onClick={onClose} type="button">Close</button>
        </div>
      </section>
    </div>
  );
}

type RenameModalProps = {
  dialog: RenameDialog;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function RenameModal({ dialog, onChange, onClose, onSubmit }: RenameModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="rename-modal"
        aria-labelledby="rename-modal-title"
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
      >
        <div className="section-header">
          <div>
            <p className="eyebrow">Rename {dialog.kind}</p>
            <h2 id="rename-modal-title">
              {dialog.kind === "project" ? "Project name" : "Layout name"}
            </h2>
          </div>
        </div>
        <label>
          Name
          <input
            autoFocus
            data-testid="rename-modal-input"
            value={dialog.value}
            onChange={(event) => onChange(event.target.value)}
            spellCheck={false}
          />
        </label>
        <div className="button-row rename-modal-actions">
          <button className="action-rename" data-icon="✎" type="submit">
            Rename {dialog.kind === "project" ? "Project" : "Layout"}
          </button>
          <button className="action-disable" data-icon="×" onClick={onClose} type="button">Cancel</button>
        </div>
      </form>
    </div>
  );
}
