import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../api/client'
import type { ContractTemplate, Service } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { SalesPageShell } from '../components/SalesPageShell'

const inputClass = 'w-full rounded border border-outline-variant px-sm py-2 text-sm'

interface ServiceForm {
  code: string
  name: string
  name_ar: string
  default_price: number
  is_active: boolean
  description: string
  contract_template_key: string
}

const emptyForm: ServiceForm = {
  code: '',
  name: '',
  name_ar: '',
  default_price: 0,
  is_active: true,
  description: '',
  contract_template_key: '',
}

export function ServiceFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const params = useParams<{ id?: string }>()
  const serviceId = params.id ? Number(params.id) : null
  const isEdit = serviceId != null
  const [form, setForm] = useState<ServiceForm>(emptyForm)

  const serviceQuery = useQuery({
    queryKey: ['service', serviceId],
    queryFn: async () => {
      const { data } = await api.get<Service>(`/services/${serviceId}`)
      return data
    },
    enabled: isEdit,
  })

  const templatesQuery = useQuery({
    queryKey: ['contract-templates'],
    queryFn: async () => {
      const { data } = await api.get<ContractTemplate[]>('/contract-templates')
      return data
    },
  })

  useEffect(() => {
    const service = serviceQuery.data
    if (service) {
      setForm({
        code: service.code ?? '',
        name: service.name,
        name_ar: service.name_ar ?? '',
        default_price: Number(service.default_price),
        is_active: service.is_active,
        description: service.description ?? '',
        contract_template_key: service.contract_template_key ?? '',
      })
    }
  }, [serviceQuery.data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code.trim() || null,
        name: (form.name_ar || form.name).trim(),
        name_ar: form.name_ar.trim() || null,
        default_price: form.default_price,
        is_active: form.is_active,
        description: form.description.trim() || null,
        contract_template_key: form.contract_template_key || null,
      }
      if (isEdit) {
        await api.put(`/services/${serviceId}`, payload)
      } else {
        await api.post('/services', payload)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      navigate('/services')
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!(form.name_ar || form.name).trim()) return
    saveMutation.mutate()
  }

  return (
    <SalesPageShell
      title={isEdit ? 'تعديل خدمة' : 'إضافة خدمة'}
      subtitle="الخدمات والرسوم التي تقدمها الشركة"
      actions={
        <Link
          to="/services"
          className="flex items-center gap-xs rounded-lg border border-outline-variant px-md py-sm text-sm font-bold text-on-surface-variant"
        >
          <Icon name="arrow_forward" size={18} />
          رجوع للقائمة
        </Link>
      }
    >
      <AsyncState
        isLoading={isEdit && serviceQuery.isLoading}
        isError={isEdit && serviceQuery.isError}
        error={serviceQuery.error}
      >
        <form
          onSubmit={handleSubmit}
          className="grid max-w-2xl gap-md rounded-lg border border-outline-variant bg-surface-container-lowest p-md"
        >
          <div className="grid gap-sm sm:grid-cols-2">
            <div>
              <label className="mb-xs block text-sm text-on-surface-variant">اسم الخدمة *</label>
              <input
                value={form.name_ar}
                onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
                placeholder="مثال: رسوم تركيب"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-xs block text-sm text-on-surface-variant">الكود</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="SRV-001"
                dir="ltr"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-xs block text-sm text-on-surface-variant">
                السعر (ج.م)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.default_price}
                onChange={(e) => setForm({ ...form, default_price: Number(e.target.value) })}
                className={`${inputClass} tabular-nums`}
              />
            </div>
          </div>

          <div>
            <label className="mb-xs block text-sm text-on-surface-variant">نموذج العقد (اختياري)</label>
            <select
              value={form.contract_template_key}
              onChange={(e) => setForm({ ...form, contract_template_key: e.target.value })}
              className={inputClass}
            >
              <option value="">بدون نموذج</option>
              {(templatesQuery.data ?? []).map((template) => (
                <option key={template.key} value={template.key}>
                  {template.name_ar}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-xs block text-sm text-on-surface-variant">وصف (اختياري)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className={inputClass}
            />
          </div>

          <label className="flex items-center gap-sm text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4"
            />
            خدمة مفعّلة
          </label>

          {saveMutation.isError && (
            <p className="text-sm text-error">{getErrorMessage(saveMutation.error)}</p>
          )}

          <div className="flex gap-sm">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex items-center gap-xs rounded-lg bg-secondary px-md py-sm text-sm font-bold text-on-secondary disabled:opacity-50"
            >
              <Icon name="save" size={18} />
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الخدمة'}
            </button>
            <Link
              to="/services"
              className="rounded-lg border border-outline-variant px-md py-sm text-sm font-bold text-on-surface-variant"
            >
              إلغاء
            </Link>
          </div>
        </form>
      </AsyncState>
    </SalesPageShell>
  )
}
