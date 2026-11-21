import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  headerActions?: ReactNode
  /** Stays visible under the scrolling body (for example a save button). */
  footer?: ReactNode
}

const sizeClass = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export function Modal({ open, onClose, title, children, size = 'md', headerActions, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-on-surface/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative z-10 flex min-h-0 w-full ${sizeClass[size]} max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg sm:max-h-[calc(100dvh-2rem)]`}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-outline-variant px-4 py-3">
          <h2 id="modal-title" className="text-base font-bold text-on-surface sm:text-lg">
            {title}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
          {headerActions}
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-low"
          >
            <Icon name="close" size={22} />
          </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-outline-variant bg-surface-container-lowest px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
