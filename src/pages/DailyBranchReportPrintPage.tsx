import { useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { DailyBranchReport } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { DailyBranchReportPrintDocument } from '../components/reports/DailyBranchReportPrintDocument'
import { Icon } from '../components/Icon'
import '../styles/daily-branch-report.css'

export function DailyBranchReportPrintPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const autoPrint = searchParams.get('print') === '1'

  const query = useQuery({
    queryKey: ['daily-branch-report', 'print', id],
    queryFn: async () => {
      const { data } = await api.get<DailyBranchReport>(`/daily-branch-reports/${id}`, {
        params: { include: 'branch' },
      })
      return data
    },
    enabled: Boolean(id),
  })

  useEffect(() => {
    if (autoPrint && query.data) {
      const timer = window.setTimeout(() => window.print(), 400)
      return () => window.clearTimeout(timer)
    }
  }, [autoPrint, query.data])

  return (
    <div className="daily-report-page">
      <div className="daily-report-toolbar no-print">
        <Link
          to="/daily-reports"
          className="flex items-center gap-1 rounded-lg border border-outline-variant bg-white px-md py-sm text-sm"
        >
          <Icon name="arrow_forward" size={18} />
          رجوع
        </Link>
        <button type="button" onClick={() => window.print()}>
          <Icon name="print" size={18} />
          طباعة البيان
        </button>
      </div>

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {query.data && <DailyBranchReportPrintDocument report={query.data} />}
      </AsyncState>
    </div>
  )
}
