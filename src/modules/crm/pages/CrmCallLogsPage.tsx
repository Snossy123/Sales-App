import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { CrmCallLog, PaginatedResponse, ServiceEvaluationRequest } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { ToastBanner } from '../../../components/ToastBanner'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

export function CrmCallLogsPage() {
  const queryClient = useQueryClient()
  const [panelOpen, setPanelOpen] = useState(false)
  const [editCall, setEditCall] = useState<CrmCallLog | null>(null)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({
    mobile_number: '',
    mobile_name: '',
    customer_id: '' as number | '',
    call_type: 'outbound',
    duration: '',
    service_evaluation_request_id: '' as number | '',
  })
  const [createAudioFile, setCreateAudioFile] = useState<File | null>(null)

  const uploadCallAudio = async (callId: number, file: File) => {
    const body = new FormData()
    body.append('audio', file)
    await api.post(`/crm/call-logs/${callId}/audio`, body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  const resetCreateForm = () => {
    setForm({
      mobile_number: '',
      mobile_name: '',
      customer_id: '',
      call_type: 'outbound',
      duration: '',
      service_evaluation_request_id: '',
    })
    setCreateAudioFile(null)
  }

  const query = useQuery({
    queryKey: ['crm', 'call-logs'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<CrmCallLog>>('/crm/call-logs', {
        params: { per_page: 50, include: 'lead,user,serviceEvaluationRequest' },
      })
      return data.data
    },
  })

  const linkableEvaluationsQuery = useQuery({
    queryKey: ['crm', 'linkable-evaluations', editCall?.customer_id],
    queryFn: async () => {
      const { data } = await api.get<{ data: ServiceEvaluationRequest[] }>('/crm/call-logs/linkable-evaluations', {
        params: { customer_id: editCall!.customer_id },
      })
      return data.data ?? []
    },
    enabled: Boolean(editCall?.customer_id),
  })

  const [editAudioFile, setEditAudioFile] = useState<File | null>(null)

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<CrmCallLog>('/crm/call-logs', {
        mobile_number: form.mobile_number,
        mobile_name: form.mobile_name || undefined,
        customer_id: form.customer_id ? Number(form.customer_id) : undefined,
        call_type: form.call_type,
        duration: form.duration ? Number(form.duration) : undefined,
        service_evaluation_request_id: form.service_evaluation_request_id
          ? Number(form.service_evaluation_request_id)
          : undefined,
        start_time: new Date().toISOString(),
      })
      if (createAudioFile) {
        await uploadCallAudio(data.id, createAudioFile)
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'call-logs'] })
      setPanelOpen(false)
      resetCreateForm()
      setToast('تم تسجيل المكالمة')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editCall) throw new Error('no call')
      const { data } = await api.patch<CrmCallLog>(`/crm/call-logs/${editCall.id}`, {
        service_evaluation_request_id: form.service_evaluation_request_id
          ? Number(form.service_evaluation_request_id)
          : null,
      })
      return data
    },
    onSuccess: async () => {
      if (editAudioFile && editCall) {
        await uploadCallAudio(editCall.id, editAudioFile)
      }
      queryClient.invalidateQueries({ queryKey: ['crm', 'call-logs'] })
      setEditCall(null)
      setEditAudioFile(null)
      setToast('تم تحديث المكالمة')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const openEdit = (call: CrmCallLog) => {
    setEditCall(call)
    setForm({
      mobile_number: call.mobile_number ?? '',
      mobile_name: call.mobile_name ?? '',
      customer_id: call.customer_id ?? '',
      call_type: call.call_type ?? 'outbound',
      duration: call.duration != null ? String(call.duration) : '',
      service_evaluation_request_id: call.service_evaluation_request_id ?? call.service_evaluation_request?.id ?? '',
    })
    setEditAudioFile(null)
  }

  const openCreate = () => {
    resetCreateForm()
    setPanelOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="سجل المكالمات"
        subtitle="تتبع المكالمات وربطها بالتقييم مع إرفاق ملف صوتي"
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="add" size={18} /> تسجيل مكالمة
          </button>
        }
      />
      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<CrmCallLog & Record<string, unknown>>
          data={(query.data ?? []) as (CrmCallLog & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={10}
          columns={[
            { key: 'mobile_name', header: 'الاسم', render: (row) => row.mobile_name ?? row.lead?.name ?? '—' },
            { key: 'mobile_number', header: 'الرقم', render: (row) => row.mobile_number ?? '—' },
            { key: 'duration', header: 'المدة (ث)', render: (row) => row.duration ?? '—' },
            {
              key: 'evaluation',
              header: 'التقييم',
              render: (row) =>
                row.service_evaluation_request_id
                  ? `#${row.service_evaluation_request_id}`
                  : '—',
            },
            {
              key: 'audio',
              header: 'صوت',
              render: (row) => (row.audio_url ? '✓' : '—'),
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => openEdit(row)}
                >
                  ربط / صوت
                </button>
              ),
            },
          ]}
        />
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
          <input
            placeholder="رقم الهاتف"
            value={form.mobile_number}
            onChange={(e) => setForm({ ...form, mobile_number: e.target.value })}
            required
            className={inputClass}
            dir="ltr"
          />
          <input
            placeholder="اسم جهة الاتصال"
            value={form.mobile_name}
            onChange={(e) => setForm({ ...form, mobile_name: e.target.value })}
            className={inputClass}
          />
          <input
            type="number"
            placeholder="المدة بالثواني"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
            className={inputClass}
            dir="ltr"
          />
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
            disabled={createMutation.isPending}
            className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary disabled:opacity-50"
          >
            {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </form>
      </Modal>

      <Modal open={Boolean(editCall)} onClose={() => setEditCall(null)} title="ربط المكالمة بالتقييم">
        {editCall && (
          <div className="space-y-sm">
            <p className="text-sm text-on-surface-variant">
              {editCall.mobile_name ?? editCall.mobile_number ?? `#${editCall.id}`}
            </p>
            {editCall.audio_url && (
              <audio controls src={editCall.audio_url} className="w-full" />
            )}
            <div>
              <label className="mb-1 block text-sm">ربط بتقييم (تفتيش)</label>
              <select
                value={form.service_evaluation_request_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    service_evaluation_request_id: e.target.value ? Number(e.target.value) : '',
                  })
                }
                className={inputClass}
                disabled={!editCall.customer_id}
              >
                <option value="">— بدون ربط —</option>
                {(linkableEvaluationsQuery.data ?? []).map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    تقييم #{ev.id}
                    {ev.executed_at ? ` · ${ev.executed_at.slice(0, 10)}` : ''}
                  </option>
                ))}
              </select>
              {!editCall.customer_id && (
                <p className="mt-1 text-xs text-on-surface-variant">أضف customer_id للمكالمة لعرض التقييمات.</p>
              )}
            </div>
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
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
              className="rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary disabled:opacity-50"
            >
              حفظ
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
