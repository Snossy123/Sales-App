/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_TOUR_PREFERENCES_URL?: string
  readonly VITE_TOUR_SYNC_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
