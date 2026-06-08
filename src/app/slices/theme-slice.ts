import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type ThemeMode = 'light' | 'dark'

export interface ThemeState {
  mode: ThemeMode
}

const initialState: ThemeState = {
  mode: 'light',
}

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
  },
})

export const themeActions = themeSlice.actions
export default themeSlice.reducer
