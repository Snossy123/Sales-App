import { useMemo, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { getScopedDepartmentId, isSuperAdmin } from '../lib/access'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Branch, PaginatedResponse, Section } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { Pagination } from '../components/Pagination'
import { ToastBanner } from '../components/ToastBanner'

type Panel = 'create' | 'edit' | 'delete' | null
type SectionRow = Section & { serial: number; branch?: Branch }

const emptyForm = {
  name_ar: '',
  branch_id: '' as number | '',
}

const PER_PAGE = 10

function filterSections(sections: SectionRow[], search: string): SectionRow[] {
  const q = search.trim().toLowerCase()
  if (!q) return sections
  return sections.filter((s) => (s.name_ar ?? s.name).toLowerCase().includes(q))
}

export function SectionsPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const scopedAdminId = getScopedDepartmentId(user)
  const isOrgWide = isSuperAdmin(user)
  const [page, setPage] = useState(1)
  const [branchFilter, setBranchFilter] = useState('')
  const [search, setSearch] = useState('')
  const [serialSort, setSerialSort] = useState<'asc' | 'desc'>('asc')
  const [panel, setPanel] = useState<Panel>(null)
  const [successToast, setSuccessToast] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null)
  const [form, setForm] = useState(emptyForm)

  const branchesQuery = useQuery({
    queryKey: ['branches', 'sections', scopedAdminId],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 100 }
      if (scopedAdminId) params['filter[administration_id]'] = scopedAdminId
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', { params })
      return data.data
    },
  })

  const sectionsQuery = useQuery({
    queryKey: ['sections', branchFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 100, include: 'branch' }
      if (branchFilter) params['filter[branch_id]'] = Number(branchFilter)
      const { data } = await api.get<PaginatedResponse<SectionRow>>('/departments', { params })
      return data.data
    },
  })

  const filtered = useMemo(
    () => filterSections(sectionsQuery.data ?? [], search),
    [sectionsQuery.data, search],
  )

  const sorted = useMemo(() => {
    const items = [...filtered]
    items.sort((a, b) => (serialSort === 'asc' ? a.id - b.id : b.id - a.id))
    return items
  }, [filtered, serialSort])

  const paginated = useMemo(() => {
    const start = (page - 1) * PER_PAGE
    return sorted.slice(start, start + PER_PAGE).map((row, idx) => ({
      ...row,
      serial: start + idx + 1,
    }))
  }, [sorted, page])

  const lastPage = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const hasFilters = Boolean(search || branchFilter)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['sections'] })
    queryClient.invalidateQueries({ queryKey: ['departments'] })
  }

  const closePanel = () => {
    setPanel(null)
    setEditId(null)
    setDeleteTarget(null)
    setForm(emptyForm)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name_ar: form.name_ar,
        branch_id: Number(form.branch_id),
      }
      if (panel === 'edit' && editId) {
        const { data } = await api.put<Section>(`/departments/${editId}`, payload)
        return data
      }
      const { data } = await api.post<Section>('/departments', payload)
      return data
    },
    onSuccess: () => {
      invalidate()
      closePanel()
      setSuccessToast(panel === 'edit' ? 'تم تحديث القسم' : 'تم إضافة القسم')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/departments/${id}`)
    },
    onSuccess: () => {
      invalidate()
      closePanel()
      setSuccessToast('تم حذف القسم')
    },
  })

  const openEdit = (section: SectionRow) => {
    setEditId(section.id)
    setForm({
      name_ar: section.name_ar ?? section.name,
      branch_id: section.branch_id ?? '',
    })
    setPanel('edit')
  }

  const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'
  const branchOptions = branchesQuery.data ?? []

  return (
    <div>
      <PageHeader
        title={isOrgWide ? 'كل الأقسام' : 'أقسام الفروع'}
        subtitle="إدارة الأقسام داخل الفروع — مبيعات، تحصيل، موارد بشرية، وغيرها"
        actions={
          <button
            type="button"
            onClick={() => {
              setPanel('create')
              setForm({
                ...emptyForm,
                branch_id: branchFilter ? Number(branchFilter) : '',
              })
              setEditId(null)
            }}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="add" size={18} />
            إضافة قسم
          </button>
        }
      />

      {successToast && (
        <ToastBanner message={successToast} onDismiss={() => setSuccessToast('')} />
      )}

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="بحث بالاسم..."
        selects={[
          {
            id: 'branch',
            label: 'الفرع',
            value: branchFilter,
            onChange: (v) => { setBranchFilter(v); setPage(1) },
            options: [
              { value: '', label: 'كل الفروع' },
              ...branchOptions.map((b) => ({
                value: String(b.id),
                label: b.name_ar || b.name,
              })),
            ],
          },
        ]}
        showClear={hasFilters}
        onClear={() => {
          setSearch('')
          setBranchFilter('')
          setSerialSort('asc')
          setPage(1)
        }}
      />

      <AsyncState
        isLoading={sectionsQuery.isLoading}
        isError={sectionsQuery.isError}
        error={sectionsQuery.error}
      >
        <DataTable<SectionRow & Record<string, unknown>>
          data={paginated as (SectionRow & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          emptyMessage={hasFilters ? 'لا توجد نتائج مطابقة للفلاتر' : 'لا توجد بيانات'}
          sortKey="serial"
          sortDirection={serialSort}
          onSort={() => {
            setSerialSort((prev) => (prev === 'asc' ? 'desc' : 'asc'))
            setPage(1)
          }}
          columns={[
            {
              key: 'serial',
              header: 'م',
              sortable: true,
              className: 'tabular-nums w-12 text-center',
              render: (row) => row.serial,
            },
            { key: 'name_ar', header: 'الاسم', render: (row) => row.name_ar || row.name },
            {
              key: 'branch',
              header: 'الفرع',
              render: (row) => row.branch?.name_ar || row.branch?.name || '—',
            },
            {
              key: 'actions',
              header: 'إجراءات',
              render: (row) => (
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(row as SectionRow)} className="text-sm text-primary hover:underline">
                    تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeleteTarget(row as Section); setPanel('delete') }}
                    className="text-sm text-error hover:underline"
                  >
                    حذف
                  </button>
                </div>
              ),
            },
          ]}
        />
        <Pagination
          currentPage={page}
          lastPage={lastPage}
          total={filtered.length}
          onPageChange={setPage}
        />
      </AsyncState>

      <Modal
        open={panel === 'create' || panel === 'edit'}
        onClose={closePanel}
        title={panel === 'edit' ? 'تعديل قسم' : 'إضافة قسم'}
      >
        <form
          onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }}
          className="grid gap-sm"
        >
          <select
            value={form.branch_id}
            onChange={(e) => setForm({ ...form, branch_id: Number(e.target.value) })}
            required
            className={inputClass}
          >
            <option value="">اختر الفرع</option>
            {branchOptions.map((b) => (
              <option key={b.id} value={b.id}>{b.name_ar || b.name}</option>
            ))}
          </select>
          <input
            placeholder="الاسم بالعربية"
            value={form.name_ar}
            onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            required
            className={inputClass}
          />
          {saveMutation.isError && (
            <p className="text-sm text-error">{getErrorMessage(saveMutation.error)}</p>
          )}
          <div className="flex gap-sm">
            <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-secondary px-md py-2 text-sm font-bold text-on-secondary">
              حفظ
            </button>
            <button type="button" onClick={closePanel} className="rounded-lg border px-md py-2 text-sm">إلغاء</button>
          </div>
        </form>
      </Modal>

      <Modal open={panel === 'delete'} onClose={closePanel} title="تأكيد الحذف" size="sm">
        <p className="mb-md text-sm text-on-surface-variant">
          هل تريد حذف قسم &quot;{deleteTarget?.name_ar || deleteTarget?.name}&quot;؟ لا يمكن التراجع.
        </p>
        {deleteMutation.isError && (
          <p className="mb-sm text-sm text-error">{getErrorMessage(deleteMutation.error)}</p>
        )}
        <div className="flex gap-sm">
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            className="rounded-lg bg-error px-md py-2 text-sm font-bold text-on-primary"
          >
            {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
          </button>
          <button type="button" onClick={closePanel} className="rounded-lg border px-md py-2 text-sm">إلغاء</button>
        </div>
      </Modal>
    </div>
  )
}
