import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { Icon } from '../components/Icon'
import { Pagination } from '../components/Pagination'
import { SalesPageShell } from '../components/SalesPageShell'
import { StartTourButton } from '../components/tour/StartTourButton'
import { StatusBadge } from '../components/StatusBadge'
import { usePageTour } from '../hooks/usePageTour'
import {
  type ApiPaginated,
  formatInvoiceDate,
  distributorLabel,
  invoiceStatusLabels,
  contractPrintPath,
  invoiceStatusOptions,
  paginatedMeta,
  paymentStatusOptions,
  paymentTermOptions,
} from '../lib/sales'
import { useAuthStore } from '../stores/authStore'

export function InvoicesPage() {
  usePageTour('invoices')
  const branchId = useAuthStore((s) => s.branchId)
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('')
  const [paymentTermFilter, setPaymentTermFilter] = useState('')
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [page, setPage] = useState(1)

  const query = useQuery({
    queryKey: [
      'sales-invoices',
      'all',
      branchId,
      statusFilter,
      paymentStatusFilter,
      paymentTermFilter,
      invoiceSearch,
      page,
    ],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        per_page: 25,
        page,
        include: 'customer,distributor',
        'filter[branch_id]': branchId ?? 0,
      }
      if (statusFilter) params['filter[status]'] = statusFilter
      if (paymentStatusFilter) params['filter[payment_status]'] = paymentStatusFilter
      if (paymentTermFilter) params['filter[payment_term]'] = paymentTermFilter
      if (invoiceSearch.trim()) params['filter[invoice_number]'] = invoiceSearch.trim()

      const { data } = await api.get<ApiPaginated<SalesInvoice>>('/sales-invoices', { params })
      return data
    },
    enabled: Boolean(branchId),
  })

  const meta = query.data ? paginatedMeta(query.data) : null
  const rows = query.data?.data ?? []
  const hasFilters = Boolean(statusFilter || paymentStatusFilter || paymentTermFilter || invoiceSearch)

  const clearFilters = () => {
    setStatusFilter('')
    setPaymentStatusFilter('')
    setPaymentTermFilter('')
    setInvoiceSearch('')
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
        options: invoiceStatusOptions.map((o) => ({ value: o.value, label: o.label })),
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
      {
        id: 'payment_term',
        label: 'نوع الدفع',
        value: paymentTermFilter,
        onChange: (value: string) => {
          setPaymentTermFilter(value)
          setPage(1)
        },
        options: paymentTermOptions.map((o) => ({ value: o.value, label: o.label })),
      },
    ],
    [statusFilter, paymentStatusFilter, paymentTermFilter],
  )

  return (
    <SalesPageShell
      title="كل الفواتير"
      subtitle="عرض وتصفية جميع فواتير المبيعات"
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
          search={invoiceSearch}
          onSearchChange={(value) => {
            setInvoiceSearch(value)
            setPage(1)
          }}
          searchPlaceholder="بحث برقم الفاتورة..."
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
        <DataTable<SalesInvoice & Record<string, unknown>>
          dataTour="invoices-table"
          data={rows as (SalesInvoice & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          emptyMessage={hasFilters ? 'لا توجد فواتير مطابقة' : 'لا توجد فواتير'}
          columns={[
            { key: 'invoice_number', header: 'رقم الفاتورة' },
            {
              key: 'invoice_date',
              header: 'التاريخ',
              render: (row) => formatInvoiceDate(String(row.invoice_date)),
            },
            {
              key: 'customer',
              header: 'العميل',
              render: (row) => row.customer?.name ?? '—',
            },
            {
              key: 'distributor',
              header: 'الموزع',
              render: (row) => distributorLabel(row.distributor),
            },
            {
              key: 'total',
              header: 'الإجمالي',
              render: (row) => `${Number(row.total).toLocaleString('ar-EG')} ج.م`,
            },
            {
              key: 'payment_term',
              header: 'الدفع',
              render: (row) => (row.payment_term === 'installment' ? 'تقسيط' : 'نقدي'),
            },
            {
              key: 'status',
              header: 'حالة المراجعة',
              headerDataTour: 'invoices-status',
              render: (row) => (
                <StatusBadge
                  status={String(row.status ?? 'confirmed')}
                  label={invoiceStatusLabels[String(row.status)] ?? String(row.status)}
                />
              ),
            },
            {
              key: 'payment_status',
              header: 'السداد',
              render: (row) => <StatusBadge status={String(row.payment_status)} />,
            },
            {
              key: 'actions',
              header: '',
              headerDataTour: 'invoices-actions',
              render: (row) => (
                <Link
                  to={contractPrintPath(row.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Icon name="print" size={18} />
                  طباعة
                </Link>
              ),
            },
          ]}
        />
        {meta && meta.last_page > 1 && (
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
