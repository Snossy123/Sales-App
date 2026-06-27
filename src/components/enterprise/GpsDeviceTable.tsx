import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../Icon'
import type { GpsDeviceRow } from '../../data/enterpriseGpsMock'

export interface GpsDeviceTableRow extends GpsDeviceRow {
  branchId?: number
}

interface GpsDeviceTableProps {
  rows?: GpsDeviceTableRow[]
  totalCount?: number
  emptyMessage?: string
}

export function GpsDeviceTable({
  rows = [],
  totalCount,
  emptyMessage = 'لا توجد فروع مسجّلة في هذه الإدارة',
}: GpsDeviceTableProps) {
  const [search, setSearch] = useState('')
  const total = totalCount ?? rows.length

  const filtered = rows.filter(
    (row) =>
      !search ||
      row.code.includes(search) ||
      row.model.includes(search) ||
      row.client.includes(search),
  )

  return (
    <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-xl border-b border-outline-variant p-lg">
        <div className="relative max-w-xl min-w-[200px] flex-1">
          <Icon
            name="search"
            className="absolute top-1/2 right-md -translate-y-1/2 text-on-surface-variant no-flip"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-md pr-xl pl-md font-body-md focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="ابحث برمز الفرع، الاسم، أو العنوان..."
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low text-right">
              <th className="p-lg font-label-md text-on-surface-variant">رمز الفرع</th>
              <th className="p-lg font-label-md text-on-surface-variant">الفرع</th>
              <th className="p-lg font-label-md text-on-surface-variant">العنوان</th>
              <th className="p-lg" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-xl text-center font-body-md text-on-surface-variant">
                  {search ? 'لا توجد نتائج مطابقة للبحث' : emptyMessage}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.branchId ?? row.code}
                  className="group cursor-pointer border-r-4 border-transparent transition-colors hover:border-primary hover:bg-surface-container"
                >
                  <td className="p-lg font-body-md font-semibold text-primary">
                    {row.branchId ? (
                      <Link to={`/branches/${row.branchId}`} className="hover:underline">
                        {row.code}
                      </Link>
                    ) : (
                      row.code
                    )}
                  </td>
                  <td className="p-lg font-body-md font-medium text-on-surface">{row.model}</td>
                  <td className="p-lg font-body-md text-on-surface-variant">{row.client}</td>
                  <td className="p-lg text-left">
                    {row.branchId ? (
                      <Link to={`/branches/${row.branchId}`}>
                        <Icon
                          name="more_vert"
                          className="rounded-full p-sm text-on-surface-variant transition-colors group-hover:text-primary hover:bg-surface-container-highest no-flip"
                        />
                      </Link>
                    ) : (
                      <Icon
                        name="more_vert"
                        className="rounded-full p-sm text-on-surface-variant transition-colors group-hover:text-primary hover:bg-surface-container-highest no-flip"
                      />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 0 && (
        <div className="flex items-center justify-between border-t border-outline-variant bg-surface-container-low p-lg">
          <p className="font-body-sm text-on-surface-variant">
            عرض {filtered.length} من أصل {total.toLocaleString('ar-EG')} فرع
          </p>
        </div>
      )}
    </section>
  )
}
