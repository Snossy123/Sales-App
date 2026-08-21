import type { ReactNode } from 'react'
import type { InstallmentItem, SalesInvoice, SalesInvoiceLine } from '../../api/types'
import {
  branchLabel,
  resolveInvoiceLine,
  resolveSerial,
  resolveTechnician,
  resolveUsername,
} from '../../lib/contractFields'
import { isServiceInvoiceLine } from '../../lib/sales'
import { ContractPrintHeader } from './ContractPrintHeader'
import '../../styles/installment-contract.css'

interface ServiceReceiptDocumentProps {
  invoice: SalesInvoice
  lineId?: number
}

const PROCEDURE_ORDINALS = ['الاول', 'الثاني', 'الثالث', 'الرابع'] as const

function procedureLabel(index: number): string {
  const ordinal = PROCEDURE_ORDINALS[index]
  return ordinal ? `الاجراء ${ordinal}` : `الاجراء ${index + 1}`
}

function fmtSlashDate(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} / ${d.getMonth() + 1} / ${d.getFullYear()}`
}

function fmtFee(value?: string | number | null): string {
  if (value == null || value === '') return ''
  const n = Number(value)
  if (Number.isNaN(n)) return String(value)
  return n.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 2 })
}

function lineDescription(line?: SalesInvoiceLine): string {
  const catalog =
    line?.description?.trim() ||
    line?.service?.name_ar?.trim() ||
    line?.service?.name?.trim() ||
    ''
  if (catalog) return catalog
  if (line?.line_contract_kind === 'subscription_renewal' || line?.renewal_type === 'annual') {
    return 'تجديد اشتراك سنوي'
  }
  if (line?.line_contract_kind === 'external_device') {
    return 'جهاز خارج الشركة'
  }
  return ''
}

function receiptProcedureLines(invoice: SalesInvoice, focused?: SalesInvoiceLine, invoiceScoped = false): SalesInvoiceLine[] {
  const all = invoice.lines ?? []
  if (invoiceScoped) return all
  const services = all.filter(isServiceInvoiceLine)
  if (!focused) return services
  if (services.some((line) => line.id === focused.id)) {
    return [focused, ...services.filter((line) => line.id !== focused.id)]
  }
  return [focused, ...all.filter((line) => line.id !== focused.id)]
}

function receiptIdentityLine(invoice: SalesInvoice, focused?: SalesInvoiceLine): SalesInvoiceLine | undefined {
  if (focused && (focused.serial_number || focused.username || focused.sim_number)) {
    return focused
  }
  return (
    (invoice.lines ?? []).find(
      (line) =>
        Boolean(line.serial_number || line.sim_number || line.username || line.line_contract_kind),
    ) ?? focused
  )
}

function dashedValue(value: string, opts?: { dir?: 'ltr' | 'rtl' }): ReactNode {
  return (
    <span className="sr-dash" dir={opts?.dir}>
      {value}
    </span>
  )
}

function receiptTechnician(invoice: SalesInvoice): string {
  const fromInvoice = resolveTechnician(undefined, invoice)
  if (fromInvoice) return fromInvoice
  const line = (invoice.lines ?? []).find((item) => item.technician?.name)
  return resolveTechnician(line, invoice)
}

function receiptInstallmentItems(invoice: SalesInvoice): InstallmentItem[] {
  const invoicePlan = invoice.installment_plan
  if (invoicePlan?.items?.length) return [...invoicePlan.items]
  const plans = invoice.installment_plans ?? []
  return plans
    .flatMap((plan) => plan.items ?? [])
    .sort((a, b) => {
      const seq = Number(a.sequence ?? a.installment_number ?? 0) - Number(b.sequence ?? b.installment_number ?? 0)
      if (seq !== 0) return seq
      return String(a.due_date).localeCompare(String(b.due_date))
    })
}

export function ServiceReceiptDocument({ invoice, lineId }: ServiceReceiptDocumentProps) {
  const customer = invoice.customer
  const invoiceScoped = lineId == null || !Number.isFinite(lineId) || lineId <= 0
  const focused = invoiceScoped ? undefined : resolveInvoiceLine(invoice, lineId)
  const identityLine = receiptIdentityLine(invoice, focused)
  const procedures = receiptProcedureLines(invoice, focused, invoiceScoped)
  const invoiceDate = fmtSlashDate(invoice.invoice_date)
  const branch = branchLabel(invoice)
  const branchDisplay = branch && branch !== '—' ? branch : ''
  const technician = receiptTechnician(invoice)
  const total = Number(invoice.total ?? 0)
  const paidNow = Number(invoice.paid_amount ?? 0)
  const balanceDue = Number(invoice.balance_due ?? Math.max(0, total - paidNow))
  const installmentItems = receiptInstallmentItems(invoice)

  return (
    <article className="installment-contract service-receipt">
      <div className="ic-frame">
        <img
          className="ic-frame-border"
          src="/contract-frame.svg"
          alt=""
          aria-hidden="true"
          draggable={false}
        />

        <ContractPrintHeader title="بيان فك وتركيب" branchLabel={branchDisplay} />

        <div className="sr-meta">
          <div className="sr-meta-date">
            اليوم الموافق {invoiceDate || '/ / 202'}
          </div>
        </div>

        <div className="sr-info-grid">
          <div className="sr-info-cell">
            <span className="sr-info-label">اسم العميل :</span>
            {dashedValue(customer?.name ?? '')}
          </div>
          <div className="sr-info-cell">
            <span className="sr-info-label">اسم المستخدم :</span>
            {dashedValue(resolveUsername(identityLine, customer))}
          </div>
          <div className="sr-info-cell">
            <span className="sr-info-label">رقم الموبايل :</span>
            {dashedValue(customer?.phone ?? '', { dir: 'ltr' })}
          </div>
          <div className="sr-info-cell">
            <span className="sr-info-label">رقم السيريال :</span>
            {dashedValue(resolveSerial(identityLine, customer), { dir: 'ltr' })}
          </div>
        </div>

        <div className="sr-work">
          <img
            className="sr-watermark"
            src="/contract/logo.png"
            alt=""
            aria-hidden="true"
            draggable={false}
          />
          <div className="sr-work-title">ما تم طلبه من العميل وانجازة من فريق العمل</div>
          {procedures.length > 0 && (
            <table className="sr-proc-table">
              <tbody>
                {procedures.map((line, index) => (
                  <tr key={line.id ?? index}>
                    <td className="sr-proc-cell">
                      <div className="sr-proc-line">
                        <span className="sr-procedure-label">- {procedureLabel(index)}/</span>
                        <span className="sr-procedure-notes">{lineDescription(line)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <table className="sr-fees">
          <thead>
            <tr>
              <th>الفني</th>
              <th>الرسوم</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{technician}</td>
              <td>{fmtFee(total)}</td>
              <td>{invoiceDate || '/ / 202'}</td>
            </tr>
          </tbody>
        </table>

        <table className="sr-pay">
          <tbody>
            <tr>
              <th>المدفوع الآن</th>
              <td>{fmtFee(paidNow)}</td>
            </tr>
            <tr>
              <th>الباقي</th>
              <td>{fmtFee(balanceDue)}</td>
            </tr>
          </tbody>
        </table>

        {installmentItems.length > 0 ? (
          <table className="sr-installments">
            <thead>
              <tr>
                <th>#</th>
                <th>الاستحقاق</th>
                <th>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {installmentItems.map((item, index) => (
                <tr key={item.id ?? index}>
                  <td>{item.sequence ?? item.installment_number ?? index + 1}</td>
                  <td>{fmtSlashDate(item.due_date)}</td>
                  <td>{fmtFee(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        <div className="sr-sign">
          <div>توقيع المسؤول</div>
          <div className="sr-sign-line" />
        </div>
      </div>
    </article>
  )
}
