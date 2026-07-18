import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { Customer, PaginatedResponse, ReferralNetworkNode } from '../../../api/types'
import { Icon } from '../../../components/Icon'
import { SearchableSelect } from '../../../components/SearchableSelect'
import { SalesPageShell } from '../../../components/SalesPageShell'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { ReferralNetworkTree } from '../components/ReferralNetworkTree'

export function CrmReferralNetworkPage() {
  const [rootSearch, setRootSearch] = useState('')
  const [rootCustomer, setRootCustomer] = useState<Customer | null>(null)
  const debouncedSearch = useDebouncedValue(rootSearch, 300)
  const searchTerm = debouncedSearch.trim()

  const customersQuery = useQuery({
    queryKey: ['customers', 'referral-network-root', searchTerm],
    queryFn: async () => {
      const params: Record<string, string | number> = { per_page: 20 }
      if (searchTerm) {
        params['filter[name]'] = searchTerm
      }
      const { data } = await api.get<PaginatedResponse<Customer>>('/customers', { params })
      return data.data
    },
  })

  const networkQuery = useQuery({
    queryKey: ['crm', 'referral-network', rootCustomer?.id ?? 'forest'],
    queryFn: async () => {
      const { data } = await api.get<{ data: ReferralNetworkNode[] }>('/crm/referral-network', {
        params: {
          root_customer_id: rootCustomer?.id,
          max_depth: 4,
        },
      })
      return data.data
    },
  })

  return (
    <SalesPageShell
      title="شبكة الإحالات"
      subtitle="شجرة المحيلين مع عدد الترشيحات ونسبة التحويل وإجمالي المبيعات"
      headerExtra={
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon name="account_tree" size={22} />
        </span>
      }
    >
      <div className="mx-auto max-w-4xl space-y-md">
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
          <div className="flex flex-col gap-sm sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <SearchableSelect
                label="جذر الشجرة (اختياري)"
                options={customersQuery.data ?? []}
                value={rootCustomer}
                onChange={setRootCustomer}
                onSearchChange={setRootSearch}
                getOptionValue={(c) => c.id}
                getOptionLabel={(c) => `${c.name} — ${c.phone}`}
                placeholder="اتركه فارغاً لعرض كل الجذور، أو ابحث عن عميل..."
                loading={customersQuery.isLoading}
                emptyMessage="لا يوجد عميل مطابق"
              />
            </div>
            {rootCustomer && (
              <button
                type="button"
                onClick={() => {
                  setRootCustomer(null)
                  setRootSearch('')
                }}
                className="rounded-lg border border-outline-variant px-md py-2 text-sm text-on-surface hover:bg-surface-container"
              >
                عرض كل الجذور
              </button>
            )}
          </div>
        </section>

        {networkQuery.isError && (
          <p className="text-sm text-error">{getErrorMessage(networkQuery.error)}</p>
        )}

        {networkQuery.isLoading ? (
          <p className="text-sm text-on-surface-variant">جاري تحميل الشبكة...</p>
        ) : (
          <ReferralNetworkTree nodes={networkQuery.data ?? []} />
        )}
      </div>
    </SalesPageShell>
  )
}
