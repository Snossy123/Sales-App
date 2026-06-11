import axios from 'axios'
import { usePortalAuthStore } from '../stores/portalAuthStore'
import { isDemoMode } from './client'
import { createMockPortalApi } from './mock/portal'

const baseURL = import.meta.env.VITE_API_URL?.trim() || '/api/v1'

const axiosPortal = axios.create({
  baseURL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

axiosPortal.interceptors.request.use((config) => {
  const token = usePortalAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axiosPortal.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      usePortalAuthStore.getState().logout()
      if (!window.location.pathname.startsWith('/portal/login')) {
        window.location.href = '/portal/login'
      }
    }
    return Promise.reject(error)
  },
)

const mockPortalApi = createMockPortalApi()

export const portalApi = isDemoMode ? mockPortalApi : axiosPortal
