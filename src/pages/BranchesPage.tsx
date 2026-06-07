import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Branch, Department, PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { Pagination } from '../components/Pagination'
import { StatusBadge } from '../components/StatusBadge'
import { Icon } from '../components/Icon'

type Panel = 'create' | 'edit' | null

const emptyForm = {
  code: '',
  name_ar: '',
  name: '',
  address: '',
  department_id: '' as number | '',
  is_active: true,
}

export function BranchesPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [deptFilter, setDeptFilter] = useState<number | ''>('')
  const [panel, setPanel] = useState<Panel>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)

  const departmentsQuery = useQuery({
    queryKey: ['departments', 'options'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Department>>('/departments', {
        params: { per_page: 100 },
      })
      return data.data
    },
  })

  const query = useQuery({
    queryKey: ['branches', 'admin', page, deptFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, per_page: 10 }
      if (deptFilter) params['filter[department_id]'] = deptFilter
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', { params })
      return data
    },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['branches'] })
    queryClient.invalidateQueries({ queryKey: ['departments'] })
    queryClient.invalidateQueries({ queryKey: ['inventory'] })
    queryClient.invalidateQueries({ queryKey: ['warehouses'] })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        department_id: Number(form.department_id),
      }
      if (panel === 'edit' && editId) {
        const { data } = await api.put<Branch>(`/branches/${editId}`, payload)
        return data
      }
      const { data } = await api.post<Branch>('/branches', payload)
      return data
    },
    onSuccess: () => {
      invalidate()
      setPanel(null)
      setForm(emptyForm)
      setEditId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/branches/${id}`)
    },
    onSuccess: invalidate,
  })

  const openEdit = (branch: Branch & { department?: Department }) => {
    setEditId(branch.id)
    setForm({
      code: branch.code,
      name_ar: branch.name_ar ?? '',
      name: branch.name,
      address: branch.address ?? '',
      department_id: branch.department_id ?? '',
      is_active: branch.is_active ?? true,
    })
    setPanel('edit')
  }

  return (
    <div>
      <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
        <h1 className="text-2xl font-bold text-on-surface">الفروع</h1>
        <button
          type="button"
          onClick={() => { setPanel('create'); setForm(emptyForm); setEditId(null) }}
          className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
        >
          <Icon name="add" size={18} />
          إضافة فرع
        </button>
      </div>

      <div className="mb-md">
        <select
          value={deptFilter}
          onChange={(e) => { setDeptFilter(e.target.value ? Number(e.target.value) : ''); setPage(1) }}
          className="rounded border border-outline-variant px-sm py-2 text-sm"
        >
          <option value="">كل الإدارات</option>
          {departmentsQuery.data?.map((d) => (
            <option key={d.id} value={d.id}>{d.name_ar || d.name}</option>
          ))}
        </select>
      </div>

      {(panel === 'create' || panel === 'edit') && (
        <form
          onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }}
          className="mb-md grid gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md sm:grid-cols-2"
        >
          <select
            value={form.department_id}
            onChange={(e) => setForm({ ...form, department_id: Number(e.target.value) })}
            required
            className="rounded border border-outline-variant px-sm py-2 text-sm sm:col-span-2"
          >
            <option value="">اختر الإدارة</option>
            {departmentsQuery.data?.map((d) => (
              <option key={d.id} value={d.id}>{d.name_ar || d.name}</option>
            ))}
          </select>
          <input
            placeholder="الكود"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
            dir="ltr"
            className="rounded border border-outline-variant px-sm py-2 text-sm"
          />
          <input
            placeholder="الاسم بالعربية"
            value={form.name_ar}
            onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            required
            className="rounded border border-outline-variant px-sm py-2 text-sm"
          />
          <input
            placeholder="العنوان"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="rounded border border-outline-variant px-sm py-2 text-sm sm:col-span-2"
          />
          <label className="flex items-center gap-xs text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            نشط
          </label>
          {saveMutation.isError && (
            <p className="text-sm text-error sm:col-span-2">{getErrorMessage(saveMutation.error)}</p>
          )}
          <div className="flex gap-sm sm:col-span-2">
            <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary">
              حفظ
            </button>
            <button type="button" onClick={() => setPanel(null)} className="rounded-lg border px-md py-2 text-sm">إلغاء</button>
          </div>
        </form>
      )}

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<Branch & Record<string, unknown>>
          data={(query.data?.data ?? []) as (Branch & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          columns={[
            { key: 'code', header: 'الكود' },
            { key: 'name_ar', header: 'الاسم', render: (row) => row.name_ar || row.name },
            {
              key: 'department',
              header: 'الإدارة',
              render: (row) => {
                const dept = row.department as Department | undefined
                return dept?.name_ar || dept?.name || '—'
              },
            },
            { key: 'address', header: 'العنوان' },
            {
              key: 'is_active',
              header: 'الحالة',
              render: (row) => (
                <StatusBadge status={row.is_active ? 'active' : 'inactive'} label={row.is_active ? 'نشط' : 'موقوف'} />
              ),
            },
            {
              key: 'actions',
              header: 'إجراءات',
              render: (row) => (
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(row as Branch)} className="text-sm text-primary hover:underline">
                    تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(row.id as number)}
                    className="text-sm text-error hover:underline"
                  >
                    حذف
                  </button>
                </div>
              ),
            },
          ]}
        />
        {query.data && (
          <Pagination
            currentPage={query.data.current_page}
            lastPage={query.data.last_page}
            total={query.data.total}
            onPageChange={setPage}
          />
        )}
      </AsyncState>
    </div>
  )
}
