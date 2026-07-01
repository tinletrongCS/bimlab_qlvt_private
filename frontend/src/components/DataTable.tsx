import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
} from "react-icons/fi";

interface Column<T> {
  key: string;
  title: string;
  render: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyText: string;
  getRowKey?: (item: T, index: number) => string | number;
  pageSizeOptions?: number[];
  itemLabel?: string;
  pagination?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  emptyText,
  getRowKey,
  pageSizeOptions = [10, 20, 50, 100],
  itemLabel = "mục",
  pagination = true,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0] ?? 10);
  const pageCount = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = data.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, data.length);
  const visibleData = useMemo(
    () => (pagination ? data.slice((safePage - 1) * pageSize, safePage * pageSize) : data),
    [data, pageSize, pagination, safePage],
  );

  useEffect(() => {
    setPage(1);
  }, [data, pageSize]);

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={column.className}>
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td className="empty" colSpan={columns.length}>
                  {emptyText}
                </td>
              </tr>
            ) : (
              visibleData.map((item, index) => (
                <tr key={getRowKey ? getRowKey(item, (safePage - 1) * pageSize + index) : index}>
                  {columns.map((column) => (
                    <td key={column.key} className={column.className}>
                      {column.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && data.length > 0 && (
        <div className="table-pagination">
          <div className="table-pagination-summary">
            Hiển thị <strong>{start}-{end}</strong> / <strong>{data.length}</strong> {itemLabel}
          </div>
          <div className="table-pagination-controls">
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              aria-label="Số dòng mỗi trang"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}/trang
                </option>
              ))}
            </select>
            <button type="button" onClick={() => setPage(1)} disabled={safePage <= 1}>
              <FiChevronsLeft />
            </button>
            <button type="button" onClick={() => setPage(safePage - 1)} disabled={safePage <= 1}>
              <FiChevronLeft />
            </button>
            <span>
              {safePage} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(safePage + 1)}
              disabled={safePage >= pageCount}
            >
              <FiChevronRight />
            </button>
            <button
              type="button"
              onClick={() => setPage(pageCount)}
              disabled={safePage >= pageCount}
            >
              <FiChevronsRight />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
