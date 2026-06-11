import { selectMenus } from '@/app/slices/auth-slice'
import { selectTabById, tagsViewActions } from '@/app/slices/tags-view-slice'
import { useAppDispatch, useAppSelector } from '@/app/store'
import type { MenuDTO } from '@/features/auth/types'
import { Result, Spin, Typography } from 'antd'
import { lazy, Suspense, useEffect, useMemo, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

/**
 * Soar flat-URL content dispatcher.
 *
 * Reads `?tab=<key>` from URL -> looks up the matching menu (by `tabKey`) in
 * Redux -> resolves `menu.component` (e.g., `system/user/index`) against a
 * Vite `import.meta.glob` map -> renders the page via `React.lazy` + `Suspense`.
 *
 * Replaces legacy's `generateRoutes()` + `router.addRoute()` flow with ~30 lines.
 *
 * Phase 5B additions (T1.3):
 *  - URL->addTab effect: every successful resolution dispatches `addTab` so the
 *    `<TabBar />` mirrors the user's navigation history. `addTab` is idempotent
 *    on duplicate id, so React 19 strict-mode double-invoke is safe.
 *  - `<Component key={refreshKey}>`: the slice's `refreshTab` action bumps a
 *    counter that React uses to unmount + remount the page on demand.
 *
 * NO `<Activity>` keep-alive yet — content remounts on each tab switch.
 * Phase 5C adds `<Activity mode={isActive ? 'visible' : 'hidden'}>` wrap for
 * tabs whose menu has `keepAlive=true`.
 *
 * Fallback cases (in priority order):
 *  1. No `?tab=`         → welcome banner
 *  2. Tab not in menu    → "unknown tab" error
 *  3. No component field → "coming soon"
 *  4. Glob miss          → "coming soon"
 *  5. Lazy load throws   → propagates to React's default error overlay (dev);
 *                          Phase 5B+ adds an ErrorBoundary (tech debt #17)
 */

// Module-level glob — Vite evaluates at build time, returns lazy import fns.
// Keys look like '/src/pages/system/user/index.tsx'.
const pageModules = import.meta.glob('/src/pages/**/*.tsx')

// Pre-build lazy wrappers once — keys match menu.component (e.g. system/user/index).
const lazyPages: Record<string, ComponentType> = {}
for (const [globPath, loader] of Object.entries(pageModules)) {
  const componentPath = globPath.slice('/src/pages/'.length, -'.tsx'.length)
  lazyPages[componentPath] = lazy(loader as () => Promise<{ default: ComponentType }>)
}

/** Recursively flatten the menu tree to a Map<tabKey, MenuDTO>. */
function flattenMenus(menus: readonly MenuDTO[]): Map<string, MenuDTO> {
  const out = new Map<string, MenuDTO>()
  function walk(items: readonly MenuDTO[]) {
    for (const item of items) {
      if (item.tabKey) out.set(item.tabKey, item)
      if (item.children && item.children.length > 0) walk(item.children)
    }
  }
  walk(menus)
  return out
}

export default function TabRenderer() {
  // ===== Hooks (always called — no early-return above this section) =====
  const menus = useAppSelector(selectMenus)
  const [searchParams] = useSearchParams()
  const dispatch = useAppDispatch()
  const { t } = useTranslation()

  const tab = searchParams.get('tab')
  const tabId = searchParams.toString()

  // Recompute only when menus tree changes (rare — after login or bootstrap)
  const menuMap = useMemo(() => flattenMenus(menus), [menus])

  const menu = tab ? menuMap.get(tab) : undefined
  const Component = menu?.component ? lazyPages[menu.component] : undefined

  // Read the tab's refreshKey from the slice. `tabFromStore` is `undefined`
  // briefly between URL change and the effect below firing — that's fine,
  // we fall back to 0 for the initial render.
  const tabFromStore = useAppSelector(selectTabById(tabId))
  const refreshKey = tabFromStore?.refreshKey ?? 0

  // URL→addTab: dispatch every time we have a valid (tab, menu, Component) triple.
  // `addTab` is a no-op when the id already exists, so the dispatch is safe on
  // re-render / React 19 strict-mode double-invoke.
  useEffect(() => {
    if (!tab || !menu || !Component) return
    dispatch(
      tagsViewActions.addTab({
        id: tabId,
        tabKey: tab,
        title: menu.name,
        search: tabId,
        closable: true,
        icon: menu.icon,
      }),
    )
  }, [dispatch, tabId, tab, menu, Component])

  // ===== Fallback 1: no tab specified =====
  if (!tab) {
    return (
      <Result
        icon={<Typography.Title level={1}>👋</Typography.Title>}
        title={t('tabRenderer.welcomeTitle')}
        subTitle={t('tabRenderer.welcomeSubtitle')}
      />
    )
  }

  // ===== Fallback 2: tab not in menu =====
  if (!menu) {
    return (
      <Result
        status="warning"
        title={t('tabRenderer.unknownTab', { tab })}
        subTitle={t('tabRenderer.unknownTabHint')}
      />
    )
  }

  // ===== Fallback 3: no component path =====
  if (!menu.component) {
    return (
      <Result
        status="info"
        title={t('tabRenderer.comingSoon')}
        subTitle={`${menu.name} — no component path defined`}
      />
    )
  }

  // ===== Fallback 4: file not in glob =====
  if (!Component) {
    return (
      <Result
        status="info"
        title={t('tabRenderer.comingSoon')}
        subTitle={`${menu.name} — page not yet implemented`}
      />
    )
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center p-8">
          <Spin size="large" />
        </div>
      }
    >
      <Component key={refreshKey} />
    </Suspense>
  )
}
