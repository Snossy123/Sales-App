import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { SalesInvoice } from '../../api/types'
import {
  branchLabel,
  buildInstallmentRows,
  fmtContractDate,
  fmtContractDateWithWeekday,
  fmtContractMoney,
  installmentTableColumnCount,
  type InstallmentTableCell,
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

// Local d/m/yyyy formatters (no leading zeros) to match the client's printed layout,
// without altering the shared fmtContractDate used by other documents.
const IC_AR_WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
function fmtDMY(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return fmtContractDate(value)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}
function fmtDMYWeekday(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return fmtContractDateWithWeekday(value)
  const day = IC_AR_WEEKDAYS[d.getDay()] ?? ''
  return day ? `${day} ${fmtDMY(value)}` : fmtDMY(value)
}
// Bare amount — no currency symbol, no thousands separator (matches the client's pills).
function fmtAmount(value?: string | number | null): string {
  if (value == null || value === '') return '—'
  const n = Number(value)
  if (Number.isNaN(n)) return String(value)
  return n.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 2 })
}

// Fit a single-line text to its container width by shrinking the font just enough.
// The warning texts are fixed but column widths differ, and the real AL Mateen glyphs
// are wider than the old fallback — a static font-size would still clip in the narrow
// column. This measures actual layout (after fonts load) and scales down to guarantee
// a single line with zero clipped characters, never scaling up past the CSS size.
function FitOneLine({
  className,
  children,
  spread = false,
}: {
  className?: string
  children: ReactNode
  spread?: boolean
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [fontPx, setFontPx] = useState<number | undefined>(undefined)
  const [wordSpacingPx, setWordSpacingPx] = useState<number | undefined>(undefined)

  useLayoutEffect(() => {
    const box = boxRef.current
    const text = textRef.current
    if (!box || !text) return
    let cancelled = false
    const MIN_PX = 9 // ~6.75pt floor — below this the text is unreadable

    const fit = () => {
      if (cancelled || !box || !text) return
      // Read the CSS-defined size as the natural maximum (never grow past it).
      text.style.fontSize = ''
      text.style.wordSpacing = ''
      // Measure content width (not the stretched block) so leftover space is real.
      text.style.display = 'inline-block'
      text.style.width = 'max-content'
      const basePx = parseFloat(getComputedStyle(text).fontSize)
      const cs = getComputedStyle(box)
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
      const avail = box.clientWidth - padX
      if (avail <= 0 || !basePx) return
      const natural = text.getBoundingClientRect().width
      if (natural <= avail) {
        setFontPx(undefined) // fits at full size — let CSS own it
        if (spread) {
          const raw = text.textContent ?? ''
          const spaces = (raw.match(/\s+/g) ?? []).length
          const extra = avail - natural
          setWordSpacingPx(spaces > 0 && extra > 0.5 ? extra / spaces : undefined)
          text.style.display = 'block'
          text.style.width = '100%'
        } else {
          setWordSpacingPx(undefined)
          text.style.display = ''
          text.style.width = ''
        }
        return
      }
      setWordSpacingPx(undefined)
      // Proportional first guess with a 1% safety margin, then verify & nudge down.
      let px = Math.max(MIN_PX, ((basePx * avail) / natural) * 0.99)
      text.style.fontSize = `${px}px`
      let guard = 0
      while (text.getBoundingClientRect().width > avail && px > MIN_PX && guard < 60) {
        px -= 0.5
        text.style.fontSize = `${px}px`
        guard++
      }
      text.style.display = spread ? 'block' : ''
      text.style.width = spread ? '100%' : ''
      setFontPx(px)
    }

    fit()
    // Re-fit once the real font has loaded (its glyph metrics differ from fallback).
    let raf = 0
    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (!cancelled) raf = requestAnimationFrame(fit)
      })
    }
    const ro = new ResizeObserver(() => fit())
    ro.observe(box)
    return () => {
      cancelled = true
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [children, spread])

  const textStyle: CSSProperties | undefined =
    fontPx || wordSpacingPx != null || spread
      ? {
          ...(fontPx ? { fontSize: `${fontPx}px` } : null),
          ...(wordSpacingPx != null ? { wordSpacing: `${wordSpacingPx}px` } : null),
          ...(spread ? { display: 'block', width: '100%' } : null),
        }
      : undefined

  return (
    <div ref={boxRef} className={className}>
      <span ref={textRef} style={textStyle}>
        {children}
      </span>
    </div>
  )
}

function renderTableCol(installmentRows: InstallmentTableCell[], start: number, end: number) {
  return (
    <div className="ic-tcol">
      <div className="ic-trow ic-trow--head">
        <span className="ic-tnum">م</span>
        <span className="ic-tcell">استحقاق</span>
        <span className="ic-tcell">سداد</span>
      </div>
      {Array.from({ length: end - start + 1 }, (_, i) => {
        const num = start + i
        const cell = installmentRows[num - 1] ?? { amount: '', due: '', paid: '' }
        return (
          <div key={num} className="ic-trow">
            <span className="ic-tnum">{num}</span>
            <span className="ic-tcell">{cell.due}</span>
            <span className="ic-tcell">{cell.paid}</span>
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
  const installmentCount = Math.max(
    plan?.installment_count ?? 0,
    plan?.items?.length ?? 0,
    installmentRows.length,
  )
  const tableCols = installmentTableColumnCount(installmentCount || 1)
  const renewalType = line?.renewal_type ?? invoice.renewal_type
  const renewalDate = line?.subscription_renewal_date ?? invoice.subscription_renewal_date
  const { paid: paidForDevice, balance: balanceForDevice, installationShare } = line
    ? lineFinancialSummary(line, invoice)
    : { paid: 0, balance: 0, installationShare: 0 }

  let paidDisplay = Number(invoice.paid_amount ?? paidForDevice)
  let balanceDisplay = Number(invoice.balance_due ?? balanceForDevice)
  const feesDisplay = installationShare
  const downPaymentDisplay = Number(plan?.down_payment ?? 0)
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
      : fmtDMY(renewalDate ?? undefined)

  const contractTitle = isInstallment ? `عقد تقسيط${deviceSuffix}` : `عقد كاش${deviceSuffix}`

  const installmentAmount =
    plan?.installment_amount != null
      ? Number(plan.installment_amount)
      : plan && line
        ? Math.floor(
            ((Number(line.line_total ?? 0) - Number(plan.down_payment ?? 0)) /
              Math.max(1, Number(plan.installment_count ?? 1))) *
              100,
          ) / 100
        : 0
  const scheduleCount = Number(plan?.installment_count ?? 0)
  const scheduleUnit = plan?.interval_type === 'weekly' ? 'أسبوع' : 'شهر'
  const scheduleLabel =
    isInstallment && scheduleCount > 0
      ? `${fmtContractMoney(installmentAmount, false)} لمدة ${scheduleCount} ${scheduleUnit}`
      : ''

  return (
    <article className="installment-contract">
      <div className="ic-frame">
        <img
          className="ic-frame-border"
          src="/contract-frame.svg"
          alt=""
          aria-hidden="true"
          draggable={false}
        />
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

        <div
          className={`ic-main${isInstallment ? '' : ' ic-main--cash'}${
            isInstallment ? ` ic-main--table-cols-${tableCols}` : ''
          }`}
        >
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
              <div className={`ic-table-grid ic-table-grid--cols-${tableCols}`}>
                {Array.from({ length: tableCols }, (_, i) =>
                  renderTableCol(installmentRows, i * 15 + 1, i * 15 + 15),
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="ic-summary">
          <div className="ic-srow ic-srow--money">
            <span className="ic-srow-item ic-srow-item--date">
              <span className="ic-pill-label">تم التعاقد يوم</span>
              <span className="ic-pill ic-pill--date">{fmtDMYWeekday(invoice.invoice_date)}</span>
            </span>
            {!isInstallment ? (
              <>
                <span className="ic-srow-item ic-srow-item--amount">
                  <span className="ic-pill-label">قيمة الجهاز</span>
                  <span className="ic-pill">{fmtAmount(line?.line_total)}</span>
                </span>
                <span className="ic-srow-item ic-srow-item--amount">
                  <span className="ic-pill-label">تم دفع مبلغ</span>
                  <span className="ic-pill">{fmtAmount(paidDisplay)}</span>
                </span>
              </>
            ) : (
              <>
                <span className="ic-srow-item ic-srow-item--amount">
                  <span className="ic-pill-label">رسوم</span>
                  <span className="ic-pill ic-pill--num-sm">{fmtAmount(feesDisplay)}</span>
                </span>
                <span className="ic-srow-item ic-srow-item--amount">
                  <span className="ic-pill-label">مقدم</span>
                  <span className="ic-pill ic-pill--num-sm">{fmtAmount(downPaymentDisplay)}</span>
                </span>
              </>
            )}
            <span className="ic-srow-item ic-srow-item--grow">
              <span className="ic-pill-label">متبقى مبلغ</span>
              <span className="ic-pill">{fmtAmount(balanceDisplay)}</span>
            </span>
            <span className="ic-srow-item ic-srow-item--grow">
              <span className="ic-pill-label">الفني</span>
              <span className="ic-pill ic-pill--sm">{resolveTechnician(line, invoice)}</span>
            </span>
          </div>

          <div className="ic-srow ic-srow--fill">
            {scheduleLabel ? (
              <span className="ic-pill ic-pill--schedule">{scheduleLabel}</span>
            ) : null}
            <span className="ic-exclude-pill">
              {renewalType === 'permanent' ? 'شامل تجديد الاشتراك' : 'غير شامل تجديد الاشتراك'}
            </span>
            <span className="ic-srow-item">
              <span className="ic-pill-label">المركبة</span>
              <span className="ic-pill ic-pill--sm">{resolveVehicle(line, invoice)}</span>
            </span>
          </div>

          <div className="ic-srow ic-srow--renewal">
            <span className="ic-pill ic-pill--renewal-date">
              <span className="ic-renewal-in-pill">تاريخ تجديد اشتراك الجهاز</span>
              {renewalDisplay}
            </span>
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

        <FitOneLine className="ic-warning ic-warning--line" spread>
          برجاء الإلتزام بشحن الباقة السنوية أو الشهرية الخاصة بالشريحة لتجنب إيقاف الشريحة وفقد
          إشارة الجهاز وإلزامك لعمل سوفت وير
        </FitOneLine>
        <div className="ic-warning-row">
          <FitOneLine className="ic-warning ic-warning--line" spread>
            برجاء الإلتزام بموعد تجديد الاشتراك السنوي للجهاز لتجنب عمل سوفت وير
          </FitOneLine>
          <FitOneLine className="ic-warning ic-warning--line" spread>
            برجاء الحفاظ على الرقم السرى لتجنب دفع 150 جنية رسوم ريسيت
          </FitOneLine>
        </div>

        <div className="ic-alert-grid">
          <div className="ic-alert-box ic-alert-box--theft">
            <p style={{ textAlign: "center" }}>
       
              في حالة السرقة يلتزم العميل بالإتصال بخدمة الطوارئ فوراً في نفس وقت السرقة
              
              للحصول على أسرع اتجاهات المركبة المسروقة وسرعة تحديد موقعها
              <br />
              <span className="ic-alert-warn is-red">تحذير هام</span>
              ممنوع إرسال أمر إيقاف للمركبة في حالة السرقة
              لعدم لفت انتباه السارق بوجود جهاز تحكم
            </p>
          </div>
          <div className="ic-alert-badge">
            <span>تنبيه</span>
            <span>هام</span>
          </div>
          <div className="ic-alert-box">
            <p style={{ textAlign: "center" }}>
              على العميل الإلتزام بسرعة التحرك في إتجاه المركبة المسروقة
              لتجنب إعطاء وقت للسارق للوصول الى الجهاز أو فك الضفيرة كاملة    
              والشركة غير مسئولة عن أى مشكلة نتيجة تأخر الوصول
              الى المركبة أو أى مشاكل تخص تغطية الشبكات
            </p>
          </div>
        </div>

        <div className="ic-signatures">
          <div>
            توقيع الموظف <span className="ic-sign-name">{resolveTechnician(line, invoice)}</span>
          </div>
          <div>
            توقيع العميل بعد الموافقة على بنود العقد / <span className="ic-sign-line" />
          </div>
        </div>

        <div className="ic-footer">
          <div className="ic-app-bar">
            <span className="ic-app-text">
              طريقة تحميل الابلكيشن (الدخول من <span className="is-red">الموبايل</span> على متجر بلاي
              أو أب ستور)
            </span>
            <span className="ic-app-brand">
              <span className="ic-app-icon" aria-hidden="true">
                <svg className="ic-app-gps" viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg">
                  <path
                    fill="currentColor"
                    d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"
                  />
                </svg>
              </span>
              <span className="ic-app-name">iTrack</span>
            </span>
          </div>
          <div className="ic-contact-bar">
            <span className="ic-contact-label">خدمة العملاء :</span>
            <span className="ic-contact-num" dir="ltr">
              01070900079-01129707002
            </span>
            <span className="ic-contact-icons" aria-hidden="true">
              <span className="ic-icon-phone">
                <svg viewBox="0 0 512 512" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C12.1 30.2 0 46 0 64C0 311.4 200.6 512 448 512c18 0 33.8-12.1 38.6-29.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6L304.7 368C234.3 334.7 177.3 277.7 144 207.3L193.3 167c13.7-11.2 18.4-30 11.6-46.3l-40-96z"
                  />
                </svg>
              </span>
              <span className="ic-icon-wa">
                <svg viewBox="0 0 448 512" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 335.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"
                  />
                </svg>
              </span>
            </span>
          </div>
          <div className="ic-qr">
            <img src="/contract/qr.png" alt="QR" />
          </div>
          <div className="ic-footer-meta">
            <div className="ic-ref">
              {invoice.invoice_number ? `#${invoice.invoice_number}` : ''}
              {' — '}
              {new Date().toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className="ic-credit">Developed by CTS — 01125833982</div>
          </div>
        </div>
      </div>
    </article>
  )
}
