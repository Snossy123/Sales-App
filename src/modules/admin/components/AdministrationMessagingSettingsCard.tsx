import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type {
  Administration,
  AdministrationMessagingSettings,
  PaginatedResponse,
} from '../../../api/types'
import { Icon } from '../../../components/Icon'
import {
  SettingsField,
  SettingsSectionCard,
  settingsInputClass,
  settingsToggleClass,
} from './SettingsSectionCard'

type MessagingDriver = 'inherit' | 'twilio' | 'http' | 'log'

interface MessagingDraft {
  whatsapp_enabled: boolean
  driver: MessagingDriver
  follow_up_phone: string
  follow_up_label: string
  append_follow_up_link: boolean
  twilio_sid: string
  twilio_auth_token: string
  twilio_from: string
  http_url: string
  http_token: string
  http_instance_id: string
}

function draftFromAdministration(admin?: Administration): MessagingDraft {
  const m = admin?.settings?.messaging
  return {
    whatsapp_enabled: m?.whatsapp_enabled ?? true,
    driver: (m?.driver as MessagingDriver) ?? 'inherit',
    follow_up_phone: m?.follow_up_phone ?? '',
    follow_up_label: m?.follow_up_label ?? 'للمتابعة أو الاستفسار اضغط هنا:',
    append_follow_up_link: m?.append_follow_up_link ?? true,
    twilio_sid: m?.twilio?.sid ?? '',
    twilio_auth_token: m?.twilio?.auth_token ?? '',
    twilio_from: m?.twilio?.from ?? '',
    http_url: m?.http?.url ?? '',
    http_token: m?.http?.token ?? '',
    http_instance_id: m?.http?.instance_id ?? '',
  }
}

function payloadFromDraft(draft: MessagingDraft): AdministrationMessagingSettings {
  return {
    whatsapp_enabled: draft.whatsapp_enabled,
    driver: draft.driver,
    follow_up_phone: draft.follow_up_phone.trim() || null,
    follow_up_label: draft.follow_up_label.trim() || null,
    append_follow_up_link: draft.append_follow_up_link,
    twilio: {
      sid: draft.twilio_sid.trim() || null,
      auth_token: draft.twilio_auth_token.trim() || null,
      from: draft.twilio_from.trim() || null,
    },
    http: {
      url: draft.http_url.trim() || null,
      token: draft.http_token.trim() || null,
      instance_id: draft.http_instance_id.trim() || null,
    },
  }
}

interface TestWhatsAppResponse {
  success: boolean
  provider: string
  provider_ref?: string | null
  error?: string | null
  message_preview?: string
}

export function AdministrationMessagingSettingsCard({
  onToast,
}: {
  onToast: (message: string) => void
}) {
  const queryClient = useQueryClient()
  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null)
  const [drafts, setDrafts] = useState<Record<number, MessagingDraft>>({})
  const [showToken, setShowToken] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testPreview, setTestPreview] = useState<string | null>(null)

  const administrationsQuery = useQuery({
    queryKey: ['administrations', 'messaging-settings'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Administration>>('/administrations', {
        params: { per_page: 100 },
      })
      return data.data
    },
  })

  const administrations = administrationsQuery.data ?? []

  useEffect(() => {
    if (administrations.length === 0) return

    setSelectedAdminId((prev) => prev ?? administrations[0].id)

    setDrafts((prev) => {
      const next = { ...prev }
      for (const admin of administrations) {
        if (!next[admin.id]) {
          next[admin.id] = draftFromAdministration(admin)
        }
      }
      return next
    })
  }, [administrations])

  const activeAdmin = administrations.find((a) => a.id === selectedAdminId) ?? administrations[0]
  const activeDraft = activeAdmin ? drafts[activeAdmin.id] ?? draftFromAdministration(activeAdmin) : null

  const patchDraft = (partial: Partial<MessagingDraft>) => {
    if (!activeAdmin) return
    setDrafts((prev) => ({
      ...prev,
      [activeAdmin.id]: {
        ...(prev[activeAdmin.id] ?? draftFromAdministration(activeAdmin)),
        ...partial,
      },
    }))
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activeAdmin || !activeDraft) return
      await api.put(`/administrations/${activeAdmin.id}`, {
        settings: {
          messaging: payloadFromDraft(activeDraft),
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['administrations'] })
      onToast(`تم حفظ إعدادات الواتساب لإدارة "${activeAdmin?.name_ar || activeAdmin?.name}"`)
    },
    onError: (error) => onToast(getErrorMessage(error)),
  })

  const testMutation = useMutation({
    mutationFn: async () => {
      if (!activeAdmin) throw new Error('اختر الإدارة أولاً')
      // Save current draft before testing so user doesn't have to click Save separately
      if (activeDraft) {
        await api.put(`/administrations/${activeAdmin.id}`, {
          settings: {
            messaging: payloadFromDraft(activeDraft),
          },
        })
      }
      const { data } = await api.post<TestWhatsAppResponse>(
        `/administrations/${activeAdmin.id}/test-whatsapp`,
        { phone: testPhone.trim() },
      )
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['administrations'] })
      setTestPreview(data.message_preview ?? null)
      if (data.success) {
        onToast(`تم إرسال الرسالة التجريبية بنجاح (${data.provider})`)
      } else {
        onToast(data.error || 'فشل إرسال الرسالة التجريبية')
      }
    },
    onError: (error) => {
      onToast(getErrorMessage(error))
    },
  })

  if (administrationsQuery.isLoading) {
    return (
      <SettingsSectionCard
        title="إعدادات الربط والمتابعة حسب الإدارة"
        description="جاري تحميل الإدارات..."
      >
        <div className="py-md text-sm text-on-surface-variant">جاري التحميل...</div>
      </SettingsSectionCard>
    )
  }

  if (administrations.length === 0) {
    return null
  }

  return (
    <SettingsSectionCard
      title="إعدادات ربط الواتساب والمتابعة حسب الإدارة"
      description="خصص حساب الإرسال (Twilio أو HTTP) ورقم موظف المتابعة الخاص بكل إدارة على حدة"
    >
      {/* Administration Selector */}
      <div className="mb-md flex flex-wrap gap-xs">
        {administrations.map((admin) => {
          const isSelected = activeAdmin?.id === admin.id
          return (
            <button
              key={admin.id}
              type="button"
              onClick={() => {
                setSelectedAdminId(admin.id)
                setTestPreview(null)
              }}
              className={`rounded-lg px-md py-xs text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'border border-outline-variant bg-surface text-on-surface hover:bg-surface-variant/40'
              }`}
            >
              {admin.name_ar || admin.name}
            </button>
          )
        })}
      </div>

      {activeAdmin && activeDraft && (
        <div className="space-y-md rounded-xl border border-outline-variant p-md">
          <div className="flex flex-wrap items-center justify-between gap-sm border-b border-outline-variant/60 pb-sm">
            <div>
              <h3 className="text-sm font-bold text-on-surface">
                {activeAdmin.name_ar || activeAdmin.name}
              </h3>
              <p className="text-xs text-on-surface-variant">
                إعدادات الربط وموظف المتابعة لهذه الإدارة
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-xs">
              <input
                type="checkbox"
                checked={activeDraft.whatsapp_enabled}
                onChange={(e) => patchDraft({ whatsapp_enabled: e.target.checked })}
                className={settingsToggleClass}
              />
              <span className="text-sm font-medium text-on-surface">تفعيل الإرسال</span>
            </label>
          </div>

          {/* Driver Selection */}
          <div className="grid gap-md sm:grid-cols-2">
            <SettingsField
              label="مزود الخدمة (Gateway Driver)"
              hint="اختر Twilio للربط بحساب Twilio الخاص بهذه الإدارة"
            >
              <select
                value={activeDraft.driver}
                onChange={(e) => patchDraft({ driver: e.target.value as MessagingDriver })}
                className={settingsInputClass}
              >
                <option value="inherit">الافتراضي للنظام (.env)</option>
                <option value="twilio">Twilio WhatsApp</option>
                <option value="http">HTTP API (UltraMsg / Gateway)</option>
                <option value="log">سجل النظام فقط (Log - للتطوير)</option>
              </select>
            </SettingsField>

            <SettingsField
              label="رقم واتساب موظف المتابعة"
              hint="عند ضغط العميل على رابط المتابعة يفتح شات مع هذا الرقم محمّلاً بتفاصيل الرسالة"
            >
              <input
                type="text"
                value={activeDraft.follow_up_phone}
                onChange={(e) => patchDraft({ follow_up_phone: e.target.value })}
                placeholder="+2010xxxxxxxx"
                className={settingsInputClass}
                dir="ltr"
              />
            </SettingsField>
          </div>

          {/* Twilio Credentials */}
          {activeDraft.driver === 'twilio' && (
            <div className="rounded-lg bg-surface-variant/30 p-md">
              <h4 className="mb-sm text-xs font-bold text-on-surface">بيانات ربط Twilio</h4>
              <div className="grid gap-md sm:grid-cols-3">
                <SettingsField label="Account SID">
                  <input
                    type="text"
                    value={activeDraft.twilio_sid}
                    onChange={(e) => patchDraft({ twilio_sid: e.target.value })}
                    placeholder="ACxxxxxxxxxxxxxxxx"
                    className={settingsInputClass}
                    dir="ltr"
                  />
                </SettingsField>

                <SettingsField label="Auth Token">
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={activeDraft.twilio_auth_token}
                      onChange={(e) => patchDraft({ twilio_auth_token: e.target.value })}
                      placeholder="••••••••••••••••"
                      className={`${settingsInputClass} pl-9`}
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken((v) => !v)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant hover:text-on-surface"
                    >
                      {showToken ? 'إخفاء' : 'إظهار'}
                    </button>
                  </div>
                </SettingsField>

                <SettingsField
                  label="رقم الإرسال (From Number)"
                  hint="في Sandbox يكون +14155238886"
                >
                  <input
                    type="text"
                    value={activeDraft.twilio_from}
                    onChange={(e) => patchDraft({ twilio_from: e.target.value })}
                    placeholder="+14155238886"
                    className={settingsInputClass}
                    dir="ltr"
                  />
                </SettingsField>
              </div>
            </div>
          )}

          {/* HTTP Credentials */}
          {activeDraft.driver === 'http' && (
            <div className="rounded-lg bg-surface-variant/30 p-md">
              <h4 className="mb-sm text-xs font-bold text-on-surface">بيانات ربط HTTP API</h4>
              <div className="grid gap-md sm:grid-cols-3">
                <SettingsField label="API URL">
                  <input
                    type="text"
                    value={activeDraft.http_url}
                    onChange={(e) => patchDraft({ http_url: e.target.value })}
                    placeholder="https://api.example.com"
                    className={settingsInputClass}
                    dir="ltr"
                  />
                </SettingsField>

                <SettingsField label="API Token">
                  <input
                    type="password"
                    value={activeDraft.http_token}
                    onChange={(e) => patchDraft({ http_token: e.target.value })}
                    placeholder="••••••••••••••••"
                    className={settingsInputClass}
                    dir="ltr"
                  />
                </SettingsField>

                <SettingsField label="Instance ID">
                  <input
                    type="text"
                    value={activeDraft.http_instance_id}
                    onChange={(e) => patchDraft({ http_instance_id: e.target.value })}
                    placeholder="instance_123"
                    className={settingsInputClass}
                    dir="ltr"
                  />
                </SettingsField>
              </div>
            </div>
          )}

          {/* Follow-up Link Options */}
          <div className="grid gap-md sm:grid-cols-2">
            <SettingsField label="نص رابط المتابعة في الرسالة">
              <input
                type="text"
                value={activeDraft.follow_up_label}
                onChange={(e) => patchDraft({ follow_up_label: e.target.value })}
                placeholder="للمتابعة أو الاستفسار اضغط هنا:"
                className={settingsInputClass}
              />
            </SettingsField>

            <div className="flex items-end pb-xs">
              <label className="flex cursor-pointer items-center gap-sm rounded-lg border border-outline-variant px-md py-sm">
                <input
                  type="checkbox"
                  checked={activeDraft.append_follow_up_link}
                  onChange={(e) => patchDraft({ append_follow_up_link: e.target.checked })}
                  className={settingsToggleClass}
                />
                <span className="text-xs font-medium text-on-surface">
                  إرفاق رابط المتابعة تلقائياً في نهاية كل رسالة
                </span>
              </label>
            </div>
          </div>

          {/* Save & Test Row */}
          <div className="flex flex-wrap items-end justify-between gap-md border-t border-outline-variant/60 pt-md">
            <div className="flex flex-wrap items-end gap-sm">
              <SettingsField label="تجربة إرسال لرقم هاتف" className="w-56">
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+2010xxxxxxxx"
                  className={settingsInputClass}
                  dir="ltr"
                />
              </SettingsField>
              <button
                type="button"
                disabled={testMutation.isPending || testPhone.trim().length < 8}
                onClick={() => testMutation.mutate()}
                className="inline-flex h-10 items-center gap-xs rounded-lg border border-primary px-md text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
              >
                <Icon name="send" className="text-base" />
                <span>{testMutation.isPending ? 'جاري الإرسال...' : 'حفظ وإرسال تجربة'}</span>
              </button>
            </div>

            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="inline-flex h-10 items-center gap-xs rounded-lg bg-primary px-lg text-sm font-medium text-on-primary shadow-sm hover:opacity-95 disabled:opacity-50"
            >
              <Icon name="save" className="text-base" />
              <span>{saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ إعدادات الإدارة'}</span>
            </button>
          </div>

          {testPreview && (
            <div className="rounded-lg border border-outline-variant bg-surface-variant/20 p-sm">
              <p className="mb-xs text-xs font-bold text-on-surface-variant">معاينة الرسالة المُرسلة:</p>
              <pre className="whitespace-pre-wrap text-xs text-on-surface" dir="auto">
                {testPreview}
              </pre>
            </div>
          )}
        </div>
      )}
    </SettingsSectionCard>
  )
}
