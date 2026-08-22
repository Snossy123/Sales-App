import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { AsyncState } from '../../../components/AsyncState'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { SearchableSelect } from '../../../components/SearchableSelect'
import { TextArea } from '../../../components/ui/TextArea'
import { ToastBanner } from '../../../components/ToastBanner'
import {
  CRM_INPUT,
  CRM_PRIMARY_BTN,
  CRM_SECONDARY_BTN,
  CrmFilterPanel,
  CrmPageShell,
} from '../components/CrmPageShell'
import { CrmKpiCard } from '../components/ui/CrmKpiCard'
import { CrmStatusPill } from '../components/ui/CrmChip'
import {
  CrmTable,
  CrmTableFooter,
  CrmTableHeader,
  CrmTableHeaderCell,
  CrmTableRow,
} from '../components/ui/CrmTable'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { downloadCsv } from '../lib/ownerReports'
import { formatDatetime12hDisplay } from '../../../lib/datetime12h'
import { NumericInput } from '../../../components/ui/NumericInput'

import {
  CALL_NEXT_ACTION_OPTIONS,
  CALL_OUTCOME_OPTIONS,
  CALL_PRIORITY_OPTIONS,
  canCreateTaskFromStatement,
  emptyStatementForm,
  normalizeStatementForm,
  previewTaskTitle,
  statementFormLabel,
} from '../lib/callStatementForm'
import {
  customerToCallContactOptions,
  datetimeLocalToIso,
  isoToDatetimeLocal,
  leadToCallContactOptions,
  mergeCallContactOptions,
  nowDatetimeLocal,
  referralLeadToCallContactOptions,
  type CallContactOption,
} from '../lib/contactPhones'

function contactKindLabel(kind: CallContactOption['kind']): string {
  if (kind === 'customer') return 'عميل'
  if (kind === 'referral') return 'ترشيح'
  return 'عميل محتمل'
}

const inputClass =
  'w-full rounded-[9px] border px-2.5 py-2 text-[13px] [border-color:var(--crm-border)] [background:var(--crm-surface-muted)]'

function StatementFormFields({
  value,
  onChange,
}: {
  value: CallStatementForm
  onChange: (next: CallStatementForm) => void
}) {
  return (
    <div className="space-y-sm rounded-lg border border-outline-variant/70 p-sm">
      <p className="text-sm font-medium">الإفادة</p>
      <div>
        <label className="mb-1 block text-xs text-on-surface-variant">نتيجة المكالمة</label>
        <select
          value={value.outcome ?? ''}
          onChange={(e) =>
            onChange({
              ...value,
              outcome: (e.target.value || null) as CallStatementForm['outcome'],
            })
          }
          className={inputClass}
        >
          <option value="">— اختر —</option>
          {CALL_OUTCOME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-on-surface-variant">المطلوب التالي</label>
        <select
          value={value.next_action ?? ''}
          onChange={(e) =>
            onChange({
              ...value,
              next_action: (e.target.value || null) as CallStatementForm['next_action'],
            })
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
      </div>
      <div>
        <label className="mb-1 block text-xs text-on-surface-variant">موعد المتابعة (تاريخ ووقت)</label>
        <input
          type="datetime-local"
          value={value.follow_up_date ? isoToDatetimeLocal(value.follow_up_date) : ''}
          onChange={(e) => onChange({ ...value, follow_up_date: e.target.value || null })}
          className={inputClass}
          dir="ltr"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-on-surface-variant">الأولوية</label>
        <select
          value={value.priority ?? 'medium'}
          onChange={(e) =>
            onChange({
              ...value,
              priority: (e.target.value || 'medium') as CallStatementForm['priority'],
            })
          }
          className={inputClass}
        >
          {CALL_PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-on-surface-variant">ملاحظة</label>
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
    </div>
  )
}

function ContactPickerSection({
  selectedContact,
  onContactChange,
  onSearchChange,
  options,
  loading,
}: {
  selectedContact: CallContactOption | null
  onContactChange: (contact: CallContactOption | null) => void
  onSearchChange: (value: string) => void
  options: CallContactOption[]
  loading: boolean
}) {
  return (
    <div className="space-y-sm rounded-lg border border-outline-variant/70 p-sm">
      <SearchableSelect
        label="جهة الاتصال (عميل / ترشيح / عميل محتمل)"
        options={options}
        value={selectedContact}
        onChange={onContactChange}
        onSearchChange={onSearchChange}
        getOptionValue={(c) => c.optionKey}
        getOptionLabel={(c) => c.label}
        placeholder="ابحث بالاسم أو رقم الموبايل..."
        loading={loading}
        emptyMessage="لا يوجد تطابق في العملاء أو الترشيحات"
      />
      {selectedContact && (
        <p className="text-xs text-on-surface-variant">
          {contactKindLabel(selectedContact.kind)} · {selectedContact.name} ·{' '}
          <span dir="ltr">{selectedContact.number}</span>
        </p>
      )}
    </div>
  )
}

export function CrmCallLogsPage() {
  const queryClient = useQueryClient()
  const [panelOpen, setPanelOpen] = useState(false)
  const [editCall, setEditCall] = useState<CrmCallLog | null>(null)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [taskEmployeeId, setTaskEmployeeId] = useState<number | ''>('')
  const [toast, setToast] = useState('')
  const [selectedContact, setSelectedContact] = useState<CallContactOption | null>(null)
  const [contactSearch, setContactSearch] = useState('')
  const debouncedContactSearch = useDebouncedValue(contactSearch, 300)

  const [form, setForm] = useState({
    mobile_number: '',
    mobile_name: '',
    customer_id: '' as number | '',
    lead_id: '' as number | '',
    referral_lead_id: '' as number | '',
    call_type: 'outbound',
    duration: '',
    start_time: nowDatetimeLocal(),
    statement_form: emptyStatementForm(),
    service_evaluation_request_id: '' as number | '',
  })
  const [createAudioFile, setCreateAudioFile] = useState<File | null>(null)
  const [editAudioFile, setEditAudioFile] = useState<File | null>(null)
  const [createWithTask, setCreateWithTask] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search.trim(), 250)

  const pickerOpen = panelOpen || (Boolean(editCall) && !taskModalOpen)

  const uploadCallAudio = async (callId: number, file: File) => {
    const body = new FormData()
    body.append('audio', file)
    await api.post(`/crm/call-logs/${callId}/audio`, body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  const resetContactState = () => {
    setSelectedContact(null)
    setContactSearch('')
  }

  const resetCreateForm = () => {
    setForm({
      mobile_number: '',
      mobile_name: '',
      customer_id: '',
      lead_id: '',
      referral_lead_id: '',
      call_type: 'outbound',
      duration: '',
      start_time: nowDatetimeLocal(),
      statement_form: emptyStatementForm(),
      service_evaluation_request_id: '',
    })
    setCreateAudioFile(null)
    setCreateWithTask(false)
    setTaskEmployeeId('')
    resetContactState()
  }

  const applyContact = (contact: CallContactOption | null) => {
    setSelectedContact(contact)
    setForm((prev) => ({
      ...prev,
      mobile_number: contact?.number ?? '',
      mobile_name: contact?.name ?? '',
      customer_id: contact?.customerId ?? '',
      lead_id: contact?.leadId ?? '',
      referral_lead_id: contact?.referralLeadId ?? '',
      service_evaluation_request_id: '',
    }))
  }

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
    enabled: pickerOpen,
  })

  const contactOptions = useMemo(() => {
    const searched = contactSearchQuery.data ?? []
    if (selectedContact && !searched.some((c) => c.optionKey === selectedContact.optionKey)) {
      return [selectedContact, ...searched]
    }
    return searched
  }, [contactSearchQuery.data, selectedContact])

  const query = useQuery({
    queryKey: ['crm', 'call-logs'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<CrmCallLog>>('/crm/call-logs', {
        params: { per_page: 50, include: 'lead,user,serviceEvaluationRequest,crmTask' },
      })
      return data.data
    },
  })

  const evaluationCustomerId = form.customer_id === '' ? null : Number(form.customer_id)

  const linkableEvaluationsQuery = useQuery({
    queryKey: ['crm', 'linkable-evaluations', evaluationCustomerId],
    queryFn: async () => {
      const { data } = await api.get<{ data: ServiceEvaluationRequest[] }>('/crm/call-logs/linkable-evaluations', {
        params: { customer_id: evaluationCustomerId },
      })
      return data.data ?? []
    },
    enabled: Boolean(evaluationCustomerId) && pickerOpen,
  })

  useEffect(() => {
    if (!evaluationCustomerId) return
    const list = linkableEvaluationsQuery.data
    if (!list) return
    setForm((prev) => {
      if (prev.service_evaluation_request_id !== '') return prev
      if (list.length === 1) {
        return { ...prev, service_evaluation_request_id: list[0].id }
      }
      return prev
    })
  }, [evaluationCustomerId, linkableEvaluationsQuery.data])

  const meEmployeeQuery = useQuery({
    queryKey: ['me-employee'],
    queryFn: async () => {
      try {
        const { data } = await api.get<Employee>('/me/employee')
        return data
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          return null
        }
        throw err
      }
    },
  })

  const needEmployees = taskModalOpen || (panelOpen && createWithTask)

  const employeesQuery = useQuery({
    queryKey: ['employees', 'crm-call-task'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
        params: { per_page: 100, 'filter[status]': 'active' },
      })
      return data.data
    },
    enabled: needEmployees,
  })

  useEffect(() => {
    if (!needEmployees) return
    if (taskEmployeeId !== '') return
    if (meEmployeeQuery.data?.id) {
      setTaskEmployeeId(meEmployeeQuery.data.id)
    }
  }, [needEmployees, taskEmployeeId, meEmployeeQuery.data?.id])

  const statementPayload = () => ({
    ...form.statement_form,
    follow_up_date: form.statement_form.follow_up_date
      ? datetimeLocalToIso(form.statement_form.follow_up_date) ?? form.statement_form.follow_up_date
      : null,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedContact || !form.mobile_number.trim()) {
        throw new Error('اختر جهة اتصال من البحث (عميل أو ترشيح)')
      }
      if (createWithTask) {
        if (!canCreateTaskFromStatement(form.statement_form)) {
          throw new Error('حدد المطلوب التالي في الإفادة لإنشاء مهمة')
        }
        if (taskEmployeeId === '') {
          throw new Error('اختر موظفاً للمهمة')
        }
      }

      const { data } = await api.post<CrmCallLog>('/crm/call-logs', {
        mobile_number: form.mobile_number,
        mobile_name: form.mobile_name || undefined,
        customer_id: form.customer_id ? Number(form.customer_id) : undefined,
        lead_id: form.lead_id ? Number(form.lead_id) : undefined,
        referral_lead_id: form.referral_lead_id ? Number(form.referral_lead_id) : undefined,
        call_type: form.call_type,
        duration: form.duration ? Number(form.duration) : undefined,
        statement_form: statementPayload(),
        service_evaluation_request_id: form.service_evaluation_request_id
          ? Number(form.service_evaluation_request_id)
          : undefined,
        start_time: datetimeLocalToIso(form.start_time) ?? new Date().toISOString(),
      })
      if (createAudioFile) {
        await uploadCallAudio(data.id, createAudioFile)
      }

      let taskId: number | null = null
      if (createWithTask && taskEmployeeId !== '') {
        const { data: created } = await api.post<{ call_log: CrmCallLog; task: CrmTask }>(
          `/crm/call-logs/${data.id}/create-task`,
          { employee_id: Number(taskEmployeeId) },
        )
        taskId = created.task.id
      }

      return { call: data, taskId }
    },
    onSuccess: ({ taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'call-logs'] })
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: ['crm-tasks'] })
      }
      setPanelOpen(false)
      resetCreateForm()
      setToast(taskId ? `تم تسجيل المكالمة وإنشاء المهمة #${taskId}` : 'تم تسجيل المكالمة')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editCall) throw new Error('no call')
      const { data } = await api.patch<CrmCallLog>(`/crm/call-logs/${editCall.id}`, {
        mobile_number: form.mobile_number || null,
        mobile_name: form.mobile_name || null,
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        lead_id: form.lead_id ? Number(form.lead_id) : null,
        referral_lead_id: form.referral_lead_id ? Number(form.referral_lead_id) : null,
        start_time: form.start_time ? datetimeLocalToIso(form.start_time) : null,
        duration: form.duration ? Number(form.duration) : null,
        statement_form: statementPayload(),
        service_evaluation_request_id: form.service_evaluation_request_id
          ? Number(form.service_evaluation_request_id)
          : null,
      })
      return data
    },
    onSuccess: async (data) => {
      if (editAudioFile && editCall) {
        await uploadCallAudio(editCall.id, editAudioFile)
      }
      queryClient.invalidateQueries({ queryKey: ['crm', 'call-logs'] })
      setEditCall(data)
      setEditAudioFile(null)
      setToast('تم تحديث المكالمة')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!editCall) throw new Error('no call')
      if (taskEmployeeId === '') throw new Error('اختر موظفاً')
      const { data } = await api.post<{ call_log: CrmCallLog; task: CrmTask }>(
        `/crm/call-logs/${editCall.id}/create-task`,
        { employee_id: Number(taskEmployeeId) },
      )
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'call-logs'] })
      queryClient.invalidateQueries({ queryKey: ['crm-tasks'] })
      setEditCall(data.call_log)
      setTaskModalOpen(false)
      setToast(`تم إنشاء المهمة #${data.task.id}`)
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const openEdit = (call: CrmCallLog) => {
    setEditCall(call)
    resetContactState()

    setForm({
      mobile_number: call.mobile_number ?? '',
      mobile_name: call.mobile_name ?? '',
      customer_id: call.customer_id ?? '',
      lead_id: call.lead?.id ?? '',
      referral_lead_id: call.referral_lead_id ?? '',
      call_type: call.call_type ?? 'outbound',
      duration: call.duration != null ? String(call.duration) : '',
      start_time: isoToDatetimeLocal(call.start_time) || nowDatetimeLocal(),
      statement_form: normalizeStatementForm(call.statement_form),
      service_evaluation_request_id: call.service_evaluation_request_id ?? call.service_evaluation_request?.id ?? '',
    })

    if (call.referral_lead_id) {
      void api.get<ReferralLead>(`/crm/referral-leads/${call.referral_lead_id}`).then(({ data }) => {
        const options = referralLeadToCallContactOptions(data)
        const match =
          options.find((p) => p.number === call.mobile_number) ?? options[0] ?? null
        if (match) setSelectedContact(match)
      })
    } else if (call.customer_id) {
      void api.get<Customer>(`/customers/${call.customer_id}`).then(({ data }) => {
        const options = customerToCallContactOptions(data)
        const match =
          options.find((p) => p.number === call.mobile_number) ?? options[0] ?? null
        if (match) setSelectedContact(match)
      })
    } else if (call.lead) {
      const options = leadToCallContactOptions(call.lead as Lead)
      const match = options.find((p) => p.number === call.mobile_number) ?? options[0] ?? null
      if (match) setSelectedContact(match)
    }

    setEditAudioFile(null)
    setTaskModalOpen(false)
    setTaskEmployeeId('')
  }

  const openCreate = () => {
    resetCreateForm()
    setPanelOpen(true)
  }

  const contactLabel =
    form.mobile_name || form.mobile_number || editCall?.mobile_name || editCall?.mobile_number || ''

  const contactPickerProps = {
    selectedContact,
    onContactChange: applyContact,
    onSearchChange: setContactSearch,
    options: contactOptions,
    loading: contactSearchQuery.isLoading,
  }

  const evaluationSelect = (
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
        disabled={!evaluationCustomerId}
      >
        <option value="">— بدون ربط —</option>
        {(linkableEvaluationsQuery.data ?? []).map((ev) => (
          <option key={ev.id} value={ev.id}>
            تقييم #{ev.id}
            {ev.executed_at ? ` · ${ev.executed_at.slice(0, 10)}` : ''}
          </option>
        ))}
      </select>
      {!evaluationCustomerId && (
        <p className="mt-1 text-xs text-on-surface-variant">
          اختر عميلاً من البحث (أو عميلاً محتملاً محوّلاً) لجلب التقييمات تلقائياً.
        </p>
      )}
      {evaluationCustomerId && linkableEvaluationsQuery.isLoading && (
        <p className="mt-1 text-xs text-on-surface-variant">جاري تحميل التقييمات…</p>
      )}
      {evaluationCustomerId &&
        !linkableEvaluationsQuery.isLoading &&
        (linkableEvaluationsQuery.data?.length ?? 0) === 0 && (
          <p className="mt-1 text-xs text-on-surface-variant">لا توجد تقييمات معلّقة لهذا العميل.</p>
        )}
    </div>
  )

  const pageSize = 10
  const CALL_COLS = '1.3fr 1fr 1.2fr 80px 1.6fr 110px 70px'

  const calls = query.data ?? []
  const todayKey = new Date().toISOString().slice(0, 10)
  const todayCalls = calls.filter((c) => (c.start_time ?? '').startsWith(todayKey))
  const withDuration = calls.filter((c) => c.duration != null && c.duration > 0)
  const avgDurationSec =
    withDuration.length > 0
      ? Math.round(
          withDuration.reduce((sum, c) => sum + (c.duration ?? 0), 0) / withDuration.length,
        )
      : 0
  const avgMin = Math.floor(avgDurationSec / 60)
  const avgSec = String(avgDurationSec % 60).padStart(2, '0')
  const noStatement = calls.filter(
    (c) => !c.statement?.trim() && !c.statement_form?.outcome,
  ).length
  const convertedToInstall = calls.filter((c) => {
    const next = c.statement_form?.next_action
    return next === 'follow_install' || next === 'schedule_visit'
  }).length

  const filteredCalls = useMemo(() => {
    if (!debouncedSearch) return calls
    const q = debouncedSearch.toLowerCase()
    return calls.filter((c) => {
      const name = (c.mobile_name ?? c.lead?.name ?? '').toLowerCase()
      const phone = (c.mobile_number ?? '').toLowerCase()
      const note = (c.statement?.trim() || statementFormLabel(c.statement_form)).toLowerCase()
      return name.includes(q) || phone.includes(q) || note.includes(q)
    })
  }, [calls, debouncedSearch])

  const lastPage = Math.max(1, Math.ceil(filteredCalls.length / pageSize))
  const currentPage = Math.min(page, lastPage)
  const pageRows = filteredCalls.slice(
    (currentPage - 1) * pageSize,
    (currentPage - 1) * pageSize + pageSize,
  )

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const formatDuration = (seconds?: number | null) => {
    if (seconds == null) return '—'
    const m = Math.floor(seconds / 60)
    const s = String(seconds % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  const outcomeMeta = (row: CrmCallLog) => {
    const outcome = row.statement_form?.outcome
    if (outcome === 'interested') return { label: 'مهتم', color: '#15803d', tint: '#e7f6ec' }
    if (outcome === 'not_interested') return { label: 'مرفوض', color: '#dc2626', tint: '#fdecec' }
    if (outcome === 'unavailable') return { label: 'لم يرد', color: '#64748b', tint: '#eef1f7' }
    if (outcome === 'callback_requested') return { label: 'متابعة', color: '#b45309', tint: '#fef3e2' }
    if (row.crm_task_id) return { label: 'مهمة', color: '#2563eb', tint: '#eff4fe' }
    return { label: '—', color: '#64748b', tint: '#eef1f7' }
  }

  const handleExport = () => {
    downloadCsv(
      'crm-call-logs.csv',
      ['الاسم', 'الرقم', 'وقت المكالمة', 'المدة', 'الإفادة', 'النتيجة'],
      filteredCalls.map((row) => [
        row.mobile_name ?? row.lead?.name ?? '',
        row.mobile_number ?? '',
        formatDatetime12hDisplay(row.start_time),
        formatDuration(row.duration),
        row.statement?.trim() || statementFormLabel(row.statement_form),
        outcomeMeta(row).label,
      ]),
    )
  }

  return (
    <CrmPageShell
      kicker="العمل اليومي"
      title="سجل المكالمات"
      subtitle="كل مكالمة مع إفادتها ونتيجتها وربطها بالترشيح."
      actions={
        <>
          <button type="button" onClick={handleExport} className={CRM_SECONDARY_BTN}>
            تصدير
          </button>
          <button type="button" onClick={openCreate} className={CRM_PRIMARY_BTN}>
            <Icon name="add" size={18} /> + تسجيل مكالمة
          </button>
        </>
      }
    >
      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

      <div className="flex flex-wrap gap-3.5">
        <CrmKpiCard label="مكالمات اليوم" value={todayCalls.length} />
        <CrmKpiCard label="متوسط مدة المكالمة" value={`${avgMin}:${avgSec}`} />
        <CrmKpiCard variant="danger" label="مكالمات دون إفادة" value={noStatement} />
        <CrmKpiCard label="حوّلت لموعد تركيب" value={convertedToInstall} />
      </div>

      <CrmFilterPanel>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث في الترشيحات والعملاء…"
          className={`${CRM_INPUT} min-w-[220px] flex-1`}
        />
      </CrmFilterPanel>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <CrmTable
          header={
            <CrmTableHeader columns={CALL_COLS}>
              <CrmTableHeaderCell>جهة الاتصال</CrmTableHeaderCell>
              <CrmTableHeaderCell>الرقم</CrmTableHeaderCell>
              <CrmTableHeaderCell>وقت المكالمة</CrmTableHeaderCell>
              <CrmTableHeaderCell>المدة</CrmTableHeaderCell>
              <CrmTableHeaderCell>الإفادة</CrmTableHeaderCell>
              <CrmTableHeaderCell>النتيجة</CrmTableHeaderCell>
              <CrmTableHeaderCell> </CrmTableHeaderCell>
            </CrmTableHeader>
          }
          footer={
            <CrmTableFooter>
              <span className="text-xs" style={{ color: 'var(--crm-text-faint)' }}>
                إجمالي {filteredCalls.length} مكالمة — صفحة {currentPage} من {lastPage}
              </span>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={CRM_SECONDARY_BTN}
                  style={{ height: 32, opacity: currentPage <= 1 ? 0.45 : 1 }}
                >
                  السابق
                </button>
                <button
                  type="button"
                  disabled={currentPage >= lastPage}
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  className={CRM_SECONDARY_BTN}
                  style={{ height: 32, opacity: currentPage >= lastPage ? 0.45 : 1 }}
                >
                  التالي
                </button>
              </div>
            </CrmTableFooter>
          }
        >
          {pageRows.length === 0 ? (
            <p className="px-3.5 py-8 text-center text-sm" style={{ color: 'var(--crm-text-faint)' }}>
              لا توجد مكالمات مسجّلة بعد
            </p>
          ) : (
            pageRows.map((row) => {
              const name = row.mobile_name ?? row.lead?.name ?? '—'
              const meta = outcomeMeta(row)
              return (
                <CrmTableRow key={row.id} columns={CALL_COLS}>
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-[9px] text-[11px] font-semibold"
                      style={{
                        background: 'var(--crm-neutral-soft)',
                        color: 'var(--crm-text-muted)',
                      }}
                    >
                      {String(name).slice(0, 1)}
                    </span>
                    <span className="text-[13px] font-semibold">{name}</span>
                  </div>
                  <span
                    className="text-[12.5px] tabular-nums"
                    dir="ltr"
                    style={{ color: 'var(--crm-text-secondary)' }}
                  >
                    {row.mobile_number ?? '—'}
                  </span>
                  <span className="text-[12.5px]" style={{ color: 'var(--crm-text-secondary)' }}>
                    {formatDatetime12hDisplay(row.start_time)}
                  </span>
                  <span className="text-[12.5px]" style={{ color: 'var(--crm-text-secondary)' }}>
                    {formatDuration(row.duration)}
                  </span>
                  <span
                    className="truncate text-[12.5px]"
                    style={{ color: 'var(--crm-text-muted)' }}
                    title={row.statement ?? undefined}
                  >
                    {row.statement?.trim() || statementFormLabel(row.statement_form)}
                  </span>
                  <CrmStatusPill label={meta.label} color={meta.color} tint={meta.tint} />
                  <button
                    type="button"
                    className="text-[12.5px] font-semibold"
                    style={{ color: 'var(--crm-primary)' }}
                    onClick={() => openEdit(row)}
                  >
                    تعديل
                  </button>
                </CrmTableRow>
              )
            })
          )}
        </CrmTable>
      </AsyncState>

      <Modal
        open={panelOpen}
        onClose={() => {
          setPanelOpen(false)
          resetCreateForm()
        }}
        title="تسجيل مكالمة"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createMutation.mutate()
          }}
          className="space-y-sm"
        >
          <ContactPickerSection {...contactPickerProps} />
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
          <StatementFormFields
            value={form.statement_form}
            onChange={(statement_form) => setForm({ ...form, statement_form })}
          />
          {evaluationSelect}
          <div className="space-y-sm rounded-lg border border-outline-variant/70 p-sm">
            <label className="flex items-center gap-sm text-sm font-medium">
              <input
                type="checkbox"
                checked={createWithTask}
                onChange={(e) => {
                  setCreateWithTask(e.target.checked)
                  if (!e.target.checked) setTaskEmployeeId('')
                }}
              />
              إنشاء مهمة من الإفادة بعد الحفظ
            </label>
            {createWithTask && (
              <>
                {!canCreateTaskFromStatement(form.statement_form) && (
                  <p className="text-xs text-on-surface-variant">حدد «المطلوب التالي» في الإفادة أولاً.</p>
                )}
                <div>
                  <label className="mb-1 block text-xs text-on-surface-variant">الموظف المسؤول</label>
                  <select
                    value={taskEmployeeId}
                    onChange={(e) => setTaskEmployeeId(e.target.value ? Number(e.target.value) : '')}
                    className={inputClass}
                    required={createWithTask}
                  >
                    <option value="">— اختر موظفاً —</option>
                    {(employeesQuery.data ?? []).map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
                {canCreateTaskFromStatement(form.statement_form) && (
                  <p className="text-xs text-on-surface-variant">
                    معاينة: {previewTaskTitle(form.statement_form, contactLabel || form.mobile_number)}
                  </p>
                )}
              </>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">إرفاق ملف صوتي للمكالمة</label>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setCreateAudioFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
            {createAudioFile && (
              <p className="mt-1 text-xs text-on-surface-variant">{createAudioFile.name}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={
              createMutation.isPending ||
              !selectedContact ||
              (createWithTask &&
                (!canCreateTaskFromStatement(form.statement_form) || taskEmployeeId === ''))
            }
            className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary disabled:opacity-50"
          >
            {createMutation.isPending
              ? 'جاري الحفظ...'
              : createWithTask
                ? 'حفظ وإنشاء مهمة'
                : 'حفظ'}
          </button>
        </form>
      </Modal>

      <Modal
        open={Boolean(editCall) && !taskModalOpen}
        onClose={() => {
          setEditCall(null)
          resetContactState()
        }}
        title="تعديل المكالمة"
      >
        {editCall && (
          <div className="space-y-sm">
            {editCall.audio_url && (
              <audio controls src={editCall.audio_url} className="w-full" />
            )}
            <ContactPickerSection {...contactPickerProps} />
            <div>
              <label className="mb-1 block text-sm font-medium">وقت المكالمة</label>
              <input
                type="datetime-local"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
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
            <StatementFormFields
              value={form.statement_form}
              onChange={(statement_form) => setForm({ ...form, statement_form })}
            />
            {evaluationSelect}
            {editCall.crm_task_id ? (
              <p className="rounded-lg bg-surface-container px-sm py-2 text-sm">
                تم ربط مهمة{' '}
                <Link to="/crm/tasks" className="font-medium text-primary hover:underline">
                  #{editCall.crm_task_id}
                </Link>
              </p>
            ) : (
              <button
                type="button"
                disabled={!canCreateTaskFromStatement(form.statement_form) || updateMutation.isPending}
                onClick={async () => {
                  if (!editCall) return
                  try {
                    const { data } = await api.patch<CrmCallLog>(`/crm/call-logs/${editCall.id}`, {
                      mobile_number: form.mobile_number || null,
                      mobile_name: form.mobile_name || null,
                      customer_id: form.customer_id ? Number(form.customer_id) : null,
                      lead_id: form.lead_id ? Number(form.lead_id) : null,
                      referral_lead_id: form.referral_lead_id ? Number(form.referral_lead_id) : null,
                      start_time: form.start_time ? datetimeLocalToIso(form.start_time) : null,
                      statement_form: statementPayload(),
                      service_evaluation_request_id: form.service_evaluation_request_id
                        ? Number(form.service_evaluation_request_id)
                        : null,
                    })
                    setEditCall(data)
                    queryClient.invalidateQueries({ queryKey: ['crm', 'call-logs'] })
                    setTaskEmployeeId('')
                    setTaskModalOpen(true)
                  } catch (err) {
                    setToast(getErrorMessage(err))
                  }
                }}
                className="w-full rounded-lg border border-primary px-md py-2 text-sm font-bold text-primary disabled:opacity-50"
              >
                إنشاء مهمة من الإفادة
              </button>
            )}
            <div>
              <label className="mb-1 block text-sm">إرفاق ملف صوتي للمكالمة</label>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setEditAudioFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
              />
              {editAudioFile && (
                <p className="mt-1 text-xs text-on-surface-variant">{editAudioFile.name}</p>
              )}
            </div>
            <button
              type="button"
              disabled={updateMutation.isPending || !selectedContact}
              onClick={() => updateMutation.mutate()}
              className="rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary disabled:opacity-50"
            >
              حفظ
            </button>
          </div>
        )}
      </Modal>

      <Modal
        open={taskModalOpen && Boolean(editCall)}
        onClose={() => setTaskModalOpen(false)}
        title="إنشاء مهمة من الإفادة"
      >
        {editCall && (
          <div className="space-y-sm">
            <div className="rounded-lg bg-surface-container px-sm py-2 text-sm">
              <p className="font-medium">{previewTaskTitle(form.statement_form, contactLabel)}</p>
              {form.statement_form.follow_up_date && (
                <p className="mt-1 text-on-surface-variant">
                  الموعد: {formatDatetime12hDisplay(form.statement_form.follow_up_date)}
                </p>
              )}
              <p className="mt-1 text-on-surface-variant">{statementFormLabel(form.statement_form)}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">الموظف المسؤول</label>
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
            </div>
            <div className="flex gap-sm">
              <button
                type="button"
                onClick={() => setTaskModalOpen(false)}
                className="rounded-lg border border-outline-variant px-md py-2 text-sm"
              >
                رجوع
              </button>
              <button
                type="button"
                disabled={createTaskMutation.isPending || taskEmployeeId === ''}
                onClick={() => createTaskMutation.mutate()}
                className="rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary disabled:opacity-50"
              >
                {createTaskMutation.isPending ? 'جاري الإنشاء...' : 'تأكيد إنشاء المهمة'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </CrmPageShell>
  )
}
