import { useEffect, useMemo, useState } from 'react'
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
  'w-full rounded-[9px] border px-2.5 py-2 text-[13px] [border-color:var(--crm-border)] [background:var(--crm-surface-muted)]'

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
}: {
  open: boolean
  onClose: () => void
  onSaved?: (message: string) => void
  lockedCustomerId?: number
  lockedCaseId?: number
}) {
  const queryClient = useQueryClient()
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
    service_evaluation_request_id: '' as number | '',
  })

  useEffect(() => {
    if (!open) return
    setFormError(null)
    setCaseId(lockedCaseId ?? '')
    setForm((prev) => ({
      ...prev,
      customer_id: lockedCustomerId ?? '',
      start_time: nowDatetimeLocal(),
      statement_form: emptyStatementForm(),
    }))
  }, [open, lockedCustomerId, lockedCaseId])

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
    enabled: open && Boolean(customerId) && !lockedCaseId,
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
    enabled: open && Boolean(customerId),
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
      if (!selectedContact || !form.mobile_number.trim()) {
        throw new Error('اختر جهة اتصال من البحث (عميل أو ترشيح)')
      }
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
        mobile_number: form.mobile_number,
        mobile_name: form.mobile_name || undefined,
        customer_id: form.customer_id ? Number(form.customer_id) : undefined,
        lead_id: form.lead_id ? Number(form.lead_id) : undefined,
        referral_lead_id: form.referral_lead_id ? Number(form.referral_lead_id) : undefined,
        call_type: form.call_type,
        duration: form.duration ? Number(form.duration) : undefined,
        statement_form: statementForm,
        service_evaluation_request_id: form.service_evaluation_request_id
          ? Number(form.service_evaluation_request_id)
          : undefined,
        start_time: datetimeLocalToIso(form.start_time) ?? new Date().toISOString(),
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
      onSaved?.(taskId ? `تم تسجيل المكالمة وإنشاء المهمة #${taskId}` : 'تم تسجيل المكالمة')
      onClose()
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  })

  const showCasePicker = !lockedCaseId && Boolean(customerId) && !casesQuery.isError

  return (
    <Modal open={open} onClose={onClose} title="تسجيل مكالمة" size="lg">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          createMutation.mutate()
        }}
        className="space-y-sm"
      >
        {formError ? <p className="text-sm text-error">{formError}</p> : null}
        {lockedCustomerId ? (
          <p className="text-sm text-on-surface-variant">
            العميل: {lockedCustomerQuery.data?.name ?? selectedContact?.name ?? '…'}
            {selectedContact ? (
              <>
                {' '}
                · <span dir="ltr">{selectedContact.number}</span>
              </>
            ) : null}
          </p>
        ) : (
          <div className="space-y-sm rounded-lg border border-outline-variant/70 p-sm">
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
          </div>
        )}

        {showCasePicker ? (
          <div>
            <label className="mb-1 block text-sm font-medium">ربط بمشكلة (اختياري)</label>
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
        {lockedCaseId ? <p className="text-xs text-on-surface-variant">هتتربط المكالمة بحالة المشكلة دي.</p> : null}

        <div>
          <label className="mb-1 block text-sm font-medium">وقت المكالمة</label>
          <input
            type="datetime-local"
            value={form.start_time}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            required
            className={inputClass}
            dir="ltr"
          />
        </div>
        <NumericInput
          type="number"
          placeholder="المدة بالثواني"
          value={form.duration}
          onChange={(e) => setForm({ ...form, duration: e.target.value })}
          className={inputClass}
          dir="ltr"
        />
        <StatementFields
          value={form.statement_form}
          onChange={(statement_form) => setForm({ ...form, statement_form })}
        />
        <div>
          <label className="mb-1 block text-sm font-medium">ربط بتقييم (تفتيش)</label>
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
        {!lockedCaseId ? (
          <div className="space-y-sm rounded-lg border border-outline-variant/70 p-sm">
            <label className="flex items-center gap-sm text-sm font-medium">
              <input
                type="checkbox"
                checked={createWithTask}
                onChange={(e) => setCreateWithTask(e.target.checked)}
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
        ) : null}
        {!lockedCaseId ? (
          <div>
            <label className="mb-1 block text-sm font-medium">إرفاق ملف صوتي للمكالمة</label>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setCreateAudioFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </div>
        ) : null}
        <button
          type="submit"
          disabled={createMutation.isPending || !selectedContact}
          className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary disabled:opacity-50"
        >
          {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
        </button>
      </form>
    </Modal>
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
    <div className="space-y-sm rounded-lg border border-outline-variant/70 p-sm">
      <p className="text-sm font-medium">الإفادة</p>
      <select
        value={value.outcome ?? ''}
        onChange={(e) => onChange({ ...value, outcome: (e.target.value || null) as CallStatementForm['outcome'] })}
        className={inputClass}
      >
        <option value="">— نتيجة المكالمة —</option>
        {CALL_OUTCOME_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        value={value.next_action ?? ''}
        onChange={(e) =>
          onChange({ ...value, next_action: (e.target.value || null) as CallStatementForm['next_action'] })
        }
        className={inputClass}
      >
        <option value="">— المطلوب التالي —</option>
        {CALL_NEXT_ACTION_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <input
        type="datetime-local"
        value={value.follow_up_date ? isoToDatetimeLocal(value.follow_up_date) : ''}
        onChange={(e) => onChange({ ...value, follow_up_date: e.target.value || null })}
        className={inputClass}
        dir="ltr"
      />
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
      <TextArea
        mode="arabic"
        placeholder="تفاصيل إضافية…"
        value={value.notes ?? ''}
        onChange={(e) => onChange({ ...value, notes: e.target.value })}
        rows={3}
        maxLength={2000}
        className={inputClass}
      />
    </div>
  )
}
