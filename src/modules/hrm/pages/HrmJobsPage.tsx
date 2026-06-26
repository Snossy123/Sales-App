import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { HrmJob, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { Icon } from '../../../components/Icon'
import { Modal } from '../../../components/Modal'
import { PageHeader } from '../../../components/PageHeader'
import { StatusBadge } from '../../../components/StatusBadge'
import { EntityRowActions } from '../../../components/crud/EntityRowActions'
import { getEntityCrudConfig } from '../../../lib/crud/entityCrudRegistry'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

const emptyForm = {
  name: '',
  description: '',
  status: 'active',
}

export function HrmJobsPage() {
  const queryClient = useQueryClient()
  const [panelOpen, setPanelOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [toast, setToast] = useState('')
  const crudConfig = getEntityCrudConfig('hrmJobs')

  const query = useQuery({
    queryKey: ['hrm', 'jobs'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<HrmJob>>('/hrm/jobs', { params: { per_page: 100 } })
      return data.data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        status: form.status,
      }
      if (editId) {
        const { data } = await api.put<HrmJob>(`/hrm/jobs/${editId}`, payload)
        return data
      }
      const { data } = await api.post<HrmJob>('/hrm/jobs', payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm', 'jobs'] })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      setPanelOpen(false)
      setEditId(null)
      setForm(emptyForm)
      setToast('تم حفظ الوظيفة')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const openEdit = (job: HrmJob) => {
    setEditId(job.id)
    setForm({
      name: job.name,
      description: job.description ?? '',
      status: job.status,
    })
    setPanelOpen(false)
  }

  return (
    <div>
      <PageHeader
        title="الوظائف"
        subtitle="تعريف المسميات الوظيفية وربطها بالموظفين"
        actions={
          <button
            type="button"
            onClick={() => {
              setPanelOpen(true)
              setEditId(null)
              setForm(emptyForm)
            }}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="add" size={18} /> وظيفة جديدة
          </button>
        }
      />
      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<HrmJob & Record<string, unknown>>
          data={(query.data ?? []) as (HrmJob & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={10}
          columns={[
            { key: 'name', header: 'الوظيفة' },
            {
              key: 'description',
              header: 'الوصف',
              render: (row) => row.description?.trim() || '—',
            },
            {
              key: 'employees_count',
              header: 'عدد الموظفين',
              className: 'tabular-nums',
              render: (row) => row.employees_count ?? 0,
            },
            {
              key: 'status',
              header: 'الحالة',
              render: (row) => <StatusBadge status={row.status} />,
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <EntityRowActions
                  row={row}
                  config={crudConfig}
                  queryKeys={[['hrm', 'jobs']]}
                  onEdit={openEdit}
                  showView={false}
                />
              ),
            },
          ]}
        />
      </AsyncState>

      <Modal
        open={panelOpen || editId !== null}
        onClose={() => {
          setPanelOpen(false)
          setEditId(null)
        }}
        title={editId ? 'تعديل وظيفة' : 'وظيفة جديدة'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveMutation.mutate()
          }}
          className="space-y-sm"
        >
          <input
            placeholder="اسم الوظيفة"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className={inputClass}
          />
          <textarea
            placeholder="الوصف (اختياري)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className={inputClass}
          />
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className={inputClass}
          >
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary"
          >
            حفظ
          </button>
        </form>
      </Modal>
    </div>
  )
}
