import type { SalesInvoice } from '../../api/types'
import {
  buildInstallmentRows,
  fmtContractDate,
  fmtContractMoney,
  lineFinancialSummary,
  resolveInvoiceLine,
  resolveLinePlan,
  resolveSerial,
  resolveSim,
  resolveTechnician,
  resolveUsername,
  resolveVehicle,
  renewalTypeLabels,
} from '../../lib/contractFields'
import '../../styles/installment-contract.css'

interface InstallmentContractDocumentProps {
  invoice: SalesInvoice
  lineId?: number
}

export function InstallmentContractDocument({ invoice, lineId }: InstallmentContractDocumentProps) {
  const customer = invoice.customer
  const line = resolveInvoiceLine(invoice, lineId)
  const plan = resolveLinePlan(line, invoice)
  const installmentRows = buildInstallmentRows(line, invoice)
  const devicePrice = Number(line?.line_total ?? invoice.subtotal ?? 0)
  const renewalType = line?.renewal_type ?? invoice.renewal_type
  const renewalDate = line?.subscription_renewal_date ?? invoice.subscription_renewal_date
  const { paid: paidForDevice, balance: balanceForDevice } = line
    ? lineFinancialSummary(line, invoice)
    : { paid: 0, balance: 0 }

  let paidDisplay = Number(invoice.paid_amount ?? paidForDevice)
  let balanceDisplay = Number(invoice.balance_due ?? balanceForDevice)
  if (plan?.items?.length && line) {
    const installmentsPaid = plan.items.reduce(
      (sum, item) => sum + Number(item.paid_amount ?? 0),
      0,
    )
    paidDisplay = Number(plan.down_payment ?? 0) + installmentsPaid
    balanceDisplay = Math.max(0, Number(line.line_total ?? 0) - paidDisplay)
  }

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
          Al Iraqi
          <span>Trading</span>
          <span>Security Systems</span>
        </div>
        <div className="ic-header-center">
          <div className="ic-logo-text">Al Iraqi</div>
          <div className="ic-logo-badge">GPS</div>
          <div className="ic-title-badge">
            عقد تقسيط
            {invoice.lines && invoice.lines.length > 1 && line
              ? ` — جهاز ${invoice.lines.indexOf(line) + 1}`
              : ''}
          </div>
        </div>
        <div className="ic-header-ar">العراقي</div>
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
            <span className="ic-field-label">رقم العميل 3:</span>
            <span className="ic-field-value">{customer?.phone_3 ?? ''}</span>
          </div>
          <div className="ic-field-row">
            <span className="ic-field-label">علامة مميزة:</span>
            <span className="ic-field-value">{customer?.distinctive_mark ?? ''}</span>
          </div>
          <div className="ic-field-row">
            <span className="ic-field-label">رقم الشريحة:</span>
            <span className="ic-field-value" dir="ltr">
              {resolveSim(line, customer)}
            </span>
          </div>
          <div className="ic-field-row">
            <span className="ic-field-label">اسم المستخدم:</span>
            <span className="ic-field-value">{resolveUsername(line, customer)}</span>
          </div>
          <div className="ic-field-row">
            <span className="ic-field-label">السريال:</span>
            <span className="ic-field-value" dir="ltr">
              {resolveSerial(line, customer)}
            </span>
          </div>
          <div className="ic-field-row">
            <span className="ic-field-label">قيمة الجهاز:</span>
            <span className="ic-field-value">{fmtContractMoney(devicePrice)}</span>
          </div>
          {line && Number(line.discount ?? 0) > 0 && (
            <div className="ic-field-row">
              <span className="ic-field-label">خصم الجهاز:</span>
              <span className="ic-field-value">{fmtContractMoney(line.discount)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="ic-summary">
        <span className="ic-summary-item">
          <strong>تم التعاقد يوم:</strong>
          <span className="ic-summary-val">{fmtContractDate(invoice.invoice_date)}</span>
        </span>
        <span className="ic-summary-item">
          <strong>تم دفع مبلغ:</strong>
          <span className="ic-summary-val">{fmtContractMoney(paidDisplay, false)}</span>
        </span>
        <span className="ic-summary-item">
          <strong>متبقى مبلغ:</strong>
          <span className="ic-summary-val">{fmtContractMoney(balanceDisplay, false)}</span>
        </span>
        <span className="ic-oval">
          <strong>الفني:</strong>
          <span className="ic-summary-val">{resolveTechnician(line, invoice)}</span>
        </span>
        <span className="ic-oval">
          <strong>المركبة:</strong>
          <span className="ic-summary-val">{resolveVehicle(line, invoice)}</span>
        </span>
      </div>

      <div className="ic-renewal-box">
        <span className="ic-summary-item">
          <strong>تاريخ تجديد اشتراك الجهاز:</strong>
          <span className="ic-summary-val">
            {renewalType === 'permanent'
              ? renewalTypeLabels.permanent
              : fmtContractDate(renewalDate ?? undefined)}
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
          {line?.product_unit?.imei ? ` — ${line.product_unit.imei}` : ''}
        </div>
      </footer>
    </article>
  )
}
