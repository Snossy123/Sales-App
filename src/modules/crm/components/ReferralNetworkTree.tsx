import { useState } from 'react'
import type { ReferralNetworkNode } from '../../../api/types'
import { Icon } from '../../../components/Icon'

function formatSales(value: number): string {
  if (!value) return '—'
  return new Intl.NumberFormat('ar-EG', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2)
  return (parts[0][0] + parts[1][0]).slice(0, 2)
}

interface ReferralNetworkTreeProps {
  nodes: ReferralNetworkNode[]
}

interface TreeNodeProps {
  node: ReferralNetworkNode
  depth: number
  isLast: boolean
}

function MetricChip({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        accent
          ? 'bg-primary/12 text-primary ring-1 ring-primary/15'
          : 'bg-surface-container text-on-surface ring-1 ring-outline-variant/60'
      }`}
    >
      <span className="text-on-surface-variant">{label}</span>
      <strong className="tabular-nums">{value}</strong>
    </span>
  )
}

function TreeNode({ node, depth, isLast }: TreeNodeProps) {
  const [open, setOpen] = useState(depth < 2)
  const hasChildren = node.children.length > 0
  const isCustomer = node.kind === 'customer'

  return (
    <li className={`relative list-none ${depth > 0 ? 'ms-7' : ''}`}>
      {depth > 0 && (
        <>
          {/* Vertical guide: full height for middle siblings, stops at node for last */}
          <span
            aria-hidden
            className="pointer-events-none absolute top-0 w-px bg-outline-variant"
            style={{
              insetInlineStart: '-1.15rem',
              height: isLast ? '1.875rem' : '100%',
            }}
          />
          {/* Horizontal elbow into the card */}
          <span
            aria-hidden
            className="pointer-events-none absolute top-[1.875rem] h-px w-[1.15rem] bg-outline-variant"
            style={{ insetInlineStart: '-1.15rem' }}
          />
        </>
      )}

      <div
        className={`group relative z-[1] flex flex-col gap-sm rounded-2xl border bg-surface-container-lowest p-sm shadow-sm transition-all duration-200 sm:flex-row sm:items-center sm:justify-between sm:gap-md sm:p-md ${
          depth === 0
            ? 'border-primary/30 bg-gradient-to-l from-surface-container-lowest to-primary/5 ring-1 ring-primary/15'
            : 'border-outline-variant hover:border-primary/35 hover:shadow-md'
        }`}
      >
        <div className="flex min-w-0 items-center gap-sm">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container text-primary transition-colors hover:bg-primary/10"
              aria-expanded={open}
              aria-label={open ? 'طي الفرع' : 'توسيع الفرع'}
            >
              <Icon name={open ? 'expand_more' : 'chevron_left'} size={18} />
            </button>
          ) : (
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-outline-variant text-on-surface-variant">
              <Icon name="fiber_manual_record" size={10} />
            </span>
          )}

          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              isCustomer
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {initials(node.name)}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-xs">
              <p className="truncate text-sm font-bold text-on-surface sm:text-base">{node.name}</p>
              {node.converted && (
                <span
                  className="inline-flex items-center rounded-full bg-secondary/15 p-0.5 text-secondary"
                  title="محوّل"
                >
                  <Icon name="check_circle" size={16} filled />
                </span>
              )}
              <span
                className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                  isCustomer
                    ? 'bg-primary/10 text-primary'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {isCustomer ? 'عميل' : 'ترشيح'}
              </span>
            </div>
            <p className="mt-0.5 tabular-nums text-xs text-on-surface-variant" dir="ltr">
              {node.phone}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 ps-10 sm:ps-0">
          <MetricChip label="جاب" value={node.metrics.referred_count} />
          <MetricChip label="تحويل" value={formatRate(node.metrics.conversion_rate)} />
          <MetricChip label="مبيعات" value={formatSales(node.metrics.total_sales)} accent />
        </div>
      </div>

      {hasChildren && open && (
        <ul className="relative mt-sm space-y-sm border-s border-transparent ps-0">
          {node.children.map((child, index) => (
            <TreeNode
              key={`${child.kind}-${child.id}`}
              node={child}
              depth={depth + 1}
              isLast={index === node.children.length - 1}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export function ReferralNetworkTree({ nodes }: ReferralNetworkTreeProps) {
  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-sm rounded-2xl border border-dashed border-outline-variant bg-surface-container-low/50 px-md py-xl text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon name="account_tree" size={28} />
        </span>
        <p className="text-sm font-medium text-on-surface">لا توجد شبكة إحالات للعرض</p>
        <p className="max-w-sm text-xs text-on-surface-variant">
          اختر عميلاً كجذر، أو سجّل ترشيحات جديدة لبناء الشجرة
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-outline-variant bg-gradient-to-b from-surface-container-lowest to-surface-container-low/40 p-md sm:p-lg">
      <ul className="space-y-md">
        {nodes.map((node, index) => (
          <TreeNode
            key={`${node.kind}-${node.id}`}
            node={node}
            depth={0}
            isLast={index === nodes.length - 1}
          />
        ))}
      </ul>
    </div>
  )
}
