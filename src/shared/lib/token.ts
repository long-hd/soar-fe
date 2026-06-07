/**
 * Access + refresh token storage helpers.
 * Plain localStorage, no TTL — token expiry is detected at request time when
 * `CommonResult.code === 401`, then handled by the auth-interceptor refresh flow.
 */

const ACCESS_TOKEN_KEY = 'SOAR_ACCESS_TOKEN'
const REFRESH_TOKEN_KEY = 'SOAR_REFRESH_TOKEN'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens(tokens: { accessToken: string; refreshToken: string }): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
}

export function removeTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

/** Prefix a raw token with `Bearer `. */
export function formatToken(token: string): string {
  return `Bearer ${token}`
}
