import type { ReactNode } from "react";
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
  const { openActionMenuId, setOpenActionMenuId, setOpenContextPicker } = useAppStore();
  const isOpen = openActionMenuId === id;

  return (
    <div className="action-menu" data-action-menu-root>
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
        <div className="action-menu-popover" role="menu">
          {children}
        </div>
      )}
    </div>
  );
}
