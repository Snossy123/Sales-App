import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { Customer, PaginatedResponse, ReferralNetworkNode } from '../../../api/types'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { AsyncState } from '../../../components/AsyncState'
import {
  CRM_INPUT,
  CRM_PRIMARY_BTN,
  CRM_SECONDARY_BTN,
  CrmFilterPanel,
  CrmPageShell,
} from '../components/CrmPageShell'
import { ReferralNetworkTree } from '../components/ReferralNetworkTree'
import { downloadCsv } from '../lib/ownerReports'
import { referralStatusMeta } from '../lib/referralLeads'

function flattenNetwork(nodes: ReferralNetworkNode[], depth = 0): Array<Array<string | number>> {
  const rows: Array<Array<string | number>> = []
  for (const node of nodes) {
    rows.push([
      depth,
      node.kind === 'customer' ? 'عميل' : 'ترشيح',
      node.name,
      node.phone,
      node.metrics.referred_count,
      `${Math.round(node.metrics.conversion_rate * 100)}%`,
      node.metrics.total_sales || 0,
      node.status ? referralStatusMeta(node.status).label : '',
    ])
    if (node.children.length) {
      rows.push(...flattenNetwork(node.children, depth + 1))
    }
  }
  return rows
}

export function CrmReferralNetworkPage() {
  const [rootSearch, setRootSearch] = useState('')
  const [rootCustomer, setRootCustomer] = useState<Customer | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
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

  const nodes = networkQuery.data ?? []

  const searchValue = useMemo(() => {
    if (rootCustomer) return `${rootCustomer.name} — ${rootCustomer.phone}`
    return rootSearch
  }, [rootCustomer, rootSearch])

  const handleExport = () => {
    if (!nodes.length) return
    downloadCsv(
      'crm-referral-network.csv',
      ['المستوى', 'النوع', 'الاسم', 'الهاتف', 'أحال', 'تحويل', 'مبيعات', 'الحالة'],
      flattenNetwork(nodes),
    )
  }

  return (
    <CrmPageShell
      kicker="التحليلات"
      title="شبكة الإحالات"
      subtitle="من أحال من — مع عدد الترشيحات ونسبة التحويل وإجمالي المبيعات."
      actions={
        <>
          <button
            type="button"
            onClick={handleExport}
            disabled={!nodes.length}
            className={`${CRM_SECONDARY_BTN} disabled:opacity-50`}
          >
            تصدير
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!nodes.length}
            className={`${CRM_PRIMARY_BTN} disabled:opacity-50`}
          >
            تصدير الشجرة
          </button>
        </>
      }
      filters={
        <CrmFilterPanel>
          <div className="relative min-w-0 flex-1">
            <input
              type="search"
              value={searchValue}
              onChange={(e) => {
                setRootCustomer(null)
                setRootSearch(e.target.value)
                setPickerOpen(true)
              }}
              onFocus={() => setPickerOpen(true)}
              placeholder="ابحث عن عميل لبناء الشجرة من عنده…"
              className={`${CRM_INPUT} w-full`}
            />
            {pickerOpen && !rootCustomer ? (
              <div
                className="absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-56 overflow-auto"
                style={{
                  background: 'var(--crm-surface)',
                  border: '1px solid var(--crm-border)',
                  borderRadius: 'var(--crm-radius-md)',
                  boxShadow: 'var(--crm-shadow)',
                }}
              >
                {customersQuery.isLoading ? (
                  <p className="m-0 px-3.5 py-3 text-[12.5px]" style={{ color: 'var(--crm-text-faint)' }}>
                    جاري البحث…
                  </p>
                ) : (customersQuery.data ?? []).length === 0 ? (
                  <p className="m-0 px-3.5 py-3 text-[12.5px]" style={{ color: 'var(--crm-text-faint)' }}>
                    لا يوجد عميل مطابق
                  </p>
                ) : (
                  (customersQuery.data ?? []).map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      className="flex w-full flex-col gap-0.5 px-3.5 py-2.5 text-start transition-colors hover:[background:var(--crm-surface-muted)]"
                      onClick={() => {
                        setRootCustomer(customer)
                        setRootSearch('')
                        setPickerOpen(false)
                      }}
                    >
                      <span className="text-[13px] font-semibold">{customer.name}</span>
                      <span className="text-[11.5px] tabular-nums" dir="ltr" style={{ color: 'var(--crm-text-faint)' }}>
                        {customer.phone}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
          <span className="text-xs" style={{ color: 'var(--crm-text-faint)' }}>
            اضغط على المُحيل لعرض من جاء عن طريقه
          </span>
          {rootCustomer ? (
            <button
              type="button"
              onClick={() => {
                setRootCustomer(null)
                setRootSearch('')
                setPickerOpen(false)
              }}
              className={CRM_SECONDARY_BTN}
            >
              عرض كل الجذور
            </button>
          ) : null}
        </CrmFilterPanel>
      }
    >
      <AsyncState
        isLoading={networkQuery.isLoading}
        isError={networkQuery.isError}
        error={networkQuery.error}
      >
        <ReferralNetworkTree nodes={nodes} />
      </AsyncState>
    </CrmPageShell>
  )
}
