import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import {
  buildContractListColumns,
  contractDateFilterParams,
  contractReviewRowClass,
  defaultContractListActions,
  filterContractListRows,
} from '../components/contracts/contractListTable'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { Icon } from '../components/Icon'
import { Pagination } from '../components/Pagination'
import { SalesPageShell } from '../components/SalesPageShell'
import { StartTourButton } from '../components/tour/StartTourButton'
import { usePageTour } from '../hooks/usePageTour'
import {
  type ApiPaginated,
  paginatedMeta,
  paymentStatusOptions,
  reviewStatusOptions,
} from '../lib/sales'
import { getListScopeQueryKey, mergeScopedListParams } from '../lib/dataScope'
import { useAuthStore } from '../stores/authStore'

export function InvoicesPage() {
  usePageTour('invoices')
  const user = useAuthStore((s) => s.user)
  const listScopeKey = getListScopeQueryKey(user)
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('')
  const [contractSearch, setContractSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const query = useQuery({
    queryKey: [
      'sales-invoices',
      'all',
      listScopeKey,
      statusFilter,
      paymentStatusFilter,
      dateFrom,
      dateTo,
      page,
    ],
    queryFn: async () => {
      const params = mergeScopedListParams(user, {
        per_page: 25,
        page,
        include: 'customer,distributor,branch,lines',
        ...contractDateFilterParams(dateFrom, dateTo),
      })
      if (statusFilter) params['filter[review_status]'] = statusFilter
      if (paymentStatusFilter) params['filter[payment_status]'] = paymentStatusFilter

      const { data } = await api.get<ApiPaginated<SalesInvoice>>('/sales-invoices', { params })
      return data
    },
    enabled: Boolean(user),
  })

  const meta = query.data ? paginatedMeta(query.data) : null
  const rows = query.data?.data ?? []
  const displayRows = useMemo(
    () => filterContractListRows(rows, contractSearch),
    [rows, contractSearch],
  )
  const hasFilters = Boolean(
    statusFilter || paymentStatusFilter || contractSearch || dateFrom || dateTo,
  )

  const clearFilters = () => {
    setStatusFilter('')
    setPaymentStatusFilter('')
    setContractSearch('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const filterSelects = useMemo(
    () => [
      {
        id: 'status',
        label: 'حالة المراجعة',
        value: statusFilter,
        onChange: (value: string) => {
          setStatusFilter(value)
          setPage(1)
        },
        options: reviewStatusOptions.map((o) => ({ value: o.value, label: o.label })),
      },
      {
        id: 'payment_status',
        label: 'حالة السداد',
        value: paymentStatusFilter,
        onChange: (value: string) => {
          setPaymentStatusFilter(value)
          setPage(1)
        },
        options: paymentStatusOptions.map((o) => ({ value: o.value, label: o.label })),
      },
    ],
    [statusFilter, paymentStatusFilter],
  )

  const columns = useMemo(
    () =>
      buildContractListColumns({
        renderActions: defaultContractListActions,
      }),
    [],
  )

  return (
    <SalesPageShell
      title="كل التعاقدات"
      subtitle="عرض وتصفية جميع تعاقدات المبيعات"
      actions={
        <>
          <StartTourButton tourId="invoices" />
          <Link
            to="/pos"
            data-tour="invoices-create"
            className="inline-flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
          >
            <Icon name="add" size={18} />
            تعاقد جديد
          </Link>
        </>
      }
      filters={
        <FilterBar
          dataTour="invoices-filters"
          search={contractSearch}
          onSearchChange={setContractSearch}
          searchPlaceholder="بحث باسم العميل أو رقم الهاتف أو الموزع..."
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={(value) => {
            setDateFrom(value)
            setPage(1)
          }}
          onDateToChange={(value) => {
            setDateTo(value)
            setPage(1)
          }}
          dateFromLabel="من تاريخ التعاقد"
          dateToLabel="إلى تاريخ التعاقد"
          selects={filterSelects}
          showClear={hasFilters}
          onClear={clearFilters}
        />
      }
    >
      <div data-tour="invoices-results">
        <AsyncState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
        >
          <div className="overflow-x-auto">
            <DataTable<SalesInvoice & Record<string, unknown>>
              dataTour="invoices-table"
              data={displayRows as (SalesInvoice & Record<string, unknown>)[]}
              keyExtractor={(row) => row.id}
              striped={false}
              rowClassName={(row) => contractReviewRowClass(row.review_status)}
              emptyMessage={hasFilters ? 'لا توجد تعاقدات مطابقة' : 'لا توجد تعاقدات'}
              columns={columns}
            />
          </div>
          {meta && (
            <Pagination
              currentPage={meta.current_page}
              lastPage={meta.last_page}
              total={meta.total}
              onPageChange={setPage}
            />
          )}
        </AsyncState>
      </div>
    </SalesPageShell>
  )
}
