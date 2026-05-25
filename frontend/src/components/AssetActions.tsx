import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import type { AssetItem } from '../services/types'

interface AssetActionsProps {
  item: AssetItem
  onEdit: () => void
  onDelete: () => void
  onRevoke: () => void
  onDispose: () => void
}

export function AssetActions({ item, onEdit, onDelete, onRevoke, onDispose }: AssetActionsProps) {
  const isDisposed = item.status === 'DISPOSED'
  return (
    <div className="row-actions">
      {!isDisposed && item.assignedEmployeeId && (
        <button className="mini success" onClick={onRevoke}>
          Thu hồi
        </button>
      )}
      {!isDisposed && (
        <button className="mini" onClick={onDispose}>
          Thanh lý
        </button>
      )}
      <button className="mini" onClick={onEdit}>
        <FiEdit2 /> Sửa
      </button>
      <button className="mini danger" onClick={onDelete}>
        <FiTrash2 /> Xóa
      </button>
    </div>
  )
}
