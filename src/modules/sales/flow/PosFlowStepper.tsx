import { POS_FLOW_STEPS, type PosFlowDraft, type PosFlowStepId } from './posFlowTypes'

interface PosFlowStepperProps {
  draft: PosFlowDraft
  onGoTo: (step: PosFlowStepId) => void
}

export function PosFlowStepper({ draft, onGoTo }: PosFlowStepperProps) {
  const currentIndex = POS_FLOW_STEPS.findIndex((step) => step.id === draft.step)

  return (
    <ol className="flex items-center gap-0">
      {POS_FLOW_STEPS.map((step, index) => {
        const done = index < currentIndex
        const active = index === currentIndex
        const reachable = index <= currentIndex
        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onGoTo(step.id)}
              className="flex min-w-0 items-center gap-xs disabled:cursor-default"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                  active
                    ? 'bg-primary text-on-primary shadow-sm'
                    : done
                      ? 'bg-primary/15 text-primary'
                      : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {done ? '✓' : index + 1}
              </span>
              <span
                className={`truncate text-sm font-bold ${
                  active ? 'text-on-surface' : 'hidden text-on-surface-variant sm:inline'
                }`}
              >
                {step.label}
              </span>
            </button>
            {index < POS_FLOW_STEPS.length - 1 ? (
              <span
                className={`mx-sm hidden h-px min-w-4 flex-1 sm:block ${
                  done ? 'bg-primary/40' : 'bg-outline-variant'
                }`}
                aria-hidden
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
