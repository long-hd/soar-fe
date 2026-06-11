import type { RootState } from '@/app/store'
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

/**
 * TagsView slice — tracks open tabs for the multi-tab AppShell.
 *
 * Source of truth for *active* tab is the URL (`?tab=` + other query params).
 * This slice only owns the *list* of open tabs and per-tab metadata.
 *
 * Persisted to sessionStorage (per-browser-tab; F5 keeps, new browser-tab fresh).
 * Wired in `store.ts` via `tagsViewPersistConfig`.
 *
 * See `T1_0_TAGS_VIEW_PATTERNS.md` for the data-flow diagram + decision log.
 */

export interface TabItem {
  /**
   * Identity = the URL search string as navigated, e.g.
   *   "tab=system-user"
   *   "tab=system-user-detail&id=123"
   * Two URLs with the same params in different order would create two tabs.
   * Canonicalization deferred (tech debt TV-E) — not an issue in practice
   * since we always navigate via the same code paths.
   */
  id: string

  /** Menu `tab_key`, e.g. "system-user". Used for menu highlight + parentTabKey resolution. */
  tabKey: string

  /**
   * Display title — captured from `menu.name` at addTab time.
   * Mutable via `updateTitle` (Phase 5C: detail pages set "Edit user: Long").
   */
  title: string

  /** Same as `id` today; kept separate so a future ID scheme (uuid) doesn't break URL restore. */
  search: string

  /** True for user-opened tabs; false for affix tabs (Phase 5C — schema reserved). */
  closable: boolean

  /** Bumped by `refreshTab` to force `<Component>` remount in TabRenderer. */
  refreshKey: number

  /** Optional icon name from menu config, rendered in TabBar if present. */
  icon?: string
}

export interface TagsViewState {
  openTabs: TabItem[]
}

const initialState: TagsViewState = {
  openTabs: [],
}

/** Action type emitted by `authSlice.logout` thunk. Used in extraReducers below. */
const AUTH_LOGOUT_FULFILLED = 'auth/logout/fulfilled'

export const tagsViewSlice = createSlice({
  name: 'tagsView',
  initialState,
  reducers: {
    /**
     * Add a tab. No-op if a tab with the same `id` already exists
     * (re-navigating to the same URL must not duplicate).
     *
     * Caller supplies all fields except `refreshKey` (initialized to 0).
     */
    addTab: (state, action: PayloadAction<Omit<TabItem, 'refreshKey'>>) => {
      const incoming = action.payload
      if (state.openTabs.some(t => t.id === incoming.id)) return
      state.openTabs.push({ ...incoming, refreshKey: 0 })
    },

    /** Remove a tab by id. Affix tabs (closable=false) cannot be closed. */
    closeTab: (state, action: PayloadAction<string>) => {
      const id = action.payload
      state.openTabs = state.openTabs.filter(t => t.id !== id || !t.closable)
    },

    /**
     * Close all tabs except the one matching `id` and any affix tabs.
     * Used by context menu "Close Others".
     */
    closeOthers: (state, action: PayloadAction<string>) => {
      const keepId = action.payload
      state.openTabs = state.openTabs.filter(t => t.id === keepId || !t.closable)
    },

    /** Close every non-affix tab. */
    closeAll: state => {
      state.openTabs = state.openTabs.filter(t => !t.closable)
    },

    /** Bump `refreshKey` for a tab → triggers `<Component>` remount in TabRenderer. */
    refreshTab: (state, action: PayloadAction<string>) => {
      const tab = state.openTabs.find(t => t.id === action.payload)
      if (tab) tab.refreshKey += 1
    },

    /**
     * Rename a tab. Used by detail pages later (Phase 5C) to set context-aware
     * titles like "Edit user: Long" instead of the menu's static "User Management".
     */
    updateTitle: (state, action: PayloadAction<{ id: string; title: string }>) => {
      const tab = state.openTabs.find(t => t.id === action.payload.id)
      if (tab) tab.title = action.payload.title
    },

    /** Hard reset — used by tests or future "clear workspace" features. */
    reset: () => initialState,
  },
  extraReducers: builder => {
    // Clear all tabs on logout. Auth-slice doesn't need to know about tagsView;
    // we listen to its action by string-typed matcher to avoid circular imports.
    builder.addMatcher(
      action => action.type === AUTH_LOGOUT_FULFILLED,
      () => initialState,
    )
  },
})

export const tagsViewActions = tagsViewSlice.actions
export default tagsViewSlice.reducer

// ===== Selectors =====

export const selectOpenTabs = (state: RootState): TabItem[] => state.tagsView.openTabs

/**
 * Find a tab by its id (URL search string). Returns `undefined` if not in openTabs
 * (e.g., during the brief moment between URL change and `addTab` effect firing).
 */
export const selectTabById =
  (id: string) =>
  (state: RootState): TabItem | undefined =>
    state.tagsView.openTabs.find(t => t.id === id)
