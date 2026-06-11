import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { usePortalAuthStore } from '../../stores/portalAuthStore'
import { handlePortalMockRequest } from './portalHandlers'

export function createMockPortalApi(): AxiosInstance {
  const request = async <T = unknown>(
    method: string,
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> => {
    const cleanUrl = url.replace(/^\//, '')
    const { user } = usePortalAuthStore.getState()

    try {
      const result = handlePortalMockRequest(method, cleanUrl, data, config, {
        user: user ?? undefined,
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
        throw Object.assign(new Error(err.message), {
          isAxiosError: true,
          response: err.response,
          config: config as AxiosRequestConfig,
        })
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
