import { useEffect, useMemo, useState } from "react";

import { describeAction, isRecognizedKeycode } from "../lib/actions";
import { selectedKeycode, TRANSPARENT } from "../lib/keymap";
import { type SimpleComposerKind } from "../lib/qmkActions";
import { fitPrimaryKeyLabel, fitSecondaryKeyLabel } from "../lib/textFit";
import { KeycodeLibraryDrawer } from "../components/KeycodeLibraryDrawer";
import { LayoutVersionTree } from "../components/LayoutVersionTree";
import { PreviewKeycap, actionTypeLabel } from "../components/PreviewKeycap";
import { SaveKeyAliasModal } from "../components/AppModals";
import { danceBehaviorFields, layerPalette, simpleKeycodeMods, toggleSimpleKeycodeModifier } from "../lib/editorConfig";
import { useAppWorkspace } from "../hooks/useAppWorkspace";

export function EditorPage() {
  const [isEditingSelectedKey, setIsEditingSelectedKey] = useState(false);
  const {
    keyboardViewportRef,
    activeKeyboardProject,
    activeLayerName,
    activeLayoutId,
    activeSavedLayout,
    activeLayoutVersion,
    availableLayouts,
    model,
    layoutNameDraft,
    layerNameDraft,
    layers,
    activeLayer,
    activeLayerIndex,
    layerColorMap,
    keyboardGeometry,
    keyboardVisualSize,
    keyboardStageSize,
    keyboardScale,
    selectedSlot,
    swapSourceSlot,
    copiedKeyAction,
    selectedKey,
    currentAction,
    draftAction,
    draftDetails,
    captureTarget,
    composerMode,
    syncComposerWithSelection,
    showSaveAliasDialog,
    generatedAction,
    simpleKind,
    simpleComposerPickerOptions,
    simpleAction,
    simpleKeycodeModifiers,
    simpleKeycode,
    simpleRawAction,
    modTapModifier,
    modTapPickerOptions,
    composerLayerPickerOptions,
    simpleLayer,
    behaviorSlots,
    danceName,
    danceComposition,
    extraKeyNameDraft,
    danceRows,
    macroRows,
    customKeycodeRows,
    aliasRows,
    editingDanceName,
    danceDraftName,
    danceDraftSlots,
    editingExtKeyName,
    extKeyDraft,
    versionNameDraft,
    selectedVersionNameDraft,
    renderContextPicker,
    renderActionMenu,
    runMenuAction,
    openCreateLayoutDialog,
    duplicateLayout,
    uploadLayout,
    setStatusMessage,
    closeActionMenus,
    openJsonEditDialog,
    downloadJson,
    openLayoutRenameDialog,
    saveCurrentLayoutAsDefault,
    deleteLayout,
    createBlankKeyboardProject,
    setActivePage,
    setActiveLayerName,
    setSwapSourceSlot,
    setLayerNameDraft,
    renameActiveLayer,
    addLayer,
    moveActiveLayer,
    removeActiveLayer,
    setActiveLayerColor,
    handleKeyClick,
    handleKeyDragStart,
    handleKeyDragOver,
    handleKeyDrop,
    handleKeyDragEnd,
    setDraftAction,
    writeAction,
    setCaptureTarget,
    cancelKeySwap,
    startKeySwap,
    copySelectedKeyAction,
    pasteCopiedKeyAction,
    setSyncComposerWithSelection,
    setComposerMode,
    setShowSaveAliasDialog,
    setSimpleKind,
    setSimpleRawAction,
    setSimpleKeycodeModifiers,
    setSimpleKeycode,
    setModTapModifier,
    setSimpleLayer,
    updateBehaviorSlot,
    setDanceName,
    setExtraKeyNameDraft,
    openSaveAliasDialog,
    submitSaveAliasDialog,
    copyGeneratedAction,
    applyGeneratedAction,
    startNewDance,
    setDanceDraftName,
    setDanceDraftSlots,
    saveDanceDraft,
    setEditingDanceName,
    startEditDance,
    deleteDance,
    startNewExtKey,
    setExtKeyDraft,
    saveExtKeyDraft,
    setEditingExtKeyName,
    startEditExtKey,
    deleteExtKey,
    setVersionNameDraft,
    saveLayoutVersion,
    setSelectedVersionNameDraft,
    renameActiveVersion,
    deleteActiveVersion,
    loadLayoutVersion,
  } = useAppWorkspace({ enableEditorEffects: true });
  const keyboardUnit = keyboardGeometry?.unit ?? 60;
  const keyboardPaddingX = keyboardGeometry?.paddingX ?? 0;
  const keyboardPaddingY = keyboardGeometry?.paddingY ?? 0;
  const supportIdentifierNames = useMemo(() => {
    return new Set([
      ...aliasRows.map((key) => key.name),
      ...customKeycodeRows.map((key) => key.name),
      ...macroRows.map((key) => key.name),
      ...danceRows.map(([name]) => name)
    ].map((name) => name.trim()).filter(Boolean));
  }, [aliasRows, customKeycodeRows, danceRows, macroRows]);
  const selectedExpressionValue = isEditingSelectedKey ? draftAction : currentAction;
  const selectedExpressionDetails = describeAction(selectedExpressionValue);
  const selectedExpressionValidationLevel = selectedExpressionDetails.validation?.level ??
    (supportIdentifierNames.has(selectedExpressionValue.trim()) || isRecognizedKeycode(selectedExpressionValue) ? "ok" : "warning");

  useEffect(() => {
    setIsEditingSelectedKey(false);
  }, [activeLayer.name, selectedSlot]);

  const startEditingSelectedKey = () => {
    setDraftAction(currentAction);
    setIsEditingSelectedKey(true);
  };

  const cancelEditingSelectedKey = () => {
    setDraftAction(currentAction);
    setIsEditingSelectedKey(false);
  };

  const saveEditingSelectedKey = () => {
    if (!selectedKey) {
      return;
    }
    writeAction(draftAction);
    setIsEditingSelectedKey(false);
    setStatusMessage(`Updated ${selectedKey.slot} on ${activeLayer.name}.`);
  };

  return (
    <>
<section className="workspace editor-workspace">
          <div className="page-heading active-layout-card editor-layout-card">
            <div>
              <p className="eyebrow">Layout</p>
              <h1>{layoutNameDraft || activeSavedLayout?.name || "No layout selected"}</h1>
              <p>{availableLayouts.length} layouts / {activeSavedLayout?.versions.length ?? 0} versions. Use the top bar to switch layouts.</p>
            </div>
            <div className="page-actions editor-layout-actions">
              <button className="action-create" data-icon="+" data-testid="new-layout" disabled={!model} onClick={openCreateLayoutDialog} type="button">Create Layout</button>
              {renderActionMenu("layout-actions", "Layout actions", (
                <>
                  <button className="action-copy" data-icon="⧉" data-testid="duplicate-layout" disabled={!activeSavedLayout} onClick={() => runMenuAction(duplicateLayout)} role="menuitem" type="button">Duplicate Layout</button>
                  <label
                    aria-disabled={!model}
                    className={`file-import action-import ${!model ? "disabled" : ""}`}
                    data-icon="⇣"
                    role="menuitem"
                    title={model ? "Import a layout JSON file" : "Add a KLE model before importing layouts"}
                  >
                    Import Layout
                    <input
                      data-testid="layout-upload"
                      accept="application/json,.json"
                      disabled={!model}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void uploadLayout(file).catch((error: unknown) => {
                            setStatusMessage(error instanceof Error ? error.message : "Failed to upload layout JSON.");
                          });
                        }
                        closeActionMenus();
                        event.target.value = "";
                      }}
                      type="file"
                    />
                  </label>
                  <button className="action-rename" data-icon="{}" data-testid="edit-layout-json" disabled={!activeSavedLayout} onClick={() => runMenuAction(() => openJsonEditDialog("layout"))} role="menuitem" type="button">Edit Layout JSON</button>
                  <button className="action-export" data-icon="⇡" data-testid="download-layout" disabled={!activeSavedLayout} onClick={() => runMenuAction(downloadJson)} role="menuitem" type="button">Download Layout</button>
                  <button className="action-rename" data-icon="✎" data-testid="rename-layout" disabled={!activeSavedLayout} onClick={() => runMenuAction(openLayoutRenameDialog)} role="menuitem" type="button">Rename Layout</button>
                  <button className="action-default" data-icon="★" data-testid="save-default-layout" disabled={!activeSavedLayout} onClick={() => runMenuAction(saveCurrentLayoutAsDefault)} role="menuitem" type="button">Save as Default</button>
                  <button className="danger-button action-danger" data-icon="!" data-testid="delete-layout" disabled={!activeSavedLayout} onClick={() => runMenuAction(deleteLayout)} role="menuitem" type="button">Delete Layout</button>
                </>
              ), { disabled: !model && !activeSavedLayout })}
            </div>
          </div>
          {!activeKeyboardProject ? (
            <div className="editor-card setup-state-card" data-testid="missing-project-state">
              <p className="eyebrow">Project required</p>
              <h2>No user project selected</h2>
              <p>Create a project, import a project JSON file, or load one of the example projects before editing layouts.</p>
              <button className="action-create" data-icon="+" data-testid="editor-create-project" onClick={() => {
                createBlankKeyboardProject();
                setActivePage("projects");
              }} type="button">
                Create Project
              </button>
            </div>
          ) : !model ? (
            <div className="editor-card setup-state-card" data-testid="missing-kle-state">
              <p className="eyebrow">Keyboard model required</p>
              <h2>No KLE model configured</h2>
              <p>Create Project now starts with an empty project shell. Upload a KLE JSON file or use Edit KLE JSON on the Projects page to add key IDs before creating layouts.</p>
              <button className="action-rename" data-icon="{}" data-testid="editor-edit-kle-json" onClick={() => {
                setActivePage("projects");
                openJsonEditDialog("kle");
              }} type="button">
                Edit KLE JSON
              </button>
            </div>
          ) : !activeSavedLayout ? (
            <div className="editor-card setup-state-card" data-testid="missing-layout-state">
              <p className="eyebrow">Layout required</p>
              <h2>No layouts in this project</h2>
              <p>This project has a KLE model but no layouts. Create a layout from the project default template or import a saved layout JSON.</p>
              <button className="action-create" data-icon="+" data-testid="editor-create-first-layout" onClick={openCreateLayoutDialog} type="button">
                Create Layout
              </button>
            </div>
          ) : selectedKey ? (
            <>
          <div className="keyboard-panel">
          <div className="layer-tabs" role="tablist" aria-label="Layers">
            {layers.map((layer, index) => (
              <button
                className={layer.name === activeLayer.name ? "active" : ""}
                key={`${layer.name}-${index}`}
                id={`tab-${layer.name}`}
                data-testid={`layer-tab-${layer.name}`}
                onClick={() => {
                  setActiveLayerName(layer.name);
                  setSwapSourceSlot(null);
                }}
                role="tab"
                aria-controls="keyboard-stage"
                aria-selected={layer.name === activeLayer.name}
                type="button"
              >
                <span className="layer-tab-dot" style={{ backgroundColor: layerColorMap[layer.name] }} />
                {index}: {layer.name}
              </button>
            ))}
          </div>

          <div className="layer-toolbar" aria-label="Layer management">
            <div className="layer-edit-group">
              <div className="layer-edit-controls">
                <div className="button-row">
                  {renderActionMenu("layer-actions", "Layer actions", (
                    <>
                      <button className="action-create" data-icon="+" data-testid="add-layer" onClick={() => runMenuAction(addLayer)} role="menuitem" type="button">Add</button>
                      <button className="action-move" data-icon="←" data-testid="move-layer-left" disabled={activeLayerIndex === 0} onClick={() => runMenuAction(() => moveActiveLayer(-1))} role="menuitem" type="button">Move left</button>
                      <button className="action-move" data-icon="→" data-testid="move-layer-right" disabled={activeLayerIndex === layers.length - 1} onClick={() => runMenuAction(() => moveActiveLayer(1))} role="menuitem" type="button">Move right</button>
                      <button className="action-danger" data-icon="!" data-testid="remove-layer" disabled={layers.length <= 1} onClick={() => runMenuAction(removeActiveLayer)} role="menuitem" type="button">Remove</button>
                    </>
                  ), { testId: "layer-actions-trigger" })}
                </div>
                <input
                  aria-label="Active layer name"
                  data-testid="layer-name-input"
                  value={layerNameDraft}
                  onChange={(event) => setLayerNameDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      renameActiveLayer();
                    }
                  }}
                  spellCheck={false}
                />
              </div>
            </div>
            <div className="layer-color-picker" aria-label={`Color for ${activeLayer.name}`}>
              <span>Color</span>
              <div className="layer-color-swatches">
                {layerPalette.map((color) => (
                  <button
                    aria-label={`Set ${activeLayer.name} color to ${color}`}
                    aria-pressed={layerColorMap[activeLayer.name] === color}
                    className={layerColorMap[activeLayer.name] === color ? "active" : ""}
                    data-testid={`layer-color-${color.replace("#", "")}`}
                    key={color}
                    onClick={() => setActiveLayerColor(color)}
                    style={{ backgroundColor: color }}
                    title={`Set ${activeLayer.name} color to ${color}`}
                    type="button"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="keyboard-stage-viewport" ref={keyboardViewportRef}>
            <div
              className="keyboard-stage-scaler"
              style={{ width: keyboardVisualSize.width, height: keyboardVisualSize.height }}
            >
              <div
                className="keyboard-stage"
                id="keyboard-stage"
                role="tabpanel"
                aria-labelledby={`tab-${activeLayer.name}`}
                style={{
                  width: keyboardStageSize.width,
                  height: keyboardStageSize.height,
                  transform: `scale(${keyboardScale})`
                }}
              >
            {model.keys.map((key) => {
              const action = selectedKeycode(activeLayer, key.slot);
              const details = describeAction(action);
              const layerColor = details.layer ? layerColorMap[details.layer] : undefined;
              const keyWidth = key.width * keyboardUnit;
              const actionType = actionTypeLabel(details);
              const primaryFit = fitPrimaryKeyLabel(details.primary, keyWidth);
              const secondaryFit = fitSecondaryKeyLabel(actionType, keyWidth);
              return (
                <button
                  className={`keycap ${details.tone} ${key.slot === selectedSlot ? "selected" : ""} ${key.slot === swapSourceSlot ? "swap-source" : ""} ${copiedKeyAction?.layerName === activeLayer.name && copiedKeyAction.slot === key.slot ? "copy-source" : ""}`}
                  key={key.slot}
                  data-testid={`key-${key.slot}`}
                  draggable
                  onClick={() => handleKeyClick(key)}
                  onDragStart={(event) => handleKeyDragStart(key, event)}
                  onDragOver={handleKeyDragOver}
                  onDrop={(event) => handleKeyDrop(key, event)}
                  onDragEnd={() => handleKeyDragEnd(key)}
                  aria-label={`${key.slot} on ${activeLayer.name}: ${action}`}
                  aria-pressed={key.slot === selectedSlot}
                  style={{
                    left: (key.x + keyboardPaddingX) * keyboardUnit,
                    top: (key.y + keyboardPaddingY) * keyboardUnit,
                    width: key.width * keyboardUnit,
                    height: key.height * keyboardUnit,
                    transform: `rotate(${key.rotation}deg)`,
                    transformOrigin: `${(key.rotationX - key.x) * keyboardUnit}px ${(key.rotationY - key.y) * keyboardUnit}px`
                  }}
                  title={`${key.slot}: ${action}`}
                  type="button"
                >
                  <span className="key-slot">{key.slot}</span>
                  {layerColor && (
                    <span
                      className="layer-dot"
                      style={{ backgroundColor: layerColor }}
                      title={`${details.layer} layer action`}
                    />
                  )}
                  <span
                    className="key-primary"
                    data-font-size={primaryFit.fontSize.toFixed(2)}
                    data-measured-width={primaryFit.measuredWidth.toFixed(2)}
                    style={{ fontSize: primaryFit.fontSize, lineHeight: `${primaryFit.lineHeight}px` }}
                  >
                    {details.primary}
                  </span>
                  <span
                    className="key-secondary"
                    data-font-size={secondaryFit.fontSize.toFixed(2)}
                    data-measured-width={secondaryFit.measuredWidth.toFixed(2)}
                    style={{ fontSize: secondaryFit.fontSize, lineHeight: `${secondaryFit.lineHeight}px` }}
                  >
                    {actionType}
                  </span>
                </button>
              );
            })}
              </div>
            </div>
          </div>

          <div className="keyboard-toolbelt" aria-label="Keyboard key tools" data-testid="keyboard-toolbelt">
            <div className="button-row keyboard-toolbelt-actions">
              <button
                className={swapSourceSlot ? "action-swap active" : "action-swap"}
                data-icon="⇄"
                data-testid="swap-action"
                onClick={swapSourceSlot ? cancelKeySwap : startKeySwap}
                type="button"
              >
                {swapSourceSlot ? "Cancel Swap" : "Swap Key"}
              </button>
              <button
                className={copiedKeyAction ? "action-copy active" : "action-copy"}
                data-icon={copiedKeyAction ? "×" : "⧉"}
                data-testid="copy-key-action"
                onClick={copySelectedKeyAction}
                type="button"
              >
                {copiedKeyAction ? "Cancel Copy" : "Copy Key"}
              </button>
              <button
                className="action-paste"
                data-icon="⇣"
                data-testid="paste-key-action"
                disabled={!copiedKeyAction}
                onClick={pasteCopiedKeyAction}
                type="button"
              >
                Paste Key
              </button>
              <button
                className="action-transparent"
                data-icon="↓"
                data-testid="transparent-action"
                onClick={() => {
                  writeAction(TRANSPARENT);
                  setStatusMessage(`${selectedKey.slot} is transparent on ${activeLayer.name}.`);
                }}
                type="button"
              >
                Transparent
              </button>
              <button
                className="action-disable"
                data-icon="×"
                data-testid="noop-action"
                onClick={() => {
                  writeAction("KC_NO");
                  setStatusMessage(`${selectedKey.slot} is disabled on ${activeLayer.name}.`);
                }}
                type="button"
              >
                No-op
              </button>
            </div>
          </div>
          </div>

          <aside className="editor-panel">
            <div className="editor-card key-editor-card">
              <div className="selected-key-header">
                <span>Selected Key:</span>
                <strong>Key {selectedKey.slot} / {activeLayer.name}</strong>
              </div>
              <div className="selected-key-expression-row">
                <input
                  aria-label={`Expression for ${selectedKey.slot} on ${activeLayer.name}`}
                  className={`validation-${selectedExpressionValidationLevel}`}
                  data-testid="action-input"
                  readOnly={!isEditingSelectedKey}
                  value={selectedExpressionValue}
                  onChange={(event) => setDraftAction(event.target.value)}
                  onKeyDown={(event) => {
                    if (!isEditingSelectedKey) {
                      return;
                    }
                    if (event.key === "Enter") {
                      saveEditingSelectedKey();
                    }
                    if (event.key === "Escape") {
                      cancelEditingSelectedKey();
                    }
                  }}
                  spellCheck={false}
                />
                {isEditingSelectedKey ? (
                  <div className="selected-key-edit-actions">
                    <button
                      className="action-default"
                      data-icon="×"
                      data-testid="cancel-action-edit"
                      onClick={cancelEditingSelectedKey}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="action-save"
                      data-icon="✓"
                      data-testid="apply-action"
                      onClick={saveEditingSelectedKey}
                      type="button"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    className="action-save"
                    data-icon="✎"
                    data-testid="edit-action"
                    onClick={startEditingSelectedKey}
                    type="button"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            <div className="editor-card composer-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">Action composer</p>
                <h2>{composerMode === "dance" ? "Dance composer" : "Simple composer"}</h2>
              </div>
              <div className="composer-heading-actions">
                <label className="composer-sync-toggle">
                  <input
                    checked={syncComposerWithSelection}
                    data-testid="sync-composer-selection"
                    onChange={(event) => setSyncComposerWithSelection(event.target.checked)}
                    type="checkbox"
                  />
                  Follow selected
                </label>
              </div>
            </div>
            <div className="composer-mode-tabs" role="tablist" aria-label="Composer mode">
              <button
                className={composerMode === "simple" ? "active" : ""}
                onClick={() => setComposerMode("simple")}
                role="tab"
                aria-selected={composerMode === "simple"}
                type="button"
              >
                Simple
              </button>
              <button
                className={composerMode === "dance" ? "active" : ""}
                onClick={() => setComposerMode("dance")}
                role="tab"
                aria-selected={composerMode === "dance"}
                type="button"
              >
                Dance
              </button>
            </div>
            <div className="composer-section composer-fields-section">
              {composerMode === "simple" ? (
                <>
                {renderContextPicker({
                  id: "simple-kind",
                  label: "Action type",
                  value: simpleKind,
                  emptyLabel: "Choose action",
                  choices: simpleComposerPickerOptions,
                  disabled: false,
                  onSelect: (value) => setSimpleKind(value as SimpleComposerKind),
                  className: "field-picker composer-picker",
                  triggerTestId: "simple-composer-kind",
                  searchTestId: "simple-composer-kind-search",
                  optionTestId: "simple-composer-kind-option"
                })}
                <div className="behavior-grid">
                  {simpleKind === "raw" && (
                    <label>
                      Raw QMK expression
                      <input
                        data-testid="simple-raw-action"
                        placeholder="RGUI(LSFT(KC_9))"
                        value={simpleRawAction}
                        onChange={(event) => setSimpleRawAction(event.target.value)}
                        spellCheck={false}
                      />
                    </label>
                  )}
                  {simpleAction.fields.includes("keycode") && (
                    <label>
                      Keycode
                      <div className="keycode-mod-row">
                        {simpleKeycodeMods.filter((modifier) => modifier.group === "regular").map((modifier) => (
                          <label key={modifier.id}>
                            {modifier.label}
                            <input
                              checked={simpleKeycodeModifiers.includes(modifier.id)}
                              data-testid={`simple-keycode-mod-${modifier.id}`}
                              onChange={() => setSimpleKeycodeModifiers((current) => toggleSimpleKeycodeModifier(current, modifier.id))}
                              type="checkbox"
                            />
                          </label>
                        ))}
                        <span className="keycode-mod-divider" aria-hidden="true">|</span>
                        {simpleKeycodeMods.filter((modifier) => modifier.id === "meh").map((modifier) => (
                          <label key={modifier.id}>
                            {modifier.label}
                            <input
                              checked={simpleKeycodeModifiers.includes(modifier.id)}
                              data-testid={`simple-keycode-mod-${modifier.id}`}
                              onChange={() => setSimpleKeycodeModifiers((current) => toggleSimpleKeycodeModifier(current, modifier.id))}
                              type="checkbox"
                            />
                          </label>
                        ))}
                        <span className="keycode-mod-divider" aria-hidden="true">|</span>
                        {simpleKeycodeMods.filter((modifier) => modifier.id === "hyper").map((modifier) => (
                          <label key={modifier.id}>
                            {modifier.label}
                            <input
                              checked={simpleKeycodeModifiers.includes(modifier.id)}
                              data-testid={`simple-keycode-mod-${modifier.id}`}
                              onChange={() => setSimpleKeycodeModifiers((current) => toggleSimpleKeycodeModifier(current, modifier.id))}
                              type="checkbox"
                            />
                          </label>
                        ))}
                      </div>
                      <small className="keycode-mod-caveat">Meh and Hyper are exclusive chords; selecting either clears regular modifiers.</small>
                      <div className={`raw-input-row ${captureTarget === "simple" ? "capturing" : ""}`}>
                        <input
                          data-testid="simple-keycode"
                          placeholder="KC_SPC"
                          value={simpleKeycode}
                          onChange={(event) => setSimpleKeycode(event.target.value)}
                          spellCheck={false}
                        />
                        <button
                          className="action-capture"
                          data-icon="⌘"
                          data-testid="simple-keycode-capture"
                          onClick={() => {
                            setCaptureTarget("simple");
                            setStatusMessage("Press a key to capture it for Simple composer.");
                          }}
                          type="button"
                        >
                          {captureTarget === "simple" ? "Press key" : "Capture"}
                        </button>
                      </div>
                    </label>
                  )}
                  {simpleKind === "mod_tap" && (
                    renderContextPicker({
                      id: "mod-tap-modifier",
                      label: "Hold modifier",
                      value: modTapModifier,
                      emptyLabel: "Choose modifier",
                      choices: modTapPickerOptions,
                      disabled: false,
                      onSelect: setModTapModifier,
                      className: "field-picker composer-picker",
                      triggerTestId: "mod-tap-modifier",
                      searchTestId: "mod-tap-modifier-search",
                      optionTestId: "mod-tap-modifier-option"
                    })
                  )}
                  {simpleAction.fields.includes("layer") && (
                    renderContextPicker({
                      id: "simple-layer",
                      label: simpleAction.layerLabel ?? "Layer",
                      value: simpleLayer,
                      emptyLabel: "No layers",
                      choices: composerLayerPickerOptions,
                      disabled: composerLayerPickerOptions.length === 0,
                      onSelect: setSimpleLayer,
                      className: "field-picker composer-picker",
                      triggerTestId: "simple-layer",
                      searchTestId: "simple-layer-search",
                      optionTestId: "simple-layer-option"
                    })
                  )}
                </div>
                </>
              ) : (
                <>
              <label>
                Dance name
                <input
                  data-testid="dance-name"
                  placeholder="DANCE_0"
                  value={danceName}
                  onChange={(event) => setDanceName(event.target.value)}
                  spellCheck={false}
                />
              </label>
              <div className="behavior-grid">
                {danceBehaviorFields.map((field) => (
                  <label key={field.id}>
                    {field.label}
                    <input
                      data-testid={`behavior-${field.id}`}
                      placeholder={field.placeholder}
                      value={behaviorSlots[field.id]}
                      onChange={(event) => updateBehaviorSlot(field.id, event.target.value)}
                      spellCheck={false}
                    />
                    <small>{field.help}</small>
                  </label>
                ))}
              </div>
                </>
              )}
            </div>
            <div className={`composer-section composer-output-preview ${composerMode === "dance" ? "needs-code" : ""}`}>
              <PreviewKeycap action={generatedAction} layerColors={layerColorMap} slot={selectedKey.slot} testId="composer-key-preview" />
              <div className="generated-expression">
                <span>Generated expression</span>
                <code className={composerMode === "dance" ? "needs-code" : ""}>{generatedAction}</code>
              </div>
            </div>
            {composerMode === "dance" && danceComposition.supportCode && (
              <details className="support-code-preview">
                <summary>Generated QMK support preview</summary>
                <pre>{danceComposition.supportCode}</pre>
              </details>
            )}
            <div className="composer-section generated composer-actions">
              <span>
                {composerMode === "dance"
                  ? `Apply TD(${danceName || "DANCE_0"}) and add or update its dances JSON entry.`
                  : `Apply this generated raw identifier to ${selectedKey.slot} on ${activeLayer.name}.`}
              </span>
              <div className="composer-action-buttons">
                <button
                  className="action-copy"
                  data-icon="⧉"
                  data-testid="copy-generated-action"
                  onClick={copyGeneratedAction}
                  type="button"
                >
                  Copy expression
                </button>
                <button
                  className="action-default"
                  data-icon="+"
                  data-testid="open-save-key-alias"
                  onClick={openSaveAliasDialog}
                  type="button"
                >
                  Save Key Alias
                </button>
                <button
                  className="action-save"
                  data-icon="✓"
                  data-testid="use-generated-action"
                  onClick={applyGeneratedAction}
                  type="button"
                >
                  Apply generated
                </button>
              </div>
            </div>
            </div>

            <div className="editor-card composer-companion-card" aria-hidden="true">
              <div className="composer-companion-orbit">
                <span />
                <span />
                <span />
              </div>
              <div className="composer-companion-copy">
                <p>Composing</p>
                <strong>{selectedKey.slot}</strong>
                <span>{activeLayer.name}</span>
              </div>
              <code>{generatedAction}</code>
            </div>

            <div className="editor-card support-data-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Layout support data</p>
                  <h2>Dances, macros, custom key aliases, keycodes</h2>
                </div>
                <span className="metric-pill">{danceRows.length} dances / {macroRows.length} macros / {aliasRows.length} aliases / {customKeycodeRows.length} keycodes</span>
              </div>
              <div className="support-table-group">
                <section>
                  <div className="mini-section-header">
                    <h3>Key dances</h3>
                    <button className="action-create mini-action" data-icon="+" data-testid="add-dance" onClick={startNewDance} type="button">Add</button>
                  </div>
                  {danceRows.length > 0 || editingDanceName !== null ? (
                    <div className="support-table-scroll">
                      <table className="support-table" data-testid="dance-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Tap</th>
                            <th>Hold</th>
                            <th>Double</th>
                            <th>Tap-hold</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editingDanceName !== null && (
                            <tr className="editing-row">
                              <th scope="row">
                                <input data-testid="dance-edit-name" value={danceDraftName} onChange={(event) => setDanceDraftName(event.target.value)} spellCheck={false} />
                              </th>
                              {danceBehaviorFields.map((field) => (
                                <td key={field.id}>
                                  <input
                                    data-testid={`dance-edit-${field.id}`}
                                    value={danceDraftSlots[field.id]}
                                    onChange={(event) => setDanceDraftSlots((current) => ({ ...current, [field.id]: event.target.value }))}
                                    spellCheck={false}
                                  />
                                </td>
                              ))}
                              <td>
                                <div className="support-row-actions">
                                  <button className="action-save" data-icon="✓" data-testid="save-dance" onClick={saveDanceDraft} type="button">Save</button>
                                  <button className="action-disable" data-icon="×" data-testid="cancel-dance-edit" onClick={() => setEditingDanceName(null)} type="button">Cancel</button>
                                </div>
                              </td>
                            </tr>
                          )}
                          {danceRows.map(([name, slots]) => (
                            <tr key={name}>
                              <th scope="row"><code>{name}</code></th>
                              <td><code>{slots.tap || "-"}</code></td>
                              <td><code>{slots.hold || "-"}</code></td>
                              <td><code>{slots.doubleTap || "-"}</code></td>
                              <td><code>{slots.tapHold || "-"}</code></td>
                              <td>
                                <div className="support-row-actions">
                                  {renderActionMenu(`dance-actions-${name}`, "Actions", (
                                    <>
                                      <button className="action-rename" data-icon="✎" data-testid={`edit-dance-${name}`} onClick={() => runMenuAction(() => startEditDance(name, slots))} role="menuitem" type="button">Edit</button>
                                      <button className="action-danger" data-icon="!" data-testid={`delete-dance-${name}`} onClick={() => runMenuAction(() => deleteDance(name))} role="menuitem" type="button">Delete</button>
                                    </>
                                  ), { icon: "⋯" })}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="empty-support-data" data-testid="dance-table-empty">No key dances in this layout.</p>
                  )}
                </section>
                <section>
                  <div className="mini-section-header">
                    <h3>Macros</h3>
                    <button className="action-create mini-action" data-icon="+" data-testid="add-macro" onClick={() => startNewExtKey("macro")} type="button">Add</button>
                  </div>
                  {macroRows.length > 0 || (editingExtKeyName !== null && extKeyDraft.kind === "macro") ? (
                    <div className="support-table-scroll">
                      <table className="support-table" data-testid="macro-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Kind</th>
                            <th>Value</th>
                            <th>Notes</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editingExtKeyName !== null && extKeyDraft.kind === "macro" && (
                            <tr className="editing-row">
                              <th scope="row"><input data-testid="macro-edit-name" value={extKeyDraft.name} onChange={(event) => setExtKeyDraft((current) => ({ ...current, name: event.target.value }))} spellCheck={false} /></th>
                              <td><code>{extKeyDraft.kind}</code></td>
                              <td><input data-testid="macro-edit-value" value={extKeyDraft.value} onChange={(event) => setExtKeyDraft((current) => ({ ...current, value: event.target.value }))} spellCheck={false} /></td>
                              <td><input data-testid="macro-edit-notes" value={extKeyDraft.notes} onChange={(event) => setExtKeyDraft((current) => ({ ...current, notes: event.target.value }))} spellCheck={false} /></td>
                              <td>
                                <div className="support-row-actions">
                                  <button className="action-save" data-icon="✓" data-testid="save-extkey" onClick={saveExtKeyDraft} type="button">Save</button>
                                  <button className="action-disable" data-icon="×" data-testid="cancel-extkey-edit" onClick={() => setEditingExtKeyName(null)} type="button">Cancel</button>
                                </div>
                              </td>
                            </tr>
                          )}
                          {macroRows.map((key) => (
                            <tr key={`${key.name}-${key.kind}-${key.value}`}>
                              <th scope="row"><code>{key.name}</code></th>
                              <td>{key.kind || "-"}</td>
                              <td><code>{key.value || "-"}</code></td>
                              <td>{key.notes || "-"}</td>
                              <td>
                                <div className="support-row-actions">
                                  {renderActionMenu(`macro-actions-${key.name}`, "Actions", (
                                    <>
                                      <button className="action-rename" data-icon="✎" data-testid={`edit-extkey-${key.name}`} onClick={() => runMenuAction(() => startEditExtKey(key))} role="menuitem" type="button">Edit</button>
                                      <button className="action-danger" data-icon="!" data-testid={`delete-extkey-${key.name}`} onClick={() => runMenuAction(() => deleteExtKey(key.name))} role="menuitem" type="button">Delete</button>
                                    </>
                                  ), { icon: "⋯" })}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="empty-support-data" data-testid="macro-table-empty">No macros in this layout.</p>
                  )}
                </section>
                <section>
                  <div className="mini-section-header">
                    <h3>Custom key aliases</h3>
                    <button className="action-create mini-action" data-icon="+" data-testid="add-alias" onClick={() => startNewExtKey("alias")} type="button">Add</button>
                  </div>
                  {aliasRows.length > 0 || (editingExtKeyName !== null && extKeyDraft.kind !== "macro" && extKeyDraft.kind !== "keycode") ? (
                    <div className="support-table-scroll">
                      <table className="support-table" data-testid="extkeys-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Kind</th>
                            <th>Value</th>
                            <th>Notes</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editingExtKeyName !== null && extKeyDraft.kind !== "macro" && extKeyDraft.kind !== "keycode" && (
                            <tr className="editing-row">
                              <th scope="row"><input data-testid="alias-edit-name" value={extKeyDraft.name} onChange={(event) => setExtKeyDraft((current) => ({ ...current, name: event.target.value }))} spellCheck={false} /></th>
                              <td><code>{extKeyDraft.kind || "alias"}</code></td>
                              <td><input data-testid="alias-edit-value" value={extKeyDraft.value} onChange={(event) => setExtKeyDraft((current) => ({ ...current, value: event.target.value }))} spellCheck={false} /></td>
                              <td><input data-testid="alias-edit-notes" value={extKeyDraft.notes} onChange={(event) => setExtKeyDraft((current) => ({ ...current, notes: event.target.value }))} spellCheck={false} /></td>
                              <td>
                                <div className="support-row-actions">
                                  <button className="action-save" data-icon="✓" data-testid="save-extkey" onClick={saveExtKeyDraft} type="button">Save</button>
                                  <button className="action-disable" data-icon="×" data-testid="cancel-extkey-edit" onClick={() => setEditingExtKeyName(null)} type="button">Cancel</button>
                                </div>
                              </td>
                            </tr>
                          )}
                          {aliasRows.map((key) => (
                            <tr key={`${key.name}-${key.kind}-${key.value}`}>
                              <th scope="row"><code>{key.name}</code></th>
                              <td>{key.kind || "-"}</td>
                              <td><code>{key.value || "-"}</code></td>
                              <td>{key.notes || "-"}</td>
                              <td>
                                <div className="support-row-actions">
                                  {renderActionMenu(`alias-actions-${key.name}`, "Actions", (
                                    <>
                                      <button className="action-rename" data-icon="✎" data-testid={`edit-extkey-${key.name}`} onClick={() => runMenuAction(() => startEditExtKey(key))} role="menuitem" type="button">Edit</button>
                                      <button className="action-danger" data-icon="!" data-testid={`delete-extkey-${key.name}`} onClick={() => runMenuAction(() => deleteExtKey(key.name))} role="menuitem" type="button">Delete</button>
                                    </>
                                  ), { icon: "⋯" })}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="empty-support-data" data-testid="extkeys-table-empty">No custom key aliases in this layout.</p>
                  )}
                </section>
                <section>
                  <div className="mini-section-header">
                    <h3>Custom keycodes</h3>
                    <span>SAFE_RANGE in template</span>
                    <button className="action-create mini-action" data-icon="+" data-testid="add-keycode" onClick={() => startNewExtKey("keycode")} type="button">Add</button>
                  </div>
                  {customKeycodeRows.length > 0 || (editingExtKeyName !== null && extKeyDraft.kind === "keycode") ? (
                    <div className="support-table-scroll">
                      <table className="support-table" data-testid="custom-keycode-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Kind</th>
                            <th>Notes</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editingExtKeyName !== null && extKeyDraft.kind === "keycode" && (
                            <tr className="editing-row">
                              <th scope="row"><input data-testid="keycode-edit-name" value={extKeyDraft.name} onChange={(event) => setExtKeyDraft((current) => ({ ...current, name: event.target.value }))} spellCheck={false} /></th>
                              <td><code>{extKeyDraft.kind}</code></td>
                              <td><input data-testid="keycode-edit-notes" value={extKeyDraft.notes} onChange={(event) => setExtKeyDraft((current) => ({ ...current, notes: event.target.value }))} spellCheck={false} /></td>
                              <td>
                                <div className="support-row-actions">
                                  <button className="action-save" data-icon="✓" data-testid="save-extkey" onClick={saveExtKeyDraft} type="button">Save</button>
                                  <button className="action-disable" data-icon="×" data-testid="cancel-extkey-edit" onClick={() => setEditingExtKeyName(null)} type="button">Cancel</button>
                                </div>
                              </td>
                            </tr>
                          )}
                          {customKeycodeRows.map((key) => (
                            <tr key={`${key.name}-${key.kind}`}>
                              <th scope="row"><code>{key.name}</code></th>
                              <td>{key.kind || "-"}</td>
                              <td>{key.notes || "-"}</td>
                              <td>
                                <div className="support-row-actions">
                                  {renderActionMenu(`keycode-actions-${key.name}`, "Actions", (
                                    <>
                                      <button className="action-rename" data-icon="✎" data-testid={`edit-extkey-${key.name}`} onClick={() => runMenuAction(() => startEditExtKey(key))} role="menuitem" type="button">Edit</button>
                                      <button className="action-danger" data-icon="!" data-testid={`delete-extkey-${key.name}`} onClick={() => runMenuAction(() => deleteExtKey(key.name))} role="menuitem" type="button">Delete</button>
                                    </>
                                  ), { icon: "⋯" })}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="empty-support-data" data-testid="custom-keycode-table-empty">No custom keycodes in this layout.</p>
                  )}
                </section>
              </div>
            </div>

            <div className="editor-card version-tree-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Version tree</p>
                  <h2>{activeLayoutVersion?.name ?? "No version"}</h2>
                </div>
                <span className="metric-pill">{activeSavedLayout.versions.length} versions</span>
              </div>
              <p>
                Click a saved version to load it as the fork point. The next saved version becomes a child of the
                active node. Saved versions are immutable snapshots with the KLE model used when they were created.
              </p>
              <div className="version-save-row">
                <label>
                  New version name
                  <input
                    data-testid="version-name-input"
                    onChange={(event) => setVersionNameDraft(event.target.value)}
                    placeholder={`Version ${activeSavedLayout.versions.length + 1}`}
                    spellCheck={false}
                    value={versionNameDraft}
                  />
                </label>
                <button className="action-save" data-icon="✓" data-testid="save-layout-version" onClick={saveLayoutVersion} type="button">
                  Save Version
                </button>
              </div>
              <div className="version-edit-row">
                <label>
                  Selected version name
                  <input
                    data-testid="selected-version-name-input"
                    onChange={(event) => setSelectedVersionNameDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        renameActiveVersion();
                      }
                    }}
                    spellCheck={false}
                    value={selectedVersionNameDraft}
                  />
                </label>
                <div className="button-row version-edit-actions">
                  {renderActionMenu("version-actions", "Version actions", (
                    <>
                      <button className="action-rename" data-icon="✎" data-testid="rename-version" onClick={() => runMenuAction(renameActiveVersion)} role="menuitem" type="button">Rename Version</button>
                      <button className="danger-button action-danger" data-icon="!" data-testid="delete-version" disabled={activeSavedLayout.versions.length <= 1} onClick={() => runMenuAction(deleteActiveVersion)} role="menuitem" type="button">Delete Version</button>
                    </>
                  ))}
                </div>
              </div>
              <LayoutVersionTree layout={activeSavedLayout} onSelectVersion={loadLayoutVersion} />
            </div>
          </aside>
            </>
          ) : (
            <div className="editor-card setup-state-card" data-testid="missing-key-state">
              <p className="eyebrow">Keyboard model empty</p>
              <h2>No key IDs found</h2>
              <p>The active KLE model has no selectable key IDs. Edit the KLE JSON and put unique identifiers in the center legend entries.</p>
            </div>
          )}
        </section>
        {showSaveAliasDialog && (
          <SaveKeyAliasModal
            expression={generatedAction}
            value={extraKeyNameDraft}
            onChange={setExtraKeyNameDraft}
            onClose={() => setShowSaveAliasDialog(false)}
            onSubmit={submitSaveAliasDialog}
          />
        )}
        <KeycodeLibraryDrawer />
      </>
  );
}
