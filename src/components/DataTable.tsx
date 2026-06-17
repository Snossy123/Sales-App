import { useEffect, useState, type ReactNode } from 'react'
import { Pagination } from './Pagination'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  className?: string
  headerDataTour?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string | number
  emptyMessage?: string
  striped?: boolean
  dataTour?: string
  rowClassName?: (row: T) => string
  /**
   * When set (> 0), enables built-in client-side pagination with this many
   * rows per page and renders pagination controls below the table.
   */
  pageSize?: number
  /** Changing this value resets to page 1 (e.g. branch id, search query). */
  pageKey?: string | number
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'لا توجد بيانات',
  striped = true,
  dataTour,
  rowClassName,
  pageSize,
  pageKey,
}: DataTableProps<T>) {
  const paginate = typeof pageSize === 'number' && pageSize > 0
  const total = data.length
  const lastPage = paginate ? Math.max(1, Math.ceil(total / pageSize)) : 1
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [pageKey])

  useEffect(() => {
    setPage((current) => Math.min(current, lastPage))
  }, [lastPage, total])

  const currentPage = Math.min(page, lastPage)
  const visibleRows = paginate
    ? data.slice((currentPage - 1) * pageSize, (currentPage - 1) * pageSize + pageSize)
    : data

  if (total === 0) {
    return (
      <div
        data-tour={dataTour}
        className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg text-center text-on-surface-variant"
      >
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <div
        data-tour={dataTour}
        className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest"
      >
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low">
              {columns.map((col) => (
                <th
                  key={col.key}
                  data-tour={col.headerDataTour}
                  className={`px-md py-md text-right text-xs font-bold text-on-surface-variant ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, idx) => (
              <tr
                key={keyExtractor(row)}
                className={`border-b border-outline-variant/60 last:border-0 ${
                  rowClassName?.(row) ??
                  (striped && idx % 2 === 1 ? 'bg-surface-container-low/50' : '')
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-md py-md text-on-surface ${col.className ?? ''}`}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginate && total > 0 && (
        <Pagination
          currentPage={currentPage}
          lastPage={lastPage}
          total={total}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
