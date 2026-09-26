import { Icon } from '../../../../components/Icon'
import { POS_FLOW_ACTIONS, type PosFlowAction } from '../posFlowTypes'

interface ActionStepProps {
  value: PosFlowAction | null
  onChange: (action: PosFlowAction) => void
}

export function ActionStep({ value, onChange }: ActionStepProps) {
  return (
    <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-3">
      {POS_FLOW_ACTIONS.map((action) => {
        const active = value === action.id
        return (
          <button
            key={action.id}
            type="button"
            onClick={() => onChange(action.id)}
            className={`rounded-2xl border p-md text-start transition-colors ${
              active
                ? 'border-primary bg-primary/10 shadow-sm'
                : 'border-outline-variant bg-surface-container-lowest hover:border-primary/40'
            }`}
          >
            <span
              className={`mb-sm flex h-11 w-11 items-center justify-center rounded-xl ${
                active ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-primary'
              }`}
            >
              <Icon name={action.icon} size={24} />
            </span>
            <span className="block text-base font-extrabold text-on-surface">{action.label}</span>
            <span className="mt-xs block text-sm leading-snug text-on-surface-variant">
              {action.description}
            </span>
          </button>
        )
      })}
    </div>
  )
}
