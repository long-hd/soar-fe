import { selectMenus } from '@/app/slices/auth-slice'
import { selectOpenTabs, tagsViewActions, type TabItem } from '@/app/slices/tags-view-slice'
import { useAppDispatch, useAppSelector } from '@/app/store'
import type { MenuDTO } from '@/features/auth/types'
import { Result, Spin, Typography } from 'antd'
import { Activity, lazy, Suspense, useEffect, useMemo, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

/**
 * Soar flat-URL content dispatcher with `<Activity>` keep-alive.
 *
 * Architecture:
 *  - All `openTabs` are rendered simultaneously, each wrapped in `<Activity>`.
 *  - The one whose `id` matches the current URL search string is `mode="visible"`;
 *    the rest are `mode="hidden"` — mounted but invisible, effects paused, state preserved.
 *  - When navigating to a tab not yet in `openTabs`, a "synthetic" tab is injected
 *    into the render list so the new tab paints immediately. `addTab` fires in a
 *    `useEffect`; on the next render the synthetic is replaced by the real entry
 *    with the same `id` (React reconciliation keeps the component instance alive).
 *  - When `menu.keepAlive === false`, inner content is rendered only while active.
 *    On switch-away, content unmounts (state lost).
 *
 * Fallback overlay (rendered ABOVE the Activity layer):
 *  1. No `?tab=`              → welcome banner
 *  2. Tab key not in menu     → "unknown tab" error
 *  3. Menu has no `.component` → "coming soon" (BE seed incomplete)
 *  4. `import.meta.glob` miss → "coming soon" (page file not created)
 *
 *  In any fallback case, the Activity layer still mounts (preserving open-tab state),
 *  but every Activity is forced to `mode="hidden"`.
 *
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

/** Inner shape for what we actually render in the Activity loop. */
interface RenderTab extends TabItem {
  menu: MenuDTO
  Component: ComponentType
}

export default function TabRenderer() {
  // ===== Hooks (always called — no early-return above this section) =====
  const menus = useAppSelector(selectMenus)
  const openTabs = useAppSelector(selectOpenTabs)
  const [searchParams] = useSearchParams()
  const dispatch = useAppDispatch()
  const { t } = useTranslation()

  const tab = searchParams.get('tab')
  const activeId = searchParams.toString()

  // Recompute only when menus tree changes (rare — after login or bootstrap)
  const menuMap = useMemo(() => flattenMenus(menus), [menus])

  const activeMenu = tab ? menuMap.get(tab) : undefined
  const activeComponent = activeMenu?.component ? lazyPages[activeMenu.component] : undefined
  const isUrlValid = Boolean(tab && activeMenu && activeComponent)

  // URL→addTab: dispatch when URL resolves to a valid renderable tab.
  // Idempotent — slice's `addTab` no-ops on duplicate id, so strict-mode + re-renders are safe.
  useEffect(() => {
    if (!isUrlValid || !tab || !activeMenu) return
    dispatch(
      tagsViewActions.addTab({
        id: activeId,
        tabKey: tab,
        title: activeMenu.name,
        search: activeId,
        closable: true,
      }),
    )
  }, [dispatch, activeId, tab, activeMenu, isUrlValid])

  // Build the render list: openTabs + synthetic entry for current URL if missing.
  // Resolve menu + Component for each — entries with no resolvable Component are skipped.
  const renderTabs = useMemo<RenderTab[]>(() => {
    const list: TabItem[] = [...openTabs]

    // synthetic tab injection
    if (isUrlValid && !list.some(x => x.id === activeId)) {
      list.push({
        id: activeId,
        tabKey: tab!,
        title: activeMenu!.name,
        search: activeId,
        closable: true,
        refreshKey: 0,
      })
    }
    // End of synthetic tab injection

    const out: RenderTab[] = []
    for (const item of list) {
      const menu = menuMap.get(item.tabKey)
      const Component = menu?.component ? lazyPages[menu.component] : undefined
      if (!menu || !Component) continue
      out.push({ ...item, menu, Component })
    }
    return out
  }, [openTabs, isUrlValid, activeId, tab, activeMenu, menuMap])

  // ===== Fallback overlay decision =====
  let fallback: React.ReactNode = null
  if (!tab) {
    fallback = (
      <Result
        icon={<Typography.Title level={1}>S</Typography.Title>}
        title={t('tabRenderer.welcomeTitle')}
        subTitle={t('tabRenderer.welcomeSubtitle')}
      />
    )
  } else if (!activeMenu) {
    fallback = (
      <Result
        status="warning"
        title={t('tabRenderer.unknownTab', { tab })}
        subTitle={t('tabRenderer.unknownTabHint')}
      />
    )
  } else if (!activeMenu.component || !activeComponent) {
    fallback = (
      <Result
        status="info"
        title={t('tabRenderer.comingSoon')}
        subTitle={`${activeMenu.name} — page not yet implemented`}
      />
    )
  }

  const showFallback = fallback !== null

  return (
    <>
      {showFallback && fallback}

      {renderTabs.map(rt => {
        const isActive = !showFallback && rt.id === activeId
        const keepAlive = rt.menu.keepAlive ?? true

        // Respect menu.keepAlive flag. When false and tab is hidden,
        // do not render the inner Suspense subtree — Activity wrapper remains
        // (cheap empty fiber) but state is intentionally discarded on switch-away.
        const inner =
          keepAlive || isActive ? (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center p-8">
                  <Spin size="large" />
                </div>
              }
            >
              <rt.Component key={rt.refreshKey} />
            </Suspense>
          ) : null

        return (
          <Activity key={rt.id} mode={isActive ? 'visible' : 'hidden'}>
            {inner}
          </Activity>
        )
      })}
    </>
  )
}
