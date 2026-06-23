/** تسميات حقول POS — أصغر من text-xs الافتراضي (21px) */
export const posLabelClass =
  'pos-label mb-1 block text-[14px] leading-tight font-bold text-on-surface-variant'

const posControlBase =
  'pos-control box-border w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-0 text-[16px] leading-5 focus:border-primary focus:outline-none disabled:opacity-50'

export const posInputClass = posControlBase

export const posSelectClass = `${posControlBase} appearance-none`

export const posScanClass = `${posControlBase} font-mono tracking-wide`

export const posStaticFieldClass =
  'pos-control flex items-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-[16px] leading-5'

export const posControlHeightClass = 'h-[var(--pos-control-h)] min-h-[var(--pos-control-h)] max-h-[var(--pos-control-h)]'

export const posSourceToggle = (active: boolean) =>
  `pos-control flex flex-1 items-center justify-center rounded-lg border text-[15px] font-bold transition-colors ${
    active
      ? 'border-primary bg-primary text-on-primary'
      : 'border-outline-variant bg-surface-container-lowest text-on-surface'
  }`

export const posModeToggle = (active: boolean) =>
  `flex h-full flex-1 items-center justify-center rounded-md px-2 text-[13px] font-bold transition-colors ${
    active ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
  }`

export const posToggleBtn = (active: boolean) =>
  `pos-control flex flex-1 items-center justify-center rounded-lg border text-[15px] font-bold transition-colors ${
    active
      ? 'border-primary bg-primary text-on-primary'
      : 'border-outline-variant bg-surface-container-lowest text-on-surface'
  }`

export const posModeToggleGroupClass =
  'flex h-[var(--pos-control-h)] min-h-[var(--pos-control-h)] max-h-[var(--pos-control-h)] overflow-hidden rounded-lg border border-outline-variant p-0.5'

export const posStepperClass =
  'flex h-[var(--pos-control-h)] min-h-[var(--pos-control-h)] items-center overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest'

export const posSectionTitleClass = 'text-[16px] font-extrabold text-on-surface'
