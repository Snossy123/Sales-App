import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { CrmCallLog, PaginatedResponse, SalesInvoice } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { FilterBar } from '../components/FilterBar'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import {
  contractCaseStatusLabels,
  contractCaseTypeLabels,
} from '../lib/contractStatus'
import { Modal } from '../components/Modal'
import { CallLogFormModal } from '../modules/crm/components/CallLogFormModal'
import { formatDatetime12hDisplay } from '../lib/datetime12h'
import { formatInvoiceDate } from '../lib/sales'

interface CaseCallLog extends CrmCallLog {
  linked_to_case?: boolean
}

interface ContractCaseRow {
  id: number
  case_type: string
  status: string
  reason?: string | null
  notes?: string | null
  created_at?: string | null
  sales_invoice?: Pick<SalesInvoice, 'id' | 'invoice_number'> & {
    customer?: { id: number; name: string } | null
  }
}

const TYPE_OPTIONS = [
  { value: '', label: 'الكل' },
  ...Object.entries(contractCaseTypeLabels).map(([value, label]) => ({ value, label })),
]

const STATUS_OPTIONS = [
  { value: '', label: 'الكل' },
  ...Object.entries(contractCaseStatusLabels).map(([value, label]) => ({ value, label })),
]

const REVERTIBLE = new Set(['open', 'in_progress', 'completed'])

export function ContractCasesPage() {
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [callsCase, setCallsCase] = useState<ContractCaseRow | null>(null)
  const [savedNote, setSavedNote] = useState<string | null>(null)

  const revertMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/contract-cases/${id}/revert`)
    },
    onSuccess: async () => {
      setActionError(null)
      await queryClient.invalidateQueries({ queryKey: ['contract-cases'] })
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  })

  const callsQuery = useQuery({
    queryKey: ['contract-cases', callsCase?.id, 'call-logs'],
    queryFn: async () => {
      const { data } = await api.get<{ data: CaseCallLog[] }>(`/contract-cases/${callsCase?.id}/call-logs`)
      return data.data ?? []
    },
    enabled: Boolean(callsCase),
  })

  const query = useQuery({
    queryKey: ['contract-cases', 'list', typeFilter, statusFilter],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<ContractCaseRow>>('/contract-cases', {
        params: {
          per_page: 50,
          ...(typeFilter ? { case_type: typeFilter } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
        },
      })
      return data.data ?? []
    },
  })

  const rows = query.data ?? []

  return (
    <div>
      <PageHeader
        title="قسم المشاكل"
        subtitle="حالات الدعم والاسترجاع والاستبدال وإلغاء التعاقد"
      />

      <FilterBar
        selects={[
          {
            id: 'case-type',
            label: 'النوع',
            value: typeFilter,
            options: TYPE_OPTIONS,
            onChange: setTypeFilter,
          },
          {
            id: 'case-status',
            label: 'الحالة',
            value: statusFilter,
            options: STATUS_OPTIONS,
            onChange: setStatusFilter,
          },
        ]}
      />

      {actionError ? <p className="mb-sm text-sm text-error">{actionError}</p> : null}

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <DataTable<ContractCaseRow>
          data={rows}
          keyExtractor={(row) => row.id}
          pageSize={15}
          pageKey={`${typeFilter}-${statusFilter}`}
          emptyMessage="لا توجد مشاكل مسجّلة"
          columns={[
            {
              key: 'customer',
              header: 'العميل',
              render: (row) => row.sales_invoice?.customer?.name ?? '—',
            },
            {
              key: 'invoice',
              header: 'العقد',
              render: (row) => row.sales_invoice?.invoice_number ?? '—',
            },
            {
              key: 'case_type',
              header: 'النوع',
              render: (row) => contractCaseTypeLabels[row.case_type] ?? row.case_type,
            },
            {
              key: 'status',
              header: 'الحالة',
              render: (row) => (
                <StatusBadge
                  status={row.status}
                  label={contractCaseStatusLabels[row.status] ?? row.status}
                />
              ),
            },
            {
              key: 'reason',
              header: 'السبب',
              render: (row) => row.reason || row.notes || '—',
            },
            {
              key: 'created_at',
              header: 'التاريخ',
              render: (row) => (row.created_at ? formatInvoiceDate(row.created_at) : '—'),
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <div className="flex items-center gap-3">
                  {REVERTIBLE.has(row.status) ? (
                    <button
                      type="button"
                      className="text-sm text-error hover:underline disabled:opacity-50"
                      disabled={revertMutation.isPending}
                      onClick={() => {
                        const confirmed = window.confirm(
                          'هيترجع العقد نشط والجهاز للعميل، والحالة هتتلغى',
                        )
                        if (!confirmed) return
                        revertMutation.mutate(row.id)
                      }}
                    >
                      إرجاع الحالة
                    </button>
                  ) : null}
                  {row.sales_invoice?.id ? (
                    <Link
                      to={`/contracts/${row.sales_invoice.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      عرض العقد
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() => setCallsCase(row)}
                  >
                    المكالمات
                  </button>
                </div>
              ),
            },
          ]}
        />
      </AsyncState>

      <Modal
        open={Boolean(callsCase)}
        onClose={() => {
          setCallsCase(null)
          setSavedNote(null)
        }}
        title="مكالمات العميل"
        size="lg"
      >
        {callsCase ? (
          <div className="space-y-sm">
            <p className="text-sm text-on-surface-variant">
              {callsCase.sales_invoice?.invoice_number ?? ''}
            </p>
            {callsQuery.isLoading ? <p className="text-sm">جاري تحميل السجل…</p> : null}
            {callsQuery.isError ? <p className="text-sm text-error">{getErrorMessage(callsQuery.error)}</p> : null}
            <ul className="space-y-2">
              {(callsQuery.data ?? []).map((call) => (
                <li key={call.id} className="rounded-lg border border-outline-variant/70 px-sm py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span>{formatDatetime12hDisplay(call.start_time)}</span>
                    {call.linked_to_case ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">مرتبطة بالحالة</span>
                    ) : null}
                  </div>
                  <p className="mt-1">
                    {call.user?.name ?? call.mobile_name ?? '—'}
                    {call.mobile_number ? (
                      <>
                        {' '}
                        · <span dir="ltr">{call.mobile_number}</span>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-1 text-on-surface-variant">{call.statement || '—'}</p>
                </li>
              ))}
              {!callsQuery.isLoading && (callsQuery.data?.length ?? 0) === 0 ? (
                <li className="text-sm text-on-surface-variant">لا توجد مكالمات لهذا العميل.</li>
              ) : null}
            </ul>
            {savedNote ? <p className="text-sm text-primary">{savedNote}</p> : null}
            <CallLogFormModal
              open
              embedded
              onClose={() => undefined}
              lockedCustomerId={callsCase.sales_invoice?.customer?.id}
              lockedCaseId={callsCase.id}
              onSaved={async (message) => {
                setSavedNote(message)
                await queryClient.invalidateQueries({ queryKey: ['contract-cases', callsCase.id, 'call-logs'] })
              }}
            />
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
