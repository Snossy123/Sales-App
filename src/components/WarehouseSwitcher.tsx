import { useContextStore } from '../stores/contextStore'
import { useAuthStore } from '../stores/authStore'

export function WarehouseSwitcher() {
  const { warehouses, warehousesLoading } = useContextStore()
  const warehouseId = useAuthStore((s) => s.warehouseId)
  const selectWarehouse = useContextStore((s) => s.selectWarehouse)
  const branchId = useAuthStore((s) => s.branchId)

  return (
    <label className="flex items-center gap-xs text-sm">
      <span className="text-on-surface-variant">المخزن</span>
      <select
        value={warehouseId ?? ''}
        onChange={(e) => selectWarehouse(Number(e.target.value))}
        disabled={!branchId || warehousesLoading || warehouses.length === 0}
        className="min-w-[140px] rounded border border-outline-variant bg-surface-container-lowest px-sm py-1.5 text-on-surface focus:border-primary focus:outline-none"
      >
        <option value="" disabled>
          اختر المخزن
        </option>
        {warehouses.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name_ar || w.name}
          </option>
        ))}
      </select>
    </label>
  )
}
