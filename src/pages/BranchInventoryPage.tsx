import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { ProductUnit } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { CustodyVoucherModal } from '../components/inventory/CustodyVoucherModal'
import { SalesPageShell } from '../components/SalesPageShell'
import { useAuthStore } from '../stores/authStore'

const BUCKET_LABELS: Record<string, string> = {
  new: 'جديدة',
  custody_customer: 'عهدة — أجهزة عملاء',
  custody_software: 'عهدة — سوفت',
  custody_maintenance: 'عهدة — صيانة',
  custody_branch_tracking: 'عهدة — متابعة فرع',
}

interface BranchInventoryResponse {
  units: ProductUnit[]
  grouped: {
    new: ProductUnit[]
    by_bucket: Record<string, ProductUnit[]>
  }
}

export function BranchInventoryPage() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [voucherOpen, setVoucherOpen] = useState(false)
  const [voucherMode, setVoucherMode] = useState<'receive' | 'issue'>('receive')

  const query = useQuery({
    queryKey: ['branch-inventory', user?.branch_id],
    queryFn: async () => {
      const params: Record<string, number> = {}
      if (user?.branch_id) params.branch_id = user.branch_id
      const { data } = await api.get<BranchInventoryResponse>('/inventory/branch', { params })
      return data
    },
    enabled: Boolean(user),
  })

  const units = query.data?.units ?? []
  const byBucket = query.data?.grouped?.by_bucket ?? {}

  return (
    <SalesPageShell
      title="مخزون الفرع"
      subtitle="جديدة · عهدة · حسب الموظف"
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg border border-outline-variant px-3 py-2 text-sm"
            onClick={() => {
              setVoucherMode('receive')
              setVoucherOpen(true)
            }}
          >
            إذن استلام
          </button>
          <button
            type="button"
            className="rounded-lg bg-primary px-3 py-2 text-sm text-on-primary"
            onClick={() => {
              setVoucherMode('issue')
              setVoucherOpen(true)
            }}
          >
            إذن صرف عهدة
          </button>
        </div>
      }
    >
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <div className="space-y-6">
          {Object.entries(byBucket).length === 0 && (
            <p className="text-sm text-on-surface-variant">لا توجد وحدات مصنّفة في مخزون الفرع بعد.</p>
          )}
          {Object.entries(byBucket).map(([bucket, bucketUnits]) => (
            <section key={bucket} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
              <h2 className="mb-3 font-semibold">{BUCKET_LABELS[bucket] ?? bucket}</h2>
              <ul className="space-y-2 text-sm">
                {bucketUnits.map((unit) => (
                  <li key={unit.id} className="flex justify-between border-b border-outline-variant/40 py-1">
                    <span>{unit.serial_number ?? unit.imei ?? `#${unit.id}`}</span>
                    <span className="text-on-surface-variant">
                      {unit.custody_employee?.name ?? unit.state}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </AsyncState>

      <CustodyVoucherModal
        open={voucherOpen}
        mode={voucherMode}
        branchId={user?.branch_id}
        onClose={() => setVoucherOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['branch-inventory'] })
          setVoucherOpen(false)
        }}
      />
    </SalesPageShell>
  )
}
