import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { AccessoryWarehouseStock, GpsStock } from '../api/types'
import { useAuthStore } from '../stores/authStore'

interface TickerItem {
  key: string
  label: string
  value: number
}

function accessoryAvailable(row: AccessoryWarehouseStock): number {
  if (typeof row.available === 'number') return row.available
  return Math.max(0, (row.quantity ?? 0) - (row.reserved ?? 0))
}

function accessoryName(row: AccessoryWarehouseStock): string {
  return row.product_model?.name_ar || row.product_model?.name || `إكسسوار #${row.product_model_id}`
}

function TickerTrack({ items, hidden }: { items: TickerItem[]; hidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-6 px-6" aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <span key={item.key} className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap text-xs">
          <span className="text-on-surface-variant">{item.label}</span>
          <span className="tabular-nums font-bold text-on-surface">{item.value}</span>
        </span>
      ))}
    </div>
  )
}

export function BranchStockTickerBar() {
  const warehouseId = useAuthStore((s) => s.warehouseId)

  const gpsQuery = useQuery({
    queryKey: ['gps-stock', 'ticker', warehouseId],
    queryFn: async () => {
      const { data } = await api.get<GpsStock>('/gps-stock', {
        params: { 'filter[warehouse_id]': warehouseId },
      })
      return data
    },
    enabled: Boolean(warehouseId),
  })

  const accessoriesQuery = useQuery({
    queryKey: ['accessories', 'stocks', 'ticker', warehouseId],
    queryFn: async () => {
      const { data } = await api.get<{ data: AccessoryWarehouseStock[] }>('/accessories/stocks', {
        params: { warehouse_id: warehouseId },
      })
      return data.data ?? []
    },
    enabled: Boolean(warehouseId),
  })

  const items = useMemo<TickerItem[]>(() => {
    if (!gpsQuery.data && !accessoriesQuery.data) return []

    const next: TickerItem[] = [
      {
        key: 'gps-available',
        label: 'أجهزة متاحة للبيع',
        value: gpsQuery.data?.available ?? 0,
      },
    ]

    const accessories = [...(accessoriesQuery.data ?? [])].sort((a, b) =>
      accessoryName(a).localeCompare(accessoryName(b), 'ar'),
    )

    for (const row of accessories) {
      next.push({
        key: `accessory-${row.product_model_id}`,
        label: accessoryName(row),
        value: accessoryAvailable(row),
      })
    }

    return next
  }, [gpsQuery.data, accessoriesQuery.data])

  if (!warehouseId) return null
  if (gpsQuery.isLoading || accessoriesQuery.isLoading) return null
  if (gpsQuery.isError || accessoriesQuery.isError) return null
  if (items.length === 0) return null

  const durationSec = Math.max(20, items.length * 4)

  return (
    <div className="overflow-hidden border-b border-outline-variant bg-surface-container-low print:hidden">
      <div
        className="stock-ticker-track flex w-max hover:[animation-play-state:paused]"
        style={{ animationDuration: `${durationSec}s` }}
      >
        <TickerTrack items={items} />
        <TickerTrack items={items} hidden />
      </div>
    </div>
  )
}
