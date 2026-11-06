import { ContractPrintBorder } from './ContractPrintBorder'
import { ContractPrintFooter } from './ContractPrintFooter'
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
  resolveLinePlan,
  resolveSerial,
  resolveSim,
  resolveTechnician,
  resolveUsername,
  resolveVehicle,
  renewalTypeLabels,
  usesCashContractTemplate,
  vehicleTypeLabels,
  displayPersonName,
} from '../../lib/contractFields'
import { useAuthStore } from '../../stores/authStore'
import { ContractPrintHeader } from './ContractPrintHeader'
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
function fmtPrintStamp(value = new Date()): string {
  const date = `${value.getDate()}/${value.getMonth() + 1}/${value.getFullYear()}`
  const time = value.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${date}, ${time}`
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
  dir,
}: {
  className?: string
  children: ReactNode
  spread?: boolean
  dir?: 'ltr' | 'rtl'
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
      text.style.flex = '0 0 auto'
      text.style.width = 'max-content'
      text.style.minWidth = 'max-content'
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
          text.style.flex = ''
          text.style.width = '100%'
          text.style.minWidth = ''
        } else {
          setWordSpacingPx(undefined)
          text.style.display = ''
          text.style.flex = ''
          text.style.width = ''
          text.style.minWidth = ''
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
      text.style.flex = ''
      text.style.width = spread ? '100%' : ''
      text.style.minWidth = ''
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
  }, [children, dir, spread])

  const textStyle: CSSProperties | undefined =
    fontPx || wordSpacingPx != null || spread
      ? {
          ...(fontPx ? { fontSize: `${fontPx}px` } : null),
          ...(wordSpacingPx != null ? { wordSpacing: `${wordSpacingPx}px` } : null),
          ...(spread ? { display: 'block', width: '100%' } : null),
        }
      : undefined

  return (
    <div ref={boxRef} className={className} dir={dir}>
      <span ref={textRef} style={textStyle}>
        {children}
      </span>
    </div>
  )
}

function renderTableCol(rows: InstallmentTableCell[], startNumber: number, colKey: string) {
  return (
    <div key={colKey} className="ic-tcol">
      <div className="ic-trow ic-trow--head">
        <span className="ic-tnum">م</span>
        <span className="ic-tcell">استحقاق</span>
        <span className="ic-tcell">المبلغ</span>
        <span className="ic-tcell">سداد</span>
      </div>
      {rows.map((cell, index) => {
        const num = startNumber + index
        return (
          <div key={num} className="ic-trow">
            <span className="ic-tnum">{num}</span>
            <span className="ic-tcell">{cell.due}</span>
            <span className="ic-tcell">{cell.amount}</span>
            <span className="ic-tcell">{cell.paid}</span>
          </div>
        )
      })}
    </div>
  )
}

export function InstallmentContractDocument({ invoice, lineId }: InstallmentContractDocumentProps) {
  const signerName = displayPersonName(useAuthStore((s) => s.user?.name))
  const customer = invoice.customer
  const line = resolveInvoiceLine(invoice, lineId)
  const isInstallment = !usesCashContractTemplate(line, invoice)
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
  const { paid: paidDisplay, balance: balanceDisplay, installationShare } = line
    ? lineFinancialSummary(line, invoice)
    : {
        paid: Number(invoice.paid_amount ?? 0),
        balance: Number(invoice.balance_due ?? 0),
        installationShare: 0,
      }
  const feesDisplay = installationShare
  const downPaymentDisplay = Number(plan?.down_payment ?? 0)

  const deviceSuffix =
    invoice.lines && invoice.lines.length > 1 && line
      ? ` — جهاز ${invoice.lines.indexOf(line) + 1}`
      : ''

  const isRenewal = invoice.contract_kind === 'subscription_renewal'
  const isPermanentRenewal = renewalType === 'permanent'
  const renewalDisplay =
    renewalType === 'permanent'
      ? renewalTypeLabels.permanent
      : fmtDMY(renewalDate ?? undefined)

  const contractTitle = isRenewal
    ? `تجديد الاشتراك ${isInstallment ? 'قسط' : 'كاش'}`
    : isInstallment
      ? `عقد تقسيط${deviceSuffix}`
      : `عقد كاش${deviceSuffix}`
  const renewalDateLabel = fmtDMY(
    renewalDate ?? invoice.invoice_date ?? new Date().toISOString().slice(0, 10),
  )
  const renewalFeeAmount =
    line?.line_total != null && line.line_total !== ''
      ? line.line_total
      : paidDisplay

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
  const installmentIntervalLabel =
    plan?.interval_type === 'weekly' ? 'قسط اسبوعي' : 'قسط شهري'
  const installmentDurationLabel =
    scheduleCount > 0 ? `${scheduleCount} ${scheduleUnit}` : ''
  const scheduleLabel =
    isInstallment && scheduleCount > 0
      ? `${fmtContractMoney(installmentAmount, false)} لمدة ${scheduleCount} ${scheduleUnit}`
      : ''
  const renewalInstallments = Array.from({ length: 4 }, (_, index) => {
    const item = plan?.items?.[index]
    const amount =
      item?.amount != null && item.amount !== ''
        ? fmtAmount(item.amount)
        : index < scheduleCount && installmentAmount > 0
          ? fmtAmount(installmentAmount)
          : ''
    return {
      amount,
      due: amount ? (installmentRows[index]?.due ?? '') : '',
      paid: amount ? (installmentRows[index]?.paid ?? '') : '',
    }
  })

  const vehicleTypeKey = line?.vehicle_type ?? ''
  const vehicleTypeLabel = vehicleTypeKey
    ? (vehicleTypeLabels[vehicleTypeKey] ?? vehicleTypeKey)
    : ''
  const plateLetters =
    line?.vehicle_type === 'tuk_tuk'
      ? (line.chassis_number?.trim() ?? '')
      : (line?.vehicle_plate_letters?.trim() ?? '')
  const plateNumbers =
    line?.vehicle_type === 'tuk_tuk'
      ? (line.engine_number?.trim() ?? '')
      : (line?.vehicle_plate_numbers?.trim() ?? '')

  const cashField = (label: string, value: ReactNode, opts?: { dir?: 'ltr' | 'rtl' }) => (
    <div className="ic-cash-cell">
      <span className="ic-field-diamond">◆</span>
      <span className="ic-field-label">{label}</span>
      <span className="ic-field-value" dir={opts?.dir}>
        {value}
      </span>
    </div>
  )

  const renewalField = (label: string, value: ReactNode, opts?: { dir?: 'ltr' | 'rtl' }) => (
    <div className="ic-renewal-field">
      <span className="ic-renewal-field-label">{label}</span>
      <span className="ic-renewal-field-value" dir={opts?.dir}>
        {value || '—'}
      </span>
    </div>
  )

  return (
    <article
      className={`installment-contract${isRenewal ? ' installment-contract--renewal' : ''}`}
    >
      <div className="ic-frame">
        <ContractPrintBorder src="/contract-frame.svg" />
        <ContractPrintHeader
          title={contractTitle}
          branchLabel={branchLabel(invoice)}
        />

        {isRenewal ? (
          <div className="ic-renewal-container">
            <div className="ic-renewal-fields">
              {renewalField('السيد /', customer?.name ?? '')}
              {renewalField('اسم المستخدم /', resolveUsername(line, customer))}
              {renewalField('رقم السيريال /', resolveSerial(line, customer), { dir: 'ltr' })}
              {renewalField('الموبايل 1 /', customer?.phone ?? '', { dir: 'ltr' })}
              {renewalField('الموبايل 2 /', customer?.phone_2 ?? '', { dir: 'ltr' })}
              <div className="ic-renewal-date-row">
                <span className="ic-renewal-date-label">تاريخ تجديد الاشتراك :</span>
                <span className="ic-renewal-date-value" dir="ltr">
                  {renewalDateLabel}
                </span>
              </div>
            </div>

            {!isInstallment ? (
              <div className="ic-renewal-cash-pay">
                <div className="ic-renewal-cash-paid">
                  <span>تم دفع المبلغ</span>
                  <span>(خالص)</span>
                </div>
                <div className="ic-renewal-cash-fee">
                  <div className="ic-renewal-cash-fee-row">تجديد اشتراك (كاش)</div>
                  <div className="ic-renewal-cash-fee-row">
                    رسوم تجديد الاشتراك (
                    <span dir="ltr">{fmtAmount(renewalFeeAmount)}</span>)
                  </div>
                </div>
              </div>
            ) : (
              <div className="ic-renewal-table">
                <div className="ic-renewal-table-right">
                  <div className="ic-renewal-badge-header">ملخص التقسيط</div>
                  <div className="ic-renewal-pay-details">
                    <div className="ic-renewal-summary-item">
                      <span>تم دفع</span>
                      <strong dir="ltr">{fmtAmount(paidDisplay)}</strong>
                    </div>
                    <div className="ic-renewal-summary-item">
                      <span>المتبقي</span>
                      <strong dir="ltr">{fmtAmount(balanceDisplay)}</strong>
                    </div>
                    <div className="ic-renewal-summary-item">
                      <span>{installmentIntervalLabel}</span>
                      <strong dir="ltr">{fmtAmount(installmentAmount)}</strong>
                    </div>
                    <div className="ic-renewal-summary-item">
                      <span>مدة التقسيط</span>
                      <strong>{installmentDurationLabel || '—'}</strong>
                    </div>
                  </div>
                </div>

                <div className="ic-renewal-table-left">
                  <div className="ic-renewal-badge-header">بيان الأقساط</div>
                  <div className="ic-renewal-grid-boxes">
                    {renewalInstallments.map((cell, index) => (
                      <div className="ic-renewal-box" key={index}>
                        <span>القسط {index + 1}</span>
                        <strong dir="ltr">{cell.amount || '—'}</strong>
                        {cell.amount ? (
                          <>
                            <div className="ic-renewal-box-meta">
                              <span>استحقاق</span>
                              <span className="ic-renewal-box-due" dir="ltr">
                                {cell.due || '—'}
                              </span>
                            </div>
                            <div className="ic-renewal-box-meta">
                              <span>تاريخ السداد</span>
                              <span className="ic-renewal-box-due" dir="ltr">
                                {cell.paid || '—'}
                              </span>
                            </div>
                          </>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="ic-renewal-note-section">
              <div className="ic-renewal-note-title">ملحوظة</div>
              <div className="ic-renewal-note-text">
                {isPermanentRenewal
                  ? 'تجديد الاشتراك مرة واحدة مدى الحياة.'
                  : 'قيمة تجديد الاشتراك السنوى هى 25% من سعر الجهاز كاش فى وقت تجديده.'}
              </div>
            </div>

            <div className="ic-renewal-signatures">
              <div className="ic-renewal-signature-col ic-renewal-signature-col--right">
                <div className="ic-signature-role">امضاء المسئول</div>
                <div className="ic-signature-name">{signerName || 'sama.khaled'}</div>
                {!isInstallment ? <div className="ic-renewal-signature-line" /> : null}
              </div>
              <div className="ic-renewal-signature-col ic-renewal-signature-col--left">
                <div className="ic-signature-role">مدير الفرع</div>
                <div className="ic-signature-name">Hossam Eleraqy</div>
                {!isInstallment ? <div className="ic-renewal-signature-line" /> : null}
              </div>
            </div>
          </div>
        ) : !isInstallment ? (
          <>
            <div className="ic-main ic-main--cash">
              <div className="ic-cash-grid">
                <div className="ic-cash-col">
                  {cashField('السيد :', customer?.name ?? '')}
                  {cashField('رقم العميل :', customer?.phone ?? '', { dir: 'ltr' })}
                  {cashField('رقم الشريحة :', resolveSim(line, customer), { dir: 'ltr' })}
                  {cashField('سريال الشريحة :', '', { dir: 'ltr' })}
                  {cashField('اسم المستخدم :', resolveUsername(line, customer))}
                  {cashField('السيريال :', resolveSerial(line, customer), { dir: 'ltr' })}
                </div>
                <div className="ic-cash-col">
                  {cashField('تاريخ التعاقد :', fmtDMY(invoice.invoice_date))}
                  {cashField('تاريخ تجديد اشتراك القمر الاصطناعي :', renewalDisplay)}
                  {cashField('تم دفع مبلغ :', fmtAmount(paidDisplay), { dir: 'ltr' })}
                  {cashField('الفني :', resolveTechnician(line, invoice))}
                  {cashField('نوع المركبة :', vehicleTypeLabel)}
                  <div className="ic-cash-cell ic-cash-cell--split">
                    <span className="ic-field-diamond">◆</span>
                    <span className="ic-field-label">حروف المركبة :</span>
                    <span className="ic-field-value" dir="rtl">
                      {plateLetters}
                    </span>
                    <span className="ic-field-label">رقم المركبة :</span>
                    <span className="ic-field-value" dir="ltr">
                      {plateNumbers}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="ic-cash-below">
              <div className="ic-cash-notes">
                <span className="ic-note-pill">ملحوظة هامة</span>
                <span className="ic-note-text">
                  قيمة تجديد الاشتراك السنوى هى 25% من سعر الجهاز كاش فى وقت تجديده
                </span>
              </div>

              <div className="ic-terms">
                في حالة إسترجاع الجهاز للشركة يلتزم العميل بدفع <b>25%</b> من سعر الجهاز رسوم فتح
                الإشتراك ويتم دفع <b>575</b> سوفت وير للجهاز ويتم دفع <b>200</b> جنية رسوم فك ويطبق نسبة
                الفوائد <b>250</b> جنية لكل شهر مع دفع حق أي أجزاء تالفة للجهاز ولا يحق للعميل إسترجاع
                الجهاز بعد مرور <b>14 يوم</b>
              </div>

              <FitOneLine className="ic-warning ic-warning--line">
                برجاء الإلتزام بشحن الباقة السنوية أو الشهرية الخاصة بالشريحة لتجنب إيقاف الشريحة وفقد
                إشارة الجهاز وإلزامك لعمل سوفت وير
              </FitOneLine>
              <div className="ic-warning-row">
                <FitOneLine className="ic-warning ic-warning--line">
                  برجاء الإلتزام بموعد تجديد الاشتراك السنوي للجهاز لتجنب عمل سوفت وير
                </FitOneLine>
                <FitOneLine className="ic-warning ic-warning--line">
                  برجاء الحفاظ على الرقم السرى لتجنب دفع 150 جنية رسوم ريسيت
                </FitOneLine>
              </div>

              <div className="ic-alert-grid">
                <div className="ic-alert-box ic-alert-box--theft">
                  <p style={{ textAlign: 'center' }}>
                    في حالة السرقة يلتزم العميل بالإتصال بخدمة الطوارئ فوراً في نفس وقت السرقة للحصول
                    على أسرع اتجاهات المركبة المسروقة وسرعة تحديد موقعها
                    <br />
                    <span className="ic-alert-warn is-red">تحذير هام</span>
                    ممنوع إرسال أمر إيقاف للمركبة في حالة السرقة لعدم لفت انتباه السارق بوجود جهاز
                    تحكم
                  </p>
                </div>
                <div className="ic-alert-badge">
                  <span>تنبيه</span>
                  <span>هام</span>
                </div>
                <div className="ic-alert-box">
                  <p style={{ textAlign: 'center' }}>
                    على العميل الإلتزام بسرعة التحرك في إتجاه المركبة المسروقة لتجنب إعطاء وقت للسارق
                    للوصول الى الجهاز أو فك الضفيرة كاملة والشركة غير مسئولة عن أى مشكلة نتيجة تأخر
                    الوصول الى المركبة أو أى مشاكل تخص تغطية الشبكات
                  </p>
                </div>
              </div>

              <div className="ic-signatures">
                <div>
                  توقيع الموظف <span className="ic-sign-name">{signerName}</span>
                </div>
                <div>
                  توقيع العميل بعد الموافقة على بنود العقد / <span className="ic-sign-line" />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={`ic-main ic-main--table-cols-${tableCols}`}>
              <div className="ic-fields">
                <div className="ic-field-row">
                  <span className="ic-field-diamond">◆</span>
                  <span className="ic-field-label">السيد :</span>
                  <FitOneLine className="ic-field-value">
                    {customer?.name ?? ''}
                  </FitOneLine>
                </div>
                <div className="ic-field-row">
                  <span className="ic-field-diamond">◆</span>
                  <span className="ic-field-label">الرقم القومي :</span>
                  <FitOneLine className="ic-field-value" dir="ltr">
                    {customer?.national_id ?? ''}
                  </FitOneLine>
                </div>
                <div className="ic-field-row">
                  <span className="ic-field-diamond">◆</span>
                  <span className="ic-field-label">رقم العميل 1 :</span>
                  <FitOneLine className="ic-field-value" dir="ltr">
                    {customer?.phone ?? ''}
                  </FitOneLine>
                </div>
                <div className="ic-field-row">
                  <span className="ic-field-diamond">◆</span>
                  <span className="ic-field-label">رقم العميل 2 :</span>
                  <FitOneLine className="ic-field-value" dir="ltr">
                    {customer?.phone_2 ?? ''}
                  </FitOneLine>
                </div>
                <div className="ic-field-row">
                  <span className="ic-field-diamond">◆</span>
                  <span className="ic-field-label">رقم الشريحة :</span>
                  <FitOneLine className="ic-field-value" dir="ltr">
                    {resolveSim(line, customer)}
                  </FitOneLine>
                </div>
                <div className="ic-field-row">
                  <span className="ic-field-diamond">◆</span>
                  <span className="ic-field-label">اسم المستخدم :</span>
                  <FitOneLine className="ic-field-value">
                    {resolveUsername(line, customer)}
                  </FitOneLine>
                </div>
                <div className="ic-field-row">
                  <span className="ic-field-diamond">◆</span>
                  <span className="ic-field-label">السريال :</span>
                  <FitOneLine className="ic-field-value" dir="ltr">
                    {resolveSerial(line, customer)}
                  </FitOneLine>
                </div>
              </div>

              <div className="ic-table-wrap">
                <div className="ic-table-title">بيان تقسيط</div>
                <div className={`ic-table-grid ic-table-grid--cols-${tableCols}`}>
                  {Array.from({ length: tableCols }, (_, i) =>
                    renderTableCol(
                      installmentRows.slice(i * 12, (i + 1) * 12),
                      i * 12 + 1,
                      `installment-col-${i}`,
                    ),
                  )}
                </div>
              </div>
            </div>

            <div className="ic-below">
            <div className="ic-summary">
              <div className="ic-srow ic-srow--money">
                <span className="ic-srow-item ic-srow-item--date">
                  <span className="ic-pill-label">تم التعاقد يوم</span>
                  <span className="ic-pill ic-pill--date">{fmtDMYWeekday(invoice.invoice_date)}</span>
                </span>
                <span className="ic-srow-item ic-srow-item--amount">
                  <span className="ic-pill-label">رسوم</span>
                  <span className="ic-pill ic-pill--num-sm">{fmtAmount(feesDisplay)}</span>
                </span>
                <span className="ic-srow-item ic-srow-item--amount">
                  <span className="ic-pill-label">مقدم</span>
                  <span className="ic-pill ic-pill--num-sm">{fmtAmount(downPaymentDisplay)}</span>
                </span>
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
                  <span className="ic-pill ic-pill--sm ic-pill--vehicle">{resolveVehicle(line, invoice)}</span>
                </span>
              </div>

              <div className="ic-srow ic-srow--renewal">
                <span className="ic-pill ic-pill--renewal-date">
                  <span className="ic-renewal-in-pill">تاريخ تجديد اشتراك الجهاز</span>
                  {renewalDisplay}
                </span>
                <span className="ic-note-pill">ملحوظة هامة</span>
                <FitOneLine className="ic-note-text">
                  قيمة تجديد الاشتراك السنوى هى 25% من سعر الجهاز كاش فى وقت تجديده
                </FitOneLine>
              </div>
            </div>

            <div className="ic-terms">
              الرجاء الالتزام بسداد الأقساط المستحقة دفعها في الموعد المحدد لتجنب فرض غرامة{' '}
              <b>10 جنيهات</b> لكل يوم تأخير، وفي حالة تأخير دفع القسط <b>ثلاثة أيام</b> فسوف يتم فقد
              إشارة الجهاز أو تعطيل المركبة. وفي حالة استرجاع الجهاز للشركة يلتزم العميل بدفع{' '}
              <b>25%</b> من قيمة الجهاز كاش ويتم دفع <b>350</b> سوفت وير ويتم دفع <b>150</b> جنية رسوم
              فك ويطبق نسبة الفوائد <b>200</b> جنية لكل شهر مع دفع حق أي اجزاء تالفة للجهاز، ولا يحق
              للعميل استرجاع الجهاز بعد مرور <b>29 يوم</b>
            </div>

            <FitOneLine className="ic-warning ic-warning--line">
              برجاء الإلتزام بشحن الباقة السنوية أو الشهرية الخاصة بالشريحة لتجنب إيقاف الشريحة وفقد
              إشارة الجهاز وإلزامك لعمل سوفت وير
            </FitOneLine>
            <div className="ic-warning-row">
              <FitOneLine className="ic-warning ic-warning--line">
                برجاء الإلتزام بموعد تجديد الاشتراك السنوي للجهاز لتجنب عمل سوفت وير
              </FitOneLine>
              <FitOneLine className="ic-warning ic-warning--line">
                برجاء الحفاظ على الرقم السرى لتجنب دفع 150 جنية رسوم ريسيت
              </FitOneLine>
            </div>

            <div className="ic-alert-grid">
              <div className="ic-alert-box ic-alert-box--theft">
                <p>
                  في حالة السرقة يلتزم العميل بالإتصال بخدمة الطوارئ فوراً في نفس وقت السرقة للحصول على
                  أسرع اتجاهات المركبة المسروقة وسرعة تحديد موقعها
                </p>
                <span className="ic-alert-warn is-red">تحذير هام</span>
                <p>
                  ممنوع إرسال أمر إيقاف للمركبة في حالة السرقة لعدم لفت انتباه السارق بوجود جهاز تحكم
                </p>
              </div>
              <div className="ic-alert-badge">
                <span>تنبيه</span>
                <span>هام</span>
              </div>
              <div className="ic-alert-box">
                <p>
                  على العميل الإلتزام بسرعة التحرك في إتجاه المركبة المسروقة لتجنب إعطاء وقت للسارق
                  للوصول الى الجهاز أو فك الضفيرة كاملة والشركة غير مسئولة عن أى مشكلة نتيجة تأخر
                  الوصول الى المركبة أو أى مشاكل تخص تغطية الشبكات
                </p>
              </div>
            </div>

            <div className="ic-signatures">
              <div>
                توقيع الموظف <span className="ic-sign-name">{signerName}</span>
              </div>
              <div>
                توقيع العميل بعد الموافقة على بنود العقد / <span className="ic-sign-line" />
              </div>
            </div>
            </div>
          </>
        )}

        <ContractPrintFooter reference={invoice.invoice_number} printedAt={fmtPrintStamp()} />
      </div>
    </article>
  )
}
