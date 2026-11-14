import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function ContractActionsMenu({ children, contractNumber }: { children: ReactNode; contractNumber: string }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!position) return
    panel.current?.querySelector<HTMLElement>('a, button')?.focus()
    const close = () => setPosition(null)
    const scroll = (event: Event) => { if (!panel.current?.contains(event.target as Node)) close() }
    const outside = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) close()
    }
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', keyboard)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', scroll, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', keyboard)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', scroll, true)
    }
  }, [position])

  return <>
    <button ref={trigger} type="button" aria-label={`إجراءات التعاقد ${contractNumber}`}
      aria-expanded={Boolean(position)} aria-controls={position ? id : undefined}
      className="rounded-lg px-3 py-1 text-2xl leading-none hover:bg-surface-container-high"
      onClick={() => {
        if (position) return setPosition(null)
        const rect = trigger.current!.getBoundingClientRect()
        setPosition({ top: Math.min(rect.bottom + 4, Math.max(8, window.innerHeight - 360)), left: Math.max(8, Math.min(rect.right - 280, window.innerWidth - 288)) })
      }}>⋮</button>
    {position && createPortal(
      <div ref={panel} id={id} aria-label="إجراءات التعاقد" dir="rtl" style={position}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setPosition(null) }}
        onClick={(event) => { if ((event.target as HTMLElement).closest('a, button')) setPosition(null) }}
        className="fixed z-50 flex max-h-[min(350px,80vh)] w-[280px] flex-col gap-1 overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-2 shadow-xl [&_a]:flex [&_a]:w-full [&_a]:rounded-lg [&_a]:px-3 [&_a]:py-2 [&_button]:w-full [&_button]:rounded-lg [&_button]:px-3 [&_button]:py-2 [&_button]:text-start [&_a:hover]:bg-surface-container-low [&_button:hover]:bg-surface-container-low">
        {children}
      </div>, document.body,
    )}
  </>
}
