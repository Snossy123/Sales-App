import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import {
  buildContractListColumns,
  contractDateFilterParams,
  contractReviewRowClass,
  filterContractListRows,
  reviewOnlyContractListActions,
  sortContractsByDateTime,
} from '../components/contracts/contractListTable'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { SalesPageShell } from '../components/SalesPageShell'
import { getListScopeQueryKey, mergeScopedListParams } from '../lib/dataScope'
import { useAuthStore } from '../stores/authStore'

export function InvoiceReviewPage() {
  const user = useAuthStore((s) => s.user)
  const listScopeKey = getListScopeQueryKey(user)
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const query = useQuery({
    queryKey: ['sales-invoices', 'review', listScopeKey, dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await api.get<{ data: SalesInvoice[] }>('/sales-invoices', {
        params: mergeScopedListParams(user, {
          per_page: 50,
          include: 'customer,distributor,branch,lines',
          'filter[review_status]': 'pending',
          ...contractDateFilterParams(dateFrom, dateTo),
        }),
      })
      return data.data
    },
    enabled: Boolean(user),
  })

  const filteredRows = useMemo(
    () => sortContractsByDateTime(filterContractListRows(query.data ?? [], invoiceSearch)),
    [query.data, invoiceSearch],
  )

  const hasFilters = Boolean(invoiceSearch || dateFrom || dateTo)

  const clearFilters = () => {
    setInvoiceSearch('')
    setDateFrom('')
    setDateTo('')
  }

  const columns = useMemo(
    () =>
      buildContractListColumns({
        renderActions: reviewOnlyContractListActions,
      }),
    [],
  )

  return (
    <SalesPageShell
      title="مراجعة التعاقدات"
      subtitle="اختر تعاقداً لمراجعة بياناته واعتماده أو رفضه"
      filters={
        <FilterBar
          search={invoiceSearch}
          onSearchChange={setInvoiceSearch}
          searchPlaceholder="بحث باسم العميل أو رقم الهاتف أو الموزع..."
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          dateFromLabel="من تاريخ التعاقد"
          dateToLabel="إلى تاريخ التعاقد"
          showClear={hasFilters}
          onClear={clearFilters}
        />
      }
    >
      <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
        <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
          <DataTable<SalesInvoice & Record<string, unknown>>
            data={filteredRows as (SalesInvoice & Record<string, unknown>)[]}
            keyExtractor={(row) => row.id}
            pageSize={10}
            striped={false}
            rowClassName={(row) => contractReviewRowClass(row.review_status)}
            emptyMessage={
              hasFilters ? 'لا توجد تعاقدات مطابقة' : 'لا توجد تعاقدات بانتظار المراجعة'
            }
            columns={columns}
          />
        </AsyncState>
      </div>
    </SalesPageShell>
  )
}
