import { useState } from 'react'
import { Icon } from '../Icon'
import type { BranchProduct } from '../../data/branchDetailMock'
import { getStatusBadgeClass } from '../../data/branchDetailMock'

interface BranchInventoryTableProps {
  products: BranchProduct[]
}

export function BranchInventoryTable({ products }: BranchInventoryTableProps) {
  const [search, setSearch] = useState('')
  const [selectedSku, setSelectedSku] = useState(products[0]?.sku ?? '')

  const filtered = products.filter(
    (p) => !search || p.sku.includes(search) || p.name.includes(search) || p.category.includes(search),
  )

  return (
    <section className="elevation-l1 overflow-hidden rounded-lg">
      <div className="flex items-center justify-between border-b border-outline-variant bg-[#F8F9FA] px-md py-sm">
        <h2 className="font-title-lg text-title-lg text-on-surface">مخزون الفرع</h2>
        <div className="relative w-64">
          <Icon
            name="search"
            size={20}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-secondary no-flip"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-outline-variant py-1.5 pr-9 pl-3 font-body-sm outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            placeholder="البحث عن منتج أو رمز..."
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead>
            <tr className="border-b border-outline-variant bg-[#F8F9FA]">
              <th className="px-md py-3 font-label-md text-secondary">رمز المنتج</th>
              <th className="px-md py-3 font-label-md text-secondary">اسم المنتج</th>
              <th className="px-md py-3 font-label-md text-secondary">الفئة</th>
              <th className="px-md py-3 text-left font-label-md text-secondary">السعر</th>
              <th className="px-md py-3 text-left font-label-md text-secondary">المخزون</th>
              <th className="px-md py-3 text-left font-label-md text-secondary">المباعة</th>
              <th className="px-md py-3 font-label-md text-secondary">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1E4E8] font-body-md text-on-surface">
            {filtered.map((product) => {
              const isSelected = selectedSku === product.sku
              return (
                <tr
                  key={product.sku}
                  onClick={() => setSelectedSku(product.sku)}
                  className={`cursor-pointer transition-colors hover:bg-surface-container ${
                    isSelected ? 'border-r-4 border-primary bg-surface-container-highest' : ''
                  }`}
                >
                  <td className="px-md py-4 font-mono text-body-sm text-secondary no-flip">{product.sku}</td>
                  <td className="px-md py-4 font-medium">{product.name}</td>
                  <td className="px-md py-4">{product.category}</td>
                  <td className="px-md py-4 text-left no-flip">{product.price}</td>
                  <td className="px-md py-4 text-left no-flip">{product.stock.toLocaleString('ar-EG')}</td>
                  <td className="px-md py-4 text-left no-flip">{product.sold.toLocaleString('ar-EG')}</td>
                  <td className="px-md py-4">
                    <span className={`rounded-full px-2 py-0.5 text-label-sm ${getStatusBadgeClass(product.status)}`}>
                      {product.statusLabel}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-outline-variant bg-[#F8F9FA] px-md py-sm">
        <span className="font-body-sm text-secondary">عرض 6 من أصل 120 منتجاً</span>
        <div className="flex gap-xs">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded border border-outline-variant transition-colors hover:bg-surface-container"
          >
            <Icon name="chevron_right" size={18} className="no-flip" />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded bg-primary font-label-md text-white"
          >
            1
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded border border-outline-variant font-label-md transition-colors hover:bg-surface-container"
          >
            2
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded border border-outline-variant font-label-md transition-colors hover:bg-surface-container"
          >
            3
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded border border-outline-variant transition-colors hover:bg-surface-container"
          >
            <Icon name="chevron_left" size={18} className="no-flip" />
          </button>
        </div>
      </div>
    </section>
  )
}
