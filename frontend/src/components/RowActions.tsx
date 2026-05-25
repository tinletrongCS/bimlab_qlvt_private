import { FiEdit2, FiTrash2 } from 'react-icons/fi'

interface RowActionsProps {
  onEdit: () => void
  onDelete: () => void
}

export function RowActions({ onEdit, onDelete }: RowActionsProps) {
  return (
    <div className="row-actions">
      <button className="mini" onClick={onEdit}>
        <FiEdit2 /> Sửa
      </button>
      <button className="mini danger" onClick={onDelete}>
        <FiTrash2 /> Xóa
      </button>
    </div>
  )
}
