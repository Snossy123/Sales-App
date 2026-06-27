import { useState } from 'react'
import { Icon } from '../Icon'
import type { BranchProduct } from '../../lib/branchDashboard'
import { getStatusBadgeClass } from '../../lib/branchDashboard'

interface BranchInventoryTableProps {
  products: BranchProduct[]
}

export function BranchInventoryTable({ products }: BranchInventoryTableProps) {
  const [search, setSearch] = useState('')

  const filtered = products.filter(
    (product) =>
      !search ||
      product.sku.includes(search) ||
      product.name.includes(search) ||
      product.category.includes(search),
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-md py-xl text-center text-secondary">
                  {search ? 'لا توجد نتائج مطابقة للبحث' : 'لا يوجد مخزون GPS مسجّل لهذا الفرع'}
                </td>
              </tr>
            ) : (
              filtered.map((product) => (
                <tr key={product.sku} className="transition-colors hover:bg-surface-container">
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
              ))
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 0 && (
        <div className="border-t border-outline-variant bg-[#F8F9FA] px-md py-sm">
          <span className="font-body-sm text-secondary">
            عرض {filtered.length} من أصل {products.length} منتج
          </span>
        </div>
      )}
    </section>
  )
}
