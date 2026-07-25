import type { DragEvent, ReactNode } from 'react'

interface CrmKanbanColumnProps {
  title: string
  count: number
  dotColor: string
  onDragOver?: (e: DragEvent) => void
  onDrop?: (e: DragEvent) => void
  children: ReactNode
  minHeight?: number
}

export function CrmKanbanColumn({
  title,
  count,
  dotColor,
  onDragOver,
  onDrop,
  children,
  minHeight = 420,
}: CrmKanbanColumnProps) {
  return (
    <section
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="flex min-w-[240px] flex-col gap-2.5 p-2.5"
      style={{
        background: 'var(--crm-surface-muted)',
        border: '1px solid var(--crm-border-muted)',
        borderRadius: 'var(--crm-radius-md)',
        minHeight,
      }}
    >
      <div className="flex items-center justify-between px-1.5 py-0.5">
        <div className="flex items-center gap-2.5">
          <span className="crm-status-dot" style={{ background: dotColor }} />
          <span className="text-[13px] font-semibold" style={{ color: 'var(--crm-text)' }}>
            {title}
          </span>
        </div>
        <span
          className="rounded-[9px] px-2.5 py-px text-xs font-semibold"
          style={{ color: 'var(--crm-text-muted)', background: 'var(--crm-neutral-soft)' }}
        >
          {count}
        </span>
      </div>
      {children}
    </section>
  )
}

interface CrmKanbanBoardProps {
  columns?: number
  children: ReactNode
}

export function CrmKanbanBoard({ columns = 4, children }: CrmKanbanBoardProps) {
  return (
    <div
      className="pipeline-scroll grid gap-3.5 overflow-x-auto pb-2"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(240px, 1fr))`,
        alignItems: 'start',
      }}
      data-tour="crm-pipeline"
    >
      {children}
    </div>
  )
}
