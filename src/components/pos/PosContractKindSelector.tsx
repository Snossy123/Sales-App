import type { ContractKind } from '../../lib/contractKinds'
import { CONTRACT_KINDS } from '../../lib/contractKinds'

interface PosContractKindSelectorProps {
  value: ContractKind
  onChange: (value: ContractKind) => void
}

export function PosContractKindSelector({ value, onChange }: PosContractKindSelectorProps) {
  return (
    <div className="mb-md rounded-lg border border-outline-variant bg-surface-container-lowest p-sm sm:p-md">
      <p className="mb-sm text-sm font-bold text-on-surface">نوع الخدمة</p>
      <div className="grid grid-cols-1 gap-xs sm:grid-cols-2 xl:grid-cols-4">
        {CONTRACT_KINDS.map((kind) => {
          const active = value === kind.value
          return (
            <button
              key={kind.value}
              type="button"
              onClick={() => onChange(kind.value)}
              className={`rounded-lg border px-sm py-sm text-start transition-colors ${
                active
                  ? 'border-primary bg-primary/10 text-on-surface'
                  : 'border-outline-variant/70 bg-surface-container-low hover:border-primary/40'
              }`}
            >
              <span className="block text-sm font-bold">{kind.label}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-on-surface-variant">
                {kind.description}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
