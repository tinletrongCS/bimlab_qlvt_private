import { FiPlus } from "react-icons/fi";

interface PanelHeaderProps {
  title: string;
  action: boolean;
  onAdd: () => void;
}

export function PanelHeader({ title, action, onAdd }: PanelHeaderProps) {
  return (
    <div className="panel-title">
      <div>
        <h2>{title}</h2>
        <p>Danh sách dữ liệu thật từ backend QLVT</p>
      </div>
      {action && (
        <button type="button" onClick={onAdd}>
          <FiPlus /> Thêm mới
        </button>
      )}
    </div>
  );
}
