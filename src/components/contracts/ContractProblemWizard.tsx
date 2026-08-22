import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../api/client'
import { useProcedureDraft } from '../../hooks/useProcedureDraft'
import { useAuthStore } from '../../stores/authStore'
import {
  PROCEDURE_DRAFT_IDS,
  readProcedureDraft,
  useProcedureDraftStore,
} from '../../stores/procedureDraftStore'
import type { CollectionPaymentAccount, Employee, PaginatedResponse, ProductUnit, SalesInvoice } from '../../api/types'
import { userCanPerform } from '../../lib/access'
import { Icon } from '../Icon'
import { NumericInput } from '../ui/NumericInput'


type CaseType = 'support' | 'return' | 'exchange' | 'cancel'

interface ReturnDebtBreakdown {
  uninstall_fee: number
  software_fee: number
  cash_annual_portion: number
  monthly_interest_amount: number
  months: number
  interest_total: number
  installation_executed_at?: string | null
}

interface ReturnPreview {
  total_paid: number
  device_debt_amount: number
  disbursement_amount: number
  breakdown?: ReturnDebtBreakdown
}

interface CancelPreviewPayment {
  id: number
  amount: number
  payment_method: string
  collection_payment_account?: {
    id: number
    payment_method: string
    beneficiary_name: string
    phone?: string | null
    bank_name?: string | null
    account_number?: string | null
  } | null
}

interface CancelPreview {
  allowed: boolean
  down_payment_amount: number
  payments: CancelPreviewPayment[]
}

interface ContractCaseRecord {
  id: number
  case_type: string
  status: string
}

interface ContractProblemWizardProps {
  invoice: SalesInvoice
  open: boolean
  onClose: () => void
  onComplete: () => void
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'نقدي',
  wallet: 'محفظة',
  instapay: 'انستا',
  bank_transfer: 'تحويل بنكي',
  card: 'بطاقة',
}

const TYPE_OPTIONS: { value: CaseType; label: string; description: string }[] = [
  { value: 'support', label: 'دعم فني', description: 'إنشاء مهمة دعم للعقد' },
  { value: 'return', label: 'استرجاع', description: 'إرجاع الجهاز للمخزون وأمر دفع إن لزم' },
  { value: 'exchange', label: 'استبدال', description: 'استبدال الجهاز بآخر من مخزون الفرع' },
  { value: 'cancel', label: 'إلغاء التعاقد', description: 'قبل تنفيذ الفني: إلغاء المهمة ورجوع الجهاز ورد المقدم' },
]

function originalPaymentLabel(payment: CancelPreviewPayment): string {
  const account = payment.collection_payment_account
  if (account) {
    const parts = [account.beneficiary_name, account.phone, account.bank_name, account.account_number].filter(
      Boolean,
    )
    return parts.join(' — ') || PAYMENT_METHOD_LABELS[account.payment_method] || account.payment_method
  }
  return PAYMENT_METHOD_LABELS[payment.payment_method] ?? payment.payment_method ?? 'نقدي'
}

type WizardDraft = {
  step: number
  caseType: CaseType | null
  reason: string
  notes: string
  openedCase: ContractCaseRecord | null
  deviceDebt: string
  newUnitId: number | ''
  disposition: 'good' | 'faulty'
  employeeId: number | ''
  scheduledAt: string
  customerReceivedRefund: boolean
  refundVia: 'cash' | 'account'
  refundAccountId: number | ''
}

function applyWizardDraft(
  draft: WizardDraft,
  setters: {
    setStep: (value: number) => void
    setCaseType: (value: CaseType | null) => void
    setReason: (value: string) => void
    setNotes: (value: string) => void
    setOpenedCase: (value: ContractCaseRecord | null) => void
    setDeviceDebt: (value: string) => void
    setNewUnitId: (value: number | '') => void
    setDisposition: (value: 'good' | 'faulty') => void
    setEmployeeId: (value: number | '') => void
    setScheduledAt: (value: string) => void
    setCustomerReceivedRefund: (value: boolean) => void
    setRefundVia: (value: 'cash' | 'account') => void
    setRefundAccountId: (value: number | '') => void
  },
) {
  setters.setStep(draft.step)
  setters.setCaseType(draft.caseType)
  setters.setReason(draft.reason)
  setters.setNotes(draft.notes)
  setters.setOpenedCase(draft.openedCase)
  setters.setDeviceDebt(draft.deviceDebt)
  setters.setNewUnitId(draft.newUnitId)
  setters.setDisposition(draft.disposition)
  setters.setEmployeeId(draft.employeeId)
  setters.setScheduledAt(draft.scheduledAt)
  setters.setCustomerReceivedRefund(draft.customerReceivedRefund)
  setters.setRefundVia(draft.refundVia)
  setters.setRefundAccountId(draft.refundAccountId)
}

export function ContractProblemWizard({ invoice, open, onClose, onComplete }: ContractProblemWizardProps) {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const draftId = PROCEDURE_DRAFT_IDS.contractProblem(invoice.id)
  const [step, setStep] = useState(0)
  const [caseType, setCaseType] = useState<CaseType | null>(null)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [openedCase, setOpenedCase] = useState<ContractCaseRecord | null>(null)
  const [deviceDebt, setDeviceDebt] = useState('')
  const [newUnitId, setNewUnitId] = useState<number | ''>('')
  const [disposition, setDisposition] = useState<'good' | 'faulty'>('faulty')
  const [employeeId, setEmployeeId] = useState<number | ''>('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [customerReceivedRefund, setCustomerReceivedRefund] = useState(false)
  const [refundVia, setRefundVia] = useState<'cash' | 'account'>('cash')
  const [refundAccountId, setRefundAccountId] = useState<number | ''>('')

  const deviceLine = invoice.lines?.find((l) => l.product_unit_id)
  const warehouseId = invoice.warehouse_id

  useEffect(() => {
    if (!open) return
    const saved = readProcedureDraft<WizardDraft>(draftId, userId)
    if (saved) {
      applyWizardDraft(saved, {
        setStep,
        setCaseType,
        setReason,
        setNotes,
        setOpenedCase,
        setDeviceDebt,
        setNewUnitId,
        setDisposition,
        setEmployeeId,
        setScheduledAt,
        setCustomerReceivedRefund,
        setRefundVia,
        setRefundAccountId,
      })
      return
    }
    setStep(0)
    setCaseType(null)
    setReason('')
    setNotes('')
    setOpenedCase(null)
    setDeviceDebt('')
    setNewUnitId('')
    setDisposition('faulty')
    setEmployeeId('')
    setScheduledAt('')
    setCustomerReceivedRefund(false)
    setRefundVia('cash')
    setRefundAccountId('')
  }, [draftId, open, userId])

  const wizardDraftSnapshot = useMemo<WizardDraft>(
    () => ({
      step,
      caseType,
      reason,
      notes,
      openedCase,
      deviceDebt,
      newUnitId,
      disposition,
      employeeId,
      scheduledAt,
      customerReceivedRefund,
      refundVia,
      refundAccountId,
    }),
    [
      step,
      caseType,
      reason,
      notes,
      openedCase,
      deviceDebt,
      newUnitId,
      disposition,
      employeeId,
      scheduledAt,
      customerReceivedRefund,
      refundVia,
      refundAccountId,
    ],
  )

  useProcedureDraft({
    id: draftId,
    userId,
    titleAr: invoice.customer?.name
      ? `مشكلة عقد — ${invoice.customer.name}`
      : `مشكلة عقد #${invoice.invoice_number ?? invoice.id}`,
    resumePath: `/contracts/${invoice.id}?resume=problem`,
    snapshot: wizardDraftSnapshot,
    isMeaningful: Boolean(caseType || reason.trim() || notes.trim() || openedCase),
    enabled: open,
  })

  const finishWizard = () => {
    useProcedureDraftStore.getState().clearDraft(draftId, userId)
    onComplete()
  }

  const previewQuery = useQuery({
    queryKey: ['contract-return-preview', invoice.id, deviceDebt],
    queryFn: async () => {
      const params: Record<string, string | number> = {}
      if (deviceLine?.id) params.sales_invoice_line_id = deviceLine.id
      if (deviceDebt !== '') params.device_debt_amount = Number(deviceDebt)
      const { data } = await api.get<ReturnPreview>(
        `/sales-invoices/${invoice.id}/contract-return-preview`,
        { params },
      )
      return data
    },
    enabled: open && step === 2 && caseType === 'return' && Boolean(openedCase),
  })

  const cancelPreviewQuery = useQuery({
    queryKey: ['contract-cancel-preview', invoice.id],
    queryFn: async () => {
      const { data } = await api.get<CancelPreview>(`/sales-invoices/${invoice.id}/contract-cancel-preview`)
      return data
    },
    enabled: open,
  })

  const user = useAuthStore((s) => s.user)
  const canDisburse = userCanPerform(user, 'contract_cases.disburse')

  const visibleTypeOptions = useMemo(
    () =>
      TYPE_OPTIONS.filter((opt) => {
        if (opt.value === 'cancel' && cancelPreviewQuery.data?.allowed === false) return false
        if ((opt.value === 'return' || opt.value === 'cancel') && !canDisburse) return false
        return true
      }),
    [cancelPreviewQuery.data?.allowed, canDisburse],
  )

  const accountsQuery = useQuery({
    queryKey: ['collection-accounts', 'active', 'cancel-refund'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CollectionPaymentAccount[] }>('/collection-accounts/active')
      return data.data ?? []
    },
    enabled: open && step === 2 && caseType === 'cancel' && refundVia === 'account',
  })

  useEffect(() => {
    if (previewQuery.data && deviceDebt === '' && caseType === 'return') {
      setDeviceDebt(String(previewQuery.data.device_debt_amount))
    }
  }, [previewQuery.data, deviceDebt, caseType])

  const unitsQuery = useQuery({
    queryKey: ['product-units', 'exchange', warehouseId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ProductUnit>>('/product-units', {
        params: {
          per_page: 100,
          'filter[warehouse_id]': warehouseId,
          'filter[state]': 'available',
        },
      })
      return data.data ?? []
    },
    enabled: open && step === 2 && caseType === 'exchange' && Boolean(warehouseId),
  })

  const employeesQuery = useQuery({
    queryKey: ['employees', 'support-case'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100, 'filter[branch_id]': invoice.branch_id },
      })
      return data.data ?? []
    },
    enabled: open && step === 2 && caseType === 'support',
  })

  const openCaseMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ContractCaseRecord>('/contract-cases', {
        sales_invoice_id: invoice.id,
        sales_invoice_line_id: deviceLine?.id,
        case_type: caseType,
        reason: reason.trim() || null,
        notes: notes.trim() || null,
      })
      return data
    },
    onSuccess: (data) => {
      setOpenedCase(data)
      setStep(2)
    },
  })

  const completeReturnMutation = useMutation({
    mutationFn: async () => {
      if (!openedCase) throw new Error('لم تُفتح الحالة')
      const { data } = await api.post(`/contract-cases/${openedCase.id}/complete-return`, {
        device_debt_amount: deviceDebt !== '' ? Number(deviceDebt) : undefined,
        notes: notes.trim() || undefined,
      })
      return data
    },
    onSuccess: finishWizard,
  })

  const completeExchangeMutation = useMutation({
    mutationFn: async () => {
      if (!openedCase || !newUnitId) throw new Error('اختر جهازاً جديداً')
      const { data } = await api.post(`/contract-cases/${openedCase.id}/complete-exchange`, {
        new_product_unit_id: newUnitId,
        disposition,
        notes: notes.trim() || undefined,
      })
      return data
    },
    onSuccess: finishWizard,
  })

  const completeSupportMutation = useMutation({
    mutationFn: async () => {
      if (!openedCase) throw new Error('لم تُفتح الحالة')
      const { data } = await api.post(`/contract-cases/${openedCase.id}/complete-support`, {
        employee_id: employeeId || undefined,
        scheduled_at: scheduledAt || undefined,
        notes: notes.trim() || undefined,
      })
      return data
    },
    onSuccess: finishWizard,
  })

  const completeCancelMutation = useMutation({
    mutationFn: async () => {
      if (!openedCase) throw new Error('لم تُفتح الحالة')
      const payload: Record<string, unknown> = {
        notes: notes.trim() || undefined,
      }
      const downAmount = Number(cancelPreviewQuery.data?.down_payment_amount ?? 0)
      if (downAmount > 0) {
        payload.customer_received_refund = customerReceivedRefund
        if (refundVia === 'cash') {
          payload.refund_method = 'cash'
        } else {
          const account = (accountsQuery.data ?? []).find((a) => a.id === refundAccountId)
          if (!account) throw new Error('اختر حساب التحصيل للرد')
          payload.refund_method = account.payment_method
          payload.collection_payment_account_id = account.id
        }
      }
      const { data } = await api.post(`/contract-cases/${openedCase.id}/complete-cancel`, payload)
      return data
    },
    onSuccess: finishWizard,
  })

  if (!open) return null

  const downPaymentAmount = Number(cancelPreviewQuery.data?.down_payment_amount ?? 0)
  const canCompleteCancel =
    downPaymentAmount <= 0 ||
    (customerReceivedRefund && (refundVia === 'cash' || Boolean(refundAccountId)))

  const pending =
    openCaseMutation.isPending ||
    completeReturnMutation.isPending ||
    completeExchangeMutation.isPending ||
    completeSupportMutation.isPending ||
    completeCancelMutation.isPending

  const error =
    openCaseMutation.error ??
    completeReturnMutation.error ??
    completeExchangeMutation.error ??
    completeSupportMutation.error ??
    completeCancelMutation.error

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-md">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-lg"
      >
        <div className="mb-md flex items-center justify-between">
          <h2 className="text-lg font-semibold">تحويل العقد للمشاكل</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-surface-container-low">
            <Icon name="close" size={22} />
          </button>
        </div>

        {step === 0 && (
          <div className="space-y-sm">
            <p className="text-sm text-on-surface-variant">اختر نوع المشكلة:</p>
            {visibleTypeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setCaseType(opt.value)
                  setStep(1)
                }}
                className="block w-full rounded-lg border border-outline-variant px-md py-sm text-start hover:border-primary hover:bg-primary/5"
              >
                <span className="font-medium">{opt.label}</span>
                <span className="mt-0.5 block text-xs text-on-surface-variant">{opt.description}</span>
              </button>
            ))}
          </div>
        )}

        {step === 1 && caseType && (
          <div className="space-y-md">
            <p className="text-sm font-medium">
              النوع: {TYPE_OPTIONS.find((o) => o.value === caseType)?.label}
            </p>
            <div>
              <label className="mb-xs block text-sm text-on-surface-variant">السبب *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-outline-variant px-sm py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-xs block text-sm text-on-surface-variant">ملاحظات</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-outline-variant px-sm py-2 text-sm"
              />
            </div>
            {error && <p className="text-sm text-error">{getErrorMessage(error)}</p>}
            <div className="flex justify-between gap-sm">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="rounded-lg border border-outline-variant px-md py-sm text-sm"
              >
                رجوع
              </button>
              <button
                type="button"
                disabled={!reason.trim() || pending}
                onClick={() => openCaseMutation.mutate()}
                className="rounded-lg bg-primary px-md py-sm text-sm font-medium text-on-primary disabled:opacity-50"
              >
                {pending ? 'جاري الفتح…' : 'متابعة'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && caseType === 'return' && (
          <div className="space-y-md">
            {previewQuery.isLoading ? (
              <p className="text-sm text-on-surface-variant">جاري حساب المبالغ…</p>
            ) : previewQuery.data ? (
              <dl className="space-y-2 rounded-lg border border-outline-variant bg-surface-container-low p-sm text-sm">
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">إجمالي المدفوع</dt>
                  <dd className="tabular-nums font-medium">
                    {Number(previewQuery.data.total_paid).toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
                  </dd>
                </div>
                {previewQuery.data.breakdown && (
                  <div className="space-y-1 rounded border border-outline-variant/60 bg-surface-container-lowest px-sm py-sm text-xs text-on-surface-variant">
                    <p className="font-medium text-on-surface">تفصيل المديونية المحسوبة</p>
                    <p>
                      رسوم فك:{' '}
                      {Number(previewQuery.data.breakdown.uninstall_fee).toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
                    </p>
                    <p>
                      رسوم سوفت:{' '}
                      {Number(previewQuery.data.breakdown.software_fee).toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
                    </p>
                    <p>
                      25% من كاش اشتراك سنوي:{' '}
                      {Number(previewQuery.data.breakdown.cash_annual_portion).toLocaleString(
                        'ar-EG',
                      )}{' '}
                      ج.م
                    </p>
                    <p>
                      فائدة ({Number(previewQuery.data.breakdown.months)} شهر ×{' '}
                      {Number(previewQuery.data.breakdown.monthly_interest_amount).toLocaleString(
                        'ar-EG',
                      )}
                      ):{' '}
                      {Number(previewQuery.data.breakdown.interest_total).toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
                    </p>
                    {previewQuery.data.breakdown.installation_executed_at ? (
                      <p>
                        تاريخ تنفيذ التركيب:{' '}
                        {previewQuery.data.breakdown.installation_executed_at}
                      </p>
                    ) : (
                      <p>لم يُسجَّل تنفيذ تركيب بعد — الفائدة = 0</p>
                    )}
                  </div>
                )}
                <div>
                  <label className="mb-xs block text-on-surface-variant">
                    مديونية الجهاز (ج.م) — يمكن تعديلها يدوياً
                  </label>
                  <NumericInput
                    type="number"
                    min={0}
                    value={deviceDebt}
                    onChange={(e) => setDeviceDebt(e.target.value)}
                    className="w-full rounded border border-outline-variant px-sm py-2 tabular-nums"
                  />
                </div>
                <div className="flex justify-between">
                  <dt className="text-on-surface-variant">أمر الدفع للعميل</dt>
                  <dd className="tabular-nums font-bold text-secondary">
                    {Number(
                      Math.max(0, Number(previewQuery.data.total_paid) - Number(deviceDebt || 0)),
                    ).toLocaleString('ar-EG', { numberingSystem: 'latn' })}{' '}
                    ج.م
                  </dd>
                </div>
              </dl>
            ) : null}
            {error && <p className="text-sm text-error">{getErrorMessage(error)}</p>}
            <div className="flex justify-between gap-sm">
              <button type="button" onClick={onClose} className="rounded-lg border border-outline-variant px-md py-sm text-sm">
                إلغاء
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => completeReturnMutation.mutate()}
                className="rounded-lg bg-error px-md py-sm text-sm font-medium text-on-error disabled:opacity-50"
              >
                {pending ? 'جاري الاسترجاع…' : 'إكمال الاسترجاع'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && caseType === 'exchange' && (
          <div className="space-y-md">
            <div>
              <label className="mb-xs block text-sm text-on-surface-variant">حالة الجهاز المستبدَل</label>
              <div className="flex gap-sm">
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    name="disposition"
                    checked={disposition === 'good'}
                    onChange={() => setDisposition('good')}
                  />
                  سليم → مخزون جديد
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    name="disposition"
                    checked={disposition === 'faulty'}
                    onChange={() => setDisposition('faulty')}
                  />
                  عطل → صيانة
                </label>
              </div>
            </div>
            <div>
              <label className="mb-xs block text-sm text-on-surface-variant">الجهاز الجديد من المخزون</label>
              <select
                value={newUnitId}
                onChange={(e) => setNewUnitId(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-lg border border-outline-variant px-sm py-2 text-sm"
              >
                <option value="">اختر جهازاً</option>
                {(unitsQuery.data ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.serial_number ?? u.imei ?? `#${u.id}`}
                  </option>
                ))}
              </select>
              {(unitsQuery.data ?? []).length === 0 && !unitsQuery.isLoading && (
                <p className="mt-xs text-xs text-on-surface-variant">لا توجد أجهزة متاحة في مخزون الفرع</p>
              )}
            </div>
            {error && <p className="text-sm text-error">{getErrorMessage(error)}</p>}
            <div className="flex justify-between gap-sm">
              <button type="button" onClick={onClose} className="rounded-lg border border-outline-variant px-md py-sm text-sm">
                إلغاء
              </button>
              <button
                type="button"
                disabled={!newUnitId || pending}
                onClick={() => completeExchangeMutation.mutate()}
                className="rounded-lg bg-primary px-md py-sm text-sm font-medium text-on-primary disabled:opacity-50"
              >
                {pending ? 'جاري الاستبدال…' : 'إكمال الاستبدال'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && caseType === 'support' && (
          <div className="space-y-md">
            <div>
              <label className="mb-xs block text-sm text-on-surface-variant">الفني (اختياري)</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-lg border border-outline-variant px-sm py-2 text-sm"
              >
                <option value="">بدون إسناد</option>
                {(employeesQuery.data ?? []).map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-xs block text-sm text-on-surface-variant">موعد الزيارة (اختياري)</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-lg border border-outline-variant px-sm py-2 text-sm"
              />
            </div>
            {error && <p className="text-sm text-error">{getErrorMessage(error)}</p>}
            <div className="flex justify-between gap-sm">
              <button type="button" onClick={onClose} className="rounded-lg border border-outline-variant px-md py-sm text-sm">
                إلغاء
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => completeSupportMutation.mutate()}
                className="rounded-lg bg-primary px-md py-sm text-sm font-medium text-on-primary disabled:opacity-50"
              >
                {pending ? 'جاري الإنشاء…' : 'إنشاء مهمة الدعم'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && caseType === 'cancel' && (
          <div className="space-y-md">
            {cancelPreviewQuery.isLoading ? (
              <p className="text-sm text-on-surface-variant">جاري حساب المقدم…</p>
            ) : (
              <>
                <p className="text-sm text-on-surface-variant">
                  سيتم إلغاء مهمة الفني وإرجاع الجهاز للمخزن وتغيير حالة العقد إلى ملغى.
                </p>
                {downPaymentAmount > 0 ? (
                  <div className="space-y-sm rounded-lg border border-outline-variant bg-surface-container-low p-sm text-sm">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">المقدم المستحق للرد</span>
                      <span className="tabular-nums font-medium">
                        {downPaymentAmount.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-on-surface-variant">
                      <p className="font-medium text-on-surface">طريقة الدفع الأصلية (للعلم)</p>
                      {(cancelPreviewQuery.data?.payments ?? []).map((p) => (
                        <p key={p.id}>
                          {Number(p.amount).toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م — {originalPaymentLabel(p)}
                        </p>
                      ))}
                    </div>
                    <div>
                      <p className="mb-xs text-on-surface-variant">وجهة رد المقدم</p>
                      <div className="flex flex-wrap gap-sm">
                        <label className="flex items-center gap-1 text-sm">
                          <input
                            type="radio"
                            name="refundVia"
                            checked={refundVia === 'cash'}
                            onChange={() => {
                              setRefundVia('cash')
                              setRefundAccountId('')
                            }}
                          />
                          نقدي
                        </label>
                        <label className="flex items-center gap-1 text-sm">
                          <input
                            type="radio"
                            name="refundVia"
                            checked={refundVia === 'account'}
                            onChange={() => setRefundVia('account')}
                          />
                          حساب تحصيل
                        </label>
                      </div>
                    </div>
                    {refundVia === 'account' && (
                      <select
                        value={refundAccountId}
                        onChange={(e) => setRefundAccountId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full rounded-lg border border-outline-variant px-sm py-2 text-sm"
                      >
                        <option value="">اختر الحساب</option>
                        {(accountsQuery.data ?? []).map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.beneficiary_name}
                            {account.phone ? ` — ${account.phone}` : ''}
                            {account.bank_name ? ` — ${account.bank_name}` : ''}
                            {` (${PAYMENT_METHOD_LABELS[account.payment_method] ?? account.payment_method})`}
                          </option>
                        ))}
                      </select>
                    )}
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={customerReceivedRefund}
                        onChange={(e) => setCustomerReceivedRefund(e.target.checked)}
                      />
                      <span>
                        أؤكد أن العميل استلم مبلغ المقدم{' '}
                        {downPaymentAmount.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م عبر{' '}
                        {refundVia === 'cash'
                          ? 'نقدي'
                          : (accountsQuery.data ?? []).find((a) => a.id === refundAccountId)?.beneficiary_name ??
                            'الحساب المختار'}
                      </span>
                    </label>
                  </div>
                ) : (
                  <p className="text-sm text-on-surface-variant">لا يوجد مقدم للرد على هذا العقد.</p>
                )}
              </>
            )}
            {error && <p className="text-sm text-error">{getErrorMessage(error)}</p>}
            <div className="flex justify-between gap-sm">
              <button type="button" onClick={onClose} className="rounded-lg border border-outline-variant px-md py-sm text-sm">
                إلغاء
              </button>
              <button
                type="button"
                disabled={pending || !canCompleteCancel}
                onClick={() => completeCancelMutation.mutate()}
                className="rounded-lg bg-error px-md py-sm text-sm font-medium text-on-error disabled:opacity-50"
              >
                {pending ? 'جاري الإلغاء…' : 'إكمال إلغاء التعاقد'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
