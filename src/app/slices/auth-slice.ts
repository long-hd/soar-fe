import { createSlice } from '@reduxjs/toolkit'

/**
 * Auth state — mirrors fields from BE `/system/auth/get-permission-info`.
 *
 * `menus` is `unknown[]` until B1 defines MenuDTO in features/auth/types.ts.
 */
export interface AuthState {
  userId: number | null
  accessToken: string | null
  refreshToken: string | null
  permissions: string[]
  roles: string[]
  menus: unknown[]
  status: 'idle' | 'authenticating' | 'authenticated' | 'error'
}

const initialState: AuthState = {
  userId: null,
  accessToken: null,
  refreshToken: null,
  permissions: [],
  roles: [],
  menus: [],
  status: 'idle',
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Wipe all auth state — used by logout and refresh-fail handlers. */
    reset: () => initialState,
  },
})

export const authActions = authSlice.actions
export default authSlice.reducer
