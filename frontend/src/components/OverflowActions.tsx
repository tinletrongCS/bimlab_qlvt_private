import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiMoreVertical } from "react-icons/fi";

export interface OverflowAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

interface OverflowActionsProps {
  actions: OverflowAction[];
  label: string;
}

export function OverflowActions({ actions, label }: OverflowActionsProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 168;
    setPosition({
      top: Math.min(rect.bottom + 4, window.innerHeight - 12),
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
    });
    setOpen((value) => !value);
  };

  useEffect(() => {
    if (!open) return undefined;

    const close = () => setOpen(false);
    const closeOnEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", closeOnEsc);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", closeOnEsc);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="overflow-actions-trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={openMenu}
      >
        <FiMoreVertical />
      </button>
      {open &&
        createPortal(
          <>
            <div
              className="overflow-actions-backdrop"
              role="presentation"
              onClick={() => setOpen(false)}
            />
            <div
              className="row-action-menu-list overflow-actions-menu"
              role="menu"
              style={{ top: position.top, left: position.left }}
            >
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className={action.danger ? "danger" : undefined}
                  disabled={action.disabled}
                  role="menuitem"
                  onClick={() => {
                    if (action.disabled) return;
                    setOpen(false);
                    action.onClick();
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
