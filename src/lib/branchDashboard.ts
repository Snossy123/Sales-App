import type { Branch, GpsStock } from '../api/types'
import { formatMoney } from './theme'

export interface BranchKpi {
  label: string
  value: string
  trendIcon: string
  trendText: string
  trendColor: string
  iconFilled?: boolean
}

export interface BranchProduct {
  sku: string
  name: string
  category: string
  price: string
  stock: number
  sold: number
  status: 'available' | 'low' | 'unavailable'
  statusLabel: string
}

export interface BranchViewModel {
  id: number
  code: string
  name: string
  status: string
  statusColor: string
  address: string
  phone: string
  administrationName: string
  kpis: BranchKpi[]
  products: BranchProduct[]
}

export interface BranchDashboardOptions {
  currency?: string
  locale?: string
}

function formatCount(value: number): string {
  return value.toLocaleString('ar-EG')
}

export function getStatusBadgeClass(status: BranchProduct['status']): string {
  if (status === 'low') return 'bg-[#FFF4E5] text-[#B76E00]'
  if (status === 'unavailable') return 'bg-error-container text-error'
  return 'bg-[#EAF6ED] text-[#34A853]'
}

function productStatus(available: number): Pick<BranchProduct, 'status' | 'statusLabel'> {
  if (available <= 0) return { status: 'unavailable', statusLabel: 'غير متوفر' }
  if (available <= 5) return { status: 'low', statusLabel: 'منخفض' }
  return { status: 'available', statusLabel: 'متوفر' }
}

export function getBranchWarehouseId(branch: Branch): number | null {
  const warehouses = branch.warehouses ?? []
  const branchWarehouse = warehouses.find((warehouse) => !warehouse.is_central) ?? warehouses[0]
  return branchWarehouse?.id ?? null
}

export function buildBranchDashboard(
  branch: Branch,
  stock: GpsStock | null,
  options: BranchDashboardOptions = {},
): BranchViewModel {
  const currency = options.currency ?? 'EGP'
  const locale = options.locale ?? 'ar-EG'
  const available = stock?.available ?? 0
  const reserved = stock?.reserved ?? 0
  const sold = stock?.sold ?? 0
  const quantity = stock?.quantity ?? 0
  const product = stock?.product
  const isActive = branch.is_active !== false
  const administrationName =
    branch.administration?.name_ar ||
    branch.administration?.name ||
    branch.department?.name_ar ||
    branch.department?.name ||
    '—'

  const kpis: BranchKpi[] = [
    {
      label: 'إجمالي المخزون',
      value: formatCount(quantity),
      trendIcon: 'inventory',
      trendText: quantity > 0 ? 'جميع حالات المخزون' : 'لا يوجد مخزون',
      trendColor: 'text-primary',
    },
    {
      label: 'متاح للبيع',
      value: formatCount(available),
      trendIcon: 'storefront',
      trendText: available > 0 ? 'جاهز للبيع' : 'لا توجد وحدات متاحة',
      trendColor: available > 0 ? 'text-[#34A853]' : 'text-on-surface-variant',
    },
    {
      label: 'مباع',
      value: formatCount(sold),
      trendIcon: sold > 0 ? 'check_circle' : 'sell',
      trendText: sold > 0 ? 'وحدات مباعة' : 'لا توجد مبيعات',
      trendColor: sold > 0 ? 'text-[#34A853]' : 'text-on-surface-variant',
      iconFilled: sold > 0,
    },
    {
      label: 'محجوز / قيد النقل',
      value: formatCount(reserved),
      trendIcon: 'build',
      trendText: reserved > 0 ? 'تحت المعالجة' : 'لا يوجد',
      trendColor: reserved > 0 ? 'text-[#B76E00]' : 'text-on-surface-variant',
    },
  ]

  const products: BranchProduct[] = product
    ? [
        {
          sku: product.model_code ?? `GPS-${branch.code}`,
          name: product.name_ar || product.name,
          category: 'أجهزة GPS',
          price: formatMoney(product.sell_price, currency, locale),
          stock: available,
          sold,
          ...productStatus(available),
        },
      ]
    : []

  return {
    id: branch.id,
    code: branch.code,
    name: branch.name_ar || branch.name,
    status: isActive ? 'قيد التشغيل' : 'موقوف',
    statusColor: isActive ? 'bg-[#EAF6ED] text-[#34A853]' : 'bg-error-container text-error',
    address: branch.address || '—',
    phone: branch.phone || '—',
    administrationName,
    kpis,
    products,
  }
}
