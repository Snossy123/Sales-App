import { NavLink } from 'react-router-dom'

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center justify-center rounded-lg px-md py-2 text-sm font-bold transition-colors ${
    isActive
      ? 'bg-primary text-on-primary shadow-sm'
      : 'border border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
  }`

export function PosContractTypeTabs() {
  return (
    <div className="mb-md flex flex-wrap gap-xs">
      <NavLink to="/pos" end className={tabClass}>
        تعاقد جديد (أجهزة)
      </NavLink>
      <NavLink to="/pos/services" className={tabClass}>
        تعاقد خدمات
      </NavLink>
    </div>
  )
}
