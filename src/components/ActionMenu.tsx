import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useAppStore } from "../stores/appStore";

type ActionMenuProps = {
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  icon?: string;
  testId?: string;
};

export function ActionMenu({
  id,
  label,
  children,
  className = "",
  disabled,
  icon = "☰",
  testId
}: ActionMenuProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverLeft, setPopoverLeft] = useState(0);
  const { openActionMenuId, setOpenActionMenuId, setOpenContextPicker } = useAppStore();
  const isOpen = openActionMenuId === id;

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
  }, [isOpen]);

  return (
    <div className="action-menu" data-action-menu-root ref={rootRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={`action-menu-trigger ${className}`.trim()}
        data-icon={icon}
        data-testid={testId}
        disabled={disabled}
        onClick={() => {
          setOpenContextPicker(null);
          setOpenActionMenuId((current) => current === id ? null : id);
        }}
        type="button"
      >
        {label}
      </button>
      {isOpen && (
        <div className="action-menu-popover" ref={popoverRef} role="menu" style={{ left: popoverLeft }}>
          {children}
        </div>
      )}
    </div>
  );
}
