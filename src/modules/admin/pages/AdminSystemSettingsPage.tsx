import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type {
  GeneralSettings,
  MessagingSettings,
  OrganizationSettings,
  SalesSettings,
  SecuritySettings,
  CustomerMessageLogEntry,
  PaginatedResponse,
} from '../../../api/types'
import { AsyncState } from '../../../components/AsyncState'
import { Icon } from '../../../components/Icon'
import { KpiCard } from '../../../components/KpiCard'
import { PageHeader } from '../../../components/PageHeader'
import { ToastBanner } from '../../../components/ToastBanner'
import { useOrgSettingsStore } from '../../../stores/orgSettingsStore'
import { LogoUploader } from '../components/LogoUploader'
import { ModuleToggleCard } from '../components/ModuleToggleCard'
import { SettingsField, SettingsSectionCard, settingsInputClass, settingsToggleClass } from '../components/SettingsSectionCard'
import { SettingsTabNav } from '../components/SettingsTabNav'
import {
  CURRENCY_OPTIONS,
  DEFAULT_GENERAL,
  DEFAULT_MESSAGING,
  DEFAULT_SALES,
  DEFAULT_SECURITY,
  MESSAGING_PLACEHOLDERS,
  mergeSettings,
  MODULE_DEFINITIONS,
  PAYMENT_TERM_OPTIONS,
  TIMEZONE_OPTIONS,
  type SettingsTab,
} from '../lib/systemSettingsCatalog'

interface FormState {
  name: string
  name_ar: string
  phone: string
  email: string
  address: string
  enabled_modules: string[]
  general: GeneralSettings
  sales: SalesSettings
  security: SecuritySettings
  messaging: MessagingSettings
}

function buildForm(data: OrganizationSettings): FormState {
  const org = data.organization
  const messagingPartial = data.settings?.messaging
  return {
    name: org.name ?? '',
    name_ar: org.name_ar ?? '',
    phone: org.phone ?? '',
    email: org.email ?? '',
    address: org.address ?? '',
    enabled_modules: org.enabled_modules ?? [],
    general: mergeSettings(DEFAULT_GENERAL, data.settings?.general),
    sales: mergeSettings(DEFAULT_SALES, data.settings?.sales),
    security: mergeSettings(DEFAULT_SECURITY, data.settings?.security),
    messaging: {
      ...mergeSettings(DEFAULT_MESSAGING, messagingPartial),
      templates: {
        ...DEFAULT_MESSAGING.templates,
        ...messagingPartial?.templates,
      },
    },
  }
}

function formatUpdatedAt(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
}

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  contract_welcome: 'ترحيب التعاقد',
  contract_approved: 'اعتماد التعاقد',
  installment_reminder: 'تذكير قسط',
  installment_paid: 'تأكيد سداد',
}

const MESSAGE_STATUS_LABELS: Record<string, string> = {
  sent: 'مُرسل',
  queued: 'في الانتظار',
  failed: 'فشل',
  skipped: 'تخطي',
}

export function AdminSystemSettingsPage() {
  const queryClient = useQueryClient()
  const setFromApi = useOrgSettingsStore((s) => s.setFromApi)
  const updateGeneral = useOrgSettingsStore((s) => s.updateGeneral)
  const [activeTab, setActiveTab] = useState<SettingsTab>('branding')
  const [toast, setToast] = useState('')
  const [form, setForm] = useState<FormState | null>(null)

  const query = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationSettings>('/admin/settings')
      return data
    },
  })

  const logsQuery = useQuery({
    queryKey: ['messaging', 'logs'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<CustomerMessageLogEntry>>('/messaging/logs', {
        params: { per_page: 50 },
      })
      return data
    },
    enabled: activeTab === 'messaging',
  })

  useEffect(() => {
    if (query.data) {
      setForm(buildForm(query.data))
      setFromApi({
        organization: query.data.organization,
        settings: {
          general: mergeSettings(DEFAULT_GENERAL, query.data.settings?.general),
          security: mergeSettings(DEFAULT_SECURITY, query.data.settings?.security),
        },
      })
    }
  }, [query.data, setFromApi])

  const saveMutation = useMutation({
    mutationFn: async (payload: FormState) => {
      const { data } = await api.put<OrganizationSettings>('/admin/settings', {
        name: payload.name,
        name_ar: payload.name_ar,
        phone: payload.phone,
        email: payload.email,
        address: payload.address,
        enabled_modules: payload.enabled_modules,
        settings: {
          general: payload.general,
          sales: payload.sales,
          security: payload.security,
          messaging: payload.messaging,
        },
      })
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'bootstrap'] })
      setForm(buildForm(data))
      setFromApi({
        organization: data.organization,
        settings: {
          general: mergeSettings(DEFAULT_GENERAL, data.settings?.general),
          security: mergeSettings(DEFAULT_SECURITY, data.settings?.security),
        },
      })
      updateGeneral(mergeSettings(DEFAULT_GENERAL, data.settings?.general))
      setToast('تم حفظ الإعدادات')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const logoMutation = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData()
      body.append('logo', file)
      const { data } = await api.post<OrganizationSettings & { logo_url?: string }>(
        '/admin/settings/logo',
        body,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
      if (form && data.settings?.general) {
        setForm({ ...form, general: { ...form.general, logo_url: data.settings.general.logo_url } })
      }
      setToast('تم تحديث الشعار')
    },
    onError: (err) => setToast(getErrorMessage(err)),
  })

  const enabledCount = useMemo(
    () => (form?.enabled_modules.length ?? 0) + 1,
    [form?.enabled_modules],
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (form) saveMutation.mutate(form)
  }

  const patch = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const patchGeneral = (partial: Partial<GeneralSettings>) => {
    setForm((prev) => (prev ? { ...prev, general: { ...prev.general, ...partial } } : prev))
  }

  const patchSales = (partial: Partial<SalesSettings>) => {
    setForm((prev) => (prev ? { ...prev, sales: { ...prev.sales, ...partial } } : prev))
  }

  const patchSecurity = (partial: Partial<SecuritySettings>) => {
    setForm((prev) => (prev ? { ...prev, security: { ...prev.security, ...partial } } : prev))
  }

  const patchMessaging = (partial: Partial<MessagingSettings>) => {
    setForm((prev) => (prev ? { ...prev, messaging: { ...prev.messaging, ...partial } } : prev))
  }

  const patchTemplate = (key: keyof NonNullable<MessagingSettings['templates']>, value: string) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            messaging: {
              ...prev.messaging,
              templates: { ...prev.messaging.templates, [key]: value },
            },
          }
        : prev,
    )
  }

  const toggleModule = (key: string) => {
    if (!form) return
    const enabled = form.enabled_modules.includes(key)
    patch(
      'enabled_modules',
      enabled ? form.enabled_modules.filter((m) => m !== key) : [...form.enabled_modules, key],
    )
  }

  return (
    <div>
      <PageHeader
        title="إعدادات النظام"
        subtitle="مركز التحكم في هوية المنظمة، التشغيل، الأمان، والوحدات"
        actions={
          form && (
            <button
              type="submit"
              form="system-settings-form"
              disabled={saveMutation.isPending}
              className="flex items-center gap-xs rounded-lg bg-primary px-md py-2 text-sm font-bold text-on-primary disabled:opacity-50"
            >
              <Icon name="save" size={18} className="no-flip" />
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>
          )
        }
      />

      {toast && <ToastBanner message={toast} onDismiss={() => setToast('')} />}

      <AsyncState isLoading={query.isLoading} isError={query.isError} error={query.error}>
        {form && (
          <>
            <div className="mb-md grid gap-sm sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard
                label="حالة النظام"
                value={query.data?.organization.is_active ? 'نشط' : 'موقوف'}
                icon="verified"
              />
              <KpiCard label="الوحدات المفعّلة" value={String(enabledCount)} icon="widgets" />
              <KpiCard
                label="آخر تحديث"
                value={formatUpdatedAt(query.data?.organization.updated_at)}
                icon="schedule"
              />
            </div>

            <SettingsTabNav active={activeTab} onChange={setActiveTab} />

            <form id="system-settings-form" onSubmit={handleSubmit} className="space-y-md">
              {activeTab === 'branding' && (
                <SettingsSectionCard
                  title="الهوية والعلامة التجارية"
                  description="اسم المنظمة، الشعار، وبيانات الاتصال الرسمية"
                >
                  <SettingsField label="شعار المنظمة" hint="يظهر في الشريط الجانبي والتقارير">
                    <LogoUploader
                      logoUrl={form.general.logo_url}
                      uploading={logoMutation.isPending}
                      onUpload={async (file) => {
                        await logoMutation.mutateAsync(file)
                      }}
                    />
                  </SettingsField>

                  <div className="grid gap-md sm:grid-cols-2">
                    <SettingsField label="اسم المنظمة (إنجليزي)">
                      <input
                        value={form.name}
                        onChange={(e) => patch('name', e.target.value)}
                        className={settingsInputClass}
                        dir="ltr"
                      />
                    </SettingsField>
                    <SettingsField label="اسم المنظمة (عربي)">
                      <input
                        value={form.name_ar}
                        onChange={(e) => patch('name_ar', e.target.value)}
                        className={settingsInputClass}
                      />
                    </SettingsField>
                    <SettingsField label="لون النظام">
                      <div className="flex items-center gap-sm">
                        <input
                          type="color"
                          value={form.general.theme_color ?? '#2563eb'}
                          onChange={(e) => patchGeneral({ theme_color: e.target.value })}
                          className="h-10 w-14 cursor-pointer rounded border border-outline-variant"
                        />
                        <input
                          value={form.general.theme_color ?? ''}
                          onChange={(e) => patchGeneral({ theme_color: e.target.value })}
                          className={settingsInputClass}
                          dir="ltr"
                        />
                      </div>
                    </SettingsField>
                    <SettingsField label="الهاتف">
                      <input
                        value={form.phone}
                        onChange={(e) => patch('phone', e.target.value)}
                        className={settingsInputClass}
                        dir="ltr"
                      />
                    </SettingsField>
                    <SettingsField label="البريد الإلكتروني">
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => patch('email', e.target.value)}
                        className={settingsInputClass}
                        dir="ltr"
                      />
                    </SettingsField>
                    <SettingsField label="الموقع الإلكتروني" className="sm:col-span-2">
                      <input
                        value={form.general.website ?? ''}
                        onChange={(e) => patchGeneral({ website: e.target.value || null })}
                        className={settingsInputClass}
                        dir="ltr"
                        placeholder="https://"
                      />
                    </SettingsField>
                    <SettingsField label="العنوان" className="sm:col-span-2">
                      <textarea
                        value={form.address}
                        onChange={(e) => patch('address', e.target.value)}
                        rows={2}
                        className={settingsInputClass}
                      />
                    </SettingsField>
                    <SettingsField label="الرقم الضريبي">
                      <input
                        value={form.general.tax_number ?? ''}
                        onChange={(e) => patchGeneral({ tax_number: e.target.value || null })}
                        className={settingsInputClass}
                        dir="ltr"
                      />
                    </SettingsField>
                    <SettingsField label="السجل التجاري">
                      <input
                        value={form.general.commercial_register ?? ''}
                        onChange={(e) => patchGeneral({ commercial_register: e.target.value || null })}
                        className={settingsInputClass}
                        dir="ltr"
                      />
                    </SettingsField>
                  </div>
                </SettingsSectionCard>
              )}

              {activeTab === 'regional' && (
                <SettingsSectionCard
                  title="الإقليم والتنسيق"
                  description="العملة، المنطقة الزمنية، وتنسيقات العرض"
                >
                  <div className="grid gap-md sm:grid-cols-2">
                    <SettingsField label="العملة الافتراضية">
                      <select
                        value={form.general.currency ?? 'EGP'}
                        onChange={(e) => patchGeneral({ currency: e.target.value })}
                        className={settingsInputClass}
                      >
                        {CURRENCY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </SettingsField>
                    <SettingsField label="المنطقة الزمنية">
                      <select
                        value={form.general.timezone ?? 'Africa/Cairo'}
                        onChange={(e) => patchGeneral({ timezone: e.target.value })}
                        className={settingsInputClass}
                      >
                        {TIMEZONE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </SettingsField>
                    <SettingsField label="اللغة الافتراضية">
                      <select
                        value={form.general.default_locale ?? 'ar'}
                        onChange={(e) =>
                          patchGeneral({ default_locale: e.target.value as 'ar' | 'en' })
                        }
                        className={settingsInputClass}
                      >
                        <option value="ar">العربية</option>
                        <option value="en">English</option>
                      </select>
                    </SettingsField>
                    <SettingsField label="بداية السنة المالية (شهر)">
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={form.general.fiscal_year_start_month ?? 1}
                        onChange={(e) =>
                          patchGeneral({ fiscal_year_start_month: Number(e.target.value) })
                        }
                        className={settingsInputClass}
                        dir="ltr"
                      />
                    </SettingsField>
                    <SettingsField label="تنسيق التاريخ">
                      <input
                        value={form.general.date_format ?? 'Y/m/d'}
                        onChange={(e) => patchGeneral({ date_format: e.target.value })}
                        className={settingsInputClass}
                        dir="ltr"
                      />
                    </SettingsField>
                    <SettingsField label="تنسيق الوقت">
                      <select
                        value={form.general.time_format ?? '12h'}
                        onChange={(e) =>
                          patchGeneral({ time_format: e.target.value as '12h' | '24h' })
                        }
                        className={settingsInputClass}
                      >
                        <option value="12h">12 ساعة</option>
                        <option value="24h">24 ساعة</option>
                      </select>
                    </SettingsField>
                  </div>
                </SettingsSectionCard>
              )}

              {activeTab === 'sales' && (
                <SettingsSectionCard
                  title="تشغيل المبيعات والتقسيط"
                  description="سياسات نقطة البيع، الفواتير، وجدولة الأقساط"
                >
                  <div className="grid gap-md sm:grid-cols-2">
                    <SettingsField label="بادئة رقم الفاتورة" hint="مثال: INV-000001">
                      <input
                        value={form.sales.invoice_prefix ?? 'INV'}
                        onChange={(e) => patchSales({ invoice_prefix: e.target.value })}
                        className={settingsInputClass}
                        dir="ltr"
                      />
                    </SettingsField>
                    <SettingsField label="طريقة الدفع الافتراضية">
                      <select
                        value={form.sales.default_payment_term ?? 'installment'}
                        onChange={(e) =>
                          patchSales({
                            default_payment_term: e.target.value as SalesSettings['default_payment_term'],
                          })
                        }
                        className={settingsInputClass}
                      >
                        {PAYMENT_TERM_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </SettingsField>
                    <SettingsField label="أقصى عدد أقساط">
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={form.sales.max_installment_months ?? 24}
                        onChange={(e) =>
                          patchSales({ max_installment_months: Number(e.target.value) })
                        }
                        className={settingsInputClass}
                        dir="ltr"
                      />
                    </SettingsField>
                    <SettingsField label="فترة القسط (بالأيام)">
                      <input
                        type="number"
                        min={1}
                        value={form.sales.installment_interval_days ?? 30}
                        onChange={(e) =>
                          patchSales({ installment_interval_days: Number(e.target.value) })
                        }
                        className={settingsInputClass}
                        dir="ltr"
                      />
                    </SettingsField>
                    <SettingsField label="أيام السماح قبل التأخير">
                      <input
                        type="number"
                        min={0}
                        value={form.sales.overdue_grace_days ?? 3}
                        onChange={(e) =>
                          patchSales({ overdue_grace_days: Number(e.target.value) })
                        }
                        className={settingsInputClass}
                        dir="ltr"
                      />
                    </SettingsField>
                    <SettingsField label="غرامة التأخير (%)" hint="0 = بدون غرامة">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={form.sales.late_fee_percent ?? 0}
                        onChange={(e) =>
                          patchSales({ late_fee_percent: Number(e.target.value) })
                        }
                        className={settingsInputClass}
                        dir="ltr"
                      />
                    </SettingsField>
                    <SettingsField label="غرامة يومية ثابتة (ج.م)">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={form.sales.late_fee_daily_amount ?? 10}
                        onChange={(e) =>
                          patchSales({ late_fee_daily_amount: Number(e.target.value) })
                        }
                        className={settingsInputClass}
                        dir="ltr"
                      />
                    </SettingsField>
                    <SettingsField label="نوع غرامة التأخير">
                      <select
                        value={form.sales.late_fee_mode ?? 'daily_fixed'}
                        onChange={(e) =>
                          patchSales({
                            late_fee_mode: e.target.value as 'daily_fixed' | 'percent',
                          })
                        }
                        className={settingsInputClass}
                      >
                        <option value="daily_fixed">مبلغ يومي ثابت</option>
                        <option value="percent">نسبة من القسط</option>
                      </select>
                    </SettingsField>
                    <SettingsField label="حد أدنى للمقدم (%)">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={form.sales.min_down_payment_percent ?? 10}
                        onChange={(e) =>
                          patchSales({ min_down_payment_percent: Number(e.target.value) })
                        }
                        className={settingsInputClass}
                        dir="ltr"
                      />
                    </SettingsField>
                    <SettingsField label="رسوم التركيب الافتراضية (ج.م)">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.sales.default_installation_fee ?? 500}
                        onChange={(e) =>
                          patchSales({ default_installation_fee: Number(e.target.value) })
                        }
                        className={settingsInputClass}
                        dir="ltr"
                      />
                    </SettingsField>
                  </div>

                  <label className="mb-sm flex cursor-pointer items-center gap-sm rounded-lg border border-outline-variant px-md py-sm">
                    <input
                      type="checkbox"
                      checked={form.sales.enable_installation_fee ?? true}
                      onChange={(e) => patchSales({ enable_installation_fee: e.target.checked })}
                      className={settingsToggleClass}
                    />
                    <div>
                      <p className="text-sm font-medium text-on-surface">تفعيل رسوم التركيب</p>
                      <p className="text-xs text-on-surface-variant">إظهار رسوم التركيب في نقطة البيع</p>
                    </div>
                  </label>

                  <label className="mb-md flex cursor-pointer items-center gap-sm rounded-lg border border-outline-variant px-md py-sm">
                    <input
                      type="checkbox"
                      checked={form.sales.allow_disable_installation_fee_in_sale ?? true}
                      onChange={(e) =>
                        patchSales({ allow_disable_installation_fee_in_sale: e.target.checked })
                      }
                      className={settingsToggleClass}
                    />
                    <div>
                      <p className="text-sm font-medium text-on-surface">السماح بإلغاء الرسوم أثناء البيع</p>
                      <p className="text-xs text-on-surface-variant">يظهر خيار تعطيل رسوم التركيب في التعاقد</p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-center gap-sm rounded-lg border border-outline-variant px-md py-sm">
                    <input
                      type="checkbox"
                      checked={form.sales.require_invoice_review ?? true}
                      onChange={(e) => patchSales({ require_invoice_review: e.target.checked })}
                      className={settingsToggleClass}
                    />
                    <div>
                      <p className="text-sm font-medium text-on-surface">مراجعة العقود (لا توقف التعاقد)</p>
                      <p className="text-xs text-on-surface-variant">
                        التعاقد والأقساط تُنشأ فوراً؛ المراجعة تتم لاحقاً دون إيقاف العملية
                      </p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-center gap-sm rounded-lg border border-outline-variant px-md py-sm">
                    <input
                      type="checkbox"
                      checked={form.sales.allow_negative_inventory ?? false}
                      onChange={(e) => patchSales({ allow_negative_inventory: e.target.checked })}
                      className={settingsToggleClass}
                    />
                    <div>
                      <p className="text-sm font-medium text-on-surface">السماح بالمخزون السالب</p>
                      <p className="text-xs text-on-surface-variant">
                        إتمام التعاقد بدون وحدات متاحة ثم تزويد المخزون لاحقاً
                      </p>
                    </div>
                  </label>

                  <SettingsField label="ترتيب المراجعة والأقساط">
                    <select
                      value={form.sales.review_installment_order ?? 'after_installments'}
                      onChange={(e) =>
                        patchSales({
                          review_installment_order: e.target.value as
                            | 'before_installments'
                            | 'after_installments',
                        })
                      }
                      className={settingsInputClass}
                    >
                      <option value="after_installments">الأقساط أولاً ثم المراجعة</option>
                      <option value="before_installments">المراجعة أولاً ثم الأقساط</option>
                    </select>
                  </SettingsField>
                </SettingsSectionCard>
              )}

              {activeTab === 'messaging' && (
                <SettingsSectionCard
                  title="رسائل واتساب للعملاء"
                  description="تذكير الأقساط، ترحيب التعاقد، وتأكيد السداد — إعدادات API من ملف .env"
                >
                  <label className="mb-md flex cursor-pointer items-center gap-sm rounded-lg border border-outline-variant px-md py-sm">
                    <input
                      type="checkbox"
                      checked={form.messaging.whatsapp_enabled ?? false}
                      onChange={(e) => patchMessaging({ whatsapp_enabled: e.target.checked })}
                      className={settingsToggleClass}
                    />
                    <div>
                      <p className="text-sm font-medium text-on-surface">تفعيل إرسال واتساب</p>
                      <p className="text-xs text-on-surface-variant">
                        في التطوير يُسجَّل في الـ log — اربط مزود API عبر WHATSAPP_DRIVER=http
                      </p>
                    </div>
                  </label>

                  <div className="mb-md grid gap-md sm:grid-cols-2">
                    <SettingsField label="أيام التذكير قبل الاستحقاق">
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={form.messaging.reminder_days_before ?? 1}
                        onChange={(e) =>
                          patchMessaging({ reminder_days_before: Number(e.target.value) })
                        }
                        className={settingsInputClass}
                        dir="ltr"
                      />
                    </SettingsField>
                  </div>

                  <div className="mb-md grid gap-sm sm:grid-cols-2">
                    {(
                      [
                        ['send_contract_welcome', 'رسالة ترحيب عند التعاقد'],
                        ['send_contract_approved', 'رسالة بعد اعتماد المراجعة'],
                        ['send_installment_reminder', 'تذكير قبل موعد القسط'],
                        ['send_installment_paid', 'تأكيد بعد سداد القسط'],
                      ] as const
                    ).map(([key, label]) => (
                      <label
                        key={key}
                        className="flex cursor-pointer items-center gap-sm rounded-lg border border-outline-variant px-md py-sm"
                      >
                        <input
                          type="checkbox"
                          checked={form.messaging[key] ?? true}
                          onChange={(e) => patchMessaging({ [key]: e.target.checked })}
                          className={settingsToggleClass}
                        />
                        <span className="text-sm text-on-surface">{label}</span>
                      </label>
                    ))}
                  </div>

                  <p className="mb-sm text-xs text-on-surface-variant">
                    المتغيرات المتاحة: {MESSAGING_PLACEHOLDERS}
                  </p>

                  <div className="grid gap-md">
                    {(
                      [
                        ['contract_welcome', 'قالب ترحيب التعاقد'],
                        ['contract_approved', 'قالب اعتماد التعاقد'],
                        ['installment_reminder', 'قالب تذكير القسط'],
                        ['installment_paid', 'قالب تأكيد السداد'],
                      ] as const
                    ).map(([key, label]) => (
                      <SettingsField key={key} label={label}>
                        <textarea
                          rows={4}
                          value={form.messaging.templates?.[key] ?? ''}
                          onChange={(e) => patchTemplate(key, e.target.value)}
                          className={settingsInputClass}
                        />
                      </SettingsField>
                    ))}
                  </div>
                </SettingsSectionCard>
              )}

              {activeTab === 'messaging' && (
                <SettingsSectionCard
                  title="سجل الرسائل الأخير"
                  description="آخر الرسائل المرسلة أو المتخطاة — مفيد قبل ربط مزود واتساب حقيقي"
                >
                  {logsQuery.isLoading && (
                    <p className="text-sm text-on-surface-variant">جاري تحميل السجل...</p>
                  )}
                  {logsQuery.isError && (
                    <p className="text-sm text-error">{getErrorMessage(logsQuery.error)}</p>
                  )}
                  {logsQuery.data && logsQuery.data.data.length === 0 && (
                    <p className="text-sm text-on-surface-variant">لا توجد رسائل مسجّلة بعد.</p>
                  )}
                  {logsQuery.data && logsQuery.data.data.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-outline-variant">
                      <table className="w-full text-sm">
                        <thead className="bg-surface-container-low text-on-surface-variant">
                          <tr>
                            <th className="px-md py-sm text-start font-medium">الوقت</th>
                            <th className="px-md py-sm text-start font-medium">العميل</th>
                            <th className="px-md py-sm text-start font-medium">النوع</th>
                            <th className="px-md py-sm text-start font-medium">الحالة</th>
                            <th className="px-md py-sm text-start font-medium">الفاتورة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logsQuery.data.data.map((log) => (
                            <tr key={log.id} className="border-t border-outline-variant">
                              <td className="px-md py-sm whitespace-nowrap" dir="ltr">
                                {formatUpdatedAt(log.sent_at ?? log.created_at)}
                              </td>
                              <td className="px-md py-sm">
                                {log.customer?.name ?? '—'}
                                {log.phone ? (
                                  <span className="block text-xs text-on-surface-variant" dir="ltr">
                                    {log.phone}
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-md py-sm">
                                {MESSAGE_TYPE_LABELS[log.message_type] ?? log.message_type}
                              </td>
                              <td className="px-md py-sm">
                                <span
                                  className={
                                    log.status === 'sent'
                                      ? 'text-primary'
                                      : log.status === 'failed'
                                        ? 'text-error'
                                        : 'text-on-surface-variant'
                                  }
                                >
                                  {MESSAGE_STATUS_LABELS[log.status] ?? log.status}
                                </span>
                                {log.error && log.status === 'skipped' ? (
                                  <span className="block text-xs text-on-surface-variant">{log.error}</span>
                                ) : null}
                              </td>
                              <td className="px-md py-sm" dir="ltr">
                                {log.sales_invoice?.invoice_number ?? '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SettingsSectionCard>
              )}

              {activeTab === 'security' && (
                <SettingsSectionCard
                  title="الأمان والجلسات"
                  description="سياسات الدخول، كلمات المرور، وسجل التدقيق"
                >
                  <div className="grid gap-md sm:grid-cols-2">
                    <SettingsField label="مدة الجلسة (دقيقة)" hint="خمول المستخدم قبل تسجيل الخروج">
                      <input
                        type="number"
                        min={5}
                        max={1440}
                        value={form.security.session_timeout_minutes ?? 480}
                        onChange={(e) =>
                          patchSecurity({ session_timeout_minutes: Number(e.target.value) })
                        }
                        className={settingsInputClass}
                        dir="ltr"
                      />
                    </SettingsField>
                    <SettingsField label="الحد الأدنى لطول كلمة المرور">
                      <input
                        type="number"
                        min={6}
                        max={128}
                        value={form.security.password_min_length ?? 8}
                        onChange={(e) =>
                          patchSecurity({ password_min_length: Number(e.target.value) })
                        }
                        className={settingsInputClass}
                        dir="ltr"
                      />
                    </SettingsField>
                    <SettingsField label="مدة الاحتفاظ بسجل التدقيق (يوم)">
                      <input
                        type="number"
                        min={30}
                        max={3650}
                        value={form.security.audit_log_retention_days ?? 365}
                        onChange={(e) =>
                          patchSecurity({ audit_log_retention_days: Number(e.target.value) })
                        }
                        className={settingsInputClass}
                        dir="ltr"
                      />
                    </SettingsField>
                  </div>

                  <label className="flex cursor-pointer items-center gap-sm rounded-lg border border-outline-variant px-md py-sm">
                    <input
                      type="checkbox"
                      checked={form.security.force_password_change_on_first_login ?? false}
                      onChange={(e) =>
                        patchSecurity({ force_password_change_on_first_login: e.target.checked })
                      }
                      className={settingsToggleClass}
                    />
                    <div>
                      <p className="text-sm font-medium text-on-surface">إجبار تغيير كلمة المرور عند أول دخول</p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-center gap-sm rounded-lg border border-outline-variant px-md py-sm">
                    <input
                      type="checkbox"
                      checked={form.security.log_ip_addresses ?? true}
                      onChange={(e) => patchSecurity({ log_ip_addresses: e.target.checked })}
                      className={settingsToggleClass}
                    />
                    <div>
                      <p className="text-sm font-medium text-on-surface">تسجيل عناوين IP في سجل النشاط</p>
                    </div>
                  </label>
                </SettingsSectionCard>
              )}

              {activeTab === 'modules' && (
                <SettingsSectionCard
                  title="الوحدات والتكامل"
                  description="تفعيل أو إيقاف الوحدات والانتقال لإعداداتها التفصيلية"
                >
                  <div className="space-y-sm">
                    {MODULE_DEFINITIONS.map((mod) => (
                      <ModuleToggleCard
                        key={mod.key}
                        module={mod}
                        enabled={mod.alwaysOn || form.enabled_modules.includes(mod.key)}
                        onToggle={mod.alwaysOn ? undefined : toggleModule}
                      />
                    ))}
                  </div>
                </SettingsSectionCard>
              )}

              {saveMutation.isError && (
                <p className="text-sm text-error">{getErrorMessage(saveMutation.error)}</p>
              )}
            </form>
          </>
        )}
      </AsyncState>
    </div>
  )
}
