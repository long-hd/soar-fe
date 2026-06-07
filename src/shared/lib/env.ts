/**
 * Typed wrapper around `import.meta.env`.
 * Centralizing here keeps `VITE_*` reads out of feature code.
 */
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE,
} as const

if (!env.apiBaseUrl) {
  // Soft warn — don't throw, dev may temporarily run without BE.
  console.warn('[env] VITE_API_BASE_URL is empty — API calls will use relative URLs.')
}
