import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useAppStore, type ContextPickerId } from "../stores/appStore";

export type ContextPickerOption = {
  value: string;
  label: string;
  meta: string;
};

type ContextPickerProps = {
  id: ContextPickerId;
  label: string;
  value: string;
  emptyLabel: string;
  choices: ContextPickerOption[];
  disabled: boolean;
  onSelect: (value: string) => void;
  className?: string;
  triggerTestId?: string;
  searchTestId?: string;
  optionTestId?: string;
};

export function ContextPicker({
  id,
  label,
  value,
  emptyLabel,
  choices,
  disabled,
  onSelect,
  className = "",
  triggerTestId,
  searchTestId,
  optionTestId
}: ContextPickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [popoverLeft, setPopoverLeft] = useState(0);
  const {
    contextPickerActiveIndex,
    contextPickerSearch,
    openContextPicker,
    setContextPickerActiveIndex,
    setContextPickerSearch,
    setOpenActionMenuId,
    setOpenContextPicker
  } = useAppStore();
  const isOpen = openContextPicker === id;
  const filteredOptions = useMemo(() => {
    const query = contextPickerSearch.trim().toLowerCase();
    if (!query) return choices;
    return choices.filter((option) => (
      option.label.toLowerCase().includes(query) ||
      option.meta.toLowerCase().includes(query)
    ));
  }, [choices, contextPickerSearch]);
  const selectedOption = choices.find((option) => option.value === value);
  const safeActiveIndex = filteredOptions.length > 0
    ? Math.min(contextPickerActiveIndex, filteredOptions.length - 1)
    : 0;
  const activeOptionId = `${id}-context-option-${safeActiveIndex}`;
  const triggerLabel = selectedOption?.label ?? emptyLabel;
  const triggerMeta = selectedOption?.meta ?? (disabled ? "Unavailable" : "Choose one");
  const triggerId = triggerTestId ?? `${id}-picker-trigger`;
  const searchId = searchTestId ?? `${id}-picker-search`;
  const optionId = optionTestId ?? `${id}-picker-option`;

  function closePicker() {
    setOpenContextPicker(null);
    setContextPickerSearch("");
    setContextPickerActiveIndex(0);
  }

  function openPicker() {
    setOpenActionMenuId(null);
    setOpenContextPicker((current) => current === id ? null : id);
    setContextPickerSearch("");
    setContextPickerActiveIndex(0);
  }

  function selectOption(nextValue: string) {
    onSelect(nextValue);
    closePicker();
  }

  function handleKeyDown(event: ReactKeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      closePicker();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setContextPickerActiveIndex((current) => (
        filteredOptions.length === 0 ? 0 : (current + 1) % filteredOptions.length
      ));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setContextPickerActiveIndex((current) => (
        filteredOptions.length === 0 ? 0 : (current - 1 + filteredOptions.length) % filteredOptions.length
      ));
      return;
    }

    if (event.key === "Enter") {
      const option = filteredOptions[safeActiveIndex];
      if (option) {
        event.preventDefault();
        selectOption(option.value);
      }
    }
  }

  useEffect(() => {
    if (!isOpen) return undefined;
    const focusFrame = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(focusFrame);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const frame = window.requestAnimationFrame(() => {
      const root = rootRef.current;
      const popover = popoverRef.current;
      if (!root || !popover) return;

      const rootRect = root.getBoundingClientRect();
      const popoverWidth = popover.getBoundingClientRect().width;
      const margin = 8;
      const maxViewportLeft = Math.max(margin, window.innerWidth - popoverWidth - margin);
      const rightAlignedViewportLeft = rootRect.right - popoverWidth;
      const wantsRightAlignment = rootRect.left + popoverWidth > window.innerWidth - margin && rightAlignedViewportLeft >= margin;
      const preferredViewportLeft = wantsRightAlignment ? rightAlignedViewportLeft : rootRect.left;
      const clampedViewportLeft = Math.min(Math.max(preferredViewportLeft, margin), maxViewportLeft);
      setPopoverLeft(clampedViewportLeft - rootRect.left);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, filteredOptions.length]);

  return (
    <div className={`context-picker ${className}`.trim()} data-context-picker-root ref={rootRef}>
      <span className="context-picker-label">{label}</span>
      <button
        aria-controls={`${id}-context-listbox`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="context-picker-trigger"
        data-testid={triggerId}
        disabled={disabled}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPicker();
          }
        }}
        type="button"
      >
        <strong>{triggerLabel}</strong>
        <small>{triggerMeta}</small>
      </button>
      {isOpen && (
        <div className="context-picker-popover" onKeyDown={handleKeyDown} ref={popoverRef} style={{ left: popoverLeft }}>
          <input
            aria-activedescendant={filteredOptions.length > 0 ? activeOptionId : undefined}
            aria-controls={`${id}-context-listbox`}
            aria-label={`Filter ${label.toLowerCase()} list`}
            className="context-picker-search"
            data-testid={searchId}
            onChange={(event) => {
              setContextPickerSearch(event.target.value);
              setContextPickerActiveIndex(0);
            }}
            placeholder={`Search ${label.toLowerCase()}...`}
            ref={searchRef}
            role="combobox"
            value={contextPickerSearch}
          />
          <div className="context-picker-options" id={`${id}-context-listbox`} role="listbox">
            {filteredOptions.length > 0 ? filteredOptions.map((option, index) => {
              const isActive = index === safeActiveIndex;
              const isSelected = option.value === value;
              return (
                <button
                  aria-selected={isSelected}
                  className={`context-picker-option ${isActive ? "active" : ""} ${isSelected ? "selected" : ""}`.trim()}
                  data-context-picker-active={isActive ? "true" : undefined}
                  data-testid={optionId}
                  id={`${id}-context-option-${index}`}
                  key={option.value}
                  onClick={() => selectOption(option.value)}
                  onMouseEnter={() => setContextPickerActiveIndex(index)}
                  role="option"
                  type="button"
                >
                  <span className="context-picker-option-main">
                    <strong>{option.label}</strong>
                    {isSelected && <em>selected</em>}
                  </span>
                  <small>{option.meta}</small>
                </button>
              );
            }) : (
              <div className="context-picker-empty">No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
