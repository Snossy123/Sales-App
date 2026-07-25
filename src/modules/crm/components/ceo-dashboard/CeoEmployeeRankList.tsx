import { Icon } from '../../../../components/Icon'
import type { CeoDashboardTopEmployee } from '../../../../api/types'

interface CeoEmployeeRankListProps {
  employees: CeoDashboardTopEmployee[]
  formatMoney: (value: number) => string
}

function initialOf(name: string) {
  const trimmed = name.trim()
  return trimmed ? trimmed[0] : '—'
}

export function CeoEmployeeRankList({ employees, formatMoney }: CeoEmployeeRankListProps) {
  if (employees.length === 0) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-[18px] text-center"
        style={{
          borderRadius: 'var(--crm-radius-md)',
          border: '1px dashed var(--crm-border)',
        }}
      >
        <Icon name="person" size={26} className="text-[var(--crm-text-disabled)]" />
        <span className="text-[12.5px] font-medium" style={{ color: 'var(--crm-text-faint)' }}>
          لا يوجد موظفون بمبيعات في هذه الفترة
        </span>
      </div>
    )
  }

  const maxSales = Math.max(...employees.map((e) => e.sales_total), 1)
  const [top, ...rest] = employees

  return (
    <div className="flex flex-1 flex-col">
      <div
        className="mb-3.5 flex items-center gap-3 p-3.5"
        style={{
          borderRadius: 'var(--crm-radius-md)',
          background: 'var(--crm-surface-muted)',
        }}
      >
        <div className="relative">
          <div
            className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] text-lg font-bold text-white"
            style={{ background: 'var(--crm-primary)' }}
          >
            {initialOf(top.name)}
          </div>
          <span
            className="absolute -top-1.5 -start-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 text-xs font-bold text-white"
            style={{ borderColor: 'var(--crm-surface)', background: '#e58a1a' }}
          >
            1
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-bold" style={{ color: 'var(--crm-text)' }}>
              {top.name}
            </span>
            <span
              className="shrink-0 text-sm font-bold whitespace-nowrap"
              style={{ color: 'var(--crm-primary)' }}
            >
              {formatMoney(top.sales_total)}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full"
            style={{ background: 'var(--crm-neutral-soft)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${(top.sales_total / maxSales) * 100}%`,
                background: 'var(--crm-primary)',
              }}
            />
          </div>
          <div
            className="flex justify-between text-[11.5px] font-medium"
            style={{ color: 'var(--crm-text-muted)' }}
          >
            <span>{top.branch_name ? `مبيعات ${top.branch_name}` : 'المبيعات'}</span>
            <span>{top.invoices_count} فواتير</span>
          </div>
        </div>
      </div>

      {rest.length === 0 ? (
        <div
          className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-[18px] text-center"
          style={{
            borderRadius: 'var(--crm-radius-md)',
            border: '1px dashed var(--crm-border)',
          }}
        >
          <Icon name="group" size={26} className="text-[var(--crm-text-disabled)]" />
          <span className="text-[12.5px] font-medium" style={{ color: 'var(--crm-text-faint)' }}>
            لا يوجد موظفون آخرون بمبيعات في هذه الفترة
          </span>
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {rest.map((emp, index) => (
            <li
              key={emp.user_id}
              className="flex items-center gap-3 px-3 py-2.5"
              style={{
                borderRadius: 12,
                border: '1px solid var(--crm-border-soft)',
              }}
            >
              <div className="relative">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] text-sm font-bold"
                  style={{
                    background: 'var(--crm-primary-soft)',
                    color: 'var(--crm-primary)',
                  }}
                >
                  {initialOf(emp.name)}
                </div>
                <span
                  className="absolute -top-1 -start-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: 'var(--crm-text-muted)' }}
                >
                  {index + 2}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className="truncate text-[13px] font-semibold"
                    style={{ color: 'var(--crm-text)' }}
                  >
                    {emp.name}
                  </span>
                  <span
                    className="shrink-0 text-[13px] font-bold tabular-nums"
                    style={{ color: 'var(--crm-primary)' }}
                  >
                    {formatMoney(emp.sales_total)}
                  </span>
                </div>
                <div
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full"
                  style={{ background: 'var(--crm-neutral-soft)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(emp.sales_total / maxSales) * 100}%`,
                      background: 'var(--crm-primary)',
                      opacity: 0.75,
                    }}
                  />
                </div>
                <div
                  className="mt-1 flex justify-between text-[11px]"
                  style={{ color: 'var(--crm-text-muted)' }}
                >
                  <span>{emp.branch_name ? `مبيعات ${emp.branch_name}` : 'المبيعات'}</span>
                  <span>{emp.invoices_count} فواتير</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
