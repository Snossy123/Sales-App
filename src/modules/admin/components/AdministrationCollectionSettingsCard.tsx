import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type {
  Administration,
  AdministrationCollectionSettings,
  PaginatedResponse,
  SalesSettings,
} from '../../../api/types'
import { NumericInput } from '../../../components/ui/NumericInput'
import { SettingsSectionCard, settingsInputClass, settingsToggleClass } from './SettingsSectionCard'

type CollectionDraft = {
  reconciliation_enabled: boolean
  overdue_grace_days: string
  late_fee_mode: '' | 'daily_fixed' | 'percent'
  late_fee_daily_amount: string
  late_fee_percent: string
  waive_late_fee_on_close: boolean
}

function draftFromAdministration(admin: Administration): CollectionDraft {
  const settings = admin.settings ?? {}
  return {
    reconciliation_enabled: settings.reconciliation_enabled ?? true,
    overdue_grace_days: settings.overdue_grace_days == null ? '' : String(settings.overdue_grace_days),
    late_fee_mode: settings.late_fee_mode ?? '',
    late_fee_daily_amount:
      settings.late_fee_daily_amount == null ? '' : String(settings.late_fee_daily_amount),
    late_fee_percent: settings.late_fee_percent == null ? '' : String(settings.late_fee_percent),
    waive_late_fee_on_close: settings.waive_late_fee_on_close ?? true,
  }
}

function payloadFromDraft(draft: CollectionDraft): AdministrationCollectionSettings {
  return {
    reconciliation_enabled: draft.reconciliation_enabled,
    overdue_grace_days: draft.overdue_grace_days === '' ? null : Number(draft.overdue_grace_days),
    late_fee_mode: draft.late_fee_mode === '' ? null : draft.late_fee_mode,
    late_fee_daily_amount:
      draft.late_fee_daily_amount === '' ? null : Number(draft.late_fee_daily_amount),
    late_fee_percent: draft.late_fee_percent === '' ? null : Number(draft.late_fee_percent),
    waive_late_fee_on_close: draft.waive_late_fee_on_close,
  }
}

export function AdministrationCollectionSettingsCard({
  orgSales,
  onToast,
}: {
  orgSales: SalesSettings
  onToast: (message: string) => void
}) {
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState<Record<number, CollectionDraft>>({})

  const administrationsQuery = useQuery({
    queryKey: ['administrations', 'collection-settings'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Administration>>('/administrations', {
        params: { per_page: 100 },
      })
      return data.data
    },
  })

  useEffect(() => {
    if (!administrationsQuery.data) return
    setDrafts((prev) => {
      const next = { ...prev }
      for (const admin of administrationsQuery.data) {
        if (!next[admin.id]) {
          next[admin.id] = draftFromAdministration(admin)
        }
      }
      return next
    })
  }, [administrationsQuery.data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const administrations = administrationsQuery.data ?? []
      await Promise.all(
        administrations.map((admin) => {
          const draft = drafts[admin.id] ?? draftFromAdministration(admin)
          return api.put(`/administrations/${admin.id}`, { settings: payloadFromDraft(draft) })
        }),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['administrations'] })
      onToast('تم حفظ إعدادات التصالح حسب الإدارة')
    },
    onError: (error) => onToast(getErrorMessage(error)),
  })

  const patchDraft = (id: number, partial: Partial<CollectionDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? draftFromAdministration({ id } as Administration)), ...partial },
    }))
  }

  const administrations = administrationsQuery.data ?? []

  return (
    <SettingsSectionCard
      title="التصالح والغرامات حسب الإدارة"
      description="القيم الفارغة ترث إعدادات المنظمة أعلاه. زر التصالح يظهر للمتأخر كفلتر لدرجة التأخير."
    >
      {administrationsQuery.isLoading ? (
        <p className="text-sm text-on-surface-variant">جاري تحميل الإدارات...</p>
      ) : administrations.length === 0 ? (
        <p className="text-sm text-on-surface-variant">لا توجد إدارات</p>
      ) : (
        <div className="space-y-md">
          {administrations.map((admin) => {
            const draft = drafts[admin.id] ?? draftFromAdministration(admin)
            return (
              <div
                key={admin.id}
                className="rounded-lg border border-outline-variant px-md py-sm"
              >
                <p className="mb-sm font-medium text-on-surface">{admin.name_ar || admin.name}</p>
                <div className="grid gap-sm sm:grid-cols-2 lg:grid-cols-3">
                  <label className="flex cursor-pointer items-center gap-sm rounded-lg border border-outline-variant px-sm py-2">
                    <input
                      type="checkbox"
                      checked={draft.reconciliation_enabled}
                      onChange={(e) => patchDraft(admin.id, { reconciliation_enabled: e.target.checked })}
                      className={settingsToggleClass}
                    />
                    <span className="text-sm text-on-surface">تفعيل زر التصالح</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-sm rounded-lg border border-outline-variant px-sm py-2">
                    <input
                      type="checkbox"
                      checked={draft.waive_late_fee_on_close}
                      onChange={(e) => patchDraft(admin.id, { waive_late_fee_on_close: e.target.checked })}
                      className={settingsToggleClass}
                    />
                    <span className="text-sm text-on-surface">إعفاء الغرامة عند إغلاق التصالح</span>
                  </label>
                  <label className="block text-xs text-on-surface-variant">
                    أيام السماح
                    <NumericInput
                      type="number"
                      min={0}
                      max={90}
                      value={draft.overdue_grace_days}
                      placeholder={String(orgSales.overdue_grace_days ?? 3)}
                      onChange={(e) => patchDraft(admin.id, { overdue_grace_days: e.target.value })}
                      className={`${settingsInputClass} mt-1`}
                      dir="ltr"
                    />
                  </label>
                  <label className="block text-xs text-on-surface-variant">
                    نوع الغرامة
                    <select
                      value={draft.late_fee_mode}
                      onChange={(e) =>
                        patchDraft(admin.id, {
                          late_fee_mode: e.target.value as CollectionDraft['late_fee_mode'],
                        })
                      }
                      className={`${settingsInputClass} mt-1`}
                    >
                      <option value="">وراثة المنظمة</option>
                      <option value="daily_fixed">مبلغ يومي ثابت</option>
                      <option value="percent">نسبة من القسط</option>
                    </select>
                  </label>
                  <label className="block text-xs text-on-surface-variant">
                    غرامة يومية (ج.م)
                    <NumericInput
                      type="number"
                      min={0}
                      step={0.01}
                      value={draft.late_fee_daily_amount}
                      placeholder={String(orgSales.late_fee_daily_amount ?? 10)}
                      onChange={(e) => patchDraft(admin.id, { late_fee_daily_amount: e.target.value })}
                      className={`${settingsInputClass} mt-1`}
                      dir="ltr"
                    />
                  </label>
                  <label className="block text-xs text-on-surface-variant">
                    غرامة (%)
                    <NumericInput
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={draft.late_fee_percent}
                      placeholder={String(orgSales.late_fee_percent ?? 0)}
                      onChange={(e) => patchDraft(admin.id, { late_fee_percent: e.target.value })}
                      className={`${settingsInputClass} mt-1`}
                      dir="ltr"
                    />
                  </label>
                </div>
              </div>
            )
          })}
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="rounded-lg bg-primary px-md py-2 text-sm font-medium text-on-primary"
          >
            {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ إعدادات الإدارات'}
          </button>
        </div>
      )}
    </SettingsSectionCard>
  )
}
