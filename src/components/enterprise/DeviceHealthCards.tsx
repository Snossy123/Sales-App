import { Icon } from '../Icon'
import { deviceHealthCards as defaultCards } from '../../data/enterpriseGpsMock'
import type { DepartmentHealthCard } from '../../lib/departmentDashboard'

interface DeviceHealthCardsProps {
  cards?: DepartmentHealthCard[]
}

export function DeviceHealthCards({ cards = [...defaultCards] }: DeviceHealthCardsProps) {
  return (
    <section>
      <h3 className="mb-md font-title-lg text-on-surface">حالة الأجهزة والتشغيل</h3>
      <div className="grid grid-cols-1 gap-lg md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`flex items-center justify-between rounded-xl border p-lg shadow-sm ${card.bg} ${card.border}`}
          >
            <div>
              <p className={`mb-1 font-label-md ${card.labelColor}`}>{card.label}</p>
              <p className={`font-headline-md ${card.valueColor}`}>{card.value}</p>
            </div>
            <div className="rounded-full bg-white/50 p-md shadow-inner">
              <Icon name={card.icon} className={`${card.iconColor} no-flip`} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
