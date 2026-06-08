import { combineReducers, configureStore } from '@reduxjs/toolkit'
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from 'redux-persist'
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'

import authReducer from '@/app/slices/auth-slice'
import tagsViewReducer from '@/app/slices/tags-view-slice'
import themeReducer from '@/app/slices/theme-slice'

/**
 * Inline storage adapters — bypass `redux-persist/lib/storage` which has
 * CJS/ESM interop issues in Vite (default export resolves to a namespace
 * object instead of the storage instance). Writing it inline is what
 * redux-persist does internally anyway.
 */
function createWebStorage(storage: Storage) {
  return {
    getItem: (key: string): Promise<string | null> => Promise.resolve(storage.getItem(key)),
    setItem: (key: string, value: string): Promise<void> =>
      Promise.resolve(storage.setItem(key, value)),
    removeItem: (key: string): Promise<void> => Promise.resolve(storage.removeItem(key)),
  }
}

const localStorageAdapter = createWebStorage(window.localStorage)
const sessionStorageAdapter = createWebStorage(window.sessionStorage)

/**
 * Persistence strategy per AGENTS.md §Persistence Split:
 * - localStorage: auth (cross-tab session), theme (user preference).
 * - sessionStorage: tagsView (per-browser-tab — F5 keeps tabs, new tab fresh).
 */
const authPersistConfig = {
  key: 'soar:auth',
  storage: localStorageAdapter,
  version: 1,
}

const tagsViewPersistConfig = {
  key: 'soar:tagsView',
  storage: sessionStorageAdapter,
  version: 1,
}

const themePersistConfig = {
  key: 'soar:theme',
  storage: localStorageAdapter,
  version: 1,
}

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  tagsView: persistReducer(tagsViewPersistConfig, tagsViewReducer),
  theme: persistReducer(themePersistConfig, themeReducer),
})

export const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist actions contain non-serializable internals (storage adapters).
        // Whitelist them so the dev-time check doesn't spam the console.
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: import.meta.env.DEV,
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Typed hooks — use these throughout the app instead of plain useDispatch/useSelector.
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
