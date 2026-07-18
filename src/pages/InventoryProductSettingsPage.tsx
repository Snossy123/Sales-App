import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { api, getErrorMessage } from '../api/client'
import type { GpsProduct, Service, ServiceCategory } from '../api/types'
import { AsyncState } from '../components/AsyncState'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { ToastBanner } from '../components/ToastBanner'
import { type ApiPaginated } from '../lib/sales'

const inputClass = 'w-full rounded-lg border border-outline-variant px-sm py-2 text-sm'

const emptyForm = {
  name_ar: 'جهاز GPS',
  brand: '',
  cash_annual_price: '',
  cash_permanent_price: '',
  installment_annual_price: '',
  installment_permanent_price: '',
  annual_renewal_price: '',
  external_cash_annual_price: '',
  external_cash_permanent_price: '',
  external_installment_annual_price: '',
  external_installment_permanent_price: '',
  monthly_interest_amount: '',
}

function serviceCashPrice(services: Service[], category: ServiceCategory): number {
  const match = services.find((service) => service.category === category && service.is_active)
  return Number(match?.cash_price ?? match?.default_price ?? 0)
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
    annual_renewal_price: String(product.annual_renewal_price ?? 0),
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
    monthly_interest_amount: String(product.monthly_interest_amount ?? 0),
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
    annual_renewal_price: Number(form.annual_renewal_price || 0),
    cash_price: cashAnnual,
    installment_price: installmentAnnual,
    external_cash_annual_price: Number(form.external_cash_annual_price),
    external_cash_permanent_price: Number(form.external_cash_permanent_price),
    external_installment_annual_price: Number(form.external_installment_annual_price),
    external_installment_permanent_price: Number(form.external_installment_permanent_price),
    monthly_interest_amount: Number(form.monthly_interest_amount || 0),
  }
}

function PriceField({
  id,
  label,
  value,
  onChange,
  required = true,
  min = 0.01,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  min?: number
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-on-surface-variant">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
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

  const servicesQuery = useQuery({
    queryKey: ['services', 'debt-fees'],
    queryFn: async () => {
      const { data } = await api.get<ApiPaginated<Service>>('/services', {
        params: { per_page: 100, 'filter[is_active]': '1' },
      })
      return data.data ?? []
    },
  })

  const debtBasePreview = useMemo(() => {
    const services = servicesQuery.data ?? []
    const uninstallFee = serviceCashPrice(services, 'uninstall')
    const installationFee = serviceCashPrice(services, 'installation')
    const softwareFee = serviceCashPrice(services, 'software')
    const cashAnnual = Number(form.cash_annual_price || 0)
    const cashAnnualPortion = Math.round(cashAnnual * 0.25 * 100) / 100
    const baseTotal = uninstallFee + installationFee + softwareFee + cashAnnualPortion
    return {
      uninstallFee,
      installationFee,
      softwareFee,
      cashAnnualPortion,
      baseTotal,
    }
  }, [servicesQuery.data, form.cash_annual_price])

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
            <h3 className="text-sm font-bold text-on-surface">تجديد الاشتراك</h3>
            <p className="text-xs text-on-surface-variant">
              سعر التجديد السنوي مبلغ ثابت من الإعدادات. تجديد مدى الحياة = 25% من كاش الاشتراك السنوي.
            </p>
            <div className="grid gap-md sm:grid-cols-2">
              <PriceField
                id="gps-annual-renewal"
                label="سعر التجديد السنوي (ج.م)"
                value={form.annual_renewal_price}
                onChange={(value) => setForm({ ...form, annual_renewal_price: value })}
                required={false}
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
              تُحسب عند الاسترجاع: رسوم فك + تركيب + سوفت + 25% من كاش الاشتراك السنوي + (قيمة
              فائدة كل شهر × عدد الشهور من تاريخ تنفيذ التركيب).
            </p>
            <PriceField
              id="gps-monthly-interest"
              label="قيمة فائدة كل شهر (ج.م)"
              value={form.monthly_interest_amount}
              onChange={(value) => setForm({ ...form, monthly_interest_amount: value })}
              required={false}
              min={0}
            />
            <div className="space-y-1 rounded-lg border border-outline-variant/60 bg-surface-container-lowest px-sm py-sm text-xs text-on-surface-variant">
              <p className="font-medium text-on-surface">البنود الثابتة (بدون الفائدة الشهرية)</p>
              <p>رسوم فك: {debtBasePreview.uninstallFee.toLocaleString('ar-EG')} ج.م</p>
              <p>رسوم تركيب: {debtBasePreview.installationFee.toLocaleString('ar-EG')} ج.م</p>
              <p>رسوم سوفت: {debtBasePreview.softwareFee.toLocaleString('ar-EG')} ج.م</p>
              <p>
                25% من كاش اشتراك سنوي:{' '}
                {debtBasePreview.cashAnnualPortion.toLocaleString('ar-EG')} ج.م
              </p>
              <p className="pt-1 font-medium text-on-surface">
                الإجمالي الثابت: {debtBasePreview.baseTotal.toLocaleString('ar-EG')} ج.م
              </p>
              <p className="text-[11px]">
                أسعار الفك/التركيب/السوفت تُسحب من أول خدمة مفعّلة لكل تصنيف في صفحة الخدمات.
              </p>
            </div>
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
