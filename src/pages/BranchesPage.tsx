import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { getScopedDepartmentId, isSuperAdmin } from '../lib/access'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Branch, Department, PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { ChartCard } from '../components/ChartCard'
import { CollapsibleSection } from '../components/CollapsibleSection'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { Icon } from '../components/Icon'
import { InsightBanner } from '../components/InsightBanner'
import { KpiCard } from '../components/KpiCard'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { Pagination } from '../components/Pagination'
import { StatusBadge } from '../components/StatusBadge'
import { ToastBanner } from '../components/ToastBanner'
import { BarChartPanel } from '../components/charts/BarChartPanel'
import {
  computeBranchByDeptData,
  computeBranchInsights,
  computeBranchKpis,
  computeBranchStatusData,
  filterBranches,
} from '../lib/pageStats'

type Panel = 'create' | 'edit' | 'delete' | null

const emptyForm = {
  code: '',
  name_ar: '',
  name: '',
  address: '',
  department_id: '' as number | '',
  is_active: true,
}

const PER_PAGE = 10

export function BranchesPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const scopedDeptId = getScopedDepartmentId(user)
  const isOrgWide = isSuperAdmin(user)
  const pageTitle = isOrgWide ? 'كل الفروع' : 'فروع الإدارة'
  const pageSubtitle = isOrgWide
    ? 'إدارة فروع جميع الإدارات وعناوينها'
    : 'فروع إدارتك — إضافة وتعديل وعناوين الفروع'
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [deptFilter, setDeptFilter] = useState(() => {
    if (scopedDeptId) return String(scopedDeptId)
    return searchParams.get('department') ?? ''
  })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [panel, setPanel] = useState<Panel>(null)
  const [successToast, setSuccessToast] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null)
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

  const allBranchesQuery = useQuery({
    queryKey: ['branches', 'admin', 'all', deptFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 100 }
      if (deptFilter) {
        params['filter[administration_id]'] = Number(deptFilter)
        params['filter[department_id]'] = Number(deptFilter)
      }
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', { params })
      return data.data
    },
  })

  const filtered = useMemo(
    () => filterBranches(allBranchesQuery.data ?? [], search, statusFilter),
    [allBranchesQuery.data, search, statusFilter],
  )

  const paginated = useMemo(() => {
    const start = (page - 1) * PER_PAGE
    return filtered.slice(start, start + PER_PAGE)
  }, [filtered, page])

  const lastPage = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const kpis = useMemo(() => computeBranchKpis(filtered), [filtered])
  const deptChartData = useMemo(() => computeBranchByDeptData(filtered), [filtered])
  const statusChartData = useMemo(() => computeBranchStatusData(filtered), [filtered])
  const insights = useMemo(() => computeBranchInsights(filtered), [filtered])
  const hasFilters = Boolean(search || statusFilter || deptFilter)

  const analyticsSummary = hasFilters
    ? `${filtered.length} نتيجة`
    : '4 مؤشرات'

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['branches'] })
    queryClient.invalidateQueries({ queryKey: ['departments'] })
    queryClient.invalidateQueries({ queryKey: ['inventory'] })
    queryClient.invalidateQueries({ queryKey: ['warehouses'] })
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
      closePanel()
      setSuccessToast(panel === 'edit' ? 'تم تحديث الفرع' : 'تم إضافة الفرع')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/branches/${id}`)
    },
    onSuccess: () => {
      invalidate()
      closePanel()
      setSuccessToast('تم حذف الفرع')
    },
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

  const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

  return (
    <div>
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={
          <button
            type="button"
            onClick={() => {
              setPanel('create')
              setForm({
                ...emptyForm,
                department_id: scopedDeptId ?? '',
              })
              setEditId(null)
            }}
            className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="add" size={18} />
            إضافة فرع
          </button>
        }
      />

      {successToast && (
        <ToastBanner message={successToast} onDismiss={() => setSuccessToast('')} />
      )}

      <CollapsibleSection
        title="التحليلات والرسوم البيانية"
        summary={analyticsSummary}
        isLoading={allBranchesQuery.isLoading}
      >
        {!allBranchesQuery.isLoading && allBranchesQuery.data && (
          <>
            <div className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="إجمالي الفروع" value={kpis.total} icon="store" />
              <KpiCard label="فروع نشطة" value={kpis.active} icon="check_circle" />
              <KpiCard label="إدارات ممثلة" value={kpis.departmentCount} icon="domain" />
              <KpiCard label="متوسط فروع/إدارة" value={kpis.avgPerDept} icon="analytics" />
            </div>

            <div className="mb-md grid grid-cols-1 gap-md lg:grid-cols-2">
              <ChartCard title="توزيع الفروع حسب الإدارة">
                <BarChartPanel
                  data={deptChartData}
                  xKey="name"
                  series={[{ key: 'count', label: 'عدد الفروع', color: 'var(--color-chart-1)' }]}
                />
              </ChartCard>
              <ChartCard title="حالة الفروع">
                <BarChartPanel
                  data={statusChartData}
                  xKey="name"
                  series={[
                    { key: 'count', label: 'العدد', color: 'var(--color-chart-2)' },
                  ]}
                />
              </ChartCard>
            </div>

            {insights.length > 0 && (
              <div className="space-y-md">
                {insights.map((insight) => (
                  <InsightBanner key={insight.message} message={insight.message} variant={insight.variant} />
                ))}
              </div>
            )}
          </>
        )}
      </CollapsibleSection>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="بحث بالاسم أو الكود أو العنوان..."
        selects={[
          ...(!scopedDeptId
            ? [{
                id: 'department',
                label: 'الإدارة',
                value: deptFilter,
                onChange: (v: string) => { setDeptFilter(v); setPage(1) },
                options: [
                  { value: '', label: 'كل الإدارات' },
                  ...(departmentsQuery.data?.map((d) => ({
                    value: String(d.id),
                    label: d.name_ar || d.name,
                  })) ?? []),
                ],
              }]
            : []),
          {
            id: 'status',
            label: 'الحالة',
            value: statusFilter,
            onChange: (v) => { setStatusFilter(v); setPage(1) },
            options: [
              { value: '', label: 'الكل' },
              { value: 'active', label: 'نشط' },
              { value: 'inactive', label: 'غير نشط' },
            ],
          },
        ]}
        showClear={hasFilters}
        onClear={() => {
          setSearch('')
          setStatusFilter('')
          if (!scopedDeptId) setDeptFilter('')
          setPage(1)
        }}
      />

      <AsyncState
        isLoading={allBranchesQuery.isLoading}
        isError={allBranchesQuery.isError}
        error={allBranchesQuery.error}
      >
        <DataTable<Branch & Record<string, unknown>>
          data={paginated as (Branch & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          emptyMessage={hasFilters ? 'لا توجد نتائج مطابقة للفلاتر' : 'لا توجد بيانات'}
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
                  <Link to={`/branches/${row.id}`} className="text-sm text-primary hover:underline">
                    عرض التفاصيل
                  </Link>
                  <button type="button" onClick={() => openEdit(row as Branch)} className="text-sm text-primary hover:underline">
                    تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeleteTarget(row as Branch); setPanel('delete') }}
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
        title={panel === 'edit' ? 'تعديل فرع' : 'إضافة فرع'}
      >
        <form
          onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }}
          className="grid gap-sm sm:grid-cols-2"
        >
          {scopedDeptId ? (
            <div className={`${inputClass} sm:col-span-2 bg-surface-container-low text-on-surface-variant`}>
              الإدارة: {departmentsQuery.data?.find((d) => d.id === scopedDeptId)?.name_ar || 'إدارتك'}
            </div>
          ) : (
            <select
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: Number(e.target.value) })}
              required
              className={`${inputClass} sm:col-span-2`}
            >
              <option value="">اختر الإدارة</option>
              {departmentsQuery.data?.map((d) => (
                <option key={d.id} value={d.id}>{d.name_ar || d.name}</option>
              ))}
            </select>
          )}
          <input
            placeholder="الكود"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
            dir="ltr"
            className={inputClass}
          />
          <input
            placeholder="الاسم بالعربية"
            value={form.name_ar}
            onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            required
            className={inputClass}
          />
          <input
            placeholder="الاسم بالإنجليزية"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={`${inputClass} sm:col-span-2`}
          />
          <input
            placeholder="العنوان"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className={`${inputClass} sm:col-span-2`}
          />
          <label className="flex items-center gap-xs text-sm sm:col-span-2">
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
            <button type="button" onClick={closePanel} className="rounded-lg border px-md py-2 text-sm">إلغاء</button>
          </div>
        </form>
      </Modal>

      <Modal open={panel === 'delete'} onClose={closePanel} title="تأكيد الحذف" size="sm">
        <p className="mb-md text-sm text-on-surface-variant">
          هل تريد حذف فرع &quot;{deleteTarget?.name_ar || deleteTarget?.name}&quot;؟ لا يمكن التراجع.
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
