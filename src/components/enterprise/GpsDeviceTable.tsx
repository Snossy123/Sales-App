import { useState } from 'react'
import { Icon } from '../Icon'
import { gpsDeviceRows } from '../../data/enterpriseGpsMock'

export function GpsDeviceTable() {
  const [search, setSearch] = useState('')

  const filtered = gpsDeviceRows.filter(
    (row) =>
      !search ||
      row.code.includes(search) ||
      row.model.includes(search) ||
      row.client.includes(search),
  )

  return (
    <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
      <div className="flex items-center justify-between gap-xl border-b border-outline-variant p-lg">
        <div className="relative max-w-xl flex-1">
          <Icon
            name="search"
            className="absolute top-1/2 right-md -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-md pr-xl pl-md font-body-md focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="ابحث عن جهاز برقم المتسلسل، الطراز، أو العميل..."
          />
        </div>
        <div className="flex items-center gap-sm">
          <button
            type="button"
            className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface px-md py-md font-label-md text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            <Icon name="filter_list" size={20} />
            حالة الجهاز
          </button>
          <button
            type="button"
            className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface px-md py-md font-label-md text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            <Icon name="router" size={20} />
            طراز GPS
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low text-right">
              <th className="p-lg font-label-md text-on-surface-variant">الكود</th>
              <th className="p-lg font-label-md text-on-surface-variant">الفرع</th>
              <th className="p-lg font-label-md text-on-surface-variant">العنوان</th>
              <th className="p-lg" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {filtered.map((row) => (
              <tr
                key={row.code}
                className="group cursor-pointer border-r-4 border-transparent transition-colors hover:border-primary hover:bg-surface-container"
              >
                <td className="p-lg font-body-md font-semibold text-primary">{row.code}</td>
                <td className="p-lg font-body-md font-medium text-on-surface">{row.model}</td>
                <td className="p-lg font-body-md text-on-surface-variant">{row.client}</td>
                <td className="p-lg text-left">
                  <Icon
                    name="more_vert"
                    className="rounded-full p-sm text-on-surface-variant transition-colors group-hover:text-primary hover:bg-surface-container-highest"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-outline-variant bg-surface-container-low p-lg">
        <p className="font-body-sm text-on-surface-variant">عرض 1-4 من أصل 1,300</p>
        <div className="flex items-center gap-sm">
          <button type="button" className="rounded-lg p-sm hover:bg-surface-container disabled:opacity-50" disabled>
            <Icon name="chevron_right" className="rotate-180" />
          </button>
          <button type="button" className="rounded bg-primary px-md py-1 font-label-sm text-on-primary">
            1
          </button>
          <button type="button" className="rounded px-md py-1 font-label-sm hover:bg-surface-container-highest">
            2
          </button>
          <button type="button" className="rounded px-md py-1 font-label-sm hover:bg-surface-container-highest">
            3
          </button>
          <button type="button" className="rounded-lg p-sm hover:bg-surface-container">
            <Icon name="chevron_left" className="rotate-180" />
          </button>
        </div>
      </div>
    </section>
  )
}
