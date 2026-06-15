import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { OrganizationSettings } from '../api/types'
import { useAuthStore } from '../stores/authStore'
import { useOrgSettingsStore } from '../stores/orgSettingsStore'
import {
  DEFAULT_GENERAL,
  DEFAULT_SALES,
  DEFAULT_SECURITY,
  mergeSettings,
} from '../modules/admin/lib/systemSettingsCatalog'

export function useOrgSettingsBootstrap() {
  const token = useAuthStore((s) => s.token)
  const loaded = useOrgSettingsStore((s) => s.loaded)
  const setFromApi = useOrgSettingsStore((s) => s.setFromApi)

  const query = useQuery({
    queryKey: ['admin', 'settings', 'bootstrap'],
    queryFn: async () => {
      const { data } = await api.get<OrganizationSettings>('/admin/settings')
      return data
    },
    enabled: Boolean(token) && !loaded,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (query.data) {
      setFromApi({
        organization: query.data.organization,
        settings: {
          general: mergeSettings(DEFAULT_GENERAL, query.data.settings?.general),
          sales: mergeSettings(DEFAULT_SALES, query.data.settings?.sales),
          security: mergeSettings(DEFAULT_SECURITY, query.data.settings?.security),
        },
      })
    }
  }, [query.data, setFromApi])

  const general = useOrgSettingsStore((s) => s.general)
  const organization = useOrgSettingsStore((s) => s.organization)

  return {
    general,
    organization,
    currency: general?.currency ?? 'EGP',
    locale: general?.default_locale === 'en' ? 'en-US' : 'ar-EG',
  }
}
