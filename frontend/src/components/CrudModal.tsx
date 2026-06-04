import type { FormEvent, ReactNode } from "react";
import { FiEdit2, FiPlus, FiX } from "react-icons/fi";

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
  const isUpdate = title.toLowerCase().startsWith("cập nhật");
  const HeaderIcon = isUpdate ? FiEdit2 : FiPlus;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="crud-modal"
        onSubmit={onSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div className="modal-title-group">
            <div className={`modal-title-icon ${isUpdate ? "edit" : "create"}`}>
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
