import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { Administration, Branch, Department, PaginatedResponse } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { ChartCard } from '../components/ChartCard'
import { CollapsibleSection } from '../components/CollapsibleSection'
import { DataTable } from '../components/DataTable'
import { DistributeStockModal } from '../components/DistributeStockModal'
import { AddStockForm } from '../components/AddStockForm'
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
import { DonutChartPanel } from '../components/charts/DonutChartPanel'
import {
  computeDepartmentBarData,
  computeDepartmentDonutData,
  computeDepartmentInsights,
  computeDepartmentKpis,
  filterDepartments,
} from '../lib/pageStats'

type Panel = 'create' | 'edit' | 'addStock' | 'delete' | null

const emptyForm = { name_ar: '', address: '', phone: '', is_active: true }
const PER_PAGE = 10

export function DepartmentsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [panel, setPanel] = useState<Panel>(null)
  const [distributeOpen, setDistributeOpen] = useState(false)
  const [successToast, setSuccessToast] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Administration | null>(null)
  const [deleteBranchesToo, setDeleteBranchesToo] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const allQuery = useQuery({
    queryKey: ['administrations', 'admin', 'all'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Administration>>('/administrations', {
        params: { per_page: 100 },
      })
      return data.data
    },
  })

  const branchesForDeleteQuery = useQuery({
    queryKey: ['branches', 'delete-modal', deleteTarget?.id],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Branch>>('/branches', {
        params: { 'filter[administration_id]': deleteTarget!.id, per_page: 100 },
      })
      return data.data
    },
    enabled: panel === 'delete' && deleteTarget != null,
  })

  const deleteBranchCount = branchesForDeleteQuery.data?.length ?? 0

  const filtered = useMemo(
    () => filterDepartments(allQuery.data ?? [], search, statusFilter),
    [allQuery.data, search, statusFilter],
  )

  const paginated = useMemo(() => {
    const start = (page - 1) * PER_PAGE
    return filtered.slice(start, start + PER_PAGE)
  }, [filtered, page])

  const lastPage = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const kpis = useMemo(() => computeDepartmentKpis(filtered), [filtered])
  const barData = useMemo(() => computeDepartmentBarData(filtered), [filtered])
  const donutData = useMemo(() => computeDepartmentDonutData(filtered), [filtered])
  const insights = useMemo(() => computeDepartmentInsights(filtered), [filtered])
  const hasFilters = Boolean(search || statusFilter)

  const analyticsSummary = hasFilters
    ? `${filtered.length} نتيجة`
    : '4 مؤشرات'

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['administrations'] })
    queryClient.invalidateQueries({ queryKey: ['departments'] })
    queryClient.invalidateQueries({ queryKey: ['branches'] })
    queryClient.invalidateQueries({ queryKey: ['inventory'] })
    queryClient.invalidateQueries({ queryKey: ['gps-stock'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const closePanel = () => {
    setPanel(null)
    setEditId(null)
    setDeleteTarget(null)
    setDeleteBranchesToo(false)
    setForm(emptyForm)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form }
      if (panel === 'edit' && editId) {
        const { data } = await api.put<Administration>(`/administrations/${editId}`, payload)
        return data
      }
      const { data } = await api.post<Administration>('/administrations', payload)
      return data
    },
    onSuccess: () => {
      invalidate()
      closePanel()
      setSuccessToast(panel === 'edit' ? 'تم تحديث الإدارة' : 'تم إضافة الإدارة')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async ({ id, deleteBranches }: { id: number; deleteBranches: boolean }) => {
      await api.delete(`/administrations/${id}`, {
        params: { delete_branches: deleteBranches ? 1 : 0 },
      })
    },
    onSuccess: () => {
      invalidate()
      closePanel()
      setSuccessToast('تم حذف الإدارة')
    },
  })

  const openEdit = (admin: Administration) => {
    setEditId(admin.id)
    setForm({
      name_ar: admin.name_ar ?? '',
      address: admin.address ?? '',
      phone: admin.phone ?? '',
      is_active: admin.is_active ?? true,
    })
    setPanel('edit')
  }

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

  return (
    <div>
      <PageHeader
        title="الإدارات"
        subtitle="إدارة المخزون المركزي وتوزيعه على الفروع"
        actions={
          <>
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
              className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-sm"
            >
              <Icon name="inventory_2" size={18} />
              إضافة كمية
            </button>
            <button
              type="button"
              onClick={() => setDistributeOpen(true)}
              className="flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-sm"
            >
              <Icon name="swap_horiz" size={18} />
              توزيع على فرع
            </button>
          </>
        }
      />

      {successToast && (
        <ToastBanner message={successToast} onDismiss={() => setSuccessToast('')} />
      )}

      <CollapsibleSection
        title="التحليلات والرسوم البيانية"
        summary={analyticsSummary}
        isLoading={allQuery.isLoading}
      >
        {!allQuery.isLoading && allQuery.data && (
          <>
            <div className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="إدارات نشطة" value={kpis.activeCount} icon="domain" />
              <KpiCard label="إجمالي المخزون" value={kpis.totalStock} icon="inventory_2" />
              <KpiCard label="إجمالي المعلق" value={kpis.totalPending} icon="pending" />
              <KpiCard label="إجمالي الموزّع" value={kpis.totalDistributed} icon="local_shipping" />
            </div>

            <div className="mb-md grid grid-cols-1 gap-md lg:grid-cols-2">
              <ChartCard title="مخزون كل إدارة" subtitle="إجمالي / معلق / موزّع">
                <BarChartPanel
                  data={barData}
                  xKey="name"
                  series={[
                    { key: 'quantity', label: 'إجمالي', color: 'var(--color-chart-1)' },
                    { key: 'pending', label: 'معلق', color: 'var(--color-chart-3)' },
                    { key: 'distributed', label: 'موزّع', color: 'var(--color-chart-2)' },
                  ]}
                />
              </ChartCard>
              <ChartCard title="نسبة التوزيع" subtitle="موزّع مقابل معلق">
                <DonutChartPanel data={donutData} />
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
        searchPlaceholder="بحث بالاسم أو العنوان أو الهاتف..."
        selects={[
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
        onClear={() => { setSearch(''); setStatusFilter(''); setPage(1) }}
      />

      <AsyncState isLoading={allQuery.isLoading} isError={allQuery.isError} error={allQuery.error}>
        <DataTable<Administration & Record<string, unknown>>
          data={paginated as (Administration & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          emptyMessage={hasFilters ? 'لا توجد نتائج مطابقة للفلاتر' : 'لا توجد بيانات'}
          columns={[
            { key: 'name_ar', header: 'الاسم', render: (row) => row.name_ar || row.name },
            { key: 'address', header: 'العنوان', render: (row) => row.address || '—' },
            { key: 'phone', header: 'رقم الهاتف', className: 'tabular-nums', render: (row) => row.phone || '—' },
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
                  <Link to={`/departments/${row.id}`} className="text-sm text-primary hover:underline">
                    عرض التفاصيل
                  </Link>
                  <button type="button" onClick={() => openEdit(row as Administration)} className="text-sm text-primary hover:underline">
                    تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget(row as Administration)
                      setDeleteBranchesToo(false)
                      setPanel('delete')
                    }}
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
        title={panel === 'edit' ? 'تعديل إدارة' : 'إضافة إدارة'}
      >
        {panel === 'create' && (
          <p className="mb-md text-sm text-on-surface-variant">
            يُنشأ مخزن مركزي تلقائياً لمقر هذه الإدارة عند الحفظ — يمكنك مراجعته من صفحة{' '}
            <Link to="/inventory/warehouses" className="text-primary hover:underline">المخازن</Link>.
          </p>
        )}
        <form onSubmit={handleSave} className="grid gap-sm sm:grid-cols-2">
          <input
            placeholder="الاسم بالعربية"
            value={form.name_ar}
            onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            required
            className={`${inputClass} sm:col-span-2`}
          />
          <input
            placeholder="العنوان"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className={`${inputClass} sm:col-span-2`}
          />
          <input
            placeholder="رقم الهاتف"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            dir="ltr"
            className={inputClass}
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
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button type="button" onClick={closePanel} className="rounded-lg border px-md py-2 text-sm">إلغاء</button>
          </div>
        </form>
      </Modal>

      <Modal open={panel === 'addStock'} onClose={closePanel} title="إضافة كمية للإدارة">
        <AddStockForm
          departments={(allQuery.data ?? []) as Department[]}
          submitLabel="إضافة للإدارة"
          showCancel
          onCancel={closePanel}
          onSuccess={() => {
            invalidate()
            closePanel()
            setSuccessToast('تمت إضافة الكمية للإدارة')
          }}
        />
      </Modal>

      <DistributeStockModal
        open={distributeOpen}
        onClose={() => setDistributeOpen(false)}
        departments={(allQuery.data ?? []) as Department[]}
        onSuccess={() => setSuccessToast('تم التوزيع على الفرع')}
      />

      <Modal open={panel === 'delete'} onClose={closePanel} title="تأكيد الحذف" size="sm">
        <p className="mb-md text-sm text-on-surface-variant">
          هل تريد حذف إدارة &quot;{deleteTarget?.name_ar || deleteTarget?.name}&quot;؟ لا يمكن التراجع.
        </p>
        {deleteBranchCount > 0 && (
          <label className="mb-md flex items-start gap-xs text-sm">
            <input
              type="checkbox"
              checked={deleteBranchesToo}
              onChange={(e) => setDeleteBranchesToo(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              حذف {deleteBranchCount} {deleteBranchCount === 1 ? 'فرع مرتبط' : 'فروع مرتبطة'} بهذه الإدارة
            </span>
          </label>
        )}
        {deleteMutation.isError && (
          <p className="mb-sm text-sm text-error">{getErrorMessage(deleteMutation.error)}</p>
        )}
        <div className="flex gap-sm">
          <button
            type="button"
            disabled={
              deleteMutation.isPending
              || branchesForDeleteQuery.isLoading
              || (deleteBranchCount > 0 && !deleteBranchesToo)
            }
            onClick={() => deleteTarget && deleteMutation.mutate({
              id: deleteTarget.id,
              deleteBranches: deleteBranchesToo,
            })}
            className="rounded-lg bg-error px-md py-2 text-sm font-bold text-on-primary disabled:opacity-50"
          >
            {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
          </button>
          <button type="button" onClick={closePanel} className="rounded-lg border px-md py-2 text-sm">إلغاء</button>
        </div>
      </Modal>
    </div>
  )
}
