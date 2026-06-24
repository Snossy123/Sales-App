import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { ContractTemplate } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'
import { StatusBadge } from '../components/StatusBadge'

const categoryLabels: Record<string, string> = {
  gps: 'تعاقدات GPS',
  service: 'خدمات',
}

export function ContractTemplatesPage() {
  const query = useQuery({
    queryKey: ['contract-templates'],
    queryFn: async () => {
      const { data } = await api.get<ContractTemplate[]>('/contract-templates')
      return data
    },
  })

  const templates = query.data ?? []

  return (
    <SalesPageShell
      title="نماذج العقود"
      subtitle="معاينة نماذج العقود والإيصالات المتاحة في النظام"
      actions={
        <Link
          to="/services"
          className="flex items-center gap-xs rounded-lg border border-outline-variant px-md py-sm text-sm font-bold text-on-surface-variant"
        >
          <Icon name="arrow_forward" size={18} />
          رجوع للخدمات
        </Link>
      }
    >
      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        <div className="grid gap-md md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <article
              key={template.key}
              className="flex flex-col rounded-lg border border-outline-variant bg-surface-container-lowest p-md"
            >
              <div className="mb-sm flex items-start justify-between gap-sm">
                <h2 className="font-bold text-on-surface">{template.name_ar}</h2>
                {template.category && (
                  <StatusBadge
                    status="active"
                    label={categoryLabels[template.category] ?? template.category}
                  />
                )}
              </div>
              <p className="mb-md flex-1 text-sm text-on-surface-variant">{template.description_ar}</p>
              <Link
                to={`/contract-templates/${template.key}/preview`}
                className="inline-flex items-center justify-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary"
              >
                <Icon name="visibility" size={18} />
                معاينة
              </Link>
            </article>
          ))}
        </div>
      </AsyncState>
    </SalesPageShell>
  )
}
