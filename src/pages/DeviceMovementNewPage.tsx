import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { AdminUser, DeviceMovement, PaginatedResponse, ProductUnit, Warehouse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { SalesPageShell } from '../components/SalesPageShell'
import { useAuthStore } from '../stores/authStore'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function DeviceMovementNewPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const [fromWarehouseId, setFromWarehouseId] = useState<number | ''>('')
  const [toWarehouseId, setToWarehouseId] = useState<number | ''>('')
  const [recipientUserId, setRecipientUserId] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [selectedUnitIds, setSelectedUnitIds] = useState<number[]>([])

  const warehousesQuery = useQuery({
    queryKey: ['warehouses', 'device-movements'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Warehouse>>('/warehouses', {
        params: { per_page: 100, 'filter[is_active]': 1 },
      })
      return data.data
    },
  })

  const staffQuery = useQuery({
    queryKey: ['staff-options', 'device-movements'],
    queryFn: async () => {
      const { data } = await api.get<{ data: AdminUser[] }>('/staff-options')
      return data.data.filter((user) => user.id !== userId)
    },
    enabled: Boolean(userId),
  })

  const unitsQuery = useQuery({
    queryKey: ['product-units', 'device-movements', fromWarehouseId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ProductUnit>>('/product-units', {
        params: {
          per_page: 200,
          'filter[warehouse_id]': fromWarehouseId,
          'filter[state]': 'available',
          include: 'productModel',
        },
      })
      return data.data
    },
    enabled: Boolean(fromWarehouseId),
  })

  const availableUnits = unitsQuery.data ?? []

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<DeviceMovement>('/device-movements', {
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: toWarehouseId,
        recipient_user_id: recipientUserId,
        product_unit_ids: selectedUnitIds,
        notes: notes.trim() || undefined,
      })
      return data
    },
    onSuccess: (movement) => {
      queryClient.invalidateQueries({ queryKey: ['device-movements'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      navigate(`/inventory/movements/${movement.id}`)
    },
  })

  const toggleUnit = (unitId: number) => {
    setSelectedUnitIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId],
    )
  }

  const canSubmit = useMemo(
    () =>
      Boolean(fromWarehouseId) &&
      Boolean(toWarehouseId) &&
      fromWarehouseId !== toWarehouseId &&
      Boolean(recipientUserId) &&
      selectedUnitIds.length > 0,
    [fromWarehouseId, toWarehouseId, recipientUserId, selectedUnitIds.length],
  )

  return (
    <SalesPageShell
      title="حركة أجهزة جديدة"
      subtitle="إرسال أجهزة لمستخدم آخر — يلزم تأكيده للاستلام"
      actions={
        <Link to="/inventory/movements" className="text-sm text-primary hover:underline">
          ← العودة للقائمة
        </Link>
      }
    >
      <form
        className="space-y-md"
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          createMutation.mutate()
        }}
      >
        <section className="grid gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-xs block text-on-surface-variant">مخزن المصدر</span>
            <select
              value={fromWarehouseId}
              onChange={(e) => {
                setFromWarehouseId(e.target.value ? Number(e.target.value) : '')
                setSelectedUnitIds([])
              }}
              className={inputClass}
              required
            >
              <option value="">اختر المخزن</option>
              {(warehousesQuery.data ?? []).map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name_ar || warehouse.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-xs block text-on-surface-variant">مخزن الوجهة</span>
            <select
              value={toWarehouseId}
              onChange={(e) => setToWarehouseId(e.target.value ? Number(e.target.value) : '')}
              className={inputClass}
              required
            >
              <option value="">اختر المخزن</option>
              {(warehousesQuery.data ?? [])
                .filter((warehouse) => warehouse.id !== fromWarehouseId)
                .map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name_ar || warehouse.name}
                  </option>
                ))}
            </select>
          </label>

          <label className="block text-sm md:col-span-2">
            <span className="mb-xs block text-on-surface-variant">المستلم (يؤكّد الاستلام)</span>
            <select
              value={recipientUserId}
              onChange={(e) => setRecipientUserId(e.target.value ? Number(e.target.value) : '')}
              className={inputClass}
              required
            >
              <option value="">اختر المستخدم</option>
              {(staffQuery.data ?? []).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm md:col-span-2">
            <span className="mb-xs block text-on-surface-variant">ملاحظات</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="اختياري"
            />
          </label>
        </section>

        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
          <h3 className="mb-sm text-sm font-bold text-on-surface">
            اختر الأجهزة ({selectedUnitIds.length} محدد)
          </h3>
          {!fromWarehouseId ? (
            <p className="text-sm text-on-surface-variant">اختر مخزن المصدر أولاً</p>
          ) : (
            <AsyncState isLoading={unitsQuery.isLoading} isError={unitsQuery.isError} error={unitsQuery.error}>
              {availableUnits.length === 0 ? (
                <p className="text-sm text-on-surface-variant">لا توجد أجهزة متاحة في هذا المخزن</p>
              ) : (
                <div className="max-h-80 space-y-xs overflow-y-auto">
                  {availableUnits.map((unit) => {
                    const checked = selectedUnitIds.includes(unit.id)
                    return (
                      <label
                        key={unit.id}
                        className={`flex cursor-pointer items-center gap-sm rounded-lg border px-sm py-2 ${
                          checked ? 'border-primary/40 bg-primary/5' : 'border-outline-variant/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleUnit(unit.id)}
                        />
                        <span className="flex-1 text-sm tabular-nums">
                          {unit.serial_number ?? unit.imei ?? `#${unit.id}`}
                        </span>
                        <span className="text-xs text-on-surface-variant">
                          {unit.product_model?.name_ar ?? unit.product_model?.name ?? '—'}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </AsyncState>
          )}
        </section>

        {createMutation.error && (
          <p className="text-sm text-error">{getErrorMessage(createMutation.error)}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || createMutation.isPending}
          className="rounded-lg bg-primary px-lg py-sm text-sm font-medium text-on-primary hover:bg-primary/90 disabled:opacity-60"
        >
          {createMutation.isPending ? 'جاري الإرسال…' : 'إرسال للتأكيد'}
        </button>
      </form>
    </SalesPageShell>
  )
}
