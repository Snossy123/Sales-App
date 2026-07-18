import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import type { AdminUser, CollectionPaymentAccount, Distributor, Employee } from '../../api/types'
import { CollapsibleSection } from '../CollapsibleSection'
import { DateTimeInput12h } from '../DateTimeInput12h'
import { Icon } from '../Icon'
import { InsightBanner } from '../InsightBanner'
import { StatusBadge } from '../StatusBadge'
import { collectionStatusOptions, type InstallmentCollectionRow } from '../../lib/collectionHelpers'
import { normalizeScannedInput } from '../../lib/scanner'
import { formatInvoiceDate } from '../../lib/sales'

const paymentMethodOptions = [
  { value: 'cash', label: 'كاش' },
  { value: 'wallet', label: 'محفظة' },
  { value: 'instapay', label: 'انستا' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
]

const transferMethods = ['wallet', 'instapay', 'bank_transfer']

interface PaymentRow {
  id: number
  amount: string | number
  paid_at?: string
}

function installmentTotalDue(row: InstallmentCollectionRow): number {
  return Number(
    row.total_due ??
      row.remaining ??
      Math.max(0, Number(row.amount) - Number(row.paid_amount ?? 0)),
  )
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export interface InstallmentCollectionPanelProps {
  selected: InstallmentCollectionRow | null
  selectedIsOverdueContract: boolean
  amount: number
  onAmountChange: (value: number) => void
  paymentMethod: string
  onPaymentMethodChange: (value: string) => void
  accountId: number | ''
  onAccountIdChange: (value: number | '') => void
  senderNumber: string
  onSenderNumberChange: (value: string) => void
  distributorBalanceAmount: number
  onDistributorBalanceAmountChange: (value: number) => void
  maxDistributorBalance: number
  adjustNextDueDate: boolean
  onAdjustNextDueDateChange: (value: boolean) => void
  dueDateShiftDays: number
  onDueDateShiftDaysChange: (value: number) => void
  collectionStatus: string
  onCollectionStatusChange: (value: string) => void
  collectionReminderAt: string
  onCollectionReminderAtChange: (value: string) => void
  collectionNotes: string
  onCollectionNotesChange: (value: string) => void
  deferDate: string
  onDeferDateChange: (value: string) => void
  dueDateEdits: Record<number, string>
  onDueDateEditsChange: (value: Record<number, string>) => void
  showReconcile: boolean
  responsibleUserId: number | ''
  onResponsibleUserIdChange: (value: number | '') => void
  reconcileNotes: string
  onReconcileNotesChange: (value: string) => void
  accountsQuery: UseQueryResult<CollectionPaymentAccount[]>
  usersQuery: UseQueryResult<AdminUser[]>
  installmentPaymentsQuery: UseQueryResult<PaymentRow[]>
  distributorProfile: Distributor | null | undefined
  collectMutation: UseMutationResult<unknown, Error, void, unknown>
  closeReconcileMutation: UseMutationResult<unknown, Error, number, unknown>
  reconcileMutation: UseMutationResult<unknown, Error, void, unknown>
  metadataMutation: UseMutationResult<unknown, Error, void, unknown>
  deferMutation: UseMutationResult<unknown, Error, void, unknown>
  dueDatesMutation: UseMutationResult<unknown, Error, void, unknown>
  branchId?: number | null
  branchEmployees?: Employee[]
  suspendMutation: UseMutationResult<
    unknown,
    Error,
    {
      device_received: boolean
      suspend_mode?: 'not_installed' | 'receive_device' | 'vehicle_impounded'
      resume_from_date?: string
      serial_code?: string
      employee_id?: number
      reason?: string
      notes?: string
    },
    unknown
  >
  resumeMutation: UseMutationResult<unknown, Error, void, unknown>
}

export function InstallmentCollectionPanelEmpty() {
  return (
    <div className="flex min-h-[16rem] flex-col items-center justify-center gap-sm rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-lg text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon name="payments" size={28} />
      </div>
      <p className="text-sm font-medium text-on-surface">لم يُحدد قسط بعد</p>
      <p className="max-w-[14rem] text-xs text-on-surface-variant">
        اختر قسطاً من القائمة لعرض التفاصيل وبدء التحصيل
      </p>
    </div>
  )
}

export function InstallmentCollectionPanel({
  selected,
  selectedIsOverdueContract,
  amount,
  onAmountChange,
  paymentMethod,
  onPaymentMethodChange,
  accountId,
  onAccountIdChange,
  senderNumber,
  onSenderNumberChange,
  distributorBalanceAmount,
  onDistributorBalanceAmountChange,
  maxDistributorBalance,
  adjustNextDueDate,
  onAdjustNextDueDateChange,
  dueDateShiftDays,
  onDueDateShiftDaysChange,
  collectionStatus,
  onCollectionStatusChange,
  collectionReminderAt,
  onCollectionReminderAtChange,
  collectionNotes,
  onCollectionNotesChange,
  deferDate,
  onDeferDateChange,
  dueDateEdits,
  onDueDateEditsChange,
  showReconcile,
  responsibleUserId,
  onResponsibleUserIdChange,
  reconcileNotes,
  onReconcileNotesChange,
  accountsQuery,
  usersQuery,
  installmentPaymentsQuery,
  distributorProfile,
  collectMutation,
  closeReconcileMutation,
  reconcileMutation,
  metadataMutation,
  deferMutation,
  dueDatesMutation,
  branchId,
  branchEmployees = [],
  suspendMutation,
  resumeMutation,
}: InstallmentCollectionPanelProps) {
  const serialRef = useRef<HTMLInputElement>(null)
  const [suspendMode, setSuspendMode] = useState<'not_installed' | 'receive_device' | 'vehicle_impounded'>(
    'not_installed',
  )
  const [suspendSerial, setSuspendSerial] = useState('')
  const [suspendReason, setSuspendReason] = useState('')
  const [suspendEmployeeId, setSuspendEmployeeId] = useState<number | ''>('')
  const [suspendResumeFromDate, setSuspendResumeFromDate] = useState('')

  useEffect(() => {
    if (!selected) return
    setSuspendMode('not_installed')
    setSuspendSerial(String(selected.serial_number ?? ''))
    setSuspendReason('')
    setSuspendEmployeeId('')
    setSuspendResumeFromDate('')
  }, [selected?.id])

  if (!selected) {
    return <InstallmentCollectionPanelEmpty />
  }

  const totalDue = installmentTotalDue(selected)
  const lateFee = Number(selected.late_fee_accrued ?? 0)
  const paidSoFar = Number(selected.paid_amount ?? 0)
  const tier = String(selected.display_tier ?? selected.status)
  const remainingAfterPay = roundMoney(Math.max(0, totalDue - amount))
  const isPartialPayment = amount > 0 && amount < totalDue - 0.009
  const canCollect =
    !collectMutation.isPending &&
    amount > 0 &&
    !selected.is_suspended &&
    !selected.has_open_reconciliation &&
    (!transferMethods.includes(paymentMethod) || (accountId && senderNumber.trim()))

  return (
    <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
      <div className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
        <div className="mb-sm flex items-center justify-between gap-sm">
          <h3 className="text-lg font-semibold text-on-surface">تحصيل قسط</h3>
          <StatusBadge status={tier} />
        </div>

        <div className="mb-md rounded-xl border border-primary/20 bg-primary/5 p-md text-center">
          <p className="text-xs font-medium text-on-surface-variant">المتبقي للتحصيل</p>
          <p className="mt-1 tabular-nums text-2xl font-bold text-on-surface">
            {totalDue.toLocaleString('ar-EG')} ج.م
          </p>
          {paidSoFar > 0 && (
            <p className="mt-1 text-xs tabular-nums text-secondary">
              مدفوع سابقاً على هذا القسط: {paidSoFar.toLocaleString('ar-EG')} ج.م
            </p>
          )}
          {lateFee > 0 && (
            <p className="mt-1 text-xs tabular-nums text-error">
              شامل غرامة تأخير: {lateFee.toLocaleString('ar-EG')} ج.م
            </p>
          )}
        </div>

        <dl className="mb-md space-y-1.5 text-sm">
          <div className="flex justify-between gap-sm">
            <dt className="text-on-surface-variant">العميل</dt>
            <dd className="flex items-center gap-2 font-medium text-on-surface">
              <span>{String(selected.customer_name ?? '—')}</span>
              {selected.customer_id ? (
                <Link
                  to={`/customers/${selected.customer_id}`}
                  className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                >
                  <Icon name="open_in_new" size={14} />
                  الملف
                </Link>
              ) : null}
            </dd>
          </div>
          <div className="flex justify-between gap-sm">
            <dt className="text-on-surface-variant">التعاقد</dt>
            <dd className="flex items-center gap-2">
              <span dir="ltr">{String(selected.invoice_number ?? '—')}</span>
              {selected.sales_invoice_id ? (
                <a
                  href={`/contracts/${selected.sales_invoice_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  التفاصيل
                </a>
              ) : null}
            </dd>
          </div>
          <div className="flex justify-between gap-sm">
            <dt className="text-on-surface-variant">قسط رقم</dt>
            <dd className="tabular-nums">{selected.installment_number ?? selected.sequence ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-sm">
            <dt className="text-on-surface-variant">تاريخ الاستحقاق</dt>
            <dd className="tabular-nums" dir="ltr">
              {formatInvoiceDate(selected.due_date)}
            </dd>
          </div>
        </dl>

        {selected.is_suspended && (
          <div className="mb-sm space-y-sm">
            <InsightBanner
              variant="warning"
              message={
                selected.device_in_custody
                  ? 'الأقساط معلّقة — الجهاز مستلم في الفرع'
                  : selected.collection_status === 'postponed'
                    ? 'الأقساط معلّقة — عربية محبوسة / جدول مُرحَّل'
                    : 'الأقساط معلّقة — الجهاز لم يُركّب بعد أو لم يُستلم'
              }
            />
            <button
              type="button"
              onClick={() => {
                if (window.confirm('رفع التعليق واستئناف التحصيل على هذا العقد؟')) {
                  resumeMutation.mutate()
                }
              }}
              disabled={resumeMutation.isPending}
              className="w-full rounded-lg border border-secondary py-2 text-sm font-bold text-secondary"
            >
              {resumeMutation.isPending ? 'جاري رفع التعليق...' : 'رفع التعليق'}
            </button>
            {resumeMutation.isError && (
              <p className="text-xs text-error">{getErrorMessage(resumeMutation.error)}</p>
            )}
          </div>
        )}

        {!selected.is_suspended && (
          <CollapsibleSection
            title="تعليق التعاقد"
            icon="block"
            className="mb-sm"
            summary="تعليق الأقساط حتى يسدد العميل"
          >
            <p className="mb-sm text-xs text-on-surface-variant">
              استخدم التعليق عندما لا يستطيع العميل الدفع الآن — سواء الجهاز لم يُركّب بعد، أو تستلم الجهاز، أو
              العربية محبوسة وتحتاج ترحيل الأقساط.
            </p>

            <div className="mb-sm flex flex-wrap gap-xs">
              {[
                { value: 'not_installed' as const, label: 'لم يُركّب بعد' },
                { value: 'receive_device' as const, label: 'استلام الجهاز' },
                { value: 'vehicle_impounded' as const, label: 'العربية محبوسة' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSuspendMode(option.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    suspendMode === option.value
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-outline-variant text-on-surface-variant hover:border-primary/50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {suspendMode === 'receive_device' && (
              <>
                <label className="mb-xs block text-xs text-on-surface-variant">مسح سريال الجهاز</label>
                <input
                  ref={serialRef}
                  type="text"
                  autoComplete="off"
                  value={suspendSerial}
                  onChange={(e) => setSuspendSerial(normalizeScannedInput(e.target.value))}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') e.preventDefault()
                  }}
                  placeholder="امسح السريال"
                  className="mb-sm w-full rounded border border-outline-variant bg-surface-container-lowest px-sm py-2 font-mono text-sm tracking-wide"
                  dir="ltr"
                />
                <label className="mb-xs block text-xs text-on-surface-variant">موظف العهدة</label>
                <select
                  value={suspendEmployeeId}
                  onChange={(e) => setSuspendEmployeeId(e.target.value ? Number(e.target.value) : '')}
                  className="mb-sm w-full rounded border border-outline-variant px-sm py-2 text-sm"
                >
                  <option value="">اختر الموظف (أو يُستخدم حسابك إن كان مربوطاً)</option>
                  {branchEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            {suspendMode === 'vehicle_impounded' && (
              <>
                <label className="mb-xs block text-xs text-on-surface-variant">تاريخ بداية الترحيل</label>
                <input
                  type="date"
                  value={suspendResumeFromDate}
                  onChange={(e) => setSuspendResumeFromDate(e.target.value)}
                  className="mb-sm w-full rounded border border-outline-variant px-sm py-2 text-sm"
                />
                <p className="mb-sm text-xs text-on-surface-variant">
                  تُرحَّل الأقساط غير المدفوعة لتبدأ من هذا التاريخ — بدون استلام الجهاز.
                </p>
              </>
            )}

            <label className="mb-xs block text-xs text-on-surface-variant">سبب التعليق</label>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={2}
              placeholder="مثال: العميل لا يملك المبلغ حالياً"
              className="mb-sm w-full rounded border border-outline-variant px-sm py-2 text-sm"
            />

            {suspendMutation.isError && (
              <p className="mb-sm text-xs text-error">{getErrorMessage(suspendMutation.error)}</p>
            )}

            <button
              type="button"
              onClick={() =>
                suspendMutation.mutate({
                  device_received: suspendMode === 'receive_device',
                  suspend_mode: suspendMode,
                  resume_from_date:
                    suspendMode === 'vehicle_impounded' ? suspendResumeFromDate : undefined,
                  serial_code: suspendMode === 'receive_device' ? suspendSerial : undefined,
                  employee_id: suspendEmployeeId || undefined,
                  reason: suspendReason.trim() || undefined,
                  notes: suspendReason.trim() || undefined,
                })
              }
              disabled={
                suspendMutation.isPending ||
                !branchId ||
                (suspendMode === 'receive_device' && !suspendSerial.trim()) ||
                (suspendMode === 'vehicle_impounded' && !suspendResumeFromDate)
              }
              className="w-full rounded-lg border border-error/40 bg-error/5 py-2 text-sm font-bold text-error"
            >
              {suspendMutation.isPending ? 'جاري التعليق...' : 'تعليق التعاقد'}
            </button>
          </CollapsibleSection>
        )}

        {selected.has_open_reconciliation && (
          <div className="mb-sm">
            <InsightBanner
              variant="error"
              message="يوجد تصالح مفتوح — يجب إغلاقه قبل التحصيل"
            />
          </div>
        )}

        {collectMutation.isSuccess && (
          <div className="mb-sm">
            <InsightBanner variant="success" message="تم التحصيل بنجاح" />
          </div>
        )}

        <section className="mb-md space-y-sm rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-sm">
          <h4 className="flex items-center gap-xs text-sm font-semibold text-on-surface">
            <Icon name="payments" size={18} className="text-primary" />
            دفع الآن
          </h4>

          <label className="mb-xs block text-xs text-on-surface-variant">طريقة التحصيل</label>
          <select
            value={paymentMethod}
            onChange={(e) => onPaymentMethodChange(e.target.value)}
            className="mb-sm w-full rounded border border-outline-variant px-sm py-2 text-sm"
          >
            {paymentMethodOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {transferMethods.includes(paymentMethod) && (
            <>
              <label className="mb-xs block text-xs text-on-surface-variant">
                {paymentMethod === 'bank_transfer' ? 'حساب البنك المفعل' : 'رقم المحفظة / انستا المفعل'}
              </label>
              <select
                value={accountId}
                onChange={(e) => onAccountIdChange(e.target.value ? Number(e.target.value) : '')}
                className="mb-sm w-full rounded border border-outline-variant px-sm py-2 text-sm"
              >
                <option value="">اختر الحساب</option>
                {(accountsQuery.data ?? []).map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.beneficiary_name} — {acc.account_number || acc.phone}
                    {acc.bank_name ? ` (${acc.bank_name})` : ''}
                  </option>
                ))}
              </select>

              <label className="mb-xs block text-xs text-on-surface-variant">رقم التحويل من العميل</label>
              <input
                value={senderNumber}
                onChange={(e) => onSenderNumberChange(e.target.value)}
                className="mb-sm w-full rounded border border-outline-variant px-sm py-2 text-sm"
                dir="ltr"
                placeholder="01xxxxxxxxx"
              />
            </>
          )}

          <div className="flex items-end justify-between gap-sm">
            <div className="min-w-0 flex-1">
              <label className="mb-xs block text-xs text-on-surface-variant">مبلغ هذه الدفعة</label>
              <input
                type="number"
                min={0.01}
                max={totalDue}
                step="0.01"
                value={amount}
                onChange={(e) => onAmountChange(Number(e.target.value))}
                className="w-full rounded border border-outline-variant px-sm py-2 text-lg font-bold tabular-nums"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-xs">
            {[
              { label: 'ربع المتبقي', value: roundMoney(totalDue / 4) },
              { label: 'نصف المتبقي', value: roundMoney(totalDue / 2) },
              { label: 'كامل المتبقي', value: totalDue },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => onAmountChange(option.value)}
                className={`rounded-full border px-sm py-1 text-xs font-medium transition-colors ${
                  Math.abs(amount - option.value) < 0.01
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline-variant text-on-surface-variant hover:border-primary/40 hover:text-primary'
                }`}
              >
                {option.label}
                <span className="ms-1 tabular-nums" dir="ltr">
                  ({option.value.toLocaleString('ar-EG')})
                </span>
              </button>
            ))}
          </div>

          {isPartialPayment ? (
            <p className="rounded-lg bg-tertiary/5 px-sm py-2 text-xs text-on-surface">
              دفع جزئي — بعد هذه الدفعة يتبقى{' '}
              <span className="font-bold tabular-nums text-tertiary">
                {remainingAfterPay.toLocaleString('ar-EG')} ج.م
              </span>{' '}
              على نفس القسط
            </p>
          ) : (
            <p className="text-xs text-on-surface-variant">
              يمكن دفع القسط على أكثر من دفعة — المتبقي يُسجّل تلقائياً
            </p>
          )}

          {distributorProfile && Number(distributorProfile.commission_balance ?? 0) > 0 && (
            <div className="space-y-xs rounded-lg border border-primary/25 bg-primary/5 p-sm">
              <p className="text-xs text-on-surface-variant">
                رصيد عمولة متاح:{' '}
                {Number(distributorProfile.commission_balance).toLocaleString('ar-EG')} ج.م
              </p>
              <label className="mb-xs block text-xs text-on-surface-variant">خصم من رصيد العمولة</label>
              <input
                type="number"
                min={0}
                max={maxDistributorBalance}
                value={distributorBalanceAmount}
                onChange={(e) =>
                  onDistributorBalanceAmountChange(Math.min(Number(e.target.value), maxDistributorBalance))
                }
                className="w-full rounded border border-outline-variant px-sm py-2 tabular-nums"
              />
            </div>
          )}

          {lateFee > 0 && (
            <div className="space-y-sm rounded-lg border border-outline-variant bg-surface-container-high p-sm">
              <label className="flex items-center gap-xs text-sm">
                <input
                  type="checkbox"
                  checked={adjustNextDueDate}
                  onChange={(e) => onAdjustNextDueDateChange(e.target.checked)}
                />
                تأجيل تاريخ استحقاق القسط التالي
              </label>
              {adjustNextDueDate && (
                <div>
                  <label className="mb-xs block text-xs text-on-surface-variant">عدد أيام التأجيل</label>
                  <input
                    type="number"
                    min={1}
                    value={dueDateShiftDays}
                    onChange={(e) => onDueDateShiftDaysChange(Number(e.target.value))}
                    className="w-full rounded border border-outline-variant px-sm py-2 text-sm tabular-nums"
                  />
                </div>
              )}
            </div>
          )}

          {collectMutation.isError && (
            <p className="text-sm text-error">{getErrorMessage(collectMutation.error)}</p>
          )}

          <button
            type="button"
            onClick={() => collectMutation.mutate()}
            disabled={!canCollect}
            className="flex w-full items-center justify-center gap-xs rounded-lg bg-primary py-3 font-bold text-on-primary disabled:opacity-60"
          >
            <Icon name="payments" />
            {collectMutation.isPending ? 'جاري التحصيل...' : isPartialPayment ? 'تأكيد الدفع الجزئي' : 'تأكيد التحصيل'}
          </button>

          {selected.has_open_reconciliation && selected.open_reconciliation_id != null ? (
            <button
              type="button"
              onClick={() => closeReconcileMutation.mutate(selected.open_reconciliation_id!)}
              disabled={closeReconcileMutation.isPending}
              className="w-full rounded-lg border border-secondary py-2 text-sm font-bold text-secondary"
            >
              {closeReconcileMutation.isPending ? 'جاري الإغلاق...' : 'إغلاق التصالح وإعفاء الغرامة'}
            </button>
          ) : null}
        </section>

        <CollapsibleSection
          title="متابعة التحصيل"
          icon="schedule"
          className="mb-sm"
          summary="حالة التذكير والملاحظات"
        >
          <label className="mb-xs block text-xs text-on-surface-variant">حالة التحصيل</label>
          <select
            value={collectionStatus}
            onChange={(e) => onCollectionStatusChange(e.target.value)}
            className="mb-sm w-full rounded border border-outline-variant px-sm py-2 text-sm"
          >
            <option value="">—</option>
            {collectionStatusOptions.filter((o) => o.value).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <label className="mb-xs block text-xs text-on-surface-variant">ميعاد التذكير</label>
          <DateTimeInput12h
            value={collectionReminderAt}
            onChange={onCollectionReminderAtChange}
            className="mb-sm"
          />
          <label className="mb-xs block text-xs text-on-surface-variant">ملاحظات</label>
          <textarea
            value={collectionNotes}
            onChange={(e) => onCollectionNotesChange(e.target.value)}
            rows={2}
            className="mb-sm w-full rounded border border-outline-variant px-sm py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => metadataMutation.mutate()}
            disabled={metadataMutation.isPending}
            className="w-full rounded-lg border border-primary py-2 text-sm font-medium text-primary"
          >
            {metadataMutation.isPending ? 'جاري الحفظ…' : 'حفظ متابعة التحصيل'}
          </button>
        </CollapsibleSection>

        {selectedIsOverdueContract && (
          <CollapsibleSection
            title="ترحيل الأقساط"
            icon="event_repeat"
            className="mb-sm"
            summary="إعادة جدولة المتأخرين"
          >
            <label className="mb-xs block text-xs text-on-surface-variant">تاريخ بداية جديد</label>
            <input
              type="date"
              value={deferDate}
              onChange={(e) => onDeferDateChange(e.target.value)}
              className="mb-sm w-full rounded border border-outline-variant px-sm py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => deferMutation.mutate()}
              disabled={deferMutation.isPending || !deferDate}
              className="w-full rounded-lg border border-tertiary py-2 text-sm font-medium text-tertiary"
            >
              {deferMutation.isPending ? 'جاري الترحيل…' : 'ترحيل جدول الأقساط'}
            </button>
          </CollapsibleSection>
        )}

        <CollapsibleSection
          title="تعديل تواريخ الأقساط"
          icon="edit_calendar"
          className="mb-sm"
          summary={`${Object.keys(dueDateEdits).length} قسط`}
        >
          {Object.entries(dueDateEdits).map(([id, date]) => (
            <div key={id} className="mb-sm flex items-center gap-2 text-sm">
              <span className="w-16 text-on-surface-variant">#{id}</span>
              <input
                type="date"
                value={date}
                onChange={(e) =>
                  onDueDateEditsChange({ ...dueDateEdits, [Number(id)]: e.target.value })
                }
                className="flex-1 rounded border border-outline-variant px-sm py-1 text-sm"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => dueDatesMutation.mutate()}
            disabled={dueDatesMutation.isPending}
            className="w-full rounded-lg border border-outline-variant py-2 text-sm"
          >
            {dueDatesMutation.isPending ? 'جاري الحفظ…' : 'حفظ التواريخ'}
          </button>
        </CollapsibleSection>

        {(installmentPaymentsQuery.data ?? []).length > 0 && (
          <CollapsibleSection
            title="آخر مدفوعات هذا القسط"
            icon="receipt_long"
            className="mb-sm"
            summary={`${installmentPaymentsQuery.data?.length ?? 0} دفعة`}
          >
            <ul className="space-y-1 text-sm">
              {(installmentPaymentsQuery.data ?? []).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span className="tabular-nums">
                    {Number(p.amount).toLocaleString('ar-EG')} ج.م
                    {p.paid_at ? ` — ${new Date(p.paid_at).toLocaleDateString('ar-EG')}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {showReconcile && tier === 'overdue' && !selected.has_open_reconciliation && (
          <CollapsibleSection
            title="تصالح — تسجيل حالة مفتوحة"
            icon="handshake"
            defaultOpen
            className="mb-sm"
          >
            <label className="mb-xs block text-xs text-on-surface-variant">
              المسؤول الذي تحدث معه العميل *
            </label>
            <select
              value={responsibleUserId}
              onChange={(e) => onResponsibleUserIdChange(e.target.value ? Number(e.target.value) : '')}
              className="mb-sm w-full rounded border border-outline-variant px-sm py-2 text-sm"
            >
              <option value="">اختر الموظف</option>
              {(usersQuery.data ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <textarea
              value={reconcileNotes}
              onChange={(e) => onReconcileNotesChange(e.target.value)}
              placeholder="ملاحظات التصالح..."
              rows={2}
              className="mb-sm w-full rounded border border-outline-variant px-sm py-2 text-sm"
            />
            {reconcileMutation.isError && (
              <p className="mb-sm text-xs text-error">{getErrorMessage(reconcileMutation.error)}</p>
            )}
            <button
              type="button"
              onClick={() => reconcileMutation.mutate()}
              disabled={reconcileMutation.isPending || !responsibleUserId}
              className="w-full rounded-lg border border-primary py-2 text-sm font-bold text-primary"
            >
              {reconcileMutation.isPending ? 'جاري التسجيل...' : 'تسجيل التصالح'}
            </button>
          </CollapsibleSection>
        )}
      </div>
    </div>
  )
}
