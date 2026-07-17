import { forwardRef } from 'react'
import type { PaymentTransactionReceipt } from '../../api/types'
import { resolvePublicStorageUrl } from '../../lib/storageUrl'
import { useOrgSettingsStore } from '../../stores/orgSettingsStore'

const paymentMethodLabels: Record<string, string> = {
  cash: 'كاش',
  wallet: 'محفظة',
  instapay: 'انستا',
  bank_transfer: 'تحويل بنكي',
  card: 'بطاقة',
}

const paymentSourceLabels: Record<string, string> = {
  installment: 'قسط',
  external: 'تحصيل خارجي',
  down_payment: 'مقدم',
  pos_cash: 'كاش POS',
  transportation_fee: 'رسوم تنقلات',
  contract_disbursement: 'أمر دفع',
}

interface Props {
  payment: PaymentTransactionReceipt
}

function formatPaidAt(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function receivingAccountLabel(payment: PaymentTransactionReceipt): string | null {
  const parts: string[] = []
  if (payment.beneficiary_name) parts.push(payment.beneficiary_name)
  if (payment.bank_name) parts.push(payment.bank_name)
  if (payment.account_number) parts.push(payment.account_number)
  if (parts.length === 0 && payment.collection_payment_account?.phone) {
    parts.push(payment.collection_payment_account.phone)
  }
  return parts.length > 0 ? parts.join(' — ') : null
}

export const PaymentReceiptDocument = forwardRef<HTMLElement, Props>(function PaymentReceiptDocument(
  { payment },
  ref,
) {
  const organization = useOrgSettingsStore((s) => s.organization)
  const general = useOrgSettingsStore((s) => s.general)
  const logoUrl = resolvePublicStorageUrl(general?.logo_url)
  const orgName = organization?.name_ar || organization?.name || 'مؤسسة العراقي'
  const branchName =
    payment.sales_invoice?.branch?.name_ar ||
    payment.sales_invoice?.branch?.name ||
    null
  const accountLabel = receivingAccountLabel(payment)
  const installmentNumber = payment.installment_item?.sequence ?? payment.installment_item?.installment_number

  return (
    <article ref={ref} className="payment-receipt">
      <header className="pr-header">
        {logoUrl ? <img src={logoUrl} alt="" className="pr-logo" /> : null}
        <p className="pr-org-name">{orgName}</p>
        {organization?.phone ? (
          <p className="pr-org-phone" dir="ltr">
            {organization.phone}
          </p>
        ) : null}
      </header>

      <h1 className="pr-title">إيصال تحصيل</h1>

      <dl className="pr-meta">
        <div className="pr-row">
          <dt>رقم العملية</dt>
          <dd dir="ltr">{payment.transaction_number}</dd>
        </div>
        <div className="pr-row">
          <dt>التاريخ</dt>
          <dd>{formatPaidAt(payment.paid_at)}</dd>
        </div>
        <div className="pr-row">
          <dt>العميل</dt>
          <dd>{payment.customer?.name ?? '—'}</dd>
        </div>
        {payment.customer?.phone ? (
          <div className="pr-row">
            <dt>الهاتف</dt>
            <dd dir="ltr">{payment.customer.phone}</dd>
          </div>
        ) : null}
        <div className="pr-row">
          <dt>الفاتورة</dt>
          <dd dir="ltr">{payment.sales_invoice?.invoice_number ?? '—'}</dd>
        </div>
        {installmentNumber != null ? (
          <div className="pr-row">
            <dt>القسط</dt>
            <dd>#{installmentNumber}</dd>
          </div>
        ) : null}
        <div className="pr-row">
          <dt>نوع العملية</dt>
          <dd>{paymentSourceLabels[payment.payment_source ?? ''] ?? payment.payment_source ?? '—'}</dd>
        </div>
        <div className="pr-row">
          <dt>طريقة الدفع</dt>
          <dd>{paymentMethodLabels[payment.payment_method ?? ''] ?? payment.payment_method ?? '—'}</dd>
        </div>
        {accountLabel ? (
          <div className="pr-row">
            <dt>حساب الاستلام</dt>
            <dd>{accountLabel}</dd>
          </div>
        ) : null}
        {payment.sender_transfer_number ? (
          <div className="pr-row">
            <dt>رقم تحويل العميل</dt>
            <dd dir="ltr">{payment.sender_transfer_number}</dd>
          </div>
        ) : null}
        {payment.user?.name ? (
          <div className="pr-row">
            <dt>المحصّل</dt>
            <dd>{payment.user.name}</dd>
          </div>
        ) : null}
        {branchName ? (
          <div className="pr-row">
            <dt>الفرع</dt>
            <dd>{branchName}</dd>
          </div>
        ) : null}
      </dl>

      <div className="pr-amount-box">
        <p className="pr-amount-label">المبلغ المحصّل</p>
        <p className="pr-amount-value">
          {Number(payment.amount).toLocaleString('ar-EG')} ج.م
        </p>
      </div>

      <footer className="pr-footer">
        <p>شكراً لتعاملكم معنا</p>
        <p>هذا الإيصال دليل على استلام المبلغ المذكور</p>
      </footer>
    </article>
  )
})
