import type { RootState } from '@/app/store'
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type ThemeMode = 'light' | 'dark'

export interface ThemeState {
  mode: ThemeMode
  siderCollapsed: boolean
}

const initialState: ThemeState = {
  mode: 'dark',
  siderCollapsed: false,
}

/**
 * Theme + UI preferences. Despite the name, this slice now also holds
 * sider collapse state. When state grows beyond
 * ~5 fields, rename to `ui-slice` .
 */
export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setMode(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload
    },
    toggleMode(state) {
      state.mode = state.mode === 'light' ? 'dark' : 'light'
    },
    setSiderCollapsed(state, action: PayloadAction<boolean>) {
      state.siderCollapsed = action.payload
    },
    toggleSiderCollapsed(state) {
      state.siderCollapsed = !state.siderCollapsed
    },
  },
})

export const themeActions = themeSlice.actions
export default themeSlice.reducer

// ===== Selectors =====
export const selectThemeMode = (state: RootState) => state.theme.mode
export const selectSiderCollapsed = (state: RootState) => state.theme.siderCollapsed
