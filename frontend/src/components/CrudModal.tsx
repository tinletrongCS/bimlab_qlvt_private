import type { FormEvent, ReactNode } from "react";
import { FiX } from "react-icons/fi";

interface CrudModalProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}

export function CrudModal({
  title,
  subtitle,
  children,
  submitting,
  onClose,
  onSubmit,
}: CrudModalProps) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="crud-modal"
        onSubmit={onSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Đóng">
            <FiX />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">
          <button className="secondary" type="button" onClick={onClose}>
            Hủy
          </button>
          <button type="submit" disabled={submitting}>
            {submitting ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </form>
    </div>
  );
}
