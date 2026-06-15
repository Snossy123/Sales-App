import { create } from 'zustand'
import type { GeneralSettings, OrganizationProfile, SalesSettings, SecuritySettings } from '../api/types'
import { DEFAULT_SALES } from '../modules/admin/lib/systemSettingsCatalog'
import { applyThemeColor } from '../lib/theme'

interface OrgSettingsState {
  organization: OrganizationProfile | null
  general: GeneralSettings | null
  sales: SalesSettings | null
  security: SecuritySettings | null
  loaded: boolean
  setFromApi: (payload: {
    organization: OrganizationProfile
    settings: { general: GeneralSettings; sales?: SalesSettings; security: SecuritySettings }
  }) => void
  updateGeneral: (general: GeneralSettings) => void
  clear: () => void
}

export const useOrgSettingsStore = create<OrgSettingsState>()((set) => ({
  organization: null,
  general: null,
  sales: null,
  security: null,
  loaded: false,

  setFromApi: ({ organization, settings }) => {
    applyThemeColor(settings.general.theme_color)
    set({
      organization,
      general: settings.general,
      sales: settings.sales ?? DEFAULT_SALES,
      security: settings.security,
      loaded: true,
    })
  },

  updateGeneral: (general) => {
    applyThemeColor(general.theme_color)
    set({ general })
  },

  clear: () =>
    set({
      organization: null,
      general: null,
      sales: null,
      security: null,
      loaded: false,
    }),
}))
