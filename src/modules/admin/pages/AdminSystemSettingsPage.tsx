import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type {
  GeneralSettings,
  OrganizationSettings,
  SalesSettings,
  SecuritySettings,
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
  DEFAULT_SALES,
  DEFAULT_SECURITY,
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
}

function buildForm(data: OrganizationSettings): FormState {
  const org = data.organization
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
  }
}

function formatUpdatedAt(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })
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
            <div className="mb-md grid gap-sm sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="كود المنظمة" value={query.data?.organization.code ?? '—'} icon="tag" />
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
                    <SettingsField label="كود المنظمة">
                      <input
                        value={query.data?.organization.code ?? ''}
                        readOnly
                        className={`${settingsInputClass} bg-surface-container text-on-surface-variant`}
                        dir="ltr"
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
                  </div>

                  <label className="flex cursor-pointer items-center gap-sm rounded-lg border border-outline-variant px-md py-sm">
                    <input
                      type="checkbox"
                      checked={form.sales.require_invoice_review ?? true}
                      onChange={(e) => patchSales({ require_invoice_review: e.target.checked })}
                      className={settingsToggleClass}
                    />
                    <div>
                      <p className="text-sm font-medium text-on-surface">مراجعة الفواتير قبل التأكيد</p>
                      <p className="text-xs text-on-surface-variant">
                        عند التفعيل، تمر عمليات POS بحالة «قيد المراجعة» قبل تأكيد البيع
                      </p>
                    </div>
                  </label>
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
