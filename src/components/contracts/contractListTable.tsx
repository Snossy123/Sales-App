import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { AuthUser, SalesInvoice } from '../../api/types'
import type { Column } from '../DataTable'
import { StatusBadge } from '../StatusBadge'
import { Icon } from '../Icon'
import {
  contractSourceLabel,
  contractSortTimestamp,
  fmtInvoiceContractDateTime,
  fmtContractMoney,
  invoiceContractSummary,
} from '../../lib/contractFields'
import { contractKindLabel } from '../../lib/contractKinds'
import { contractPrintPath, distributorLabel, reviewStatusForBadge, reviewStatusLabel } from '../../lib/sales'
import { userHasPermission } from '../../lib/access'
import {
  canExchangeContract,
  canRejectContract,
  canReturnContract,
  canTransferContractToProblems,
  type ContractProblemCaseType,
} from '../../lib/contractCases'
import { canEditContract, contractEditPath } from '../../lib/contractEdit'

export function contractReviewRowClass(reviewStatus?: string | null): string {
  if (reviewStatus === 'pending') return 'bg-error/20'
  if (reviewStatus === 'approved') return 'bg-secondary/25'
  return ''
}

interface ContractListColumnOptions {
  renderActions?: (row: SalesInvoice) => ReactNode
}

export function buildContractListColumns(
  options: ContractListColumnOptions = {},
): Column<SalesInvoice & Record<string, unknown>>[] {
  const columns: Column<SalesInvoice & Record<string, unknown>>[] = [
    {
      key: 'customer',
      header: 'العميل',
      render: (row) => (
        <div>
          <p className="font-medium">{row.customer?.name ?? '—'}</p>
          {row.customer?.phone && (
            <p className="text-xs text-on-surface-variant" dir="ltr">
              {row.customer.phone}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'contract_kind',
      header: 'نوع الخدمة',
      render: (row) => contractKindLabel(row.contract_kind),
    },
    {
      key: 'source',
      header: 'المصدر',
      render: (row) => contractSourceLabel(row),
    },
    {
      key: 'invoice_date',
      header: 'تاريخ التعاقد',
      render: (row) => fmtInvoiceContractDateTime(row),
    },
    {
      key: 'fee_net',
      header: 'رسوم التركيب',
      render: (row) => {
        const summary = invoiceContractSummary(row)
        return (
          <span className="tabular-nums whitespace-nowrap">
            {summary.feeNet > 0 ? fmtContractMoney(summary.feeNet) : '—'}
          </span>
        )
      },
    },
    {
      key: 'transportation_fee',
      header: 'تنقلات',
      render: (row) => {
        const fee = Number(row.transportation_fee ?? 0)
        if (fee <= 0) return '—'
        return (
          <span className="inline-flex items-center gap-1 tabular-nums whitespace-nowrap">
            <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-[11px] font-bold text-on-surface">
              تنقلات
            </span>
            {fmtContractMoney(fee)}
          </span>
        )
      },
    },
    {
      key: 'device_count',
      header: 'عدد الأجهزة',
      render: (row) => invoiceContractSummary(row).lineCount,
    },
    {
      key: 'devices_subtotal',
      header: 'إجمالي سعر الأجهزة',
      render: (row) => (
        <span className="tabular-nums whitespace-nowrap">
          {fmtContractMoney(invoiceContractSummary(row).devicesSubtotal)}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'إجمالي التعاقد',
      render: (row) => (
        <span className="tabular-nums font-medium whitespace-nowrap">
          {fmtContractMoney(invoiceContractSummary(row).contractAmount)}
        </span>
      ),
    },
    {
      key: 'paid_amount',
      header: 'المدفوع',
      render: (row) => (
        <span className="tabular-nums whitespace-nowrap">
          {fmtContractMoney(row.paid_amount)}
        </span>
      ),
    },
    {
      key: 'balance_due',
      header: 'المتبقي (للأقساط)',
      render: (row) => (
        <span className="tabular-nums whitespace-nowrap">
          {fmtContractMoney(row.balance_due)}
        </span>
      ),
    },
    {
      key: 'payment_status',
      header: 'حالة السداد',
      render: (row) =>
        row.payment_status ? <StatusBadge status={row.payment_status} /> : '—',
    },
    {
      key: 'review_status',
      header: 'حالة المراجعة',
      headerDataTour: 'invoices-status',
      render: (row) => (
        <StatusBadge
          status={reviewStatusForBadge(row.review_status)}
          label={reviewStatusLabel(row.review_status)}
        />
      ),
    },
  ]

  if (options.renderActions) {
    columns.push({
      key: 'actions',
      header: '',
      headerDataTour: 'invoices-actions',
      render: (row) => options.renderActions!(row),
    })
  }

  return columns
}

export function defaultContractListActions(
  row: SalesInvoice,
  user?: AuthUser | null,
  onOpenProblems?: (invoice: SalesInvoice, caseType?: ContractProblemCaseType) => void,
): ReactNode {
  return (
    <div className="flex flex-wrap items-center gap-sm">
      <Link
        to={`/invoices/${row.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-primary hover:underline whitespace-nowrap"
      >
        تفاصيل
      </Link>
      {canEditContract(user ?? null, row) && (
        <Link
          to={contractEditPath(row.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary hover:underline whitespace-nowrap"
        >
          تعديل
        </Link>
      )}
      {row.review_status === 'pending' &&
        userHasPermission(user ?? null, 'review.view_queue') && (
        <Link
          to={`/invoices/review/${row.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-error hover:underline whitespace-nowrap"
        >
          مراجعة
        </Link>
      )}
      {canRejectContract(user ?? null, row) && (
        <Link
          to={`/invoices/review/${row.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-error hover:underline whitespace-nowrap"
        >
          رفض
        </Link>
      )}
      {onOpenProblems && canExchangeContract(user ?? null, row) && (
        <button
          type="button"
          onClick={() => onOpenProblems(row, 'exchange')}
          className="text-sm font-medium text-error hover:underline whitespace-nowrap"
        >
          استبدال
        </button>
      )}
      {onOpenProblems && canReturnContract(user ?? null, row) && (
        <button
          type="button"
          onClick={() => onOpenProblems(row, 'return')}
          className="text-sm font-medium text-error hover:underline whitespace-nowrap"
        >
          استرجاع
        </button>
      )}
      {onOpenProblems && canTransferContractToProblems(user ?? null, row) && (
        <button
          type="button"
          onClick={() => onOpenProblems(row)}
          className="text-sm font-medium text-error hover:underline whitespace-nowrap"
        >
          تحويل للمشاكل
        </button>
      )}
      <Link
        to={contractPrintPath(row.id)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline whitespace-nowrap"
      >
        <Icon name="print" size={18} />
        طباعة
      </Link>
    </div>
  )
}

export function reviewOnlyContractListActions(
  row: SalesInvoice,
  user?: AuthUser | null,
  onOpenProblems?: (invoice: SalesInvoice, caseType?: ContractProblemCaseType) => void,
): ReactNode {
  return (
    <div className="flex flex-wrap items-center gap-sm">
      {canEditContract(user ?? null, row) && (
        <Link
          to={contractEditPath(row.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary hover:underline whitespace-nowrap"
        >
          تعديل
        </Link>
      )}
      <Link
        to={`/invoices/review/${row.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-error hover:underline whitespace-nowrap"
      >
        مراجعة
      </Link>
      {canRejectContract(user ?? null, row) && (
        <Link
          to={`/invoices/review/${row.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-error hover:underline whitespace-nowrap"
        >
          رفض
        </Link>
      )}
      {onOpenProblems && canExchangeContract(user ?? null, row) && (
        <button
          type="button"
          onClick={() => onOpenProblems(row, 'exchange')}
          className="text-sm font-medium text-error hover:underline whitespace-nowrap"
        >
          استبدال
        </button>
      )}
    </div>
  )
}

export function filterContractListRows(rows: SalesInvoice[], search: string): SalesInvoice[] {
  const q = search.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((row) => {
    const customer = String(row.customer?.name ?? '').toLowerCase()
    const phone1 = String(row.customer?.phone ?? '').toLowerCase()
    const phone2 = String(row.customer?.phone_2 ?? '').toLowerCase()
    const source = contractSourceLabel(row).toLowerCase()
    const distributor = distributorLabel(row.distributor).toLowerCase()
    return (
      customer.includes(q) ||
      phone1.includes(q) ||
      phone2.includes(q) ||
      source.includes(q) ||
      distributor.includes(q)
    )
  })
}

export function sortContractsByDateTime(
  rows: SalesInvoice[],
  direction: 'asc' | 'desc' = 'desc',
): SalesInvoice[] {
  return [...rows].sort((a, b) => {
    const diff = contractSortTimestamp(a) - contractSortTimestamp(b)
    if (diff !== 0) return direction === 'desc' ? -diff : diff
    return direction === 'desc' ? b.id - a.id : a.id - b.id
  })
}

export function contractDateFilterParams(
  dateFrom: string,
  dateTo: string,
): Record<string, string> {
  const params: Record<string, string> = {}
  if (dateFrom) params['filter[invoice_date_from]'] = dateFrom
  if (dateTo) params['filter[invoice_date_to]'] = dateTo
  return params
}
