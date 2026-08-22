import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { api } from '../../../api/client'
import type { AccessoryPackage, GpsProduct, PaginatedResponse, ProductModel, Service } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { FilterBar } from '../../../components/FilterBar'
import { SalesPageShell } from '../../../components/SalesPageShell'
import { formatNumber } from '../../../lib/format'
import { resolveGpsUnitPrice } from '../../../lib/gpsProductPricing'
import type { ApiPaginated } from '../../../lib/sales'
import { serviceCategoryLabel } from '../../../lib/services'

type CatalogSection = 'all' | 'devices' | 'services' | 'accessories'

const SECTION_FILTERS: { id: CatalogSection; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'devices', label: 'الأجهزة' },
  { id: 'services', label: 'الخدمات' },
  { id: 'accessories', label: 'الإكسسوارات' },
]

function formatPrice(value: number | string | null | undefined): string {
  return `${formatNumber(value)} ج.م`
}

function matchesSearch(haystack: Array<string | null | undefined>, query: string): boolean {
  if (!query) return true
  const q = query.trim().toLowerCase()
  return haystack.some((part) => (part ?? '').toLowerCase().includes(q))
}

function gpsPrice(product: GpsProduct, ctx: Parameters<typeof resolveGpsUnitPrice>[1]): string {
  return formatPrice(resolveGpsUnitPrice(product, ctx))
}

export function PricingCatalogPage() {
  const [search, setSearch] = useState('')
  const [section, setSection] = useState<CatalogSection>('all')

  const productQuery = useQuery({
    queryKey: ['gps-product'],
    queryFn: async () => {
      try {
        const { data } = await api.get<GpsProduct>('/gps-product')
        return data
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return null
        }
        throw error
      }
    },
  })

  const servicesQuery = useQuery({
    queryKey: ['services', 'price-guide'],
    queryFn: async () => {
      const { data } = await api.get<ApiPaginated<Service>>('/services', {
        params: { per_page: 100, 'filter[is_active]': '1' },
      })
      return data.data ?? []
    },
  })

  const accessoriesQuery = useQuery({
    queryKey: ['accessories', 'price-guide'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ProductModel>>('/accessories', {
        params: { per_page: 100, 'filter[is_active]': 1 },
      })
      return data.data ?? []
    },
  })

  const packagesQuery = useQuery({
    queryKey: ['accessory-packages', 'price-guide'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<AccessoryPackage>>('/accessory-packages', {
        params: { per_page: 100, 'filter[is_active]': 1 },
      })
      return data.data ?? []
    },
  })

  const product = productQuery.data ?? null
  const query = search.trim()

  const deviceVisible = useMemo(() => {
    if (section !== 'all' && section !== 'devices') return false
    if (!product) return section === 'devices' || !query
    return matchesSearch([product.name_ar, product.name, product.brand, 'جهاز', 'gps'], query)
  }, [product, query, section])

  const services = useMemo(() => {
    const rows = (servicesQuery.data ?? []).filter((row) => row.is_active)
    if (!query) return rows
    return rows.filter((row) =>
      matchesSearch([row.name_ar, row.name, row.code, serviceCategoryLabel(row.category)], query),
    )
  }, [query, servicesQuery.data])

  const accessories = useMemo(() => {
    const rows = (accessoriesQuery.data ?? []).filter((row) => row.is_active !== false)
    if (!query) return rows
    return rows.filter((row) => matchesSearch([row.name_ar, row.name, row.brand, row.model_code], query))
  }, [accessoriesQuery.data, query])

  const packages = useMemo(() => {
    const rows = (packagesQuery.data ?? []).filter((row) => row.is_active)
    if (!query) return rows
    return rows.filter((row) => matchesSearch([row.name_ar, row.name], query))
  }, [packagesQuery.data, query])

  const showDevices = section === 'all' || section === 'devices'
  const showServices = section === 'all' || section === 'services'
  const showAccessories = section === 'all' || section === 'accessories'

  const hasFilters = Boolean(query || section !== 'all')
  const isLoading =
    productQuery.isLoading || servicesQuery.isLoading || accessoriesQuery.isLoading || packagesQuery.isLoading
  const firstError = productQuery.error ?? servicesQuery.error ?? accessoriesQuery.error ?? packagesQuery.error
  const isError =
    productQuery.isError || servicesQuery.isError || accessoriesQuery.isError || packagesQuery.isError

  const accessoriesEmpty = accessories.length === 0 && packages.length === 0
  const hasVisibleResults =
    (showDevices && deviceVisible && Boolean(product)) ||
    (showServices && services.length > 0) ||
    (showAccessories && !accessoriesEmpty)
  const showDevicePlaceholder = showDevices && deviceVisible && !product && !query
  const showSearchEmpty = Boolean(query) && !hasVisibleResults && !showDevicePlaceholder

  return (
    <SalesPageShell
      title="دليل الأسعار"
      subtitle="تسعير الأجهزة والخدمات والإكسسوارات"
      filters={
        <div>
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="بحث بالاسم..."
            showClear={hasFilters}
            onClear={() => {
              setSearch('')
              setSection('all')
            }}
          />
          <div className="mb-md flex flex-wrap gap-sm" role="tablist" aria-label="أقسام الدليل">
            {SECTION_FILTERS.map((item) => {
              const active = section === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSection(item.id)}
                  className={
                    active
                      ? 'rounded-lg bg-primary px-md py-sm text-sm font-medium text-on-primary'
                      : 'rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-sm text-on-surface-variant'
                  }
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      }
    >
      <AsyncState isLoading={isLoading} isError={isError} error={firstError}>
        <div className="space-y-md">
          {showDevices && deviceVisible && (product || showDevicePlaceholder) && (
            <section className="space-y-sm">
              <h2 className="text-base font-bold text-on-surface">الأجهزة</h2>
              {product ? (
                <DevicePriceGuide product={product} />
              ) : (
                <p className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg text-center text-on-surface-variant">
                  لم يُضبط تسعير جهاز GPS بعد
                </p>
              )}
            </section>
          )}

          {showServices && (services.length > 0 || !query) && (
            <section className="space-y-sm">
              <h2 className="text-base font-bold text-on-surface">الخدمات</h2>
              <DataTable<Service & Record<string, unknown>>
                data={services as (Service & Record<string, unknown>)[]}
                keyExtractor={(row) => row.id}
                pageSize={15}
                pageKey={query}
                emptyMessage={query ? 'لا توجد خدمات مطابقة' : 'لا توجد خدمات مفعّلة'}
                columns={[
                  {
                    key: 'name',
                    header: 'الخدمة',
                    render: (row) => row.name_ar || row.name,
                  },
                  {
                    key: 'category',
                    header: 'التصنيف',
                    render: (row) => serviceCategoryLabel(row.category),
                  },
                  {
                    key: 'cash_price',
                    header: 'كاش',
                    className: 'tabular-nums',
                    render: (row) => formatPrice(row.cash_price ?? row.default_price),
                  },
                  {
                    key: 'installment_price',
                    header: 'تقسيط',
                    className: 'tabular-nums',
                    render: (row) => formatPrice(row.installment_price ?? row.default_price),
                  },
                ]}
              />
            </section>
          )}

          {showAccessories && (!accessoriesEmpty || !query) && (
            <section className="space-y-md">
              <h2 className="text-base font-bold text-on-surface">الإكسسوارات</h2>
              <DataTable<ProductModel & Record<string, unknown>>
                data={accessories as (ProductModel & Record<string, unknown>)[]}
                keyExtractor={(row) => row.id}
                pageSize={15}
                pageKey={query}
                emptyMessage={query ? 'لا توجد إكسسوارات مطابقة' : 'لا توجد إكسسوارات مفعّلة'}
                columns={[
                  {
                    key: 'name',
                    header: 'الصنف',
                    render: (row) => row.name_ar || row.name,
                  },
                  {
                    key: 'brand',
                    header: 'الماركة',
                    render: (row) => row.brand || '—',
                  },
                  {
                    key: 'sell_price',
                    header: 'سعر البيع',
                    className: 'tabular-nums',
                    render: (row) => formatPrice(row.sell_price),
                  },
                ]}
              />

              <h3 className="text-sm font-bold text-on-surface">الباكدجات</h3>
              <DataTable<AccessoryPackage & Record<string, unknown>>
                data={packages as (AccessoryPackage & Record<string, unknown>)[]}
                keyExtractor={(row) => row.id}
                pageSize={10}
                pageKey={query}
                emptyMessage={query ? 'لا توجد باكدجات مطابقة' : 'لا توجد باكدجات مفعّلة'}
                columns={[
                  {
                    key: 'name_ar',
                    header: 'الباكدج',
                    render: (row) => row.name_ar || row.name || '—',
                  },
                  {
                    key: 'sell_price',
                    header: 'سعر البيع',
                    className: 'tabular-nums',
                    render: (row) => formatPrice(row.sell_price),
                  },
                ]}
              />
            </section>
          )}

          {showSearchEmpty ? (
            <p className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg text-center text-on-surface-variant">
              لا توجد نتائج مطابقة
            </p>
          ) : null}
        </div>
      </AsyncState>
    </SalesPageShell>
  )
}

function DevicePriceGuide({ product }: { product: GpsProduct }) {
  const name = product.name_ar || product.name

  return (
    <div className="space-y-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
      <div>
        <p className="text-sm font-bold text-on-surface">{name}</p>
        {product.brand ? <p className="text-xs text-on-surface-variant">{product.brand}</p> : null}
      </div>

      <PriceGroup title="داخل الشركة — تعاقد جديد">
        <PriceRow label="كاش — اشتراك سنوي" value={gpsPrice(product, { contractKind: 'new_contract', paymentTerm: 'cash', renewalType: 'annual' })} />
        <PriceRow label="كاش — مدى الحياة" value={gpsPrice(product, { contractKind: 'new_contract', paymentTerm: 'cash', renewalType: 'permanent' })} />
        <PriceRow
          label="تقسيط — اشتراك سنوي"
          value={gpsPrice(product, { contractKind: 'new_contract', paymentTerm: 'installment', renewalType: 'annual' })}
        />
        <PriceRow
          label="تقسيط — مدى الحياة"
          value={gpsPrice(product, { contractKind: 'new_contract', paymentTerm: 'installment', renewalType: 'permanent' })}
        />
      </PriceGroup>

      <PriceGroup title="تجديد الاشتراك">
        <PriceRow
          label="تجديد سنوي"
          value={gpsPrice(product, { contractKind: 'subscription_renewal', paymentTerm: 'cash', renewalType: 'annual' })}
        />
        <PriceRow
          label="تجديد مدى الحياة"
          value={gpsPrice(product, { contractKind: 'subscription_renewal', paymentTerm: 'cash', renewalType: 'permanent' })}
        />
      </PriceGroup>

      <PriceGroup title="خارج الشركة — جهاز خارجي">
        <PriceRow
          label="كاش — اشتراك سنوي"
          value={gpsPrice(product, { contractKind: 'external_device', paymentTerm: 'cash', renewalType: 'annual' })}
        />
        <PriceRow
          label="كاش — مدى الحياة"
          value={gpsPrice(product, { contractKind: 'external_device', paymentTerm: 'cash', renewalType: 'permanent' })}
        />
        <PriceRow
          label="تقسيط — اشتراك سنوي"
          value={gpsPrice(product, { contractKind: 'external_device', paymentTerm: 'installment', renewalType: 'annual' })}
        />
        <PriceRow
          label="تقسيط — مدى الحياة"
          value={gpsPrice(product, { contractKind: 'external_device', paymentTerm: 'installment', renewalType: 'permanent' })}
        />
      </PriceGroup>
    </div>
  )
}

function PriceGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-sm rounded-lg border border-outline-variant/70 bg-surface-container-low/40 p-sm">
      <h3 className="text-sm font-bold text-on-surface">{title}</h3>
      <dl className="grid gap-sm sm:grid-cols-2">{children}</dl>
    </div>
  )
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-container-lowest px-sm py-sm">
      <dt className="text-xs text-on-surface-variant">{label}</dt>
      <dd className="text-sm font-bold tabular-nums text-on-surface">{value}</dd>
    </div>
  )
}
