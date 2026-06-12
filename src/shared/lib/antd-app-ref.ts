import {
  App,
  message as staticMessage,
  Modal as staticModal,
  notification as staticNotification,
} from 'antd'
import { useEffect, type ReactNode } from 'react'

/**
 * Bridges antd `<App>` instance methods (message/modal/notification) to a
 * module-level ref so non-component code (interceptors, store thunks, util
 * modules) can use them with ConfigProvider context applied (theme tokens,
 * style providers, etc.).
 *
 * Mode of operation:
 *  - `AntdAppRefBridge` mounts once inside `<App>` (see providers.tsx). It
 *    calls `App.useApp()` and writes the bound instance methods to `_ref`.
 *  - Non-component callers import `antdApp` and use its proxy properties.
 *  - Before the bridge mounts (one frame during initial boot), the proxy
 *    falls back to antd's static API. Calls still work, just without
 *    ConfigProvider context for that brief moment.
 *
 * Why a getter-based proxy instead of a plain object:
 *  - Bridge sets `_ref` AFTER first render → cached reference at module load
 *    would point at static API forever. Getters re-read `_ref` per call.
 *
 * React components should prefer `App.useApp()` directly — it's the official
 * API and re-renders correctly. Use `antdApp` only when no component context
 * is available.
 */

type AppInstance = ReturnType<typeof App.useApp>

let _ref: AppInstance | null = null

export const antdApp = {
  get message() {
    return _ref?.message ?? staticMessage
  },
  get modal() {
    return _ref?.modal ?? staticModal
  },
  get notification() {
    return _ref?.notification ?? staticNotification
  },
}

/** Mount ONCE inside `<App>`. Renders null. */
export function AntdAppRefBridge(): ReactNode {
  const app = App.useApp()
  useEffect(() => {
    _ref = app
    return () => {
      // Only clear if this effect's value is still the active ref. Defensive:
      // if React strict-mode runs effect twice, second cleanup shouldn't wipe
      // a freshly-set ref from the second mount.
      if (_ref === app) _ref = null
    }
  }, [app])
  return null
}
