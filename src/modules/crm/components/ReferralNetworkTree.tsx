import { useState } from 'react'
import type { ReferralNetworkNode } from '../../../api/types'
import { Icon } from '../../../components/Icon'

function formatSales(value: number): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

interface ReferralNetworkTreeProps {
  nodes: ReferralNetworkNode[]
}

interface NodeRowProps {
  node: ReferralNetworkNode
  depth: number
  isLast: boolean
  ancestorsLast: boolean[]
}

function NodeRow({ node, depth, isLast, ancestorsLast }: NodeRowProps) {
  const [open, setOpen] = useState(depth < 2)
  const hasChildren = node.children.length > 0

  return (
    <div>
      <div className="flex flex-wrap items-center gap-sm py-1.5">
        <div className="flex min-w-0 items-center gap-1 font-mono text-sm text-on-surface-variant">
          {ancestorsLast.map((ancestorIsLast, index) => (
            <span key={index} className="inline-block w-4 text-center">
              {ancestorIsLast ? ' ' : '│'}
            </span>
          ))}
          {depth > 0 && (
            <span className="inline-block w-4 text-center">{isLast ? '└' : '├'}</span>
          )}
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex h-6 w-6 items-center justify-center rounded text-primary hover:bg-primary/10"
              aria-label={open ? 'طي' : 'توسيع'}
            >
              <Icon name={open ? 'expand_more' : 'chevron_left'} size={18} />
            </button>
          ) : (
            <span className="inline-block w-6" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-sm">
          <span className="font-semibold text-on-surface">
            {node.name}
            {node.converted ? (
              <span className="ms-1 text-secondary" title="محوّل">
                ✔
              </span>
            ) : null}
          </span>
          <span className="tabular-nums text-xs text-on-surface-variant" dir="ltr">
            {node.phone}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
              node.kind === 'customer'
                ? 'bg-secondary/10 text-secondary'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {node.kind === 'customer' ? 'عميل' : 'ترشيح'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-xs text-xs">
          <span className="rounded-md bg-surface-container px-2 py-1 text-on-surface">
            جاب <strong>{node.metrics.referred_count}</strong>
          </span>
          <span className="rounded-md bg-surface-container px-2 py-1 text-on-surface">
            تحويل <strong>{formatRate(node.metrics.conversion_rate)}</strong>
          </span>
          <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">
            مبيعات <strong>{formatSales(node.metrics.total_sales)}</strong>
          </span>
        </div>
      </div>

      {hasChildren && open && (
        <div>
          {node.children.map((child, index) => (
            <NodeRow
              key={`${child.kind}-${child.id}`}
              node={child}
              depth={depth + 1}
              isLast={index === node.children.length - 1}
              ancestorsLast={[...ancestorsLast, isLast]}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ReferralNetworkTree({ nodes }: ReferralNetworkTreeProps) {
  if (nodes.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-outline-variant p-lg text-center text-sm text-on-surface-variant">
        لا توجد شبكة إحالات للعرض
      </p>
    )
  }

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
      {nodes.map((node, index) => (
        <NodeRow
          key={`${node.kind}-${node.id}`}
          node={node}
          depth={0}
          isLast={index === nodes.length - 1}
          ancestorsLast={[]}
        />
      ))}
    </div>
  )
}
