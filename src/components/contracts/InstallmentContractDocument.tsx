import type { Customer, InstallmentItem, SalesInvoice } from '../../api/types'
import { formatInvoiceDate } from '../../lib/sales'
import '../../styles/installment-contract.css'

function fmtMoney(value: string | number | null | undefined): string {
  if (value == null || value === '') return ''
  return Number(value).toLocaleString('ar-EG')
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return ''
  return formatInvoiceDate(value)
}

function resolveSerial(invoice: SalesInvoice, customer?: Customer | null): string {
  const unit = invoice.lines?.[0]?.product_unit
  return (
    customer?.device_serial ??
    unit?.serial_number ??
    unit?.imei ??
    ''
  )
}

function buildInstallmentRows(invoice: SalesInvoice): string[] {
  const plan = invoice.installment_plan
  const items: InstallmentItem[] = plan?.items ?? []
  const rows: string[] = Array.from({ length: 30 }, () => '')

  items.forEach((item) => {
    const num = item.installment_number
    if (num >= 1 && num <= 30) {
      const paid = Number(item.paid_amount ?? 0)
      const amount = Number(item.amount)
      rows[num - 1] = paid >= amount ? '✓' : fmtMoney(amount)
    }
  })

  if (plan && items.length === 0 && plan.installment_count > 0) {
    const financed = Number(invoice.total) - Number(plan.down_payment ?? 0)
    const perInstallment = Math.floor((financed / plan.installment_count) * 100) / 100
    for (let i = 0; i < Math.min(plan.installment_count, 30); i++) {
      rows[i] = fmtMoney(perInstallment)
    }
  }

  return rows
}

interface InstallmentContractDocumentProps {
  invoice: SalesInvoice
}

export function InstallmentContractDocument({ invoice }: InstallmentContractDocumentProps) {
  const customer = invoice.customer
  const installmentRows = buildInstallmentRows(invoice)

  const renderTableCol = (start: number, end: number) => (
    <div className="ic-table-col">
      {Array.from({ length: end - start + 1 }, (_, i) => {
        const num = start + i
        return (
          <div key={num} className="ic-table-row">
            <span className="ic-table-num">{num}</span>
            <span className="ic-table-val">{installmentRows[num - 1]}</span>
          </div>
        )
      })}
    </div>
  )

  return (
    <article className="installment-contract">
      <header className="ic-header">
        <div className="ic-header-en">
          Company
          <span>Eleraqy Trading</span>
          <span>Security Systems</span>
        </div>
        <div className="ic-header-center">
          <div className="ic-logo-text">Eleraqy Trading</div>
          <div className="ic-logo-badge">GPS</div>
          <div className="ic-title-badge">عقد تقسيط</div>
        </div>
        <div className="ic-header-ar">مؤسسة العراقي للتجارة</div>
      </header>

      <div className="ic-main">
        <div className="ic-table-wrap">
          <div className="ic-table-title">بيان تقسيط</div>
          <div className="ic-table-grid">
            {renderTableCol(1, 15)}
            {renderTableCol(16, 30)}
          </div>
        </div>

        <div className="ic-fields">
          <div className="ic-field-row">
            <span className="ic-field-label">السيد:</span>
            <span className="ic-field-value">{customer?.name ?? ''}</span>
          </div>
          <div className="ic-field-row">
            <span className="ic-field-label">الرقم القومي:</span>
            <span className="ic-field-value">{customer?.national_id ?? ''}</span>
          </div>
          <div className="ic-field-row">
            <span className="ic-field-label">رقم العميل 1:</span>
            <span className="ic-field-value">{customer?.phone ?? ''}</span>
          </div>
          <div className="ic-field-row">
            <span className="ic-field-label">رقم العميل 2:</span>
            <span className="ic-field-value">{customer?.phone_2 ?? ''}</span>
          </div>
          <div className="ic-field-row">
            <span className="ic-field-label">رقم الشريحة:</span>
            <span className="ic-field-value">{customer?.sim_number ?? ''}</span>
          </div>
          <div className="ic-field-row">
            <span className="ic-field-label">اسم المستخدم:</span>
            <span className="ic-field-value">{customer?.username ?? ''}</span>
          </div>
          <div className="ic-field-row">
            <span className="ic-field-label">السريال:</span>
            <span className="ic-field-value">{resolveSerial(invoice, customer)}</span>
          </div>
        </div>
      </div>

      <div className="ic-summary">
        <span className="ic-summary-item">
          <strong>تم التعاقد يوم:</strong>
          <span className="ic-summary-val">{fmtDate(invoice.invoice_date)}</span>
        </span>
        <span className="ic-summary-item">
          <strong>تم دفع مبلغ:</strong>
          <span className="ic-summary-val">{fmtMoney(invoice.paid_amount)}</span>
        </span>
        <span className="ic-summary-item">
          <strong>متبقى مبلغ:</strong>
          <span className="ic-summary-val">{fmtMoney(invoice.balance_due)}</span>
        </span>
        <span className="ic-oval">
          <strong>الفني:</strong>
          <span className="ic-summary-val">{invoice.technician_name ?? ''}</span>
        </span>
        <span className="ic-oval">
          <strong>المركبة:</strong>
          <span className="ic-summary-val">{invoice.vehicle_info ?? ''}</span>
        </span>
      </div>

      <div className="ic-renewal-box">
        <span className="ic-summary-item">
          <strong>تاريخ تجديد اشتراك الجهاز:</strong>
          <span className="ic-summary-val">
            {fmtDate(invoice.subscription_renewal_date ?? undefined)}
          </span>
        </span>
      </div>

      <div className="ic-note-box">
        <strong>ملحوظة هامة:</strong> قيمة تجديد الاشتراك السنوي هي 25% من سعر الجهاز كاش في وقت
        تجديده
      </div>

      <div className="ic-terms">
        <p>
          أقر أنا الموقع أدناه بأنني اطلعت على بنود هذا العقد ووافقت عليها، وأتعهد بالسداد في
          مواعيده المحددة. في حالة التأخير عن السداد يُفرض غرامة 10 جنيه عن كل يوم تأخير، وبعد
          مرور 3 أيام من التأخير يحق للمؤسسة قطع إشارة الجهاز أو إيقاف المركبة.
        </p>
        <p>
          في حالة رغبة العميل في فك الجهاز أو إرجاعه يتحمل 25% من قيمة الجهاز كاش وقت التركيب +
          350 ج.م رسوم سوفت وير + 150 ج.م رسوم فك + 200 ج.م فائدة شهرية. لا يحق للعميل الإرجاع
          بعد مرور 29 يوماً من تاريخ التعاقد.
        </p>
      </div>

      <div className="ic-warning">
        يجب شحن باقة الشريحة سنوياً/شهرياً حسب نوع الجهاز لتجنب قطع الإشارة ورسوم إعادة تشغيل
        السوفت وير
      </div>
      <div className="ic-warning">
        يلتزم العميل بتجديد الاشتراك السنوي في موعده المحدد أعلاه لتجنب رسوم السوفت وير
      </div>
      <div className="ic-warning">
        يحتفظ العميل بكلمة السر PIN ولا يُعطيها لأحد — في حالة نسيانها رسوم إعادة ضبط 150 ج.م
      </div>

      <div className="ic-alert-grid">
        <div className="ic-alert-box">
          <div className="ic-alert-title">في حالة سرقة المركبة</div>
          اتصل بخدمة العملاء فوراً لتفعيل التتبع.{' '}
          <strong>تحذير:</strong> لا ترسل أمر إيقاف إذا كان السارق داخل المركبة حالياً.
        </div>
        <div className="ic-alert-box">
          <div className="ic-alert-title">تنبيه هام</div>
          على العميل التحرك بسرعة نحو موقع المركبة المسروقة لمنع السارق من الوصول للجهاز. المؤسسة
          غير مسؤولة عن التأخير أو ضعف التغطية الشبكية.
        </div>
      </div>

      <div className="ic-signatures">
        <div>
          <strong>توقيع الموظف:</strong>
          <div className="ic-signature-line" />
        </div>
        <div>
          <strong>توقيع العميل بعد الموافقة على بنود العقد:</strong>
          <div className="ic-signature-line" />
        </div>
      </div>

      <div className="ic-app-bar">
        طريقة تحميل الابلكيشن (الدخول من الموبايل على متجر بلاي أو أب ستور) — iTrack
      </div>

      <footer className="ic-footer">
        <div className="ic-qr">QR</div>
        <div className="ic-contact">خدمة العملاء: 01070900079 — 01129707002</div>
        <div style={{ fontSize: '7pt', textAlign: 'left' }}>
          {invoice.invoice_number ? `#${invoice.invoice_number}` : ''}
        </div>
      </footer>
    </article>
  )
}
