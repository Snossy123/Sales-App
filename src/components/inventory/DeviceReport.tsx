import { ContractPrintBorder } from '../contracts/ContractPrintBorder'
import { ContractPrintHeader } from '../contracts/ContractPrintHeader'
import type { CustodyVoucher, ProductUnit } from '../../api/types'
import { formatDatetime12hDisplay } from '../../lib/datetime12h'
import { formatVisitDate, inventoryBucketLabel, maintenanceVisitStatusLabel, productUnitDisplayCode, productUnitStateLabel } from '../../lib/inventoryBuckets'

function deviceInformation(unit: ProductUnit): Array<[string, string]> {
  const fields: Array<[string, string]> = [
    ['رقم الجهاز', productUnitDisplayCode(unit)],
    ['السريال الفعلي', unit.physical_serial || '—'],
    ['اسم المستخدم', unit.username || '—'],
    ['الموديل', unit.product_model?.name_ar || unit.product_model?.name || '—'],
    ['رقم الشريحة', unit.sim_number || '—'],
    ['التصنيف', inventoryBucketLabel(unit.inventory_bucket) || '—'],
    ['الحالة', productUnitStateLabel(unit.state) || '—'],
    ['الموظف', unit.custody_employee?.name || '—'],
    ['العميل', unit.custody_customer?.name || '—'],
    ['تاريخ الاستلام', formatDatetime12hDisplay(unit.custody_received_at)],
  ]
  if (unit.inventory_bucket === 'custody_maintenance') fields.push(
    ['حالة الصيانة', maintenanceVisitStatusLabel(unit)],
    ['تاريخ الدخول', formatVisitDate(unit.maintenance_entered_on)],
    ['تاريخ الخروج', formatVisitDate(unit.maintenance_exited_on)],
  )
  fields.push(['ملاحظات الجهاز', unit.notes?.trim() || '—'])
  return fields
}

export function DeviceInformation({ unit, print = false }: { unit: ProductUnit; print?: boolean }) {
  const fields = deviceInformation(unit)
  if (print) return <table className="device-information"><tbody>{fields.map(([label, value]) => (
    <tr key={label}><th scope="row">{label}</th><td><bdi>{value}</bdi></td></tr>
  ))}</tbody></table>
  return <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg border border-outline-variant bg-surface-container-low p-3 text-sm sm:grid-cols-2">
    {fields.map(([label, value]) => <div key={label} className={label === 'ملاحظات الجهاز' ? 'sm:col-span-2' : ''}>
      <dt className="text-xs text-on-surface-variant">{label}</dt>
      <dd className="whitespace-pre-wrap break-words font-medium"><bdi>{value}</bdi></dd>
    </div>)}
  </dl>
}

export function DeviceHistoryTable({ vouchers }: { vouchers: CustodyVoucher[] }) {
  const sorted = [...vouchers].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || b.id - a.id)
  return <table className="device-history w-full text-start text-xs">
    <thead><tr>{['رقم الإذن', 'نوع الحركة', 'التاريخ والوقت', 'الموظف', 'الفرع', 'الملاحظات'].map((label) =>
      <th scope="col" key={label} className="border-b border-outline-variant bg-surface-container-low p-2 text-start font-medium">{label}</th>,
    )}</tr></thead>
    <tbody>{sorted.length ? sorted.map((voucher) => <tr key={voucher.id}>
      {[
        voucher.voucher_number || `#${voucher.id}`,
        voucher.type === 'receipt' ? 'استلام' : voucher.type === 'issuance' ? `صرف — ${voucher.recipient_type === 'customer' ? 'عميل' : voucher.recipient_type === 'employee' ? 'موظف' : '—'}` : voucher.type,
        formatDatetime12hDisplay(voucher.created_at),
        voucher.employee?.name,
        voucher.branch?.name_ar || voucher.branch?.name, voucher.notes,
      ].map((value, index) => <td key={index} className="border-b border-outline-variant p-2 align-top whitespace-pre-wrap break-words"><bdi>{value || '—'}</bdi></td>)}
    </tr>) : <tr><td colSpan={6} className="p-4 text-center">لا يوجد سجل حركة لهذا الجهاز.</td></tr>}</tbody>
  </table>
}

export function DeviceReport({ unit, vouchers, companyName, logoUrl, borderUrl, generatedAt }: {
  unit: ProductUnit; vouchers: CustodyVoucher[]; companyName?: string; logoUrl?: string | null; borderUrl?: string; generatedAt: string
}) {
  return <article className="device-report" dir="rtl" lang="ar">
    <ContractPrintBorder src={borderUrl} />
    <ContractPrintHeader title="تقرير بيانات وسجل حركة الجهاز" companyName={companyName} logoUrl={logoUrl || undefined} />
    <div className="report-meta"><span>رقم الجهاز: <bdi>{productUnitDisplayCode(unit)}</bdi></span><span>تاريخ إصدار التقرير: <bdi>{generatedAt}</bdi></span></div>
    <h2>بيانات الجهاز</h2><DeviceInformation unit={unit} print />
    <h2>سجل حركة وعهدة الجهاز</h2><DeviceHistoryTable vouchers={vouchers} />
    <footer className="report-signatures">{['توقيع العميل', 'توقيع الموظف', 'توقيع المسؤول', 'ختم الشركة'].map((label) => <div key={label}><strong>{label}</strong><span>........................</span></div>)}</footer>
  </article>
}
