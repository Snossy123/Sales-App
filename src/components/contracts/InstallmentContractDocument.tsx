import type { SalesInvoice } from '../../api/types'
import {
  branchLabel,
  buildInstallmentRows,
  fmtContractDate,
  fmtContractMoney,
  lineFinancialSummary,
  resolveInvoiceLine,
  resolveLinePaymentTerm,
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

function renderTableCol(installmentRows: string[], start: number, end: number) {
  return (
    <div className="ic-tcol">
      {Array.from({ length: end - start + 1 }, (_, i) => {
        const num = start + i
        return (
          <div key={num} className="ic-trow">
            <span className="ic-tnum">{num}</span>
            <span className="ic-tdash">-</span>
            <span className="ic-tval">{installmentRows[num - 1]}</span>
          </div>
        )
      })}
    </div>
  )
}

export function InstallmentContractDocument({ invoice, lineId }: InstallmentContractDocumentProps) {
  const customer = invoice.customer
  const line = resolveInvoiceLine(invoice, lineId)
  const isInstallment = resolveLinePaymentTerm(line, invoice) === 'installment'
  const plan = resolveLinePlan(line, invoice)
  const installmentRows = buildInstallmentRows(line, invoice)
  const renewalType = line?.renewal_type ?? invoice.renewal_type
  const renewalDate = line?.subscription_renewal_date ?? invoice.subscription_renewal_date
  const { paid: paidForDevice, balance: balanceForDevice } = line
    ? lineFinancialSummary(line, invoice)
    : { paid: 0, balance: 0 }

  let paidDisplay = Number(invoice.paid_amount ?? paidForDevice)
  let balanceDisplay = Number(invoice.balance_due ?? balanceForDevice)
  if (isInstallment && plan?.items?.length && line) {
    const installmentsPaid = plan.items.reduce(
      (sum, item) => sum + Number(item.paid_amount ?? 0),
      0,
    )
    paidDisplay = Number(plan.down_payment ?? 0) + installmentsPaid
    balanceDisplay = Math.max(0, Number(line.line_total ?? 0) - paidDisplay)
  } else if (!isInstallment && line) {
    paidDisplay = Number(line.line_total ?? paidForDevice)
    balanceDisplay = 0
  }

  const deviceSuffix =
    invoice.lines && invoice.lines.length > 1 && line
      ? ` — جهاز ${invoice.lines.indexOf(line) + 1}`
      : ''

  const renewalDisplay =
    renewalType === 'permanent'
      ? renewalTypeLabels.permanent
      : fmtContractDate(renewalDate ?? undefined)

  const contractTitle = isInstallment ? `عقد تقسيط${deviceSuffix}` : `عقد كاش${deviceSuffix}`

  return (
    <article className="installment-contract">
      <div className="ic-frame">
        <header className="ic-header">
          <div className="ic-head-ar">
            <div className="ic-head-ar-top">مؤسسة</div>
            <div className="ic-head-ar-main">العراقى للتجارة</div>
            <div className="ic-head-ar-sub">{branchLabel(invoice)}</div>
          </div>
          <div className="ic-head-center">
            <div className="ic-brandwords">
              <span>Eleraqy</span>
              <span>Trading</span>
            </div>
            <img className="ic-logo-img" src="/contract/logo.png" alt="Eleraqy Trading" />
            <div className="ic-title-badge">{contractTitle}</div>
          </div>
          <div className="ic-head-en">
            <div className="ic-head-en-top">Company</div>
            <div className="ic-head-en-main">Eleraqy Trading</div>
            <div className="ic-head-en-sub">Security Systems</div>
          </div>
        </header>

        <div className={`ic-main${isInstallment ? '' : ' ic-main--cash'}`}>
          <div className="ic-fields">
            <div className="ic-field-row">
              <span className="ic-field-diamond">◆</span>
              <span className="ic-field-label">السيد :</span>
              <span className="ic-field-value">{customer?.name ?? ''}</span>
            </div>
            <div className="ic-field-row">
              <span className="ic-field-diamond">◆</span>
              <span className="ic-field-label">الرقم القومي :</span>
              <span className="ic-field-value" dir="ltr">
                {customer?.national_id ?? ''}
              </span>
            </div>
            <div className="ic-field-row">
              <span className="ic-field-diamond">◆</span>
              <span className="ic-field-label">رقم العميل 1 :</span>
              <span className="ic-field-value" dir="ltr">
                {customer?.phone ?? ''}
              </span>
            </div>
            <div className="ic-field-row">
              <span className="ic-field-diamond">◆</span>
              <span className="ic-field-label">رقم العميل 2 :</span>
              <span className="ic-field-value" dir="ltr">
                {customer?.phone_2 ?? ''}
              </span>
            </div>
            <div className="ic-field-row">
              <span className="ic-field-diamond">◆</span>
              <span className="ic-field-label">رقم الشريحة :</span>
              <span className="ic-field-value" dir="ltr">
                {resolveSim(line, customer)}
              </span>
            </div>
            <div className="ic-field-row">
              <span className="ic-field-diamond">◆</span>
              <span className="ic-field-label">اسم المستخدم :</span>
              <span className="ic-field-value">{resolveUsername(line, customer)}</span>
            </div>
            <div className="ic-field-row">
              <span className="ic-field-diamond">◆</span>
              <span className="ic-field-label">السريال :</span>
              <span className="ic-field-value" dir="ltr">
                {resolveSerial(line, customer)}
              </span>
            </div>
          </div>

          {isInstallment ? (
            <div className="ic-table-wrap">
              <div className="ic-table-title">بيان تقسيط</div>
              <div className="ic-table-grid">
                {renderTableCol(installmentRows, 1, 15)}
                {renderTableCol(installmentRows, 16, 30)}
              </div>
            </div>
          ) : null}
        </div>

        <div className="ic-summary">
          <div className="ic-srow">
            <span className="ic-pill-label">تم التعاقد يوم</span>
            <span className="ic-pill">{fmtContractDate(invoice.invoice_date)}</span>
            {!isInstallment ? (
              <>
                <span className="ic-pill-label">قيمة الجهاز</span>
                <span className="ic-pill">{fmtContractMoney(line?.line_total, false)}</span>
              </>
            ) : null}
            <span className="ic-pill-label">تم دفع مبلغ</span>
            <span className="ic-pill">{fmtContractMoney(paidDisplay, false)}</span>
            <span className="ic-pill-label">متبقى مبلغ</span>
            <span className="ic-pill">{fmtContractMoney(balanceDisplay, false)}</span>
            <span className="ic-srow-left">
              <span className="ic-pill">{resolveTechnician(line, invoice)}</span>
              <span className="ic-pill-label">الفني</span>
            </span>
          </div>

          <div className="ic-srow">
            <span className="ic-srow-center">غير شامل تجديد الاشتراك</span>
            <span className="ic-srow-left">
              <span className="ic-pill">{resolveVehicle(line, invoice)}</span>
              <span className="ic-pill-label">المركبة</span>
            </span>
          </div>

          <div className="ic-srow">
            <span className="ic-pill-label is-red">تاريخ تجديد اشتراك الجهاز</span>
            <span className="ic-pill">{renewalDisplay}</span>
            <span className="ic-note-pill">ملحوظة هامة</span>
            <span className="ic-note-text">
              قيمة تجديد الاشتراك السنوى هى 25% من سعر الجهاز كاش فى وقت تجديده
            </span>
          </div>
        </div>

        {isInstallment ? (
          <div className="ic-terms">
            الرجاء الالتزام بسداد الأقساط المستحقة دفعها في الموعد المحدد لتجنب فرض غرامة{' '}
            <b>10 جنيهات</b> لكل يوم تأخير، وفي حالة تأخير دفع القسط <b>ثلاثة أيام</b> فسوف يتم فقد
            إشارة الجهاز أو تعطيل المركبة. وفي حالة استرجاع الجهاز للشركة يلتزم العميل بدفع{' '}
            <b>25%</b> من قيمة الجهاز كاش ويتم دفع <b>350</b> سوفت وير ويتم دفع <b>150</b> جنية رسوم
            فك ويطبق نسبة الفوائد <b>200</b> جنية لكل شهر مع دفع حق أي اجزاء تالفة للجهاز، ولا يحق
            للعميل استرجاع الجهاز بعد مرور <b>29 يوم</b>
          </div>
        ) : (
          <div className="ic-terms">
            أقر أنا الموقع أدناه بأنني اطلعت على بنود هذا العقد ووافقت عليها. في حالة رغبة العميل في
            فك الجهاز أو إرجاعه يتحمل <b>25%</b> من قيمة الجهاز كاش وقت التركيب + <b>350</b> ج.م
            رسوم سوفت وير + <b>150</b> ج.م رسوم فك. لا يحق للعميل الإرجاع بعد مرور <b>29 يوم</b> من
            تاريخ التعاقد.
          </div>
        )}

        <div className="ic-warning">
          برجاء الإلتزام بشحن الباقة السنوية أو الشهرية الخاصة بالشريحة لتجنب إيقاف الشريحة وفقد
          إشارة الجهاز وإلزامك لعمل سوفت وير
        </div>
        <div className="ic-warning">
          برجاء الإلتزام بموعد تجديد الاشتراك السنوي للجهاز لتجنب عمل سوفت وير
        </div>
        <div className="ic-warning">
          برجاء الحفاظ على الرقم السرى لتجنب دفع 150 جنية رسوم ريست
        </div>

        <div className="ic-alert-grid">
          <div className="ic-alert-box">
            <div className="ic-alert-title">في حالة سرقة المركبة</div>
            يلتزم العميل بالإتصال بخدمة الطوارئ فوراً في نفس وقت السرقة للحصول على اسرع اتجاهات
            المركبة المسروقة وسرعة تحديد موقعها.{' '}
            <span className="is-red">تحذير هام:</span> ممنوع إرسال أمر إيقاف للمركبة في حالة
            السرقة لعدم لفت انتباه السارق بوجود جهاز تحكم
          </div>
          <div className="ic-alert-badge">
            <span>تنبيه</span>
            <span>هام</span>
          </div>
          <div className="ic-alert-box">
            على العميل الإلتزام بسرعة التحرك في إتجاه المركبة المسروقة لتجنب إعطاء وقت للسارق
            للوصول الى الجهاز أو فك الضفيرة كاملة والشركة غير مسئولة عن أى مشكلة نتيجة تأخر الوصول
            الى المركبة أو أى مشاكل تخص تغطية الشبكات
          </div>
        </div>

        <div className="ic-signatures">
          <div>
            توقيع الموظف <span className="ic-sign-name">{resolveTechnician(line, invoice)}</span>
          </div>
          <div>
            توقيع العميل بعد الموافقة على بنود العقد / <span className="ic-sign-dots">………………………</span>
          </div>
        </div>

        <div className="ic-app-bar">
          <span>
            طريقة تحميل الابلكيشن (الدخول من <span className="is-red">الموبايل</span> على متجر بلاي
            أو أب ستور)
          </span>
          <img src="/contract/itrack.png" alt="iTrack" />
        </div>

        <div className="ic-footer">
          <div className="ic-contact">
            <span className="ic-contact-label">خدمة العملاء :</span>
            <span className="ic-contact-icons">☎</span>
            <span className="ic-contact-num">01070900079-01129707002</span>
          </div>
          <div className="ic-qr">
            <img src="/contract/qr.png" alt="QR" />
          </div>
          <div className="ic-ref">
            {invoice.invoice_number ? `#${invoice.invoice_number}` : ''}
            {line?.product_unit?.imei ? ` — ${line.product_unit.imei}` : ''}
          </div>
        </div>
      </div>
    </article>
  )
}
