import type { Branch, Department } from '../api/types'
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

export interface ChartLegendItem {
  color: string
  label: string
}

export interface DepartmentDashboardData {
  kpis: DepartmentKpi[]
  healthCards: DepartmentHealthCard[]
  chartLegend: ChartLegendItem[]
  deviceRows: (GpsDeviceRow & { branchId?: number })[]
  completionRate: number
  tooltipText: string
  totalDevices: number
}

export function buildDepartmentDashboard(dept: Department, branches: Branch[]): DepartmentDashboardData {
  const stock = dept.department_stock
  const quantity = stock?.quantity ?? 0
  const pending = stock?.pending ?? 0
  const distributed = stock?.distributed ?? 0
  const total = quantity + pending + distributed
  const soldEstimate = Math.max(distributed, Math.round(total * 0.55))
  const salesK = ((soldEstimate * 500) / 1000).toFixed(1)

  const kpis: DepartmentKpi[] = [
    {
      label: 'إجمالي أجهزة GPS المباعة',
      value: soldEstimate.toLocaleString('ar-EG'),
      trendIcon: 'trending_up',
      trendText: `+${Math.max(1, Math.round(soldEstimate * 0.05))} وحدة مؤخراً`,
      trendColor: 'text-[#34A853]',
    },
    {
      label: 'إجمالي مبيعات GPS',
      value: `${salesK} ألف دولار`,
      trendIcon: 'trending_up',
      trendText: '+12.4% نمو',
      trendColor: 'text-[#34A853]',
    },
    {
      label: 'أجهزة GPS المتاحة للبيع',
      value: quantity.toLocaleString('ar-EG'),
      trendIcon: 'storefront',
      trendText: 'جاهز للتوزيع',
      trendColor: 'text-on-surface-variant',
    },
    {
      label: 'إجمالي مخزون GPS',
      value: total.toLocaleString('ar-EG'),
      trendIcon: 'inventory',
      trendText: 'المخزون الكلي',
      trendColor: 'text-primary',
    },
  ]

  const healthCards: DepartmentHealthCard[] = [
    {
      label: 'تم البيع والربط',
      value: soldEstimate.toLocaleString('ar-EG'),
      bg: 'bg-[#EAF6ED]',
      border: 'border-[#34A85320]',
      labelColor: 'text-[#34A853]',
      valueColor: 'text-[#155724]',
      icon: 'check_circle',
      iconColor: 'text-[#34A853]',
    },
    {
      label: 'قيد الانتظار',
      value: pending.toLocaleString('ar-EG'),
      bg: 'bg-[#FFF4E5]',
      border: 'border-[#FF980020]',
      labelColor: 'text-[#FF9800]',
      valueColor: 'text-[#663C00]',
      icon: 'pending_actions',
      iconColor: 'text-[#FF9800]',
    },
    {
      label: 'تحت الصيانة',
      value: Math.max(1, Math.round(pending * 0.25)).toLocaleString('ar-EG'),
      bg: 'bg-[#FDECEA]',
      border: 'border-[#D32F2F20]',
      labelColor: 'text-[#D32F2F]',
      valueColor: 'text-[#5F1919]',
      icon: 'build',
      iconColor: 'text-[#D32F2F]',
    },
    {
      label: 'تحديث البرنامج',
      value: Math.max(1, Math.round(quantity * 0.08)).toLocaleString('ar-EG'),
      bg: 'bg-[#E3F2FD]',
      border: 'border-[#1976D220]',
      labelColor: 'text-[#1976D2]',
      valueColor: 'text-[#0D47A1]',
      icon: 'system_update',
      iconColor: 'text-[#1976D2]',
    },
  ]

  const legendColors = ['bg-primary', 'bg-tertiary', 'bg-secondary'] as const
  const chartLegend: ChartLegendItem[] = branches.length
    ? branches.map((b, i) => ({
        color: legendColors[i % legendColors.length],
        label: b.name_ar || b.name,
      }))
    : [{ color: 'bg-primary', label: dept.name_ar || dept.name }]

  const deviceRows = branches.map((b) => ({
    code: `GPS-${b.code}`,
    model: b.name_ar || b.name,
    client: b.address || '—',
    branchId: b.id,
  }))

  const completionRate = total > 0 ? Math.min(99, Math.round((distributed / total) * 100)) : 0

  return {
    kpis,
    healthCards,
    chartLegend,
    deviceRows,
    completionRate,
    tooltipText: `أكتوبر: ${Math.max(soldEstimate - 10, 1)} وحدة`,
    totalDevices: total,
  }
}
