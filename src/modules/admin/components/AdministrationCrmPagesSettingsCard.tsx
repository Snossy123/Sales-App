import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../../api/client'
import type { Administration, AdministrationCrmPageSettings, PaginatedResponse } from '../../../api/types'
import { SettingsSectionCard, settingsToggleClass } from './SettingsSectionCard'

type PageDraft = {
  crm_tasks_enabled: boolean
  crm_activities_enabled: boolean
}

function draftFromAdministration(admin: Administration): PageDraft {
  const settings = admin.settings ?? {}
  return {
    crm_tasks_enabled: settings.crm_tasks_enabled !== false,
    crm_activities_enabled: settings.crm_activities_enabled !== false,
  }
}

function payloadFromDraft(draft: PageDraft): AdministrationCrmPageSettings {
  return {
    crm_tasks_enabled: draft.crm_tasks_enabled,
    crm_activities_enabled: draft.crm_activities_enabled,
  }
}

export function AdministrationCrmPagesSettingsCard({
  onToast,
}: {
  onToast: (message: string) => void
}) {
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState<Record<number, PageDraft>>({})

  const administrationsQuery = useQuery({
    queryKey: ['administrations', 'crm-pages'],
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
      onToast('تم حفظ ظهور صفحات المبيعات حسب الإدارة')
    },
    onError: (error) => onToast(getErrorMessage(error)),
  })

  const patchDraft = (id: number, partial: Partial<PageDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { crm_tasks_enabled: true, crm_activities_enabled: true }), ...partial },
    }))
  }

  const administrations = administrationsQuery.data ?? []

  return (
    <SettingsSectionCard
      title="صفحات المبيعات حسب الإدارة"
      description="إلغاء التحديد يخفي الصفحة من قائمة الإدارة المحددة ومسارها. باقي الإدارات تظل ترى الصفحة."
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
              <div key={admin.id} className="rounded-lg border border-outline-variant px-md py-sm">
                <p className="mb-sm font-medium text-on-surface">{admin.name_ar || admin.name}</p>
                <div className="grid gap-sm sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-sm rounded-lg border border-outline-variant px-sm py-2">
                    <input
                      type="checkbox"
                      checked={draft.crm_tasks_enabled}
                      onChange={(e) => patchDraft(admin.id, { crm_tasks_enabled: e.target.checked })}
                      className={settingsToggleClass}
                    />
                    <span className="text-sm text-on-surface">إظهار صفحة المهام</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-sm rounded-lg border border-outline-variant px-sm py-2">
                    <input
                      type="checkbox"
                      checked={draft.crm_activities_enabled}
                      onChange={(e) =>
                        patchDraft(admin.id, { crm_activities_enabled: e.target.checked })
                      }
                      className={settingsToggleClass}
                    />
                    <span className="text-sm text-on-surface">إظهار صفحة الأنشطة</span>
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
            {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ ظهور الصفحات'}
          </button>
        </div>
      )}
    </SettingsSectionCard>
  )
}
