import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../api/client'
import type { Employee, PaginatedResponse, ProductUnit, SalesInvoice } from '../../api/types'
import { Icon } from '../Icon'

type CaseType = 'support' | 'return' | 'exchange'

interface ReturnDebtBreakdown {
  uninstall_fee: number
  installation_fee: number
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

const TYPE_OPTIONS: { value: CaseType; label: string; description: string }[] = [
  { value: 'support', label: 'دعم فني', description: 'إنشاء مهمة دعم للعقد' },
  { value: 'return', label: 'استرجاع', description: 'إرجاع الجهاز للمخزون وأمر دفع إن لزم' },
  { value: 'exchange', label: 'استبدال', description: 'استبدال الجهاز بآخر من مخزون الفرع' },
]

export function ContractProblemWizard({ invoice, open, onClose, onComplete }: ContractProblemWizardProps) {
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

  const deviceLine = invoice.lines?.find((l) => l.product_unit_id)
  const warehouseId = invoice.warehouse_id

  useEffect(() => {
    if (!open) {
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
    }
  }, [open])

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
    onSuccess: onComplete,
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
    onSuccess: onComplete,
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
    onSuccess: onComplete,
  })

  if (!open) return null

  const pending =
    openCaseMutation.isPending ||
    completeReturnMutation.isPending ||
    completeExchangeMutation.isPending ||
    completeSupportMutation.isPending

  const error =
    openCaseMutation.error ??
    completeReturnMutation.error ??
    completeExchangeMutation.error ??
    completeSupportMutation.error

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
            {TYPE_OPTIONS.map((opt) => (
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
                    {Number(previewQuery.data.total_paid).toLocaleString('ar-EG')} ج.م
                  </dd>
                </div>
                {previewQuery.data.breakdown && (
                  <div className="space-y-1 rounded border border-outline-variant/60 bg-surface-container-lowest px-sm py-sm text-xs text-on-surface-variant">
                    <p className="font-medium text-on-surface">تفصيل المديونية المحسوبة</p>
                    <p>
                      رسوم فك:{' '}
                      {Number(previewQuery.data.breakdown.uninstall_fee).toLocaleString('ar-EG')} ج.م
                    </p>
                    <p>
                      رسوم تركيب:{' '}
                      {Number(previewQuery.data.breakdown.installation_fee).toLocaleString('ar-EG')}{' '}
                      ج.م
                    </p>
                    <p>
                      رسوم سوفت:{' '}
                      {Number(previewQuery.data.breakdown.software_fee).toLocaleString('ar-EG')} ج.م
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
                      {Number(previewQuery.data.breakdown.interest_total).toLocaleString('ar-EG')} ج.م
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
                  <input
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
                    ).toLocaleString('ar-EG')}{' '}
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
      </div>
    </div>
  )
}
