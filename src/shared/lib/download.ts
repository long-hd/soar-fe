import type { AxiosResponse } from 'axios'

/**
 * Force-download a Blob response from axios.
 *
 * Bypasses BE Content-Disposition header semantics — works even for `inline` responses
 * (e.g., images) and cross-origin URLs where the HTML `download` attribute is ignored.
 *
 * Filename priority:
 *   1. `preferredFilename` (caller-supplied) — recommended when caller knows the original name
 *   2. `filename*=UTF-8''…` or `filename="…"` from Content-Disposition header
 *   3. `'download.bin'` fallback
 *
 * @param response Axios response with `responseType: 'blob'`
 * @param preferredFilename Caller-supplied name (overrides server-side filename)
 */
export function triggerDownload(response: AxiosResponse<Blob>, preferredFilename?: string): void {
  const { data, headers } = response
  const headerName = extractFilenameFromContentDisposition(
    headers['content-disposition'] as string | undefined,
  )
  const filename = preferredFilename ?? headerName ?? 'download.bin'

  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke async — some browsers process click on next tick
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Parse `filename` from a Content-Disposition header value.
 * Prefers RFC 5987 `filename*=UTF-8''…` (handles non-ASCII), falls back to legacy `filename="…"`.
 */
export function extractFilenameFromContentDisposition(contentDisposition?: string): string | null {
  if (!contentDisposition) return null

  // RFC 5987 form first
  const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  // Legacy form
  const legacyMatch = contentDisposition.match(/filename\s*=\s*"?(.*?)"?($|;)/i)
  return legacyMatch?.[1] ?? null
}
