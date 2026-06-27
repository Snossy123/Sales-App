import type { Administration, Branch, Department, InventoryOverviewRow } from '../api/types'
import type { GpsDeviceRow } from '../data/enterpriseGpsMock'

export interface DepartmentKpi {
  label: string
  value: string
  trendIcon: string
  trendText: string
  trendColor: string
}

export interface DepartmentHealthCard {
  label: string
  value: string
  bg: string
  border: string
  labelColor: string
  valueColor: string
  icon: string
  iconColor: string
}

export interface BranchStockChartRow {
  name: string
  sold: number
  available: number
  reserved: number
}

export interface DepartmentDashboardData {
  kpis: DepartmentKpi[]
  healthCards: DepartmentHealthCard[]
  branchChartData: BranchStockChartRow[]
  deviceRows: (GpsDeviceRow & { branchId?: number })[]
  completionRate: number
  totalDevices: number
}

function formatCount(value: number): string {
  return value.toLocaleString('ar-EG')
}

export function buildDepartmentDashboard(
  dept: Department | Administration,
  branches: Branch[],
  inventoryRows: InventoryOverviewRow[] = [],
): DepartmentDashboardData {
  const stock = dept.department_stock
  const totalStock = stock?.quantity ?? 0
  const pending = stock?.pending ?? 0
  const distributed = stock?.distributed ?? 0

  const branchInventory = inventoryRows.filter((row) => row.row_type === 'branch')
  const soldTotal = branchInventory.reduce((sum, row) => sum + row.sold, 0)
  const reservedTotal = branchInventory.reduce((sum, row) => sum + row.reserved, 0)
  const branchAvailable = branchInventory.reduce(
    (sum, row) => sum + Math.max(0, row.quantity - row.sold - row.reserved),
    0,
  )
  const distributionRate = totalStock > 0 ? Math.round((distributed / totalStock) * 100) : 0

  const kpis: DepartmentKpi[] = [
    {
      label: 'إجمالي مخزون GPS',
      value: formatCount(totalStock),
      trendIcon: 'inventory',
      trendText: `${branches.length} فرع`,
      trendColor: 'text-primary',
    },
    {
      label: 'مخزون معلّق (مركزي)',
      value: formatCount(pending),
      trendIcon: 'pending_actions',
      trendText: pending > 0 ? 'بانتظار التوزيع' : 'لا يوجد مخزون معلّق',
      trendColor: pending > 0 ? 'text-[#FF9800]' : 'text-on-surface-variant',
    },
    {
      label: 'موزّع على الفروع',
      value: formatCount(distributed),
      trendIcon: 'local_shipping',
      trendText: totalStock > 0 ? `${distributionRate}% من الإجمالي` : 'لا يوجد مخزون',
      trendColor: 'text-on-surface-variant',
    },
    {
      label: 'أجهزة مباعة',
      value: formatCount(soldTotal),
      trendIcon: soldTotal > 0 ? 'trending_up' : 'sell',
      trendText: soldTotal > 0 ? 'مباعة ومرتبطة' : 'لا توجد مبيعات بعد',
      trendColor: soldTotal > 0 ? 'text-[#34A853]' : 'text-on-surface-variant',
    },
  ]

  const healthCards: DepartmentHealthCard[] = [
    {
      label: 'تم البيع والربط',
      value: formatCount(soldTotal),
      bg: 'bg-[#EAF6ED]',
      border: 'border-[#34A85320]',
      labelColor: 'text-[#34A853]',
      valueColor: 'text-[#155724]',
      icon: 'check_circle',
      iconColor: 'text-[#34A853]',
    },
    {
      label: 'قيد الانتظار',
      value: formatCount(pending),
      bg: 'bg-[#FFF4E5]',
      border: 'border-[#FF980020]',
      labelColor: 'text-[#FF9800]',
      valueColor: 'text-[#663C00]',
      icon: 'pending_actions',
      iconColor: 'text-[#FF9800]',
    },
    {
      label: 'محجوز / قيد النقل',
      value: formatCount(reservedTotal),
      bg: 'bg-[#FDECEA]',
      border: 'border-[#D32F2F20]',
      labelColor: 'text-[#D32F2F]',
      valueColor: 'text-[#5F1919]',
      icon: 'build',
      iconColor: 'text-[#D32F2F]',
    },
    {
      label: 'متاح في الفروع',
      value: formatCount(branchAvailable),
      bg: 'bg-[#E3F2FD]',
      border: 'border-[#1976D220]',
      labelColor: 'text-[#1976D2]',
      valueColor: 'text-[#0D47A1]',
      icon: 'storefront',
      iconColor: 'text-[#1976D2]',
    },
  ]

  const inventoryByBranch = new Map(
    branchInventory
      .filter((row) => row.branch_id != null)
      .map((row) => [row.branch_id!, row]),
  )

  const branchChartData: BranchStockChartRow[] = branches.map((branch) => {
    const row = inventoryByBranch.get(branch.id)
    const quantity = row?.quantity ?? 0
    const sold = row?.sold ?? 0
    const reserved = row?.reserved ?? 0

    return {
      name: branch.name_ar || branch.name,
      sold,
      available: Math.max(0, quantity - sold - reserved),
      reserved,
    }
  })

  const deviceRows = branches.map((branch) => ({
    code: branch.code,
    model: branch.name_ar || branch.name,
    client: branch.address || '—',
    branchId: branch.id,
  }))

  return {
    kpis,
    healthCards,
    branchChartData,
    deviceRows,
    completionRate: distributionRate,
    totalDevices: totalStock,
  }
}
