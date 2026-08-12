import type { ReactNode } from "react";
import { FiPlus } from "react-icons/fi";

interface PanelHeaderProps {
  title: string;
  action: boolean;
  onAdd: () => void;
  extraActions?: ReactNode;
}

export function PanelHeader({ title, action, onAdd, extraActions }: PanelHeaderProps) {
  return (
    <div className="panel-title">
      <div>
        <h2>{title}</h2>
      </div>
      {action && (
        <div className="panel-actions">
          {extraActions}
          <button type="button" onClick={onAdd}>
            <FiPlus /> Thêm mới
          </button>
        </div>
      )}
    </div>
  );
}
