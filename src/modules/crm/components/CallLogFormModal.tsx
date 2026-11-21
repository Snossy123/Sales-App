import { AppDateTimePicker } from '../../../components/AppDateTimePicker'
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { api, getErrorMessage } from '../../../api/client'
import type {
  CallStatementForm,
  CrmCallLog,
  CrmTask,
  Customer,
  Employee,
  Lead,
  PaginatedResponse,
  ReferralLead,
  ServiceEvaluationRequest,
} from '../../../api/types'
import { Modal } from '../../../components/Modal'
import { SearchableSelect } from '../../../components/SearchableSelect'
import { TextArea } from '../../../components/ui/TextArea'
import { NumericInput } from '../../../components/ui/NumericInput'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import {
  CALL_NEXT_ACTION_OPTIONS,
  CALL_OUTCOME_OPTIONS,
  PROBLEM_CALL_OUTCOME_OPTIONS,
  CALL_PRIORITY_OPTIONS,
  canCreateTaskFromStatement,
  emptyStatementForm,
  previewTaskTitle,
} from '../lib/callStatementForm'
import {
  customerToCallContactOptions,
  datetimeLocalToIso,
  isoToDatetimeLocal,
  mergeCallContactOptions,
  nowDatetimeLocal,
  type CallContactOption,
} from '../lib/contactPhones'

const inputClass =
  'h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary'

const labelClass = 'mb-1 block text-xs font-semibold text-on-surface-variant'

const sectionClass = 'space-y-3 rounded-xl border border-outline-variant/80 bg-surface-container-low p-3'

interface OpenCaseOption {
  id: number
  case_type: string
  status: string
  sales_invoice?: { invoice_number?: string | null } | null
}

export function CallLogFormModal({
  open,
  onClose,
  onSaved,
  lockedCustomerId,
  lockedCaseId,
  lockedEvaluationId,
  embedded = false,
}: {
  open: boolean
  onClose: () => void
  onSaved?: (message: string) => void
  lockedCustomerId?: number
  lockedCaseId?: number
  lockedEvaluationId?: number
  embedded?: boolean
}) {
  const queryClient = useQueryClient()
  const formId = `call-log-form-${useId().replace(/:/g, '')}`
  const [selectedContact, setSelectedContact] = useState<CallContactOption | null>(null)
  const [contactSearch, setContactSearch] = useState('')
  const debouncedContactSearch = useDebouncedValue(contactSearch, 300)
  const [formError, setFormError] = useState<string | null>(null)
  const [caseId, setCaseId] = useState<number | ''>(lockedCaseId ?? '')
  const [createAudioFile, setCreateAudioFile] = useState<File | null>(null)
  const [createWithTask, setCreateWithTask] = useState(false)
  const [taskEmployeeId, setTaskEmployeeId] = useState<number | ''>('')
  const [form, setForm] = useState({
    mobile_number: '',
    mobile_name: '',
    customer_id: (lockedCustomerId ?? '') as number | '',
    lead_id: '' as number | '',
    referral_lead_id: '' as number | '',
    call_type: 'outbound',
    duration: '',
    start_time: nowDatetimeLocal(),
    statement_form: emptyStatementForm(),
    service_evaluation_request_id: (lockedEvaluationId ?? '') as number | '',
  })

  useEffect(() => {
    if (!open) return
    setFormError(null)
    setCreateAudioFile(null)
    setCreateWithTask(false)
    setCaseId(lockedCaseId ?? '')
    setForm((prev) => ({
      ...prev,
      customer_id: lockedCustomerId ?? '',
      service_evaluation_request_id: lockedEvaluationId ?? '',
      duration: '',
      start_time: nowDatetimeLocal(),
      statement_form: emptyStatementForm(),
    }))
  }, [open, lockedCustomerId, lockedCaseId, lockedEvaluationId])

  const lockedCustomerQuery = useQuery({
    queryKey: ['customers', lockedCustomerId, 'call-form'],
    queryFn: async () => {
      const { data } = await api.get<Customer>(`/customers/${lockedCustomerId}`)
      return data
    },
    enabled: open && Boolean(lockedCustomerId),
  })

  useEffect(() => {
    if (!lockedCustomerQuery.data) return
    const options = customerToCallContactOptions(lockedCustomerQuery.data)
    const first = options[0] ?? null
    setSelectedContact(first)
    if (first) {
      setForm((prev) => ({
        ...prev,
        mobile_number: first.number,
        mobile_name: first.name,
        customer_id: first.customerId ?? lockedCustomerId ?? '',
      }))
    }
  }, [lockedCustomerQuery.data, lockedCustomerId])

  const contactSearchQuery = useQuery({
    queryKey: ['crm', 'call-log-contacts', debouncedContactSearch],
    queryFn: async () => {
      const q = debouncedContactSearch.trim()
      const params: Record<string, string | number> = { per_page: 20 }
      if (q) {
        if (/^\d/.test(q)) params['filter[phone]'] = q
        else params['filter[name]'] = q
      }
      const [customersRes, leadsRes, referralsRes] = await Promise.all([
        api.get<PaginatedResponse<Customer>>('/customers', { params }),
        api.get<PaginatedResponse<Lead>>('/leads', { params }),
        api.get<PaginatedResponse<ReferralLead>>('/crm/referral-leads', { params }),
      ])
      return mergeCallContactOptions(
        customersRes.data.data ?? [],
        leadsRes.data.data ?? [],
        referralsRes.data.data ?? [],
      )
    },
    enabled: open && !lockedCustomerId,
  })

  const contactOptions = useMemo(() => {
    const searched = contactSearchQuery.data ?? []
    if (selectedContact && !searched.some((c) => c.optionKey === selectedContact.optionKey)) {
      return [selectedContact, ...searched]
    }
    return searched
  }, [contactSearchQuery.data, selectedContact])

  const customerId = form.customer_id === '' ? null : Number(form.customer_id)

  const casesQuery = useQuery({
    queryKey: ['contract-cases', 'for-call', customerId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<OpenCaseOption>>('/contract-cases', {
        params: { customer_id: customerId, per_page: 50 },
      })
      return (data.data ?? []).filter((row) => row.status !== 'cancelled')
    },
    enabled: open && !lockedEvaluationId && Boolean(customerId) && !lockedCaseId,
    retry: false,
  })

  const evaluationsQuery = useQuery({
    queryKey: ['crm', 'linkable-evaluations', customerId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ServiceEvaluationRequest[] }>('/crm/call-logs/linkable-evaluations', {
        params: { customer_id: customerId },
      })
      return data.data ?? []
    },
    enabled: open && !lockedEvaluationId && Boolean(customerId),
    retry: false,
  })

  const employeesQuery = useQuery({
    queryKey: ['employees', 'crm-call-task'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100, 'filter[status]': 'active' },
      })
      return data.data
    },
    enabled: open && createWithTask,
  })

  const meEmployeeQuery = useQuery({
    queryKey: ['me-employee'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Employee>('/me/employee')
        return data
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) return null
        throw err
      }
    },
    enabled: open && createWithTask,
  })

  useEffect(() => {
    if (!createWithTask || taskEmployeeId !== '') return
    if (meEmployeeQuery.data?.id) setTaskEmployeeId(meEmployeeQuery.data.id)
  }, [createWithTask, taskEmployeeId, meEmployeeQuery.data?.id])

  const createMutation = useMutation({
    mutationFn: async () => {
      if (createWithTask) {
        if (!canCreateTaskFromStatement(form.statement_form)) {
          throw new Error('حدد المطلوب التالي في الإفادة لإنشاء مهمة')
        }
        if (taskEmployeeId === '') throw new Error('اختر موظفاً للمهمة')
      }

      const statementForm = {
        ...form.statement_form,
        follow_up_date: form.statement_form.follow_up_date
          ? datetimeLocalToIso(form.statement_form.follow_up_date) ?? form.statement_form.follow_up_date
          : null,
      }
      const payload = {
        mobile_number: form.mobile_number.trim() || undefined,
        mobile_name: form.mobile_name || undefined,
        customer_id: form.customer_id ? Number(form.customer_id) : undefined,
        lead_id: form.lead_id ? Number(form.lead_id) : undefined,
        referral_lead_id: form.referral_lead_id ? Number(form.referral_lead_id) : undefined,
        call_type: form.call_type,
        duration: form.duration ? Number(form.duration) : undefined,
        statement_form: statementForm,
        service_evaluation_request_id: lockedEvaluationId ?? (form.service_evaluation_request_id
          ? Number(form.service_evaluation_request_id)
          : undefined),
        start_time: datetimeLocalToIso(form.start_time),
        contract_case_id: caseId === '' ? undefined : Number(caseId),
      }

      const url = lockedCaseId
        ? `/contract-cases/${lockedCaseId}/call-logs`
        : '/crm/call-logs'
      const { data } = await api.post<CrmCallLog>(url, payload)

      if (createAudioFile) {
        const body = new FormData()
        body.append('audio', createAudioFile)
        await api.post(`/crm/call-logs/${data.id}/audio`, body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      let taskId: number | null = null
      if (createWithTask && taskEmployeeId !== '') {
        const { data: created } = await api.post<{ call_log: CrmCallLog; task: CrmTask }>(
          `/crm/call-logs/${data.id}/create-task`,
          { employee_id: Number(taskEmployeeId) },
        )
        taskId = created.task.id
      }

      return taskId
    },
    onSuccess: async (taskId) => {
      await queryClient.invalidateQueries({ queryKey: ['crm', 'call-logs'] })
      await queryClient.invalidateQueries({ queryKey: ['contract-cases'] })
      setForm((prev) => ({
        ...prev,
        duration: '',
        start_time: nowDatetimeLocal(),
        statement_form: emptyStatementForm(),
        service_evaluation_request_id: '',
      }))
      setFormError(null)
      onSaved?.(taskId ? `تم تسجيل المكالمة وإنشاء المهمة #${taskId}` : 'تم تسجيل المكالمة')
      if (!embedded) onClose()
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  })

  const problemMode = Boolean(lockedCaseId)
  const showCasePicker = !lockedEvaluationId && !problemMode && Boolean(customerId) && !casesQuery.isError

  if (!open) return null

  const submitButton = (
    <button
      type="submit"
      form={formId}
      disabled={createMutation.isPending}
      className="h-10 w-full rounded-lg bg-primary text-sm font-bold text-on-primary shadow-sm transition-opacity disabled:opacity-50"
    >
      {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ المكالمة'}
    </button>
  )

  const formBody = (
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault()
          createMutation.mutate()
        }}
        className="space-y-3"
      >
        {formError ? (
          <p className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">{formError}</p>
        ) : null}
        {lockedCustomerId ? (
          <div className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-2.5 text-sm">
            <p className="font-medium text-on-surface">
              العميل: {lockedCustomerQuery.data?.name ?? selectedContact?.name ?? '…'}
              {selectedContact ? (
                <>
                  {' '}
                  · <span dir="ltr">{selectedContact.number}</span>
                </>
              ) : null}
            </p>
          </div>
        ) : (
          <SearchableSelect
            label="جهة الاتصال (عميل / ترشيح / عميل محتمل)"
            options={contactOptions}
            value={selectedContact}
            onChange={(contact) => {
              setSelectedContact(contact)
              setCaseId('')
              setForm((prev) => ({
                ...prev,
                mobile_number: contact?.number ?? '',
                mobile_name: contact?.name ?? '',
                customer_id: contact?.customerId ?? '',
                lead_id: contact?.leadId ?? '',
                referral_lead_id: contact?.referralLeadId ?? '',
                service_evaluation_request_id: '',
              }))
            }}
            onSearchChange={setContactSearch}
            getOptionValue={(c) => c.optionKey}
            getOptionLabel={(c) => c.label}
            placeholder="ابحث بالاسم أو رقم الموبايل..."
            loading={contactSearchQuery.isLoading}
            emptyMessage="لا يوجد تطابق في العملاء أو الترشيحات"
          />
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className={problemMode ? 'min-w-0 sm:col-span-2' : 'min-w-0'}>
            <label className={labelClass}>وقت المكالمة</label>
            <AppDateTimePicker
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e })}
              className={inputClass}
            />
          </div>
          {problemMode ? null : (
            <div>
              <label className={labelClass}>المدة بالثواني</label>
              <NumericInput
                type="number"
                min={0}
                step={1}
                placeholder="0"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className={inputClass}
                dir="ltr"
              />
            </div>
          )}
        </div>

        {showCasePicker ? (
          <div>
            <label className={labelClass}>ربط بمشكلة</label>
            <select
              value={caseId}
              onChange={(e) => setCaseId(e.target.value ? Number(e.target.value) : '')}
              className={inputClass}
            >
              <option value="">— بدون ربط —</option>
              {(casesQuery.data ?? []).map((row) => (
                <option key={row.id} value={row.id}>
                  #{row.id}
                  {row.sales_invoice?.invoice_number ? ` · ${row.sales_invoice.invoice_number}` : ''} · {row.case_type}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {problemMode ? (
          <div className={sectionClass}>
            <p className="text-sm font-bold text-on-surface">الإفادة</p>
            <Field label="نتيجة المكالمة">
              <select
                value={form.statement_form.outcome ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    statement_form: {
                      ...form.statement_form,
                      outcome: (e.target.value || null) as CallStatementForm['outcome'],
                    },
                  })
                }
                className={inputClass}
              >
                <option value="">— اختر —</option>
                {PROBLEM_CALL_OUTCOME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="الملاحظة">
              <TextArea
                mode="arabic"
                placeholder="إيه اللي حصل في المكالمة…"
                value={form.statement_form.notes ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    statement_form: { ...form.statement_form, notes: e.target.value },
                  })
                }
                rows={2}
                maxLength={2000}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
              />
            </Field>
          </div>
        ) : lockedEvaluationId ? (
          <Field label="ملاحظات مكالمة التقييم">
            <TextArea
              mode="arabic"
              value={form.statement_form.notes ?? ''}
              onChange={(e) => setForm({ ...form, statement_form: { ...form.statement_form, notes: e.target.value } })}
              rows={2}
              maxLength={2000}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
        ) : (
          <>
            <StatementFields
              value={form.statement_form}
              onChange={(statement_form) => setForm({ ...form, statement_form })}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>ربط بتقييم (تفتيش)</label>
                <select
                  value={form.service_evaluation_request_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      service_evaluation_request_id: e.target.value ? Number(e.target.value) : '',
                    })
                  }
                  className={inputClass}
                  disabled={!customerId}
                >
                  <option value="">— بدون ربط —</option>
                  {(evaluationsQuery.data ?? []).map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      تقييم #{ev.id}
                      {ev.executed_at ? ` · ${ev.executed_at.slice(0, 10)}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>ملف صوتي</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setCreateAudioFile(e.target.files?.[0] ?? null)}
                  className="block w-full cursor-pointer rounded-lg border border-dashed border-outline-variant bg-surface-container-low px-2 py-2 text-xs text-on-surface-variant file:me-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-primary"
                />
              </div>
            </div>
            <div className={sectionClass}>
              <label className="flex items-center gap-2 text-sm font-medium text-on-surface">
                <input
                  type="checkbox"
                  checked={createWithTask}
                  onChange={(e) => setCreateWithTask(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                إنشاء مهمة من الإفادة بعد الحفظ
              </label>
              {createWithTask ? (
                <select
                  value={taskEmployeeId}
                  onChange={(e) => setTaskEmployeeId(e.target.value ? Number(e.target.value) : '')}
                  className={inputClass}
                >
                  <option value="">— اختر موظفاً —</option>
                  {(employeesQuery.data ?? []).map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              ) : null}
              {createWithTask && canCreateTaskFromStatement(form.statement_form) ? (
                <p className="text-xs text-on-surface-variant">
                  معاينة: {previewTaskTitle(form.statement_form, form.mobile_name || form.mobile_number)}
                </p>
              ) : null}
            </div>
          </>
        )}
        {lockedEvaluationId ? (
          <div>
            <label className={labelClass}>ملف صوتي</label>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setCreateAudioFile(e.target.files?.[0] ?? null)}
              className="block w-full cursor-pointer rounded-lg border border-dashed border-outline-variant bg-surface-container-low px-2 py-2 text-xs text-on-surface-variant file:me-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-primary"
            />
          </div>
        ) : null}
        {embedded ? submitButton : null}
      </form>
  )

  if (embedded) {
    return (
      <div className="border-t border-outline-variant pt-sm">
        <p className="mb-sm text-sm font-medium text-on-surface">تسجيل مكالمة</p>
        {formBody}
      </div>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lockedEvaluationId ? 'تسجيل مكالمة تقييم العميل' : 'تسجيل مكالمة'}
      size="lg"
      footer={submitButton}
    >
      {formBody}
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  )
}

function StatementFields({
  value,
  onChange,
}: {
  value: CallStatementForm
  onChange: (next: CallStatementForm) => void
}) {
  return (
    <div className={sectionClass}>
      <p className="text-sm font-bold text-on-surface">الإفادة</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="نتيجة المكالمة">
        <select
          value={value.outcome ?? ''}
          onChange={(e) => onChange({ ...value, outcome: (e.target.value || null) as CallStatementForm['outcome'] })}
          className={inputClass}
        >
          <option value="">— اختر —</option>
          {CALL_OUTCOME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="المطلوب التالي">
        <select
          value={value.next_action ?? ''}
          onChange={(e) =>
            onChange({ ...value, next_action: (e.target.value || null) as CallStatementForm['next_action'] })
          }
          className={inputClass}
        >
          <option value="">— اختر —</option>
          {CALL_NEXT_ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="موعد المتابعة">
        <AppDateTimePicker
          value={value.follow_up_date ? isoToDatetimeLocal(value.follow_up_date) : ''}
          onChange={(e) => onChange({ ...value, follow_up_date: e || null })}
          className={inputClass}
        />
      </Field>
      <Field label="الأولوية">
        <select
          value={value.priority ?? 'medium'}
          onChange={(e) =>
            onChange({ ...value, priority: (e.target.value || 'medium') as CallStatementForm['priority'] })
          }
          className={inputClass}
        >
          {CALL_PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>
      </div>
      <Field label="الملاحظة">
        <TextArea
          mode="arabic"
          placeholder="تفاصيل إضافية…"
          value={value.notes ?? ''}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          rows={2}
          maxLength={2000}
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
        />
      </Field>
    </div>
  )
}
