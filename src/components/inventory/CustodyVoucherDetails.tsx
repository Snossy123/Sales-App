import { Link } from 'react-router-dom'
import type { CustodyVoucher } from '../../api/types'
import { productUnitDisplayCode } from '../../lib/inventoryBuckets'
import { formatDatetime12hDisplay } from '../../lib/datetime12h'

function voucherTypeLabel(type?: string): string {
  if (type === 'receipt') return 'استلام'
  if (type === 'issuance') return 'صرف'
  return type ?? '—'
}

function recipientLabel(type?: string | null): string {
  if (type === 'employee') return 'موظف'
  if (type === 'customer') return 'عميل'
  return '—'
}

function DetailField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-on-surface-variant">{label}</p>
      <p className={`font-medium ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

function resolveMaintenanceContract(voucher: CustodyVoucher): {
  id: number
  label: string
} | null {
  const nested = voucher.maintenance_invoice ?? voucher.product_unit?.maintenance_invoice
  const id = voucher.maintenance_invoice_id
    ?? voucher.product_unit?.maintenance_invoice_id
    ?? nested?.id
  if (!id) return null
  const label = nested?.invoice_number?.trim() || `#${id}`
  return { id, label }
}

export function CustodyVoucherDetails({
  voucher,
  compact = false,
  deviceNotes,
}: {
  voucher: CustodyVoucher
  compact?: boolean
  deviceNotes?: string | null
}) {
  const unit = voucher.product_unit
  const model = unit?.product_model?.name_ar ?? unit?.product_model?.name ?? '—'
  const branch = voucher.branch?.name_ar ?? voucher.branch?.name ?? '—'
  const customer = voucher.customer
    ? [voucher.customer.name, voucher.customer.phone].filter(Boolean).join(' — ')
    : '—'
  const notes = voucher.notes?.trim() ?? ''
  const hideNotes = compact && notes === (deviceNotes?.trim() ?? '')
  const maintenanceContract = resolveMaintenanceContract(voucher)

  return (
    <div className="grid grid-cols-1 gap-sm text-sm sm:grid-cols-2">
      <DetailField label="رقم الإذن" value={voucher.voucher_number ?? '—'} />
      <DetailField label="النوع" value={voucherTypeLabel(voucher.type)} />
      <div>
        <p className="text-on-surface-variant">رقم العقد</p>
        {maintenanceContract ? (
          <Link
            to={`/contracts/${maintenanceContract.id}`}
            dir="ltr"
            className="font-medium text-primary hover:underline"
          >
            {maintenanceContract.label}
          </Link>
        ) : (
          <p className="font-medium">—</p>
        )}
      </div>
      <DetailField label="التاريخ والوقت" value={formatDatetime12hDisplay(voucher.created_at)} />
      {!compact && <DetailField label="السريال" value={unit ? productUnitDisplayCode(unit) : '—'} mono />}
      <DetailField label="اسم المستخدم" value={unit?.username?.trim() || '—'} />
      <DetailField label="رقم الشريحة" value={unit?.sim_number?.trim() || '—'} mono />
      {!compact && <DetailField label="الموديل" value={model} />}
      <DetailField label="الموظف" value={voucher.employee?.name ?? '—'} />
      <DetailField label="العميل" value={customer} />
      {voucher.type === 'issuance' && (
        <DetailField label="صرف إلى" value={recipientLabel(voucher.recipient_type)} />
      )}
      <DetailField label="سجّله" value={voucher.creator?.name ?? '—'} />
      <DetailField label="الفرع" value={branch} />
      {!hideNotes && (
        <div className="sm:col-span-2">
          <p className="text-on-surface-variant">ملاحظات</p>
          <p className="font-medium whitespace-pre-wrap">{notes || '—'}</p>
        </div>
      )}
    </div>
  )
}
