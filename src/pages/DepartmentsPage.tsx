import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Branch, Department, PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { Pagination } from '../components/Pagination'
import { StatusBadge } from '../components/StatusBadge'
import { Icon } from '../components/Icon'

type Panel = 'create' | 'edit' | 'addStock' | 'distribute' | null

const emptyForm = { code: '', name_ar: '', name: '', is_active: true }

export function DepartmentsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [panel, setPanel] = useState<Panel>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [stockDeptId, setStockDeptId] = useState<number | ''>('')
  const [stockQty, setStockQty] = useState(10)
  const [distDeptId, setDistDeptId] = useState<number | ''>('')
  const [distBranchId, setDistBranchId] = useState<number | ''>('')
  const [distQty, setDistQty] = useState(5)

  const query = useQuery({
    queryKey: ['departments', 'admin', page],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Department>>('/departments', {
        params: { page, per_page: 10 },
      })
      return data
    },
  })

  const branchesQuery = useQuery({
    queryKey: ['branches', 'all', distDeptId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: { per_page: 100, 'filter[department_id]': distDeptId },
      })
      return data.data
    },
    enabled: Boolean(distDeptId),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['departments'] })
    queryClient.invalidateQueries({ queryKey: ['branches'] })
    queryClient.invalidateQueries({ queryKey: ['inventory'] })
    queryClient.invalidateQueries({ queryKey: ['gps-stock'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form }
      if (panel === 'edit' && editId) {
        const { data } = await api.put<Department>(`/departments/${editId}`, payload)
        return data
      }
      const { data } = await api.post<Department>('/departments', payload)
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
      await api.delete(`/departments/${id}`)
    },
    onSuccess: invalidate,
  })

  const addStockMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<Department>('/department-stock/add', {
        department_id: stockDeptId,
        quantity: stockQty,
      })
      return data
    },
    onSuccess: () => {
      invalidate()
      setPanel(null)
      setStockQty(10)
    },
  })

  const distributeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/department-stock/distribute', {
        department_id: distDeptId,
        branch_id: distBranchId,
        quantity: distQty,
      })
      return data
    },
    onSuccess: () => {
      invalidate()
      setPanel(null)
      setDistQty(5)
    },
  })

  const openEdit = (dept: Department) => {
    setEditId(dept.id)
    setForm({
      code: dept.code,
      name_ar: dept.name_ar ?? '',
      name: dept.name,
      is_active: dept.is_active ?? true,
    })
    setPanel('edit')
  }

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  return (
    <div>
      <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
        <h1 className="text-2xl font-bold text-on-surface">الإدارات</h1>
        <div className="flex flex-wrap gap-xs">
          <button
            type="button"
            onClick={() => { setPanel('create'); setForm(emptyForm); setEditId(null) }}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="add" size={18} />
            إضافة إدارة
          </button>
          <button
            type="button"
            onClick={() => setPanel('addStock')}
            className="flex items-center gap-xs rounded-lg border border-outline-variant px-md py-sm text-sm"
          >
            <Icon name="inventory_2" size={18} />
            إضافة كمية
          </button>
          <button
            type="button"
            onClick={() => setPanel('distribute')}
            className="flex items-center gap-xs rounded-lg border border-outline-variant px-md py-sm text-sm"
          >
            <Icon name="swap_horiz" size={18} />
            توزيع على فرع
          </button>
        </div>
      </div>

      {(panel === 'create' || panel === 'edit') && (
        <form
          onSubmit={handleSave}
          className="mb-md grid gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md sm:grid-cols-2"
        >
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
            placeholder="الاسم بالإنجليزية"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded border border-outline-variant px-sm py-2 text-sm"
          />
          <label className="flex items-center gap-xs text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            نشط
          </label>
          {(saveMutation.isError) && (
            <p className="text-sm text-error sm:col-span-2">{getErrorMessage(saveMutation.error)}</p>
          )}
          <div className="flex gap-sm sm:col-span-2">
            <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary">
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button type="button" onClick={() => setPanel(null)} className="rounded-lg border px-md py-2 text-sm">
              إلغاء
            </button>
          </div>
        </form>
      )}

      {panel === 'addStock' && (
        <form
          onSubmit={(e) => { e.preventDefault(); addStockMutation.mutate() }}
          className="mb-md grid gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md sm:grid-cols-2"
        >
          <select
            value={stockDeptId}
            onChange={(e) => setStockDeptId(Number(e.target.value))}
            required
            className="rounded border border-outline-variant px-sm py-2 text-sm"
          >
            <option value="">اختر الإدارة</option>
            {query.data?.data.map((d) => (
              <option key={d.id} value={d.id}>{d.name_ar || d.name}</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={stockQty}
            onChange={(e) => setStockQty(Number(e.target.value))}
            placeholder="عدد القطع"
            className="rounded border border-outline-variant px-sm py-2 text-sm tabular-nums"
          />
          {addStockMutation.isError && (
            <p className="text-sm text-error sm:col-span-2">{getErrorMessage(addStockMutation.error)}</p>
          )}
          <div className="flex gap-sm sm:col-span-2">
            <button type="submit" disabled={addStockMutation.isPending} className="rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary">
              إضافة للإدارة
            </button>
            <button type="button" onClick={() => setPanel(null)} className="rounded-lg border px-md py-2 text-sm">إلغاء</button>
          </div>
        </form>
      )}

      {panel === 'distribute' && (
        <form
          onSubmit={(e) => { e.preventDefault(); distributeMutation.mutate() }}
          className="mb-md grid gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md sm:grid-cols-3"
        >
          <select
            value={distDeptId}
            onChange={(e) => { setDistDeptId(Number(e.target.value)); setDistBranchId('') }}
            required
            className="rounded border border-outline-variant px-sm py-2 text-sm"
          >
            <option value="">الإدارة</option>
            {query.data?.data.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name_ar || d.name} (معلق: {d.department_stock?.pending ?? 0})
              </option>
            ))}
          </select>
          <select
            value={distBranchId}
            onChange={(e) => setDistBranchId(Number(e.target.value))}
            required
            disabled={!distDeptId}
            className="rounded border border-outline-variant px-sm py-2 text-sm"
          >
            <option value="">الفرع</option>
            {branchesQuery.data?.map((b) => (
              <option key={b.id} value={b.id}>{b.name_ar || b.name}</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={distQty}
            onChange={(e) => setDistQty(Number(e.target.value))}
            className="rounded border border-outline-variant px-sm py-2 text-sm tabular-nums"
          />
          {distributeMutation.isError && (
            <p className="text-sm text-error sm:col-span-3">{getErrorMessage(distributeMutation.error)}</p>
          )}
          <div className="flex gap-sm sm:col-span-3">
            <button type="submit" disabled={distributeMutation.isPending} className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary">
              توزيع
            </button>
            <button type="button" onClick={() => setPanel(null)} className="rounded-lg border px-md py-2 text-sm">إلغاء</button>
          </div>
        </form>
      )}

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<Department & Record<string, unknown>>
          data={(query.data?.data ?? []) as (Department & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          columns={[
            { key: 'code', header: 'الكود', className: 'tabular-nums' },
            { key: 'name_ar', header: 'الاسم', render: (row) => row.name_ar || row.name },
            {
              key: 'quantity',
              header: 'إجمالي المخزون',
              render: (row) => row.department_stock?.quantity ?? 0,
            },
            {
              key: 'pending',
              header: 'معلق',
              render: (row) => (
                <span className="font-medium text-[#653e00]">{row.department_stock?.pending ?? 0}</span>
              ),
            },
            {
              key: 'distributed',
              header: 'موزّع',
              render: (row) => row.department_stock?.distributed ?? 0,
            },
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
                  <button type="button" onClick={() => openEdit(row as Department)} className="text-sm text-primary hover:underline">
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
