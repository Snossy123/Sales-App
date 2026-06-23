import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { HrmUserSalesTarget, PaginatedResponse } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { SalesPageShell } from '../../../components/SalesPageShell'
import { SalesTargetFormModal } from '../components/SalesTargetFormModal'
import { SalesTargetProgressCard } from '../components/SalesTargetProgressCard'

export function HrmSalesTargetsPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<HrmUserSalesTarget | null>(null)

  const targetsQuery = useQuery({
    queryKey: ['hrm', 'sales-targets'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<HrmUserSalesTarget>>('/hrm/sales-targets', {
        params: { per_page: 100, include: 'employee' },
      })
      return data.data ?? []
    },
  })

  const today = new Date().toISOString().split('T')[0]
  const activeTargets = (targetsQuery.data ?? []).filter(
    (t) => t.target_start <= today && t.target_end >= today,
  )

  return (
    <SalesPageShell
      title="أهداف المبيعات"
      subtitle="تحديد أهداف عدد التعاقدات لكل موظف"
      actions={
        <button
          type="button"
          onClick={() => {
            setEditTarget(null)
            setModalOpen(true)
          }}
          className="rounded-lg bg-primary px-md py-sm text-sm font-medium text-on-primary"
        >
          هدف جديد
        </button>
      }
    >
      {activeTargets.length > 0 && (
        <div className="mb-md grid gap-sm sm:grid-cols-2 lg:grid-cols-3">
          {activeTargets.map((target) => (
            <SalesTargetProgressCard key={target.id} target={target} compact />
          ))}
        </div>
      )}

      <AsyncState
        isLoading={targetsQuery.isLoading}
        isError={targetsQuery.isError}
        error={targetsQuery.error}
      >
        <DataTable<HrmUserSalesTarget & Record<string, unknown>>
          data={(targetsQuery.data ?? []) as (HrmUserSalesTarget & Record<string, unknown>)[]}
          keyExtractor={(row) => row.id}
          pageSize={15}
          emptyMessage="لا أهداف مبيعات"
          columns={[
            {
              key: 'employee',
              header: 'الموظف',
              render: (row) =>
                (row as HrmUserSalesTarget & { employee?: { name?: string } }).employee?.name ??
                `#${row.employee_id}`,
            },
            { key: 'target_start', header: 'من' },
            { key: 'target_end', header: 'إلى' },
            {
              key: 'progress',
              header: 'التقدم',
              render: (row) => `${row.achieved_count ?? 0}/${row.target_count ?? 0}`,
            },
            {
              key: 'commission_percent',
              header: 'العمولة %',
              render: (row) => (row.commission_percent != null ? `${row.commission_percent}%` : '—'),
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditTarget(row as HrmUserSalesTarget)
                      setModalOpen(true)
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    تعديل
                  </button>
                  <Link
                    to={`/hrm/employees/${row.employee_id}`}
                    className="text-sm text-on-surface-variant hover:underline"
                  >
                    الموظف
                  </Link>
                </div>
              ),
            },
          ]}
        />
      </AsyncState>

      <SalesTargetFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        target={editTarget}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['hrm', 'sales-targets'] })}
      />
    </SalesPageShell>
  )
}
