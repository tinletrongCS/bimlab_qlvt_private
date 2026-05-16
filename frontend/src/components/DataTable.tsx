import type { ReactNode } from 'react'

interface Column<T> {
  key: string
  title: string
  render: (item: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyText: string
  getRowKey?: (item: T, index: number) => string | number
}

export function DataTable<T>({ columns, data, emptyText, getRowKey }: DataTableProps<T>) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td className="empty" colSpan={columns.length}>{emptyText}</td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr key={getRowKey ? getRowKey(item, index) : index}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render(item)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
