import type { FormEvent, ReactNode } from "react";
import { FiEdit2, FiEye, FiPlus, FiX } from "react-icons/fi";

type CrudModalMode = "create" | "edit" | "view";

interface CrudModalProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  wide?: boolean;
  className?: string;
  mode?: CrudModalMode;
  footer?: ReactNode;
}

export function CrudModal({
  title,
  subtitle,
  children,
  submitting,
  onClose,
  onSubmit,
  wide = false,
  className = "",
  mode,
  footer,
}: CrudModalProps) {
  const resolvedMode = mode || (title.toLowerCase().startsWith("cập nhật") ? "edit" : "create");
  const HeaderIcon = resolvedMode === "view" ? FiEye : resolvedMode === "edit" ? FiEdit2 : FiPlus;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className={`crud-modal${wide ? " crud-modal-wide" : ""} ${className}`.trim()}
        onSubmit={onSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div className="modal-title-group">
            <div className={`modal-title-icon ${resolvedMode}`}>
              <HeaderIcon />
            </div>
            <div>
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Đóng">
            <FiX />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">
          {footer || (
            <>
              <button className="secondary" type="button" onClick={onClose}>
                Hủy
              </button>
              <button type="submit" disabled={submitting}>
                {submitting ? "Đang lưu..." : "Lưu"}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
