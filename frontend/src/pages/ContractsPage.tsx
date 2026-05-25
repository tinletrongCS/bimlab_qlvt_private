import { DataTable } from '../components/DataTable'
import { StatusBadge } from '../components/StatusBadge'
import { PanelHeader } from '../components/PanelHeader'
import { RowActions } from '../components/RowActions'
import { useAppData } from '../contexts/AppDataContext'
import { useActions } from '../contexts/ActionsContext'
import { useAuth } from '../contexts/AuthContext'
import { money } from '../lib/format'

export function ContractsPage() {
  const { hasPermission } = useAuth()
  const { contracts } = useAppData()
  const { openModal, deleteResource } = useActions()

  const canManage = hasPermission('contract_manage')

  return (
    <section className="panel">
      <PanelHeader
        title="Hợp đồng mua sắm"
        action={canManage}
        onAdd={() => openModal({ type: 'contract', mode: 'create' })}
      />
      <DataTable
        data={contracts}
        getRowKey={(item) => item.id}
        emptyText="Chưa có hợp đồng nào"
        columns={[
          { key: 'number', title: 'Số HĐ', render: (item) => <strong>{item.contractNumber}</strong> },
          { key: 'title', title: 'Tiêu đề', render: (item) => item.title },
          { key: 'vendor', title: 'Nhà cung cấp', render: (item) => item.vendor?.name || '—' },
          { key: 'value', title: 'Giá trị', render: (item) => money.format(Number(item.contractValue || 0)) },
          { key: 'signDate', title: 'Ngày ký', render: (item) => item.signDate || '—' },
          { key: 'effectiveTo', title: 'Hiệu lực đến', render: (item) => item.effectiveTo || '—' },
          { key: 'status', title: 'Trạng thái', render: (item) => <StatusBadge value={item.status} /> },
          {
            key: 'actions',
            title: '',
            render: (item) =>
              canManage ? (
                <RowActions
                  onEdit={() => openModal({ type: 'contract', mode: 'edit', item })}
                  onDelete={() => void deleteResource('contracts', item.id)}
                />
              ) : null,
          },
        ]}
      />
    </section>
  )
}
