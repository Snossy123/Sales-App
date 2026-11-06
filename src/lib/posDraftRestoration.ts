import type { Branch, GpsProduct, ProductUnit, Warehouse } from '../api/types'
import type { DeviceContractDraft } from '../stores/salesDraftStore'
import { allowsManualDeviceEntry } from './contractKinds'
import { resolveGpsUnitPrice } from './gpsProductPricing'

export function inspectPosDraftRestoration(draft: DeviceContractDraft, current: {
  branches: Branch[]; warehouses: Warehouse[]; units: ProductUnit[]; product?: GpsProduct
}) {
  const issues: string[] = []
  const priceWarnings: string[] = []
  const branchId = draft.selectedBranch?.id ?? (draft.transactionSource === 'distributor' ? draft.selectedDistributor?.branch_id : draft.selectedSalesRep?.branch_id) ?? draft.contextBranchId
  if (branchId && !current.branches.some((branch) => branch.id === branchId && branch.is_active !== false)) issues.push('الفرع المحفوظ لم يعد متاحًا. اختر مصدر التعاقد من جديد.')
  if (draft.warehouseId && !current.warehouses.some((warehouse) => warehouse.id === draft.warehouseId && warehouse.is_active !== false)) issues.push('المخزن المحفوظ لم يعد متاحًا. اختر مخزنًا متاحًا من الشريط العلوي.')
  if (!allowsManualDeviceEntry(draft.contractKind)) {
    for (const [index, line] of draft.deviceLines.entries()) {
      if (line.productUnitId && !current.units.some((unit) => unit.id === line.productUnitId && unit.state === 'available' && unit.warehouse_id === draft.warehouseId)) {
        issues.push(`الجهاز رقم ${index + 1} لم يعد متاحًا في هذا المخزن. أعد اختيار وحدات المخزون.`)
      }
    }
  }
  if (current.product && draft.contractKind !== 'ownership_transfer') {
    for (const [index, line] of draft.deviceLines.entries()) {
      const price = resolveGpsUnitPrice(current.product, { contractKind: draft.contractKind, paymentTerm: line.paymentTerm, renewalType: line.renewalType })
      if (Math.abs(price - line.unitPrice) > 0.009) priceWarnings.push(`سعر الجهاز رقم ${index + 1} المحفوظ ${line.unitPrice} ج.م؛ السعر الحالي ${price} ج.م.`)
    }
  }
  return { issues, priceWarnings }
}
