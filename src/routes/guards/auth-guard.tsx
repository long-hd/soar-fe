import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/app/store'
import { selectIsAuthed } from '@/app/slices/auth-slice'

interface AuthGuardProps {
  children: ReactNode
}

/**
 * Wraps protected routes. Redirects to `/login?redirect=<encoded current URL>`
 * when not authenticated.
 *
 * `encodeURIComponent` is critical — Soar URLs use `?tab=<key>` flat pattern,
 * so the redirect URL contains its own `?`. Without encoding, the inner query
 * gets parsed as outer query and corrupts navigation.
 *
 * Logout flow caveat: when user dispatches logout from a protected route,
 * `isAuthed` flips to false → AuthGuard re-renders → Navigate kicks in →
 * URL becomes `/login?redirect=%2F`. Slightly noisy (redirect=/ is the
 * default destination after login anyway), but functional. Tech debt #15.
 *
 * Pattern from legacy `permission.ts:97-98` — adapted to react-router-dom.
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const isAuthed = useAppSelector(selectIsAuthed)
  const location = useLocation()

  if (!isAuthed) {
    const fullPath = location.pathname + location.search
    const redirect = encodeURIComponent(fullPath)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  return <>{children}</>
}
