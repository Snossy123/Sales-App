import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
// AxiosResponse used for mock return typing
import { useAuthStore } from '../../stores/authStore'
import { handleMockRequest } from './handlers'

/**
 * Mock API router — mirrors Laravel endpoints for Vercel demo mode.
 * Set VITE_DEMO_MODE=true to use this instead of a real backend.
 */
export function createMockApi(): AxiosInstance {
  const request = async <T = unknown>(
    method: string,
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> => {
    const cleanUrl = url.replace(/^\//, '')
    const { branchId, warehouseId, user } = useAuthStore.getState()

    try {
      const result = handleMockRequest(method, cleanUrl, data, config, {
        branchId: branchId ?? undefined,
        warehouseId: warehouseId ?? undefined,
        organizationId: user?.organization_id,
      })
      return {
        data: result as T,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config ?? {},
      } as AxiosResponse<T>
    } catch (error) {
      const err = error as { response?: { status: number; data: unknown }; message: string; isAxiosError?: boolean }
      if (err.isAxiosError && err.response) {
        const axiosErr = Object.assign(new Error(err.message), {
          isAxiosError: true,
          response: err.response,
          config: config as AxiosRequestConfig,
        })
        throw axiosErr
      }
      throw error
    }
  }

  const api = {
    get: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
      request<T>('GET', url, undefined, config),
    post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
      request<T>('POST', url, data, config),
    put: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
      request<T>('PUT', url, data, config),
    patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
      request<T>('PATCH', url, data, config),
    delete: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
      request<T>('DELETE', url, undefined, config),
    interceptors: {
      request: { use: () => undefined, eject: () => undefined },
      response: { use: () => undefined, eject: () => undefined },
    },
    defaults: { headers: { common: {} } },
  }

  return api as unknown as AxiosInstance
}
