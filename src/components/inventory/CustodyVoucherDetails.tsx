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

export function CustodyVoucherDetails({ voucher }: { voucher: CustodyVoucher }) {
  const unit = voucher.product_unit
  const model = unit?.product_model?.name_ar ?? unit?.product_model?.name ?? '—'
  const branch = voucher.branch?.name_ar ?? voucher.branch?.name ?? '—'
  const customer = voucher.customer
    ? [voucher.customer.name, voucher.customer.phone].filter(Boolean).join(' — ')
    : '—'

  return (
    <div className="grid grid-cols-1 gap-sm text-sm sm:grid-cols-2">
      <DetailField label="رقم الإذن" value={voucher.voucher_number ?? '—'} />
      <DetailField label="النوع" value={voucherTypeLabel(voucher.type)} />
      <DetailField label="التاريخ والوقت" value={formatDatetime12hDisplay(voucher.created_at)} />
      <DetailField label="السريال" value={unit ? productUnitDisplayCode(unit) : '—'} mono />
      <DetailField label="الموديل" value={model} />
      <DetailField label="الموظف" value={voucher.employee?.name ?? '—'} />
      <DetailField label="العميل" value={customer} />
      {voucher.type === 'issuance' && (
        <DetailField label="صرف إلى" value={recipientLabel(voucher.recipient_type)} />
      )}
      <DetailField label="سجّله" value={voucher.creator?.name ?? '—'} />
      <DetailField label="الفرع" value={branch} />
      <div className="sm:col-span-2">
        <p className="text-on-surface-variant">ملاحظات</p>
        <p className="font-medium whitespace-pre-wrap">{voucher.notes?.trim() || '—'}</p>
      </div>
    </div>
  )
}
