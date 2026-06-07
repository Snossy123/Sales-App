import type {
  Branch,
  DashboardStats,
  Department,
  InventoryOverviewRow,
} from '../api/types'
import type { DonutSlice } from '../components/charts/DonutChartPanel'
import type { InsightVariant } from '../components/InsightBanner'

export interface DepartmentKpis {
  activeCount: number
  totalStock: number
  totalPending: number
  totalDistributed: number
}

export interface BranchKpis {
  total: number
  active: number
  departmentCount: number
  avgPerDept: number
}

export interface InventoryKpis {
  totalQuantity: number
  totalReserved: number
  totalSold: number
  totalPending: number
}

export interface PageInsight {
  message: string
  variant: InsightVariant
}

function deptName(d: Department) {
  return d.name_ar || d.name
}

export function computeDepartmentKpis(departments: Department[]): DepartmentKpis {
  return departments.reduce(
    (acc, d) => {
      const stock = d.department_stock
      if (d.is_active !== false) acc.activeCount++
      acc.totalStock += stock?.quantity ?? 0
      acc.totalPending += stock?.pending ?? 0
      acc.totalDistributed += stock?.distributed ?? 0
      return acc
    },
    { activeCount: 0, totalStock: 0, totalPending: 0, totalDistributed: 0 },
  )
}

export function computeDepartmentBarData(departments: Department[]) {
  return departments.map((d) => ({
    name: deptName(d),
    quantity: d.department_stock?.quantity ?? 0,
    pending: d.department_stock?.pending ?? 0,
    distributed: d.department_stock?.distributed ?? 0,
  }))
}

export function computeDepartmentDonutData(departments: Department[]): DonutSlice[] {
  const kpis = computeDepartmentKpis(departments)
  return [
    { label: 'موزّع', value: kpis.totalDistributed, color: 'var(--color-chart-2)' },
    { label: 'معلق', value: kpis.totalPending, color: 'var(--color-chart-3)' },
  ].filter((s) => s.value > 0)
}

export function computeDepartmentInsights(departments: Department[]): PageInsight[] {
  const insights: PageInsight[] = []
  const withPending = departments
    .filter((d) => (d.department_stock?.pending ?? 0) > 0)
    .sort((a, b) => (b.department_stock?.pending ?? 0) - (a.department_stock?.pending ?? 0))

  if (withPending.length > 0) {
    const top = withPending[0]
    insights.push({
      message: `أعلى مخزون معلق: ${deptName(top)} — ${top.department_stock?.pending ?? 0} وحدة بانتظار التوزيع`,
      variant: 'warning',
    })
  }

  const lowDist = departments
    .filter((d) => {
      const qty = d.department_stock?.quantity ?? 0
      const dist = d.department_stock?.distributed ?? 0
      return qty > 0 && dist / qty < 0.5
    })
    .sort((a, b) => {
      const ratioA = (a.department_stock?.distributed ?? 0) / (a.department_stock?.quantity ?? 1)
      const ratioB = (b.department_stock?.distributed ?? 0) / (b.department_stock?.quantity ?? 1)
      return ratioA - ratioB
    })

  if (lowDist.length > 0 && (lowDist[0].department_stock?.pending ?? 0) > 0) {
    const d = lowDist[0]
    const pct = Math.round(
      ((d.department_stock?.distributed ?? 0) / (d.department_stock?.quantity ?? 1)) * 100,
    )
    insights.push({
      message: `نسبة توزيع منخفضة في ${deptName(d)} — ${pct}% فقط من المخزون موزّع`,
      variant: 'info',
    })
  }

  return insights
}

export function filterDepartments(
  departments: Department[],
  search: string,
  status: string,
): Department[] {
  const q = search.trim().toLowerCase()
  return departments.filter((d) => {
    if (status === 'active' && d.is_active === false) return false
    if (status === 'inactive' && d.is_active !== false) return false
    if (!q) return true
    return (
      d.code.toLowerCase().includes(q) ||
      d.name.toLowerCase().includes(q) ||
      (d.name_ar ?? '').toLowerCase().includes(q)
    )
  })
}

export function computeBranchKpis(branches: Branch[]): BranchKpis {
  const active = branches.filter((b) => b.is_active !== false).length
  const deptIds = new Set(branches.map((b) => b.department_id).filter(Boolean))
  return {
    total: branches.length,
    active,
    departmentCount: deptIds.size,
    avgPerDept: deptIds.size > 0 ? Math.round((branches.length / deptIds.size) * 10) / 10 : 0,
  }
}

export function computeBranchByDeptData(branches: Branch[]) {
  const counts = new Map<string, number>()
  for (const b of branches) {
    const name = b.department?.name_ar || b.department?.name || 'غير محدد'
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return Array.from(counts.entries()).map(([name, count]) => ({ name, count }))
}

export function computeBranchStatusData(branches: Branch[]) {
  const active = branches.filter((b) => b.is_active !== false).length
  const inactive = branches.length - active
  return [
    { name: 'نشط', count: active },
    { name: 'موقوف', count: inactive },
  ].filter((r) => r.count > 0)
}

export function computeBranchInsights(branches: Branch[]): PageInsight[] {
  const insights: PageInsight[] = []
  const byDept = computeBranchByDeptData(branches)
  if (byDept.length > 0) {
    const top = [...byDept].sort((a, b) => b.count - a.count)[0]
    insights.push({
      message: `أكثر إدارة بفروع: ${top.name} — ${top.count} فرع`,
      variant: 'info',
    })
  }

  const inactive = branches.filter((b) => b.is_active === false)
  if (inactive.length > 0) {
    insights.push({
      message: `يوجد ${inactive.length} فرع موقوف — راجع الحالة قبل التوزيع`,
      variant: 'warning',
    })
  }

  return insights
}

export function filterBranches(
  branches: Branch[],
  search: string,
  status: string,
): Branch[] {
  const q = search.trim().toLowerCase()
  return branches.filter((b) => {
    if (status === 'active' && b.is_active === false) return false
    if (status === 'inactive' && b.is_active !== false) return false
    if (!q) return true
    return (
      b.code.toLowerCase().includes(q) ||
      b.name.toLowerCase().includes(q) ||
      (b.name_ar ?? '').toLowerCase().includes(q) ||
      (b.address ?? '').toLowerCase().includes(q)
    )
  })
}

export function computeInventoryKpis(rows: InventoryOverviewRow[]): InventoryKpis {
  return rows.reduce(
    (acc, r) => {
      if (r.row_type === 'department_pending') {
        acc.totalPending += r.quantity
      } else {
        acc.totalQuantity += r.quantity
        acc.totalReserved += r.reserved
        acc.totalSold += r.sold
      }
      return acc
    },
    { totalQuantity: 0, totalReserved: 0, totalSold: 0, totalPending: 0 },
  )
}

export function computeInventoryBranchStackData(rows: InventoryOverviewRow[]) {
  return rows
    .filter((r) => r.row_type === 'branch')
    .map((r) => ({
      name: r.branch_name_ar || '—',
      quantity: r.quantity,
      reserved: r.reserved,
      sold: r.sold,
    }))
}

export function computeInventoryDeptDonutData(rows: InventoryOverviewRow[]): DonutSlice[] {
  const byDept = new Map<string, number>()
  for (const r of rows) {
    if (r.row_type === 'department_pending') continue
    const name = r.department_name_ar
    byDept.set(name, (byDept.get(name) ?? 0) + r.quantity)
  }
  return Array.from(byDept.entries()).map(([label, value], i) => ({
    label,
    value,
    color: `var(--color-chart-${(i % 4) + 1})`,
  }))
}

export function computeInventoryInsights(rows: InventoryOverviewRow[]): PageInsight[] {
  const insights: PageInsight[] = []
  const branchRows = rows.filter((r) => r.row_type === 'branch')

  if (rows.some((r) => r.row_type === 'department_pending')) {
    const pending = rows
      .filter((r) => r.row_type === 'department_pending')
      .reduce((s, r) => s + r.quantity, 0)
    insights.push({
      message: `يوجد ${pending} وحدة معلقة بانتظار التوزيع على الفروع`,
      variant: 'warning',
    })
  }

  if (branchRows.length > 0) {
    const topSold = [...branchRows].sort((a, b) => b.sold - a.sold)[0]
    if (topSold.sold > 0) {
      insights.push({
        message: `أعلى مبيعات: ${topSold.branch_name_ar} — ${topSold.sold} وحدة مباعة`,
        variant: 'success',
      })
    }

    const lowStock = [...branchRows].sort(
      (a, b) => a.quantity - a.reserved - (b.quantity - b.reserved),
    )[0]
    const available = lowStock.quantity - lowStock.reserved
    insights.push({
      message: `أقل مخزون متاح: ${lowStock.branch_name_ar} — ${available} وحدة`,
      variant: available < 10 ? 'error' : 'info',
    })
  }

  return insights
}

export function filterInventoryRows(
  rows: InventoryOverviewRow[],
  branchSearch: string,
  rowType: string,
): InventoryOverviewRow[] {
  const q = branchSearch.trim().toLowerCase()
  return rows.filter((r) => {
    if (rowType === 'pending' && r.row_type !== 'department_pending') return false
    if (rowType === 'branch' && r.row_type !== 'branch') return false
    if (!q) return true
    if (r.row_type === 'department_pending') {
      return r.department_name_ar.toLowerCase().includes(q)
    }
    return (r.branch_name_ar ?? '').toLowerCase().includes(q)
  })
}

export function computeDashboardStockBarData(departments: Department[]) {
  return departments.map((d) => ({
    name: deptName(d),
    quantity: d.department_stock?.quantity ?? 0,
    pending: d.department_stock?.pending ?? 0,
  }))
}

export function computeDashboardInstallmentDonut(stats: DashboardStats): DonutSlice[] {
  const paid = Math.max(
    0,
    stats.outstanding_balance > 0
      ? Math.round(stats.outstanding_balance * 0.4)
      : 0,
  )
  return [
    { label: 'متأخرة', value: stats.overdue_installments, color: 'var(--color-chart-3)' },
    { label: 'مستحقة هذا الأسبوع', value: stats.due_this_week, color: 'var(--color-chart-4)' },
    {
      label: 'رصيد مستحق',
      value: Math.round(stats.outstanding_balance / 1000) || paid,
      color: 'var(--color-chart-1)',
    },
  ].filter((s) => s.value > 0)
}

export function computeDashboardInsights(
  stats: DashboardStats,
  showReviews: boolean,
): PageInsight[] {
  const insights: PageInsight[] = []

  if (stats.available_units < 10) {
    insights.push({
      message: `تنبيه مخزون: المتاح حالياً ${stats.available_units} وحدة فقط`,
      variant: 'error',
    })
  }

  if (stats.overdue_installments > 0) {
    insights.push({
      message: `يوجد ${stats.overdue_installments} قسط متأخر يحتاج متابعة`,
      variant: 'warning',
    })
  }

  if (showReviews && (stats.pending_reviews ?? 0) > 0) {
    insights.push({
      message: `${stats.pending_reviews} فاتورة بانتظار المراجعة`,
      variant: 'info',
    })
  }

  if (insights.length === 0) {
    insights.push({
      message: 'الأداء مستقر — لا توجد تنبيهات عاجلة',
      variant: 'success',
    })
  }

  return insights
}
