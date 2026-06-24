import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Department, PaginatedResponse, StockReceipt } from '../api/types'
import { AddStockForm } from '../components/AddStockForm'
import { AsyncState } from '../components/AsyncState'
import { DataTable } from '../components/DataTable'
import { Icon } from '../components/Icon'
import { InsightBanner } from '../components/InsightBanner'
import { PageHeader } from '../components/PageHeader'
import { getUserRole } from '../lib/permissions'
import { useAuthStore } from '../stores/authStore'

const steps = [
  { icon: 'inventory_2', title: 'تسجيل المخزون', desc: 'أضف أجهزة GPS للإدارة (كمية معلقة)' },
  { icon: 'local_shipping', title: 'توزيع على الفروع', desc: 'من صفحة التوزيع — وزّع على الفرع المطلوب' },
  { icon: 'point_of_sale', title: 'بيع من POS', desc: 'أكمل تعاقد GPS من نقطة البيع' },
]

function formatDate(value?: string): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function InventoryAddStockPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = getUserRole(user) === 'super_admin'

  const departmentsQuery = useQuery({
    queryKey: ['departments', 'add-stock'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Department>>('/administrations', {
        params: { per_page: 100 },
      })
      return data.data
    },
  })

  const receiptsQuery = useQuery({
    queryKey: ['stock-receipts'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<StockReceipt>>('/stock-receipts', {
        params: { per_page: 20, include: 'administration,receivedBy' },
      })
      return data.data
    },
  })

  return (
    <div>
      <PageHeader
        title="تسجيل مخزون جديد"
        subtitle="إضافة أجهزة GPS جديدة للمخزون المركزي قبل توزيعها على الفروع"
        actions={
          <Link
            to="/inventory/transfers"
            className="flex items-center gap-xs rounded-lg border border-outline-variant px-md py-sm text-sm"
          >
            <Icon name="local_shipping" size={18} />
            سجل التوزيع
          </Link>
        }
      />

      {isSuperAdmin && (
        <div className="mb-md">
          <InsightBanner
            variant="info"
            to="/admin/settings"
            message="لتفعيل البيع بدون مخزون فعلي (مخزون سالب) من نقطة البيع، فعّل «السماح بالمخزون السالب» من إعدادات النظام → المبيعات."
          />
        </div>
      )}

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

      <div className="mb-lg mx-auto max-w-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-lg">
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

      <h2 className="mb-sm text-base font-bold">سجل إضافات المخزون</h2>
      <AsyncState
        isLoading={receiptsQuery.isLoading}
        isError={receiptsQuery.isError}
        error={receiptsQuery.error}
      >
        <DataTable
          data={receiptsQuery.data ?? []}
          keyExtractor={(row) => row.id}
          emptyMessage="لا توجد إضافات مخزون مسجّلة بعد"
          columns={[
            {
              key: 'created_at',
              header: 'التاريخ',
              render: (row) => formatDate(row.created_at),
            },
            {
              key: 'administration',
              header: 'الإدارة',
              render: (row) => row.administration?.name_ar || row.administration?.name || '—',
            },
            {
              key: 'quantity',
              header: 'الكمية',
              className: 'tabular-nums font-medium',
              render: (row) => row.quantity,
            },
            {
              key: 'received_by',
              header: 'بواسطة',
              render: (row) => row.receivedBy?.name || '—',
            },
          ]}
        />
      </AsyncState>
    </div>
  )
}
