declare module 'shepherd.js' {
  export interface StepButton {
    text?: string
    classes?: string
    action?: () => void
  }

  export interface StepOptions {
    id?: string
    title?: string
    text?: string
    attachTo?: { element?: string; on?: string }
    buttons?: StepButton[]
    beforeShowPromise?: () => Promise<void>
    classes?: string
  }

  export interface TourOptions {
    useModalOverlay?: boolean
    defaultStepOptions?: Record<string, unknown>
  }

  export class Tour {
    constructor(options?: TourOptions)
    addStep(options: StepOptions): void
    start(): void
    next(): void
    back(): void
    complete(): void
    cancel(): void
    isActive(): boolean
    on(event: string, handler: () => void): void
  }

  const Shepherd: {
    Tour: typeof Tour
  }

  export default Shepherd
}
