import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { useLoadingStore } from '../stores/loadingStore'

function finishTrackedRequest(config?: InternalAxiosRequestConfig) {
  if (config?._trackedByGlobalLoader) {
    config._trackedByGlobalLoader = false
    useLoadingStore.getState().endRequest()
  }
}

/**
 * Attaches global loading-counter interceptors to an Axios instance.
 * Requests with `skipGlobalLoader: true` are ignored.
 */
export function attachLoadingInterceptors(instance: AxiosInstance): void {
  instance.interceptors.request.use(
    (config) => {
      if (!config.skipGlobalLoader) {
        config._trackedByGlobalLoader = true
        useLoadingStore.getState().startRequest()
      }
      return config
    },
    (error: unknown) => {
      const config = (error as { config?: InternalAxiosRequestConfig } | undefined)?.config
      finishTrackedRequest(config)
      return Promise.reject(error)
    },
  )

  instance.interceptors.response.use(
    (response) => {
      finishTrackedRequest(response.config)
      return response
    },
    (error: unknown) => {
      const config = (error as { config?: InternalAxiosRequestConfig } | undefined)?.config
      finishTrackedRequest(config)
      return Promise.reject(error)
    },
  )
}
