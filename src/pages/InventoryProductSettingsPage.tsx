import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { api, getErrorMessage } from '../api/client'
import type { GpsProduct } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { ToastBanner } from '../components/ToastBanner'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

const emptyForm = {
  name_ar: 'جهاز GPS',
  brand: '',
  sell_price: '',
}

type GpsProductForm = typeof emptyForm

function toForm(product: GpsProduct): GpsProductForm {
  return {
    name_ar: product.name_ar || product.name,
    brand: product.brand ?? '',
    sell_price: String(product.sell_price),
  }
}

function toPayload(form: GpsProductForm) {
  const nameAr = form.name_ar.trim()
  return {
    name_ar: nameAr,
    name: nameAr,
    brand: form.brand.trim() || null,
    sell_price: Number(form.sell_price),
  }
}

export function InventoryProductSettingsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<GpsProductForm>(emptyForm)
  const [isNew, setIsNew] = useState(true)
  const [successToast, setSuccessToast] = useState('')

  const query = useQuery({
    queryKey: ['gps-product'],
    queryFn: async () => {
      const { data } = await api.get<GpsProduct>('/gps-product')
      return data
    },
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return false
      }
      return failureCount < 2
    },
  })

  useEffect(() => {
    if (query.data) {
      setForm(toForm(query.data))
      setIsNew(false)
      return
    }

    if (axios.isAxiosError(query.error) && query.error.response?.status === 404) {
      setForm(emptyForm)
      setIsNew(true)
    }
  }, [query.data, query.error])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.put<GpsProduct>('/gps-product', toPayload(form))
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gps-product'] })
      queryClient.invalidateQueries({ queryKey: ['gps-stock'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setSuccessToast(isNew ? 'تم إعداد منتج GPS بنجاح' : 'تم حفظ بيانات المنتج')
      setIsNew(false)
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  const productMissing = axios.isAxiosError(query.error) && query.error.response?.status === 404

  return (
    <div>
      <PageHeader
        title="إعدادات منتج GPS"
        subtitle="عرّف نوع الجهاز والأسعار قبل تسجيل المخزون أو البيع من نقطة البيع"
        actions={
          <Link
            to="/inventory"
            className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-md py-sm text-sm font-medium text-on-surface hover:bg-surface-container"
          >
            <Icon name="arrow_forward" size={18} />
            مخزون GPS
          </Link>
        }
      />

      {successToast && (
        <ToastBanner message={successToast} onDismiss={() => setSuccessToast('')} />
      )}

      {productMissing && (
        <div className="mb-md rounded-xl border border-tertiary/30 bg-tertiary/5 p-md">
          <p className="font-medium text-on-surface">لم يتم إعداد منتج GPS بعد</p>
          <p className="mt-xs text-sm text-on-surface-variant">
            أكمل البيانات أدناه ثم احفظ — بعدها يمكنك تسجيل المخزون من صفحة «تسجيل مخزون».
          </p>
        </div>
      )}

      <AsyncState
        isLoading={query.isLoading}
        isError={query.isError && !productMissing}
        error={query.error}
      >
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-lg space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div>
            <label htmlFor="gps-product-name-ar" className="mb-1 block text-sm font-medium text-on-surface-variant">
              اسم المنتج
            </label>
            <input
              id="gps-product-name-ar"
              value={form.name_ar}
              onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="gps-product-brand" className="mb-1 block text-sm font-medium text-on-surface-variant">
              الماركة
            </label>
            <input
              id="gps-product-brand"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="gps-product-sell" className="mb-1 block text-sm font-medium text-on-surface-variant">
              سعر البيع (ج.م)
            </label>
            <input
              id="gps-product-sell"
              type="number"
              min={0.01}
              step="0.01"
              value={form.sell_price}
              onChange={(e) => setForm({ ...form, sell_price: e.target.value })}
              required
              dir="ltr"
              className={`${inputClass} tabular-nums`}
            />
          </div>

          {saveMutation.isError && (
            <p className="text-sm text-error">{getErrorMessage(saveMutation.error)}</p>
          )}

          <div className="flex flex-wrap gap-sm">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary disabled:opacity-50"
            >
              {saveMutation.isPending ? 'جاري الحفظ...' : isNew ? 'إعداد المنتج' : 'حفظ التعديلات'}
            </button>
            {isNew && (
              <button
                type="button"
                onClick={() => navigate('/inventory')}
                className="rounded-lg border border-outline-variant px-md py-2 text-sm font-medium text-on-surface hover:bg-surface-container"
              >
                إلغاء
              </button>
            )}
          </div>
        </form>
      </AsyncState>
    </div>
  )
}
