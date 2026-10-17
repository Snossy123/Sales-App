import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Branch, DailyBranchReport, DailyBranchReportInference, Distributor } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import {
  TRANSACTION_ROW_COUNT,
  arabicDayName,
  branchDisplayName,
  createEmptyDailyReportForm,
  dailyReportPrintPath,
  formToPayload,
  mergeDailyReportInference,
  recalcDailyReportTotals,
  reportToForm,
  transactionTypeSuggestions,
  type DailyBranchReportFormState,
} from '../lib/dailyBranchReport'
import { useAuthStore } from '../stores/authStore'
import { NumericInput } from '../components/ui/NumericInput'
import { userCanPerform } from '../lib/access'


type Tab = 'transactions' | 'summary'

export function DailyBranchReportPage() {
  const queryClient = useQueryClient()
  const branchId = useAuthStore((s) => s.branchId)
  const user = useAuthStore((s) => s.user)
  const canManage = userCanPerform(user, 'daily_reports.manage')
  const [tab, setTab] = useState<Tab>('transactions')
  const [reportId, setReportId] = useState<number | null>(null)
  const [form, setForm] = useState<DailyBranchReportFormState>(() => createEmptyDailyReportForm())
  const [successMsg, setSuccessMsg] = useState('')

  const branchQuery = useQuery({
    queryKey: ['branches', branchId],
    queryFn: async () => {
      const { data } = await api.get<Branch>(`/branches/${branchId}`)
      return data
    },
    enabled: Boolean(branchId),
  })

  const distributorsQuery = useQuery({
    queryKey: ['distributors', 'daily-report'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Distributor[] }>('/distributors', { params: { per_page: 200 } })
      return data.data ?? []
    },
  })

  const existingQuery = useQuery({
    queryKey: ['daily-branch-reports', branchId, form.report_date],
    queryFn: async () => {
      const { data } = await api.get<{ data: DailyBranchReport[] }>('/daily-branch-reports', {
        params: {
          per_page: 1,
          'filter[branch_id]': branchId,
          'filter[report_date]': form.report_date,
        },
      })
      return data.data[0] ?? null
    },
    enabled: Boolean(branchId),
  })

  const inferenceQuery = useQuery({
    queryKey: ['daily-branch-reports', 'inference', branchId, form.report_date],
    queryFn: async () => {
      const { data } = await api.get<DailyBranchReportInference>('/daily-branch-reports/inference', {
        params: { branch_id: branchId, report_date: form.report_date },
      })
      return data
    },
    enabled: Boolean(branchId),
  })

  useEffect(() => {
    if (existingQuery.isFetching || inferenceQuery.isFetching) return
    if (!existingQuery.isSuccess || !inferenceQuery.isSuccess) return

    const base = existingQuery.data
      ? reportToForm(existingQuery.data)
      : createEmptyDailyReportForm(form.report_date)
    // Query results initialize the editable snapshot for the selected day.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReportId(existingQuery.data?.id ?? null)
    setForm(mergeDailyReportInference(base, inferenceQuery.data.inferred))
  }, [
    existingQuery.data,
    existingQuery.isFetching,
    existingQuery.isSuccess,
    inferenceQuery.data,
    inferenceQuery.isFetching,
    inferenceQuery.isSuccess,
    form.report_date,
  ])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!branchId) throw new Error('اختر فرعاً')
      const payload = formToPayload(form, branchId)
      if (reportId) {
        const { data } = await api.put<DailyBranchReport>(
          `/daily-branch-reports/${reportId}`,
          payload,
        )
        return data
      }
      const { data } = await api.post<DailyBranchReport>('/daily-branch-reports', payload)
      return data
    },
    onSuccess: (report) => {
      setReportId(report.id)
      setForm(reportToForm(report))
      setSuccessMsg('تم حفظ البيان اليومي')
      queryClient.invalidateQueries({ queryKey: ['daily-branch-reports'] })
    },
  })

  const updateForm = (patch: Partial<DailyBranchReportFormState>) => {
    setForm((prev) => recalcDailyReportTotals({ ...prev, ...patch }))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canManage) return
    saveMutation.mutate()
  }

  const inputClass = 'w-full rounded border border-outline-variant px-sm py-1.5 text-sm'

  if (!branchId) {
    return (
      <SalesPageShell title="البيان اليومي" subtitle="يرجى اختيار فرع من الشريط العلوي">
        <p className="text-on-surface-variant">اختر فرعاً لبدء إدخال البيان اليومي.</p>
      </SalesPageShell>
    )
  }

  const branchName = branchDisplayName(branchQuery.data)

  return (
    <SalesPageShell
      title="البيان اليومي للفرع"
      subtitle={`${branchName} — ${arabicDayName(form.report_date)} ${form.report_date}`}
      actions={
        reportId ? (
          <Link
            to={dailyReportPrintPath(reportId, true)}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="print" size={18} />
            طباعة البيان
          </Link>
        ) : undefined
      }
    >
      <form onSubmit={handleSubmit} className="space-y-md">
        <div className="flex flex-wrap items-end gap-sm rounded-lg border border-outline-variant bg-surface-container-low p-sm">
          <label className="text-sm">
            <span className="mb-xs block text-on-surface-variant">تاريخ البيان</span>
            <input
              type="date"
              value={form.report_date}
              onChange={(e) => updateForm({ report_date: e.target.value })}
              className={inputClass}
            />
          </label>
          <div className="flex flex-wrap items-center gap-md rounded-lg bg-surface-container-lowest px-md py-2 text-sm">
            <div>
              <span className="text-on-surface-variant">المدفوعات (إجمالي): </span>
              <strong className="tabular-nums text-primary">{form.total_amount.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م</strong>
            </div>
            <span className="text-outline-variant">|</span>
            <div>
              <span className="text-on-surface-variant">المصروفات (إجمالي): </span>
              <strong className="tabular-nums text-error">{form.expenses_total.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م</strong>
            </div>
            <span className="text-outline-variant">|</span>
            <div>
              <span className="text-on-surface-variant">الصافي: </span>
              <strong className="tabular-nums text-emerald-600 dark:text-emerald-400 font-bold">{form.net_amount.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م</strong>
            </div>
          </div>
        </div>

        <div className="flex gap-sm border-b border-outline-variant">
          {(
            [
              ['transactions', 'بيان المعاملات'],
              ['summary', 'بيان الملخص'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`border-b-2 px-md py-2 text-sm font-medium ${
                tab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <AsyncState
          isLoading={existingQuery.isLoading || inferenceQuery.isLoading}
          isError={existingQuery.isError || inferenceQuery.isError}
          error={existingQuery.error ?? inferenceQuery.error}
        >
          {inferenceQuery.data?.warnings.includes('INVENTORY_HISTORY_UNAVAILABLE') && (
            <p className="mb-md rounded-lg bg-warning/10 p-sm text-sm text-on-surface">
              أرصدة الأجهزة التاريخية غير متاحة؛ يتم عرض آخر لقطة محفوظة لهذا اليوم.
            </p>
          )}
          {inferenceQuery.data && (
            <p className="mb-md text-xs text-on-surface-variant">
              مستنتج من النظام: {inferenceQuery.data.sources.payments ?? 0} مدفوعات،{' '}
              {inferenceQuery.data.sources.expenses ?? 0} مصروفات،{' '}
              {inferenceQuery.data.sources.attendance ?? 0} موظفين،{' '}
              {inferenceQuery.data.sources.installations ?? 0} تركيبات.
            </p>
          )}
          {tab === 'transactions' && (
            <div className="grid gap-md lg:grid-cols-2">
              <section className="rounded-lg border border-outline-variant p-md">
                <h3 className="mb-sm font-bold text-error">تحويلات فودافون كاش</h3>
                <div className="space-y-sm">
                  {form.transfers.map((row, index) => (
                    <div key={index} className="grid grid-cols-3 gap-xs">
                      <input
                        placeholder="اسم العميل"
                        value={row.customer_name}
                        disabled
                        onChange={(e) => {
                          const transfers = [...form.transfers]
                          transfers[index] = { ...transfers[index], customer_name: e.target.value }
                          updateForm({ transfers })
                        }}
                        className={inputClass}
                      />
                      <NumericInput
                        placeholder="المبلغ"
                        type="number"
                        value={row.amount}
                        disabled
                        onChange={(e) => {
                          const transfers = [...form.transfers]
                          transfers[index] = {
                            ...transfers[index],
                            amount: e.target.value === '' ? '' : Number(e.target.value),
                          }
                          updateForm({ transfers })
                        }}
                        className={inputClass}
                      />
                      <input
                        placeholder="مرجع / انستا"
                        value={row.reference}
                        disabled
                        onChange={(e) => {
                          const transfers = [...form.transfers]
                          transfers[index] = { ...transfers[index], reference: e.target.value }
                          updateForm({ transfers })
                        }}
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-outline-variant p-md lg:col-span-1">
                <h3 className="mb-sm font-bold">معاملات اليوم ({Math.max(TRANSACTION_ROW_COUNT, form.transactions.length)} صف)</h3>
                <div className="max-h-[520px] space-y-1 overflow-y-auto">
                  {form.transactions.map((row, index) => (
                    <div key={index} className="grid grid-cols-[2rem_1fr_1fr_1fr_5rem] gap-1">
                      <span className="pt-2 text-center text-xs text-on-surface-variant">
                        {index + 1}
                      </span>
                      <input
                        placeholder="اسم العميل"
                        value={row.customer_name}
                        disabled
                        onChange={(e) => {
                          const transactions = [...form.transactions]
                          transactions[index] = {
                            ...transactions[index],
                            customer_name: e.target.value,
                          }
                          updateForm({ transactions })
                        }}
                        className={inputClass}
                      />
                      <input
                        placeholder="المروج / الموزع"
                        list="distributor-names"
                        value={row.promoter_name}
                        disabled
                        onChange={(e) => {
                          const name = e.target.value
                          const match = (distributorsQuery.data ?? []).find(
                            (d) => d.name === name || d.name_ar === name,
                          )
                          const transactions = [...form.transactions]
                          transactions[index] = {
                            ...transactions[index],
                            promoter_name: name,
                            distributor_id: match?.id ?? '',
                          }
                          updateForm({ transactions })
                        }}
                        className={inputClass}
                      />
                      <input
                        placeholder="الحالة"
                        list="transaction-types"
                        value={row.transaction_type}
                        disabled
                        onChange={(e) => {
                          const transactions = [...form.transactions]
                          transactions[index] = {
                            ...transactions[index],
                            transaction_type: e.target.value,
                          }
                          updateForm({ transactions })
                        }}
                        className={inputClass}
                      />
                      <NumericInput
                        placeholder="مبلغ"
                        type="number"
                        value={row.amount}
                        disabled
                        onChange={(e) => {
                          const transactions = [...form.transactions]
                          transactions[index] = {
                            ...transactions[index],
                            amount: e.target.value === '' ? '' : Number(e.target.value),
                          }
                          updateForm({ transactions })
                        }}
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
                <datalist id="distributor-names">
                  {(distributorsQuery.data ?? []).map((d) => (
                    <option key={d.id} value={d.name_ar || d.name} />
                  ))}
                </datalist>
                <datalist id="transaction-types">
                  {transactionTypeSuggestions.map((type) => (
                    <option key={type} value={type} />
                  ))}
                </datalist>
              </section>
            </div>
          )}

          {tab === 'summary' && (
            <div className="grid gap-md lg:grid-cols-2">
              <section className="rounded-lg border border-outline-variant p-md">
                <h3 className="mb-sm font-bold">حضور الموظفين</h3>
                {form.attendance.map((row, index) => (
                  <div key={index} className="mb-sm grid grid-cols-3 gap-xs">
                    <input
                      placeholder="اسم الموظف"
                      value={row.employee_name}
                      disabled
                      onChange={(e) => {
                        const attendance = [...form.attendance]
                        attendance[index] = { ...attendance[index], employee_name: e.target.value }
                        updateForm({ attendance })
                      }}
                      className={inputClass}
                    />
                    <input
                      placeholder="حضور"
                      value={row.check_in}
                      disabled
                      onChange={(e) => {
                        const attendance = [...form.attendance]
                        attendance[index] = { ...attendance[index], check_in: e.target.value }
                        updateForm({ attendance })
                      }}
                      className={inputClass}
                    />
                    <input
                      placeholder="انصراف"
                      value={row.check_out}
                      disabled
                      onChange={(e) => {
                        const attendance = [...form.attendance]
                        attendance[index] = { ...attendance[index], check_out: e.target.value }
                        updateForm({ attendance })
                      }}
                      className={inputClass}
                    />
                  </div>
                ))}
              </section>

              <section className="rounded-lg border border-outline-variant p-md">
                <h3 className="mb-sm font-bold">ملخص الأرقام</h3>
                <div className="grid grid-cols-2 gap-sm">
                  {[
                    ['installations_count', 'تركيب'],
                    ['devices_actual', 'اجهزة فعلي'],
                    ['devices_reserved', 'حجز'],
                    ['devices_customer', 'اجهزة عملاء'],
                    ['devices_software', 'اجهزة السوفت'],
                    ['accessories_tape', 'شكرتون'],
                    ['accessories_cable_ties', 'افيز'],
                    ['accessories_bulb', 'بلونه'],
                    ['devices_entering_count', 'دخول اجهزة للفرع'],
                  ].map(([key, label]) => (
                    <label key={key} className="text-sm">
                      <span className="mb-xs block text-on-surface-variant">{label}</span>
                      <NumericInput
                        type="number"
                        min={0}
                        value={form[key as keyof DailyBranchReportFormState] as number | ''}
                        disabled={!canManage || !key.startsWith('accessories_')}
                        onChange={(e) =>
                          updateForm({
                            [key]: e.target.value === '' ? '' : Number(e.target.value),
                          } as Partial<DailyBranchReportFormState>)
                        }
                        className={inputClass}
                      />
                    </label>
                  ))}
                  <label className="text-sm">
                    <span className="mb-xs block text-on-surface-variant">النسبة</span>
                    <input
                      value={form.percentage}
                      disabled={!canManage}
                      onChange={(e) => updateForm({ percentage: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <label className="col-span-2 text-sm">
                    <span className="mb-xs block text-on-surface-variant">ملاحظات</span>
                    <textarea
                      value={form.notes}
                      disabled={!canManage}
                      onChange={(e) => updateForm({ notes: e.target.value })}
                      rows={3}
                      className={inputClass}
                    />
                  </label>
                  <label className="col-span-2 text-sm">
                    <span className="mb-xs block text-on-surface-variant">ملاحظات فودافون / انستا</span>
                    <input
                      value={form.vodafone_other_notes}
                      disabled={!canManage}
                      onChange={(e) => updateForm({ vodafone_other_notes: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <label className="col-span-2 text-sm">
                    <span className="mb-xs block text-on-surface-variant">تجديد</span>
                    <input
                      value={form.renewal_notes}
                      disabled={!canManage}
                      onChange={(e) => updateForm({ renewal_notes: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-lg border border-outline-variant p-md">
                <h3 className="mb-sm font-bold">تحركات</h3>
                {form.movements.map((row, index) => (
                  <input
                    key={index}
                    placeholder={`تحرك ${index + 1}`}
                    value={row.description}
                    disabled
                    onChange={(e) => {
                      const movements = [...form.movements]
                      movements[index] = { description: e.target.value }
                      updateForm({ movements })
                    }}
                    className={`${inputClass} mb-sm`}
                  />
                ))}
              </section>

              <section className="rounded-lg border border-outline-variant p-md">
                <h3 className="mb-sm font-bold">التفاصيل والمصروفات</h3>
                {form.expense_lines.map((row, index) => (
                  <div key={index} className="mb-sm grid grid-cols-[2rem_1fr_6rem] gap-1">
                    <span className="pt-2 text-center text-xs">{index + 1}</span>
                    <input
                      placeholder="البيان"
                      value={row.description}
                      disabled
                      onChange={(e) => {
                        const expense_lines = [...form.expense_lines]
                        expense_lines[index] = {
                          ...expense_lines[index],
                          description: e.target.value,
                        }
                        updateForm({ expense_lines })
                      }}
                      className={inputClass}
                    />
                    <NumericInput
                      placeholder="مبلغ"
                      type="number"
                      min={0}
                      value={row.amount}
                      disabled
                      onChange={(e) => {
                        const expense_lines = [...form.expense_lines]
                        expense_lines[index] = {
                          ...expense_lines[index],
                          amount: e.target.value === '' ? '' : Number(e.target.value),
                        }
                        updateForm({ expense_lines })
                      }}
                      className={inputClass}
                    />
                  </div>
                ))}
                <p className="text-sm text-on-surface-variant">
                  إجمالي المصروفات:{' '}
                  <strong>{form.expenses_total.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م</strong>
                </p>
              </section>

              <section className="rounded-lg border border-outline-variant p-md lg:col-span-2">
                <div className="grid gap-sm sm:grid-cols-2">
                  <label className="text-sm">
                    <span className="mb-xs block text-on-surface-variant">توقيع المراجع</span>
                    <input
                      value={form.reviewer_name}
                      disabled={!canManage}
                      onChange={(e) => updateForm({ reviewer_name: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-xs block text-on-surface-variant">توقيع مدير الفرع</span>
                    <input
                      value={form.branch_manager_name}
                      disabled={!canManage}
                      onChange={(e) => updateForm({ branch_manager_name: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                </div>
              </section>
            </div>
          )}
        </AsyncState>

        {saveMutation.isError && (
          <p className="text-sm text-error">{getErrorMessage(saveMutation.error)}</p>
        )}
        {successMsg && (
          <p className="rounded-lg bg-secondary/10 p-sm text-sm text-secondary">{successMsg}</p>
        )}

        <div className="flex flex-wrap gap-sm">
          {canManage && (
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-lg bg-secondary px-xl py-3 font-bold text-on-secondary disabled:opacity-50"
            >
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ البيان اليومي'}
            </button>
          )}
          {reportId && (
            <Link
              to={dailyReportPrintPath(reportId, true)}
              className="inline-flex items-center gap-1 rounded-lg border border-primary px-md py-3 font-bold text-primary"
            >
              <Icon name="print" size={18} />
              طباعة
            </Link>
          )}
        </div>
      </form>
    </SalesPageShell>
  )
}
