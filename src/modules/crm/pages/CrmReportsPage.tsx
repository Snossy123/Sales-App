import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../api/client'
import type { CrmLeadConversionReport, CrmReportRow } from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { DataTable } from '../../../components/DataTable'
import { KpiCard } from '../../../components/KpiCard'
import { PageHeader } from '../../../components/PageHeader'

type ReportTab = 'by-user' | 'by-contact' | 'conversions'

export function CrmReportsPage() {
  const [tab, setTab] = useState<ReportTab>('by-user')
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  })

  const byUserQuery = useQuery({
    queryKey: ['crm-report-by-user'],
    queryFn: async () => {
      const { data } = await api.get<CrmReportRow[]>('/crm/reports/follow-ups-by-user')
      return data
    },
    enabled: tab === 'by-user',
  })

  const byContactQuery = useQuery({
    queryKey: ['crm-report-by-contact'],
    queryFn: async () => {
      const { data } = await api.get<CrmReportRow[]>('/crm/reports/follow-ups-by-contact')
      return data
    },
    enabled: tab === 'by-contact',
  })

  const conversionsQuery = useQuery({
    queryKey: ['crm-report-conversions', dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data } = await api.get<CrmLeadConversionReport>('/crm/reports/lead-to-customer', {
        params: { from: dateRange.from, to: dateRange.to },
      })
      return data
    },
    enabled: tab === 'conversions',
  })

  const activeQuery =
    tab === 'by-user' ? byUserQuery : tab === 'by-contact' ? byContactQuery : conversionsQuery

  return (
    <div>
      <PageHeader
        title="تقارير CRM"
        subtitle="تحليل المتابعات وتحويل العملاء المحتملين"
      />

      <div className="mb-md flex flex-wrap gap-xs border-b border-outline-variant">
        {(
          [
            { key: 'by-user', label: 'المتابعات حسب المستخدم' },
            { key: 'by-contact', label: 'المتابعات حسب جهة الاتصال' },
            { key: 'conversions', label: 'تحويل العملاء المحتملين' },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`px-md py-sm text-sm font-medium transition-colors ${
              tab === item.key
                ? 'border-b-2 border-primary text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'conversions' && (
        <div className="mb-md flex flex-wrap gap-sm">
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            className="rounded border border-outline-variant px-sm py-2 text-sm"
            dir="ltr"
          />
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="rounded border border-outline-variant px-sm py-2 text-sm"
            dir="ltr"
          />
        </div>
      )}

      <AsyncState
        isLoading={activeQuery.isLoading}
        isError={activeQuery.isError}
        error={activeQuery.error}
      >
        {tab === 'by-user' && (
          <DataTable<CrmReportRow & Record<string, unknown>>
            data={(byUserQuery.data ?? []) as (CrmReportRow & Record<string, unknown>)[]}
            keyExtractor={(row) => `${row.name ?? 'user'}-${row.total}`}
            columns={[
              { key: 'name', header: 'المستخدم' },
              {
                key: 'total',
                header: 'عدد المتابعات',
                className: 'tabular-nums',
              },
            ]}
          />
        )}

        {tab === 'by-contact' && (
          <DataTable<CrmReportRow & Record<string, unknown>>
            data={(byContactQuery.data ?? []) as (CrmReportRow & Record<string, unknown>)[]}
            keyExtractor={(row) => `${row.contact_name ?? 'contact'}-${row.total}`}
            columns={[
              { key: 'contact_name', header: 'جهة الاتصال' },
              {
                key: 'total',
                header: 'عدد المتابعات',
                className: 'tabular-nums',
              },
            ]}
          />
        )}

        {tab === 'conversions' && conversionsQuery.data && (
          <>
            <div className="mb-md grid grid-cols-1 gap-md sm:grid-cols-2">
              <KpiCard
                label="إجمالي التحويلات"
                value={conversionsQuery.data.total_converted}
                icon="person_add"
              />
              <KpiCard
                label="الفترة"
                value={`${conversionsQuery.data.from} → ${conversionsQuery.data.to}`}
                icon="date_range"
              />
            </div>
            <DataTable
              data={(conversionsQuery.data.conversions as unknown as Record<string, unknown>[])}
              keyExtractor={(row) => row.id as number}
              columns={[
                { key: 'name', header: 'الاسم' },
                { key: 'phone', header: 'الهاتف', className: 'tabular-nums' },
                {
                  key: 'converted_on',
                  header: 'تاريخ التحويل',
                  className: 'tabular-nums',
                  render: (row) =>
                    row.converted_on
                      ? new Date(String(row.converted_on)).toLocaleDateString('ar-EG')
                      : '—',
                },
              ]}
            />
          </>
        )}
      </AsyncState>
    </div>
  )
}
