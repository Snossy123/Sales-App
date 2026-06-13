import type { ReactNode } from 'react'

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
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'لا توجد بيانات',
  striped = true,
  dataTour,
}: DataTableProps<T>) {
  if (data.length === 0) {
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
                className={`px-sm py-sm text-right text-xs font-bold text-on-surface-variant ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={keyExtractor(row)}
              className={`border-b border-outline-variant/60 last:border-0 ${
                striped && idx % 2 === 1 ? 'bg-surface-container-low/50' : ''
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-sm py-sm text-on-surface ${col.className ?? ''}`}
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
  )
}
