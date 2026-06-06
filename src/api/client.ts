import axios from 'axios'
import { useAuthStore } from '../stores/authStore'
import { createMockApi } from './mock'

export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

const baseURL = import.meta.env.VITE_API_URL?.trim() || '/api/v1'

const axiosApi = axios.create({
  baseURL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

axiosApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const { branchId, warehouseId, departmentId } = useAuthStore.getState()
  if (branchId) {
    config.headers['X-Branch-Id'] = String(branchId)
  }
  if (warehouseId) {
    config.headers['X-Warehouse-Id'] = String(warehouseId)
  }
  if (departmentId) {
    config.headers['X-Department-Id'] = String(departmentId)
  }

  const user = useAuthStore.getState().user
  if (user?.organization_id) {
    config.headers['X-Organization-Id'] = String(user.organization_id)
  }

  return config
})

axiosApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

const mockApi = createMockApi()

export const api = isDemoMode ? mockApi : axiosApi

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> }
    if (data?.errors) {
      const first = Object.values(data.errors)[0]
      if (first?.[0]) return first[0]
    }
    if (data?.message) return data.message
    if (error.response?.status === 401) return 'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى.'
    if (error.response?.status === 422) return 'بيانات غير صالحة.'
    if (error.response?.status) return `خطأ في الخادم (${error.response.status})`
    return 'تعذر الاتصال بالخادم.'
  }
  if (error instanceof Error) return error.message
  return 'حدث خطأ غير متوقع.'
}
