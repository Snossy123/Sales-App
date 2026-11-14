import { useBranchFilterOptions } from '../hooks/useBranchFilterOptions'
import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import { Modal } from '../components/Modal'
import type { SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { ContractProblemWizard } from '../components/contracts/ContractProblemWizard'
import { ConvertCashToInstallmentModal } from '../components/contracts/ConvertCashToInstallmentModal'
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
import type { ContractProblemCaseType } from '../lib/contractCases'
import { useAuthStore } from '../stores/authStore'

export function InvoicesPage({ mine = false }: { mine?: boolean } = {}) {
  usePageTour('invoices')
  const branchOptions = useBranchFilterOptions()
  const [branchFilter, setBranchFilter] = useState('')
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [problemInvoice, setProblemInvoice] = useState<SalesInvoice | null>(null)
  const [problemCaseType, setProblemCaseType] = useState<ContractProblemCaseType | null>(null)
  const [convertInvoice, setConvertInvoice] = useState<SalesInvoice | null>(null)
  const [deleteInvoice, setDeleteInvoice] = useState<SalesInvoice | null>(null)
  const canDelete = Boolean(user?.roles?.some((role) => ['Admin', 'SuperAdmin'].includes(role.name)))
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/sales-invoices/${id}`),
    onSuccess: async () => {
      setDeleteInvoice(null)
      await queryClient.invalidateQueries()
    },
  })
  const resetDeleteMutation = deleteMutation.reset
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
      mine ? 'mine' : 'all',
      listScopeKey,
      statusFilter,
      paymentStatusFilter,
      branchFilter,
      dateFrom,
      dateTo,
      page,
    ],
    queryFn: async () => {
      const params = mergeScopedListParams(user, {
        per_page: 25,
        page,
        include: 'customer,distributor,branch,actionBranch,lines',
        ...contractDateFilterParams(dateFrom, dateTo),
      })
      if (branchFilter) params['filter[action_branch_id]'] = branchFilter
      if (mine) params['filter[mine]'] = '1'
      if (statusFilter) params['filter[review_status]'] = statusFilter
      if (paymentStatusFilter) params['filter[payment_status]'] = paymentStatusFilter

      const { data } = await api.get<ApiPaginated<SalesInvoice>>('/sales-invoices', { params })
      return data
    },
    enabled: Boolean(user),
  })

  const meta = query.data ? paginatedMeta(query.data) : null
  const displayRows = useMemo(
    () => filterContractListRows(query.data?.data ?? [], contractSearch),
    [query.data, contractSearch],
  )
  const hasFilters = Boolean(
    statusFilter || paymentStatusFilter || contractSearch || dateFrom || dateTo || branchFilter,
  )

  const clearFilters = () => {
    setBranchFilter('')
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
        id: 'action-branch',
        label: 'فرع تنفيذ البيع',
        value: branchFilter,
        options: branchOptions,
        onChange: (value: string) => { setBranchFilter(value); setPage(1) },
      },
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
    [statusFilter, paymentStatusFilter, branchFilter, branchOptions],
  )

  const columns = useMemo(
    () =>
      buildContractListColumns({
        renderActions: (row) =>
          defaultContractListActions(
            row,
            user,
            (invoice, caseType) => {
              setProblemInvoice(invoice)
              setProblemCaseType(caseType ?? null)
            },
            setConvertInvoice,
            canDelete ? (invoice) => { resetDeleteMutation(); setDeleteInvoice(invoice) } : undefined,
          ),
      }),
    [user, canDelete, resetDeleteMutation],
  )

  return (
    <SalesPageShell
      title={mine ? 'تعاقداتي' : 'كل التعاقدات'}
      subtitle={
        mine
          ? 'التعاقدات التي أنشأتها — يمكن التعديل قبل اعتماد المراجعة'
          : 'عرض وتصفية جميع تعاقدات المبيعات'
      }
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
          searchPlaceholder="بحث برقم التعاقد أو العميل أو الهاتف أو الموزع أو فرع التنفيذ..."
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
              emptyMessage={
                hasFilters
                  ? 'لا توجد تعاقدات مطابقة'
                  : mine
                    ? 'لا توجد تعاقدات أنشأتها بعد'
                    : 'لا توجد تعاقدات'
              }
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
      {problemInvoice && (
        <ContractProblemWizard
          invoice={problemInvoice}
          open
          initialCaseType={problemCaseType}
          onClose={() => {
            setProblemInvoice(null)
            setProblemCaseType(null)
          }}
          onComplete={() => {
            setProblemInvoice(null)
            setProblemCaseType(null)
            queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })
            queryClient.invalidateQueries({ queryKey: ['contract-cases'] })
          }}
        />
      )}
      <ConvertCashToInstallmentModal
        invoice={convertInvoice}
        open={Boolean(convertInvoice)}
        onClose={() => setConvertInvoice(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['sales-invoices'] })}
      />
      <Modal open={Boolean(deleteInvoice)} onClose={() => { if (!deleteMutation.isPending) setDeleteInvoice(null) }} title="حذف التعاقد وإلغاء معاملاته" size="sm">
        <p className="mb-md text-sm">سيتم حذف التعاقد {deleteInvoice?.invoice_number || `#${deleteInvoice?.id}`} وإلغاء مدفوعاته وأقساطه وقيوده وعمولاته ومهام الدعم، وإرجاع مخزونه. لا يمكن استعادة معاملاته من سلة المهملات.</p>
        {deleteMutation.isError && <p role="alert" className="mb-md text-sm text-error">{getErrorMessage(deleteMutation.error)}</p>}
        <div className="flex justify-end gap-sm">
          <button type="button" className="btn" disabled={deleteMutation.isPending} onClick={() => setDeleteInvoice(null)}>إلغاء</button>
          <button type="button" className="rounded-lg bg-error px-md py-sm text-sm font-bold text-on-error" disabled={deleteMutation.isPending} onClick={() => { if (deleteInvoice) deleteMutation.mutate(deleteInvoice.id) }}>{deleteMutation.isPending ? 'جارٍ الحذف...' : 'حذف وإلغاء المعاملات'}</button>
        </div>
      </Modal>
    </SalesPageShell>
  )
}
