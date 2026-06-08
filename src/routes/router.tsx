import { createBrowserRouter } from 'react-router-dom'
import LoginPage from '@/pages/login/login-page'
import ForbiddenPage from '@/pages/error/forbidden'
import NotFoundPage from '@/pages/error/not-found'
import AppShell from '@/layouts/app-shell'
import AuthGuard from './guards/auth-guard'

/**
 * 4 top-level routes — flat. All menu-triggered pages live at `/?tab=<tabKey>`
 * (see AGENTS §URL pattern + C3 tab-renderer).
 */
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forbidden',
    element: <ForbiddenPage />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
