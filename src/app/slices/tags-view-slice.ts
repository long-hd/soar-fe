import { createSlice } from '@reduxjs/toolkit'

/**
 * Open tabs registry. (addTab, closeTab,
 * setActive, pin/unpin, closeOthers, closeAll)
 *
 * Persisted to sessionStorage (per-browser-tab isolation, F5-resistant).
 */
export interface TagsViewState {
  openTabs: unknown[]
  activeTabId: string | null
}

const initialState: TagsViewState = {
  openTabs: [],
  activeTabId: null,
}

export const tagsViewSlice = createSlice({
  name: 'tagsView',
  initialState,
  reducers: {
    reset: () => initialState,
  },
})

export const tagsViewActions = tagsViewSlice.actions
export default tagsViewSlice.reducer
