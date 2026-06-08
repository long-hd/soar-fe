import { message } from 'antd'
import type { AxiosError, AxiosResponse } from 'axios'

/**
 * Response interceptor handling non-success `CommonResult.code` (other than 401)
 * and network/HTTP errors. Does NOT unwrap — callers do `.data.data` themselves.
 *
 * Pattern from legacy `service.ts:146-223` — adapted: split 401 out to auth-interceptor.
 */
export async function errorResponseFulfilled(response: AxiosResponse): Promise<AxiosResponse> {
  const body = response.data

  // Binary downloads (blob/arraybuffer) pass through untouched
  if (
    response.request?.responseType === 'blob' ||
    response.request?.responseType === 'arraybuffer'
  ) {
    return response
  }

  // Non-CommonResult shapes pass through (e.g., 3rd-party API responses)
  if (!body || typeof body !== 'object' || !('code' in body)) {
    return response
  }

  const code = body.code as number

  // Success — caller will read `.data.data`
  if (code === 0) {
    return response
  }

  // 401 should have been handled by auth-interceptor. Defensive reject.
  if (code === 401) {
    return Promise.reject(new Error(body.msg || 'Unauthorized'))
  }

  // All other non-zero codes — toast and reject
  const msg = body.msg || `Request failed (code ${code})`
  message.error(msg)
  return Promise.reject(new Error(msg))
}

/** Network errors, timeouts, HTTP non-2xx without a CommonResult body. */
export function errorResponseError(error: AxiosError): Promise<never> {
  if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
    message.error('Request timeout')
  } else if (!error.response) {
    message.error('Network error — please check your connection')
  } else {
    message.error(`HTTP ${error.response.status}: ${error.response.statusText || 'Error'}`)
  }
  return Promise.reject(error)
}
