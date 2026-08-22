import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { AdminUser, DeviceMovement, PaginatedResponse, ProductUnit, Warehouse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { SalesPageShell } from '../components/SalesPageShell'
import { getUserRole, userHasPermission } from '../lib/access'
import { normalizeScannedInput } from '../lib/scanner'
import { useAuthStore } from '../stores/authStore'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

type MovementKind = 'customer' | 'stock'

function isSellableStock(unit: ProductUnit): boolean {
  return (
    unit.state === 'available' &&
    !unit.custody_employee_id &&
    (unit.inventory_bucket == null || unit.inventory_bucket === 'new')
  )
}

export function DeviceMovementNewPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const userId = user?.id
  const role = getUserRole(user)
  const canTransferQuantity =
    userHasPermission(user, 'device_movements.transfer_quantity') ||
    role === 'super_admin' ||
    role === 'admin'

  const [fromWarehouseId, setFromWarehouseId] = useState<number | ''>('')
  const [toWarehouseId, setToWarehouseId] = useState<number | ''>('')
  const [recipientUserId, setRecipientUserId] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [kind, setKind] = useState<MovementKind>('customer')
  const [selectedUnitIds, setSelectedUnitIds] = useState<number[]>([])
  const [selectedUnits, setSelectedUnits] = useState<ProductUnit[]>([])
  const [productModelId, setProductModelId] = useState<number | ''>('')
  const [quantity, setQuantity] = useState(1)
  const [serialCode, setSerialCode] = useState('')
  const [scanError, setScanError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)

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
      return data.data.filter((staff) => staff.id !== userId)
    },
    enabled: Boolean(userId),
  })

  const customerUnitsQuery = useQuery({
    queryKey: ['product-units', 'device-movements', 'customer', fromWarehouseId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ProductUnit>>('/product-units', {
        params: {
          per_page: 200,
          'filter[warehouse_id]': fromWarehouseId,
          'filter[inventory_bucket]': 'custody_customer',
          include: 'productModel,custodyCustomer',
        },
      })
      return data.data.filter((unit) => unit.state !== 'in_transfer')
    },
    enabled: Boolean(fromWarehouseId) && kind === 'customer',
  })

  const stockUnitsQuery = useQuery({
    queryKey: ['product-units', 'device-movements', 'stock', fromWarehouseId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ProductUnit>>('/product-units', {
        params: {
          per_page: 200,
          'filter[warehouse_id]': fromWarehouseId,
          'filter[state]': 'available',
          include: 'productModel',
        },
      })
      return data.data.filter(isSellableStock)
    },
    enabled: Boolean(fromWarehouseId) && kind === 'stock' && canTransferQuantity,
  })

  const customerUnits = customerUnitsQuery.data ?? []
  const stockByModel = useMemo(() => {
    const groups = new Map<number, { modelId: number; name: string; count: number }>()
    for (const unit of stockUnitsQuery.data ?? []) {
      const existing = groups.get(unit.product_model_id)
      const name = unit.product_model?.name_ar ?? unit.product_model?.name ?? `موديل #${unit.product_model_id}`
      if (existing) {
        existing.count += 1
      } else {
        groups.set(unit.product_model_id, { modelId: unit.product_model_id, name, count: 1 })
      }
    }
    return [...groups.values()]
  }, [stockUnitsQuery.data])

  const selectedModelStock = stockByModel.find((item) => item.modelId === productModelId)
  const availableForModel = selectedModelStock?.count ?? 0

  const resetSelection = () => {
    setSelectedUnitIds([])
    setSelectedUnits([])
    setProductModelId('')
    setQuantity(1)
    setSerialCode('')
    setScanError(null)
  }

  const addUnit = (unit: ProductUnit) => {
    if (selectedUnitIds.includes(unit.id)) return
    setSelectedUnitIds((prev) => [...prev, unit.id])
    setSelectedUnits((prev) => [...prev, unit])
  }

  const toggleUnit = (unit: ProductUnit) => {
    if (selectedUnitIds.includes(unit.id)) {
      setSelectedUnitIds((prev) => prev.filter((id) => id !== unit.id))
      setSelectedUnits((prev) => prev.filter((item) => item.id !== unit.id))
      return
    }
    addUnit(unit)
  }

  const lookupSerial = async (raw: string) => {
    const code = normalizeScannedInput(raw)
    setSerialCode(code)
    setScanError(null)
    if (!code || !fromWarehouseId) return

    setIsLookingUp(true)
    try {
      const { data } = await api.get<ProductUnit>('/product-units/lookup', { params: { code } })
      if (data.warehouse_id !== fromWarehouseId) {
        setScanError('الجهاز ليس في مخزن المصدر')
        return
      }
      if (data.inventory_bucket !== 'custody_customer') {
        setScanError('هذا الجهاز ليس من أجهزة العملاء')
        return
      }
      if (data.state === 'in_transfer') {
        setScanError('الجهاز قيد النقل حالياً')
        return
      }
      if (selectedUnitIds.includes(data.id)) {
        setScanError('الجهاز محدد مسبقاً')
        return
      }
      addUnit(data)
      setSerialCode('')
    } catch (error) {
      setScanError(getErrorMessage(error))
    } finally {
      setIsLookingUp(false)
    }
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: toWarehouseId,
        recipient_user_id: recipientUserId,
        notes: notes.trim() || undefined,
      }
      if (kind === 'stock') {
        payload.product_model_id = productModelId
        payload.quantity = quantity
      } else {
        payload.product_unit_ids = selectedUnitIds
      }
      const { data } = await api.post<DeviceMovement>('/device-movements', payload)
      return data
    },
    onSuccess: (movement) => {
      queryClient.invalidateQueries({ queryKey: ['device-movements'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      navigate(`/inventory/movements/${movement.id}`)
    },
  })

  const canSubmit = useMemo(() => {
    const base =
      Boolean(fromWarehouseId) &&
      Boolean(toWarehouseId) &&
      fromWarehouseId !== toWarehouseId &&
      Boolean(recipientUserId)
    if (!base) return false
    if (kind === 'stock') {
      return Boolean(productModelId) && quantity >= 1 && quantity <= availableForModel
    }
    return selectedUnitIds.length > 0
  }, [
    fromWarehouseId,
    toWarehouseId,
    recipientUserId,
    kind,
    productModelId,
    quantity,
    availableForModel,
    selectedUnitIds.length,
  ])

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
                resetSelection()
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
              {(staffQuery.data ?? []).map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
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
          <div className="mb-sm flex flex-wrap gap-xs">
            <button
              type="button"
              onClick={() => {
                setKind('customer')
                resetSelection()
              }}
              className={`rounded-lg px-sm py-1.5 text-sm ${
                kind === 'customer'
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline-variant text-on-surface'
              }`}
            >
              أجهزة عملاء
            </button>
            {canTransferQuantity && (
              <button
                type="button"
                onClick={() => {
                  setKind('stock')
                  resetSelection()
                }}
                className={`rounded-lg px-sm py-1.5 text-sm ${
                  kind === 'stock'
                    ? 'bg-primary text-on-primary'
                    : 'border border-outline-variant text-on-surface'
                }`}
              >
                مخزون الفرع
              </button>
            )}
          </div>

          {kind === 'customer' ? (
            <>
              <h3 className="mb-sm text-sm font-bold text-on-surface">
                اختر أجهزة العملاء ({selectedUnitIds.length} محدد)
              </h3>
              {!fromWarehouseId ? (
                <p className="text-sm text-on-surface-variant">اختر مخزن المصدر أولاً</p>
              ) : (
                <>
                  <label className="mb-sm block text-sm">
                    <span className="mb-xs block text-on-surface-variant">مسح السيريال / IMEI</span>
                    <input
                      value={serialCode}
                      onChange={(e) => setSerialCode(e.target.value)}
                      onBlur={() => {
                        if (serialCode.trim()) void lookupSerial(serialCode)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          void lookupSerial(serialCode)
                        }
                      }}
                      className={inputClass}
                      placeholder="امسح أو أدخل السيريال ثم Enter"
                      disabled={isLookingUp}
                    />
                  </label>
                  {scanError && <p className="mb-sm text-sm text-error">{scanError}</p>}
                  <AsyncState
                    isLoading={customerUnitsQuery.isLoading}
                    isError={customerUnitsQuery.isError}
                    error={customerUnitsQuery.error}
                  >
                    {customerUnits.length === 0 && selectedUnits.length === 0 ? (
                      <p className="text-sm text-on-surface-variant">لا توجد أجهزة عملاء في هذا المخزن</p>
                    ) : (
                      <div className="max-h-80 space-y-xs overflow-y-auto">
                        {[
                          ...selectedUnits.filter((unit) => !customerUnits.some((item) => item.id === unit.id)),
                          ...customerUnits,
                        ].map((unit) => {
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
                                onChange={() => toggleUnit(unit)}
                              />
                              <span className="flex-1 text-sm tabular-nums">
                                {unit.serial_number ?? unit.imei ?? `#${unit.id}`}
                              </span>
                              <span className="text-xs text-on-surface-variant">
                                {unit.custody_customer?.name ??
                                  unit.product_model?.name_ar ??
                                  unit.product_model?.name ??
                                  '—'}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </AsyncState>
                </>
              )}
            </>
          ) : (
            <>
              <h3 className="mb-sm text-sm font-bold text-on-surface">نقل كمية من مخزون الفرع</h3>
              {!fromWarehouseId ? (
                <p className="text-sm text-on-surface-variant">اختر مخزن المصدر أولاً</p>
              ) : (
                <AsyncState
                  isLoading={stockUnitsQuery.isLoading}
                  isError={stockUnitsQuery.isError}
                  error={stockUnitsQuery.error}
                >
                  {stockByModel.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">لا يوجد مخزون متاح في هذا المخزن</p>
                  ) : (
                    <div className="grid gap-md md:grid-cols-2">
                      <label className="block text-sm">
                        <span className="mb-xs block text-on-surface-variant">نوع الجهاز</span>
                        <select
                          value={productModelId}
                          onChange={(e) => {
                            setProductModelId(e.target.value ? Number(e.target.value) : '')
                            setQuantity(1)
                          }}
                          className={inputClass}
                          required
                        >
                          <option value="">اختر الموديل</option>
                          {stockByModel.map((item) => (
                            <option key={item.modelId} value={item.modelId}>
                              {item.name} ({item.count} متاح)
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm">
                        <span className="mb-xs block text-on-surface-variant">
                          الكمية{productModelId ? ` (متاح: ${availableForModel})` : ''}
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={Math.max(availableForModel, 1)}
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                          className={inputClass}
                          required
                          disabled={!productModelId}
                        />
                      </label>
                    </div>
                  )}
                </AsyncState>
              )}
            </>
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
