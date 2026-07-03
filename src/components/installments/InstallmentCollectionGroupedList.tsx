import { useMemo } from 'react'
import type { InstallmentItem } from '../../api/types'
import { CollapsibleSection } from '../CollapsibleSection'
import { StatusBadge } from '../StatusBadge'
import { formatInvoiceDate } from '../../lib/sales'

export type InstallmentCollectionRow = InstallmentItem & Record<string, unknown>

interface ContractGroup {
  invoiceId: number
  invoiceNumber: string
  totalRemaining: number
  installmentCount: number
  overdueCount: number
  rows: InstallmentCollectionRow[]
}

export interface CustomerInstallmentGroup {
  customerKey: string
  customerId?: number
  customerName: string
  customerPhones: string[]
  totalRemaining: number
  installmentCount: number
  overdueCount: number
  contracts: ContractGroup[]
}

function rowRemaining(row: InstallmentCollectionRow): number {
  return Number(
    row.remaining ??
      row.total_due ??
      Math.max(0, Number(row.amount) - Number(row.paid_amount ?? 0)),
  )
}

function isOverdueRow(row: InstallmentCollectionRow): boolean {
  return row.status === 'overdue' || row.display_tier === 'overdue'
}

export function groupInstallmentsByCustomerAndContract(
  rows: InstallmentCollectionRow[],
): CustomerInstallmentGroup[] {
  const customerMap = new Map<string, CustomerInstallmentGroup>()

  for (const row of rows) {
    const customerKey = String(row.customer_id ?? row.customer_name ?? 'unknown')
    let customerGroup = customerMap.get(customerKey)
    if (!customerGroup) {
      customerGroup = {
        customerKey,
        customerId: row.customer_id as number | undefined,
        customerName: String(row.customer_name ?? '—'),
        customerPhones: (row.customer_phones ?? [row.customer_phone]).filter(Boolean) as string[],
        totalRemaining: 0,
        installmentCount: 0,
        overdueCount: 0,
        contracts: [],
      }
      customerMap.set(customerKey, customerGroup)
    }

    const invoiceId = Number(row.sales_invoice_id ?? 0)
    let contractGroup = customerGroup.contracts.find((contract) => contract.invoiceId === invoiceId)
    if (!contractGroup) {
      contractGroup = {
        invoiceId,
        invoiceNumber: String(row.invoice_number ?? (invoiceId ? `#${invoiceId}` : '—')),
        totalRemaining: 0,
        installmentCount: 0,
        overdueCount: 0,
        rows: [],
      }
      customerGroup.contracts.push(contractGroup)
    }

    contractGroup.rows.push(row)
    const remaining = rowRemaining(row)
    contractGroup.totalRemaining += remaining
    contractGroup.installmentCount += 1
    if (isOverdueRow(row)) contractGroup.overdueCount += 1

    customerGroup.totalRemaining += remaining
    customerGroup.installmentCount += 1
    if (isOverdueRow(row)) customerGroup.overdueCount += 1
  }

  return Array.from(customerMap.values())
    .sort((a, b) => a.customerName.localeCompare(b.customerName, 'ar'))
    .map((customer) => ({
      ...customer,
      contracts: customer.contracts
        .sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber, 'ar'))
        .map((contract) => ({
          ...contract,
          rows: contract.rows.sort(
            (a, b) => new Date(String(a.due_date)).getTime() - new Date(String(b.due_date)).getTime(),
          ),
        })),
    }))
}

function tierRowClass(tier?: string, selected?: boolean): string {
  if (selected) return 'bg-primary/10 ring-1 ring-primary/30'
  if (tier === 'overdue') return 'bg-red-50 hover:bg-red-100/80'
  if (tier === 'grace') return 'bg-orange-50 hover:bg-orange-100/80'
  return 'bg-white hover:bg-surface-container-low'
}

interface InstallmentCollectionGroupedListProps {
  rows: InstallmentCollectionRow[]
  selectedId?: number | null
  onSelect: (row: InstallmentCollectionRow) => void
  onReconcile: (row: InstallmentCollectionRow) => void
  onDelete: (row: InstallmentCollectionRow) => void
  emptyMessage?: string
}

function InstallmentRowsTable({
  rows,
  selectedId,
  onSelect,
  onReconcile,
  onDelete,
}: Omit<InstallmentCollectionGroupedListProps, 'emptyMessage'>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
      <table className="w-full min-w-[36rem] text-sm">
        <thead>
          <tr className="border-b border-outline-variant/60 bg-surface-container-low text-[11px] text-on-surface-variant">
            <th className="px-sm py-2 text-start font-bold">قسط #</th>
            <th className="px-sm py-2 text-start font-bold">المبلغ</th>
            <th className="px-sm py-2 text-start font-bold">المتبقي</th>
            <th className="px-sm py-2 text-start font-bold">الاستحقاق</th>
            <th className="px-sm py-2 text-start font-bold">متبقي أقساط</th>
            <th className="px-sm py-2 text-start font-bold">الحالة</th>
            <th className="px-sm py-2 text-start font-bold">تصالح</th>
            <th className="px-sm py-2 text-start font-bold"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = selectedId === row.id
            return (
              <tr
                key={row.id}
                className={`border-b border-outline-variant/40 transition-colors ${tierRowClass(String(row.display_tier ?? row.status), selected)}`}
              >
                <td className="px-sm py-2 tabular-nums">{row.installment_number ?? '—'}</td>
                <td className="px-sm py-2 tabular-nums">{Number(row.amount).toLocaleString('ar-EG')}</td>
                <td className="px-sm py-2 tabular-nums font-medium">
                  {rowRemaining(row).toLocaleString('ar-EG')}
                </td>
                <td className="px-sm py-2 tabular-nums">{formatInvoiceDate(String(row.due_date))}</td>
                <td className="px-sm py-2 tabular-nums">{row.remaining_installments ?? '—'}</td>
                <td className="px-sm py-2">
                  <StatusBadge status={String(row.display_tier ?? row.status)} />
                </td>
                <td className="px-sm py-2">
                  {row.has_open_reconciliation ? (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800">
                      مفتوح
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-sm py-2">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => onSelect(row)}
                      className="text-sm text-primary hover:underline"
                    >
                      تحصيل
                    </button>
                    {row.display_tier === 'overdue' && (
                      <button
                        type="button"
                        onClick={() => onReconcile(row)}
                        className="text-xs text-on-surface-variant hover:underline"
                      >
                        تصالح
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(row)}
                      className="text-xs text-error hover:underline"
                    >
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function InstallmentCollectionGroupedList({
  rows,
  selectedId,
  onSelect,
  onReconcile,
  onDelete,
  emptyMessage = 'لا توجد أقساط مستحقة',
}: InstallmentCollectionGroupedListProps) {
  const groups = useMemo(() => groupInstallmentsByCustomerAndContract(rows), [rows])

  if (groups.length === 0) {
    return (
      <p className="rounded-lg border border-outline-variant bg-surface-container-low p-md text-center text-sm text-on-surface-variant">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="space-y-sm">
      {groups.map((customer) => (
        <CollapsibleSection
          key={customer.customerKey}
          title={customer.customerName}
          summary={`${customer.installmentCount} قسط · ${customer.totalRemaining.toLocaleString('ar-EG')} ج.م متبقي${customer.overdueCount > 0 ? ` · ${customer.overdueCount} متأخر` : ''}`}
          defaultOpen={groups.length === 1}
        >
          <div className="mb-sm flex flex-wrap items-center gap-sm text-xs text-on-surface-variant">
            {customer.customerPhones.length > 0 && (
              <div className="flex flex-wrap gap-sm" dir="ltr">
                {customer.customerPhones.map((phone) => (
                  <a key={phone} href={`tel:${phone}`} className="text-primary hover:underline">
                    {phone}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-sm">
            {customer.contracts.map((contract) => (
              <CollapsibleSection
                key={`${customer.customerKey}-${contract.invoiceId}`}
                title={`تعاقد ${contract.invoiceNumber}`}
                summary={`${contract.installmentCount} قسط · ${contract.totalRemaining.toLocaleString('ar-EG')} ج.م${contract.overdueCount > 0 ? ` · ${contract.overdueCount} متأخر` : ''}`}
                defaultOpen={customer.contracts.length === 1}
                className="mb-0 border-outline-variant/70"
              >
                <InstallmentRowsTable
                  rows={contract.rows}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  onReconcile={onReconcile}
                  onDelete={onDelete}
                />
              </CollapsibleSection>
            ))}
          </div>
        </CollapsibleSection>
      ))}
    </div>
  )
}
