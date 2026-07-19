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
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-[#e3e7ef] px-4 py-[18px] text-center">
        <Icon name="person" size={26} className="text-[#c3c9d6]" />
        <span className="text-[12.5px] font-medium text-[#9098a8]">
          لا يوجد موظفون بمبيعات في هذه الفترة
        </span>
      </div>
    )
  }

  const maxSales = Math.max(...employees.map((e) => e.sales_total), 1)
  const [top, ...rest] = employees

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-3.5 flex items-center gap-3 rounded-[14px] bg-[#f6f8fc] p-3.5">
        <div className="relative">
          <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] bg-primary text-lg font-bold text-on-primary">
            {initialOf(top.name)}
          </div>
          <span className="absolute -top-1.5 -start-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-white bg-[#e58a1a] text-xs font-bold text-white">
            1
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-bold text-[#171b24]">{top.name}</span>
            <span className="shrink-0 text-sm font-bold text-primary whitespace-nowrap">
              {formatMoney(top.sales_total)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#e4e9f2]">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(top.sales_total / maxSales) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[11.5px] font-medium text-[#8890a0]">
            <span>{top.branch_name ? `مبيعات ${top.branch_name}` : 'المبيعات'}</span>
            <span>{top.invoices_count} فواتير</span>
          </div>
        </div>
      </div>

      {rest.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-[#e3e7ef] px-4 py-[18px] text-center">
          <Icon name="group" size={26} className="text-[#c3c9d6]" />
          <span className="text-[12.5px] font-medium text-[#9098a8]">
            لا يوجد موظفون آخرون بمبيعات في هذه الفترة
          </span>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rest.map((emp, index) => (
            <li
              key={emp.user_id}
              className="flex items-center gap-3 rounded-[12px] border border-[#f1f3f8] px-3 py-2.5"
            >
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#eef3ff] text-sm font-bold text-primary">
                  {initialOf(emp.name)}
                </div>
                <span className="absolute -top-1 -start-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#8890a0] text-[10px] font-bold text-white">
                  {index + 2}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13px] font-semibold text-[#171b24]">{emp.name}</span>
                  <span className="shrink-0 text-[13px] font-bold text-primary tabular-nums">
                    {formatMoney(emp.sales_total)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#e4e9f2]">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${(emp.sales_total / maxSales) * 100}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-[#8890a0]">
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
