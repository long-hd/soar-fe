import type { RootState } from '@/app/store'
import { authApi } from '@/features/auth/api/auth-api'
import type {
  AuthLoginReqDTO,
  AuthPermissionInfoRespDTO,
  MenuDTO,
  UserDTO,
} from '@/features/auth/types'
import type { AuthTokensDTO } from '@/shared/api/types'
import { getAccessToken, removeTokens, setTokens as setTokensInStorage } from '@/shared/lib/token'
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'

/**
 * Auth slice — single source of truth for authenticated React UI.
 *
 * Tokens live in BOTH this Redux state AND
 * `shared/lib/token.ts` localStorage. The 5 sync sites that must update both:
 *  1. `login.fulfilled`           — fulfilled reducer writes tokens to state;
 *                                    thunk writes to storage via setTokensInStorage()
 *  2. `logout` thunk              — thunk calls removeTokens(), reducer clears state
 *  3. `setTokens` reducer (sync)  — paired with setTokensInStorage() from auth-interceptor
 *                                    after refresh succeeds
 *  4. `auth-interceptor` refresh  — calls setTokensInStorage + dispatches setTokens(tokens)
 *  5. `tenant-boot-gate`          — no explicit sync needed: redux-persist rehydrates
 *                                    auth-slice and localStorage already has tokens
 */

export interface AuthState {
  userId: number | null
  user: UserDTO | null
  accessToken: string | null
  refreshToken: string | null
  permissions: string[]
  roles: string[]
  menus: MenuDTO[]
  status: 'idle' | 'authenticating' | 'authenticated' | 'error'
  error: string | null
}

const initialState: AuthState = {
  userId: null,
  user: null,
  accessToken: null,
  refreshToken: null,
  permissions: [],
  roles: [],
  menus: [],
  status: 'idle',
  error: null,
}

// ===== Async thunks =====

/**
 * Login flow (4 steps per legacy pattern):
 *  1. POST /auth/login → tokens
 *  2. Persist tokens to localStorage (so subsequent request has Authorization header)
 *  3. GET /auth/get-permission-info → user/roles/permissions/menus
 *  4. Reducer fold step 1 + step 3 into state
 *
 * On step 3 failure, rolls back step 2 — partial success treated as full failure.
 */
export const login = createAsyncThunk<
  { tokens: AuthTokensDTO; info: AuthPermissionInfoRespDTO },
  AuthLoginReqDTO,
  { rejectValue: string }
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const tokens = await authApi.login(credentials)
    setTokensInStorage({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    })
    try {
      const info = await authApi.getPermissionInfo()
      return { tokens, info }
    } catch (infoErr) {
      // Rollback partial success — tokens written to storage but info call failed
      removeTokens()
      throw infoErr
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Login failed'
    return rejectWithValue(msg)
  }
})

/**
 * Logout flow:
 *  1. Best-effort POST /auth/logout (BE invalidates token; swallow failures —
 *     network down or token already expired must not block client logout)
 *  2. removeTokens() from localStorage
 *  3. Reducer resets state (extraReducers below)
 *
 * Tenant survives logout — do NOT removeTenantId. Next visit uses same tenant
 * (resolution determined by hostname, not by user choice).
 */
export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authApi.logout()
  } catch {
    // best-effort, ignore
  }
  removeTokens()
})

/**
 * Bootstrap on app boot when token already exists in storage (cross-tab session,
 * F5 reload). Re-fetches permission info — gives BE chance to revoke permissions
 * server-side and have FE reflect immediately.
 *
 * Called from tenant-boot-gate after tenant resolves.
 *
 * On rejection: leaves status='idle' (does NOT reset). Reasons:
 *  - No token: state was already initial.
 *  - Network error: keep persisted state visible; user can retry.
 *  - Token invalid: auth-interceptor handles 401 → refresh → if refresh also fails,
 *    handleAuthorized dispatches logout (which DOES reset).
 */
export const bootstrapAuth = createAsyncThunk<
  AuthPermissionInfoRespDTO,
  void,
  { rejectValue: string }
>('auth/bootstrap', async (_, { rejectWithValue }) => {
  const accessToken = getAccessToken()
  if (!accessToken) {
    return rejectWithValue('No token in storage')
  }
  try {
    return await authApi.getPermissionInfo()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Bootstrap failed'
    return rejectWithValue(msg)
  }
})

// ===== Slice =====

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Sync action — called by `auth-interceptor` after successful refresh
     * to update Redux mirror of storage tokens. Must be paired with
     * `setTokensInStorage()` (interceptor handles that).
     */
    setTokens(state, action: PayloadAction<AuthTokensDTO>) {
      state.userId = action.payload.userId
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
    },

    /** Wipe everything — used by manual reset paths if needed. */
    reset: () => initialState,
  },
  extraReducers: builder => {
    builder
      .addCase(login.pending, state => {
        state.status = 'authenticating'
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        const { tokens, info } = action.payload
        state.userId = tokens.userId
        state.accessToken = tokens.accessToken
        state.refreshToken = tokens.refreshToken
        state.user = info.user
        state.permissions = info.permissions
        state.roles = info.roles
        state.menus = info.menus
        state.status = 'authenticated'
        state.error = null
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.payload ?? 'Login failed'
      })

      .addCase(logout.fulfilled, () => initialState)
      .addCase(logout.rejected, () => initialState)

      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.permissions = action.payload.permissions
        state.roles = action.payload.roles
        state.menus = action.payload.menus
        state.status = 'authenticated'
        state.error = null
      })
      .addCase(bootstrapAuth.rejected, state => {
        // Leave tokens + persisted state alone (see thunk JSDoc)
        state.status = 'idle'
      })
  },
})

export const authActions = authSlice.actions
export default authSlice.reducer

// ===== Selectors =====

export const selectAuth = (state: RootState) => state.auth
export const selectIsAuthed = (state: RootState) => !!state.auth.accessToken
export const selectUser = (state: RootState) => state.auth.user
export const selectPermissions = (state: RootState) => state.auth.permissions
export const selectMenus = (state: RootState) => state.auth.menus
export const selectRoles = (state: RootState) => state.auth.roles
export const selectAuthStatus = (state: RootState) => state.auth.status
export const selectAuthError = (state: RootState) => state.auth.error
