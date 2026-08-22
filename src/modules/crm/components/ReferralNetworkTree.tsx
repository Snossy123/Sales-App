import { useState } from 'react'
import type { ReferralNetworkNode } from '../../../api/types'
import { referralStatusMeta } from '../lib/referralLeads'
import { CrmStatusPill } from './ui/CrmChip'

function formatSales(value: number): string {
  if (!value) return '—'
  return new Intl.NumberFormat('ar-EG', { numberingSystem: 'latn',
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

function initials(name: string): string {
  return name.trim().slice(0, 1) || '?'
}

interface ReferralNetworkTreeProps {
  nodes: ReferralNetworkNode[]
}

function MetricCell({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex min-w-16 flex-col items-center gap-px">
      <span className="text-[15px] font-bold">{value}</span>
      <span className="text-[10.5px]" style={{ color: 'var(--crm-text-faint)' }}>
        {label}
      </span>
    </div>
  )
}

function ChildRow({ child }: { child: ReferralNetworkNode }) {
  const childMeta = child.status ? referralStatusMeta(child.status) : null
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="flex items-center gap-2.5 px-3.5 py-2.5 transition-colors"
      style={{
        border: `1px solid ${hovered ? 'var(--crm-primary-soft-border)' : 'var(--crm-border-soft)'}`,
        borderRadius: 'var(--crm-radius-md)',
        background: 'var(--crm-surface-muted)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="h-px w-5 shrink-0" style={{ background: 'var(--crm-border)' }} />
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] text-[11px] font-semibold"
        style={{ background: 'var(--crm-primary-soft)', color: 'var(--crm-primary)' }}
      >
        {initials(child.name)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="text-[12.5px] font-semibold">{child.name}</span>
        <span className="text-[11px] tabular-nums" dir="ltr" style={{ color: 'var(--crm-text-faint)' }}>
          {child.phone}
        </span>
      </div>
      {childMeta ? (
        <CrmStatusPill label={childMeta.label} color={childMeta.color} tint={childMeta.tint} />
      ) : (
        <span className="text-[11.5px]" style={{ color: 'var(--crm-text-faint)' }}>
          {child.metrics.referred_count} أحال
        </span>
      )}
    </div>
  )
}

function NetworkNodeCard({ node, depth = 0 }: { node: ReferralNetworkNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 1)
  const hasChildren = node.children.length > 0
  const isCustomer = node.kind === 'customer'

  return (
    <section
      className="overflow-hidden"
      style={{
        background: 'var(--crm-surface)',
        border: '1px solid var(--crm-border)',
        borderRadius: 'var(--crm-radius-md)',
        boxShadow: 'var(--crm-shadow)',
      }}
    >
      <button
        type="button"
        onClick={() => hasChildren && setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center gap-3.5 px-[18px] py-3.5 text-start"
        style={{
          background: 'var(--crm-surface-muted)',
          borderBottom: open && hasChildren ? '1px solid var(--crm-border-soft)' : undefined,
          cursor: hasChildren ? 'pointer' : 'default',
        }}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] text-[12.5px] font-semibold"
          style={{
            background: isCustomer ? 'var(--crm-primary)' : 'var(--crm-primary-soft)',
            color: isCustomer ? '#fff' : 'var(--crm-primary)',
          }}
        >
          {initials(node.name)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-sm font-bold">{node.name}</span>
            <span
              className="rounded-[9px] px-2.5 py-0.5 text-[10.5px] font-semibold"
              style={{ background: 'var(--crm-neutral-soft)', color: 'var(--crm-text)' }}
            >
              {isCustomer ? 'عميل' : 'ترشيح'}
            </span>
          </div>
          <span className="text-[11.5px] tabular-nums" dir="ltr" style={{ color: 'var(--crm-text-faint)' }}>
            {node.phone}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <MetricCell value={node.metrics.referred_count} label="أحال" />
          <MetricCell value={formatRate(node.metrics.conversion_rate)} label="تحويل" />
          <MetricCell value={formatSales(node.metrics.total_sales)} label="مبيعات" />
          {hasChildren ? (
            <span className="w-4 text-center text-xs" style={{ color: 'var(--crm-text-disabled)' }}>
              {open ? '▴' : '▾'}
            </span>
          ) : null}
        </div>
      </button>

      {hasChildren && open ? (
        <div className="flex flex-col gap-2.5 px-[18px] py-3.5">
          {node.children.map((child) => (
            <div key={`${child.kind}-${child.id}`} className="flex flex-col gap-2.5">
              <ChildRow child={child} />
              {child.children.length > 0 ? (
                <div className="ps-6">
                  <NetworkNodeCard node={child} depth={depth + 1} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

export function ReferralNetworkTree({ nodes }: ReferralNetworkTreeProps) {
  if (nodes.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 px-3.5 py-10 text-center"
        style={{
          border: '1px dashed var(--crm-border)',
          borderRadius: 'var(--crm-radius-md)',
          background: 'var(--crm-surface-muted)',
        }}
      >
        <p className="text-sm font-medium">لا توجد شبكة إحالات للعرض</p>
        <p className="max-w-sm text-xs" style={{ color: 'var(--crm-text-faint)' }}>
          اختر عميلاً كجذر، أو سجّل ترشيحات جديدة لبناء الشجرة
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3.5">
      {nodes.map((node) => (
        <NetworkNodeCard key={`${node.kind}-${node.id}`} node={node} />
      ))}
    </div>
  )
}
