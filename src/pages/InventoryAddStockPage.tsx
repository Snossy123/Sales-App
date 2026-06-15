import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Department, PaginatedResponse } from '../api/types'
import { AddStockForm } from '../components/AddStockForm'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'

const steps = [
  { icon: 'inventory_2', title: 'تسجيل المخزون', desc: 'أضف أجهزة GPS للإدارة (كمية معلقة)' },
  { icon: 'local_shipping', title: 'توزيع على الفروع', desc: 'من صفحة مخزون GPS — وزّع على الفرع المطلوب' },
  { icon: 'point_of_sale', title: 'بيع من POS', desc: 'أكمل تعاقد GPS من نقطة البيع' },
]

export function InventoryAddStockPage() {
  const navigate = useNavigate()

  const departmentsQuery = useQuery({
    queryKey: ['departments', 'add-stock'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Department>>('/departments', {
        params: { per_page: 100 },
      })
      return data.data
    },
  })

  return (
    <div>
      <PageHeader
        title="تسجيل مخزون جديد"
        subtitle="إضافة أجهزة GPS جديدة للمخزون المركزي قبل توزيعها على الفروع"
      />

      <div className="mb-lg grid grid-cols-1 gap-md md:grid-cols-3">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="flex gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-md"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-primary">
              <Icon name={step.icon} size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-on-surface-variant">الخطوة {index + 1}</p>
              <p className="font-medium text-on-surface">{step.title}</p>
              <p className="mt-0.5 text-sm text-on-surface-variant">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
        <AsyncState
          isLoading={departmentsQuery.isLoading}
          isError={departmentsQuery.isError}
          error={departmentsQuery.error}
        >
          <AddStockForm
            departments={departmentsQuery.data ?? []}
            onSuccess={() => navigate('/inventory', { state: { stockAdded: true } })}
          />
        </AsyncState>
      </div>
    </div>
  )
}
