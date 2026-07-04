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
  cash_annual_price: '',
  cash_permanent_price: '',
  installment_annual_price: '',
  installment_permanent_price: '',
  external_cash_annual_price: '',
  external_cash_permanent_price: '',
  external_installment_annual_price: '',
  external_installment_permanent_price: '',
  device_debt_price: '',
}

type GpsProductForm = typeof emptyForm

function toForm(product: GpsProduct): GpsProductForm {
  const cashAnnual = product.cash_annual_price ?? product.cash_price ?? product.sell_price
  const cashPermanent = product.cash_permanent_price ?? cashAnnual
  const installmentAnnual = product.installment_annual_price ?? product.installment_price ?? product.sell_price
  const installmentPermanent = product.installment_permanent_price ?? installmentAnnual

  return {
    name_ar: product.name_ar || product.name,
    brand: product.brand ?? '',
    cash_annual_price: String(cashAnnual),
    cash_permanent_price: String(cashPermanent),
    installment_annual_price: String(installmentAnnual),
    installment_permanent_price: String(installmentPermanent),
    external_cash_annual_price: String(
      product.external_cash_annual_price ?? cashAnnual,
    ),
    external_cash_permanent_price: String(
      product.external_cash_permanent_price ?? cashAnnual,
    ),
    external_installment_annual_price: String(
      product.external_installment_annual_price ?? installmentAnnual,
    ),
    external_installment_permanent_price: String(
      product.external_installment_permanent_price ?? installmentAnnual,
    ),
    device_debt_price: String(product.device_debt_price ?? 0),
  }
}

function toPayload(form: GpsProductForm) {
  const nameAr = form.name_ar.trim()
  const cashAnnual = Number(form.cash_annual_price)
  const installmentAnnual = Number(form.installment_annual_price)

  return {
    name_ar: nameAr,
    name: nameAr,
    brand: form.brand.trim() || null,
    cash_annual_price: cashAnnual,
    cash_permanent_price: Number(form.cash_permanent_price),
    installment_annual_price: installmentAnnual,
    installment_permanent_price: Number(form.installment_permanent_price),
    cash_price: cashAnnual,
    installment_price: installmentAnnual,
    external_cash_annual_price: Number(form.external_cash_annual_price),
    external_cash_permanent_price: Number(form.external_cash_permanent_price),
    external_installment_annual_price: Number(form.external_installment_annual_price),
    external_installment_permanent_price: Number(form.external_installment_permanent_price),
    device_debt_price: Number(form.device_debt_price || 0),
  }
}

function PriceField({
  id,
  label,
  value,
  onChange,
  required = true,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-on-surface-variant">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={0.01}
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        dir="ltr"
        className={`${inputClass} tabular-nums`}
      />
    </div>
  )
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
          className="mx-auto max-w-2xl space-y-md rounded-xl border border-outline-variant bg-surface-container-lowest p-lg"
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

          <section className="space-y-sm rounded-lg border border-outline-variant/70 bg-surface-container-low/40 p-sm">
            <h3 className="text-sm font-bold text-on-surface">داخل الشركة — تعاقد جديد</h3>
            <p className="text-xs text-on-surface-variant">
              سعر بيع جهاز من مخزون الشركة حسب طريقة الدفع ونوع الاشتراك (سنوي / مدى الحياة).
            </p>
            <div className="grid gap-md sm:grid-cols-2">
              <PriceField
                id="gps-internal-cash-annual"
                label="كاش — اشتراك سنوي (ج.م)"
                value={form.cash_annual_price}
                onChange={(value) => setForm({ ...form, cash_annual_price: value })}
              />
              <PriceField
                id="gps-internal-cash-permanent"
                label="كاش — مدى الحياة (ج.م)"
                value={form.cash_permanent_price}
                onChange={(value) => setForm({ ...form, cash_permanent_price: value })}
              />
              <PriceField
                id="gps-internal-installment-annual"
                label="تقسيط — اشتراك سنوي (ج.م)"
                value={form.installment_annual_price}
                onChange={(value) => setForm({ ...form, installment_annual_price: value })}
              />
              <PriceField
                id="gps-internal-installment-permanent"
                label="تقسيط — مدى الحياة (ج.م)"
                value={form.installment_permanent_price}
                onChange={(value) => setForm({ ...form, installment_permanent_price: value })}
              />
            </div>
          </section>

          <section className="space-y-sm rounded-lg border border-outline-variant/70 bg-surface-container-low/40 p-sm">
            <h3 className="text-sm font-bold text-on-surface">خارج الشركة — جهاز خارجي</h3>
            <p className="text-xs text-on-surface-variant">
              سعر منفصل حسب طريقة الدفع ونوع الاشتراك (سنوي / مدى الحياة).
            </p>
            <div className="grid gap-md sm:grid-cols-2">
              <PriceField
                id="gps-external-cash-annual"
                label="كاش — اشتراك سنوي (ج.م)"
                value={form.external_cash_annual_price}
                onChange={(value) => setForm({ ...form, external_cash_annual_price: value })}
              />
              <PriceField
                id="gps-external-cash-permanent"
                label="كاش — مدى الحياة (ج.م)"
                value={form.external_cash_permanent_price}
                onChange={(value) => setForm({ ...form, external_cash_permanent_price: value })}
              />
              <PriceField
                id="gps-external-installment-annual"
                label="تقسيط — اشتراك سنوي (ج.م)"
                value={form.external_installment_annual_price}
                onChange={(value) => setForm({ ...form, external_installment_annual_price: value })}
              />
              <PriceField
                id="gps-external-installment-permanent"
                label="تقسيط — مدى الحياة (ج.م)"
                value={form.external_installment_permanent_price}
                onChange={(value) => setForm({ ...form, external_installment_permanent_price: value })}
              />
            </div>
          </section>

          <section className="space-y-sm rounded-lg border border-outline-variant/70 bg-surface-container-low/40 p-sm">
            <h3 className="text-sm font-bold text-on-surface">مديونية الجهاز</h3>
            <p className="text-xs text-on-surface-variant">
              تُستخدم عند حساب استرجاع العقد — الفرق بين المدفوع ومديونية الجهاز يُصرف كأمر دفع للعميل.
            </p>
            <PriceField
              id="gps-device-debt"
              label="مديونية الجهاز (ج.م)"
              value={form.device_debt_price}
              onChange={(value) => setForm({ ...form, device_debt_price: value })}
            />
          </section>

          <p className="text-xs text-on-surface-variant">
            تجديد الاشتراك لجهاز داخل الشركة يُحسب تلقائياً بنسبة 25% من سعر الكاش السنوي الداخلي.
          </p>

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
