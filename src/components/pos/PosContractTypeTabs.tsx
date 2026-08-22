import { NavLink } from 'react-router-dom'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center justify-center rounded-lg px-md py-2 text-sm font-bold transition-colors ${
    isActive
      ? 'bg-primary text-on-primary shadow-sm'
      : 'border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
  }`

interface PosContractTypeTabsProps {
  onClear?: () => void
}

export function PosContractTypeTabs({ onClear }: PosContractTypeTabsProps) {
  return (
    <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
      <div className="flex flex-wrap gap-xs">
        <NavLink to="/pos" end className={tabClass}>
          تعاقد جديد (أجهزة)
        </NavLink>
        <NavLink to="/pos/services" className={tabClass}>
          تعاقد خدمات
        </NavLink>
        <NavLink to="/sales/accessories" className={tabClass}>
          بيع إكسسوار
        </NavLink>
      </div>
      {onClear ? (
        <button
          type="button"
          onClick={() => {
            if (window.confirm('هتمسح كل بيانات الفورم الحالي؟')) {
              onClear()
            }
          }}
          className="inline-flex items-center rounded-lg border border-outline-variant px-md py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
        >
          مسح البيانات
        </button>
      ) : null}
    </div>
  )
}
