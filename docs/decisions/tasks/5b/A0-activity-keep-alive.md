# A0 — `<Activity>` Keep-Alive Refactor for `TabRenderer`

> Closes the architectural gap from T1: tabs now actually preserve state across switches.

---

## Why this block exists

T1.3 shipped a TabRenderer that renders **only the active tab**. Switching tabs = unmount old + mount new = state lost (filter inputs, scroll, open modals). That makes the "tabs" effectively bookmarks, not workspaces.

Yudao avoids this with Vue's `<keep-alive :include="cachedViews">` — all opened tabs stay mounted; only the visible one is shown. React 19.2 (`react ^19.2.6` pinned) provides the equivalent: `<Activity mode="hidden|visible">`. Hidden subtrees stay mounted, effects pause, updates deprioritized — state preserved.

This block does **one thing**: refactor TabRenderer to render all open tabs simultaneously, Activity-wrap each, drive visibility from URL.

---

## Architecture

### Render decision tree

```
TabRenderer renders:
  ├─ Fallback layer (conditionally shown when URL invalid / welcome state)
  │   ├─ No ?tab=         → <Welcome />
  │   ├─ ?tab=X, X not in menu  → <UnknownTab />
  │   ├─ menu exists, no .component  → <ComingSoon />
  │   └─ no glob match for .component → <ComingSoon />
  │
  └─ Activity layer (ALWAYS rendered to preserve state)
      For each tab in (openTabs ∪ {current URL tab if valid + not yet in openTabs}):
        <Activity key={tab.id} mode={isActive && validURL ? 'visible' : 'hidden'}>
          {keepAlive || isActive ? <Suspense><Component key={refreshKey}/></Suspense> : null}
        </Activity>
```

### Key invariants

| Concern                                                 | How it's handled                                                                                                                                                      |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| State across tab switch                                 | Activity `mode="hidden"` preserves mount + state                                                                                                                      |
| Refresh (manual reload)                                 | `refreshKey` on inner Component → remount that one tab only                                                                                                           |
| Close tab                                               | Tab leaves `openTabs` → Activity wrapper unmounts → state intentionally lost                                                                                          |
| Brief lag between URL change and `addTab` effect firing | "Synthetic tab" injected into render list (see below) so the new tab is visible from the very first paint                                                             |
| `menu.keepAlive === false` (OA-2)                       | Inner content rendered only when active; hidden state unmounts inner. Activity wrapper still present, but empty — matches yudao's `:include="cachedViews"` exclusion. |
| `?tab=` URL with no matching menu / no component file   | Fallback overlay rendered. Activity layer still mounted (other open tabs preserved), all set to `hidden`.                                                             |
| Welcome state (`/` with no `?tab=`)                     | Same — fallback overlay shown, Activity layer hidden. Open tabs from prior session still mounted in background.                                                       |
| Multi-instance detail pages (Phase 5C)                  | Different URL search → different `tab.id` → different Activity key → separate component instance. Architecture-ready without changes.                                 |

### Synthetic-tab pattern

When user navigates to `?tab=system-user` for the first time:

1. **Render N (before `addTab` effect)**: `openTabs` doesn't contain `system-user` yet. Without synthetic injection, the Activity loop wouldn't render anything for the new tab → first paint blank.
2. **Synthetic injection**: TabRenderer computes a merged render list = `openTabs ∪ {currentTabSynthetic}` when current URL is valid and not yet in openTabs. First paint shows the new tab inside Activity with `mode="visible"`.
3. **Render N+1 (after `addTab` effect commits)**: `openTabs` now contains the real tab with same `id`. Merged list no longer includes synthetic (already in openTabs). Activity instance preserved across renders because React keys by `tab.id`. No remount.

The synthetic and real tab share the same `id`, same `refreshKey: 0`, same component path → React reconciliation is seamless.

---

## File: `src/layouts/components/tab-renderer.tsx` (full replacement)

```tsx
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
 * Architecture (post-A0):
 *  - All `openTabs` are rendered simultaneously, each wrapped in `<Activity>`.
 *  - The one whose `id` matches the current URL search string is `mode="visible"`;
 *    the rest are `mode="hidden"` — mounted but invisible, effects paused, state preserved.
 *  - When navigating to a tab not yet in `openTabs`, a "synthetic" tab is injected
 *    into the render list so the new tab paints immediately. `addTab` fires in a
 *    `useEffect`; on the next render the synthetic is replaced by the real entry
 *    with the same `id` (React reconciliation keeps the component instance alive).
 *  - When `menu.keepAlive === false`, inner content is rendered only while active.
 *    On switch-away, content unmounts (state lost). Matches yudao's `cachedViews`
 *    inclusion semantics.
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
 * Phase 5B+ scope: tabs do NOT sync table/filter state to URL (Q1=B). Each tab owns
 * its in-memory state via `useTableState` + React state. Activity preserves it.
 */

// Module-level glob — Vite resolves at build time.
const pageModules = import.meta.glob('/src/pages/**/*.tsx')

const lazyPages: Record<string, ComponentType> = {}
for (const [globPath, loader] of Object.entries(pageModules)) {
  const componentPath = globPath.slice('/src/pages/'.length, -'.tsx'.length)
  lazyPages[componentPath] = lazy(loader as () => Promise<{ default: ComponentType }>)
}

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
  // ===== Hooks (always called) =====
  const menus = useAppSelector(selectMenus)
  const openTabs = useAppSelector(selectOpenTabs)
  const [searchParams] = useSearchParams()
  const dispatch = useAppDispatch()
  const { t } = useTranslation()

  const tab = searchParams.get('tab')
  const activeId = searchParams.toString()

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
        icon={<Typography.Title level={1}>👋</Typography.Title>}
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

  // ===== Render: fallback (if any) + Activity loop (always) =====
  return (
    <>
      {showFallback && fallback}

      {renderTabs.map(rt => {
        const isActive = !showFallback && rt.id === activeId
        const keepAlive = rt.menu.keepAlive ?? true

        // Per OA-2: respect menu.keepAlive flag. When false and tab is hidden,
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
```

---

## Notes on subtle points

### Why not `<Activity mode={...}>` for the fallback itself?

Fallback is short-lived UI (Result component) with no state worth preserving. Conditional rendering is simpler and avoids cluttering the Activity layer with non-tab content.

### Hidden-tab perf

Per React 19.2 docs: hidden Activities pause `useEffect` + `useLayoutEffect` callbacks, deprioritize re-renders triggered by context/store updates. In practice: 10 hidden tabs = near-zero ongoing CPU. Memory is the trade-off (each tab holds its DOM + state). No `MAX_TABS` limit Phase 5B (per OA-3).

### `Activity` import path

`import { Activity } from 'react'` — stable in React 19.2 (Oct 2025). No experimental flags. Package is `react@^19.2.6` in soar-fe, version is fine.

### `keepAlive` default

`menu.keepAlive ?? true` — defaults to keep-alive when BE seed doesn't specify. Matches yudao default behavior. BE seed currently has `keep_alive: true` on every menu type=2; explicit `false` not used anywhere yet but the support is wired and zero-cost.

### Synthetic tab injection — race condition?

Sequence on initial URL navigate (e.g., user clicks sidebar):

1. URL changes → React re-renders TabRenderer
2. `searchParams` updates → `activeId` updates → `isUrlValid=true`
3. Synthetic injection adds tab to `renderTabs` for THIS render
4. JSX returns: `<Activity key="tab=system-user" mode="visible">...</Activity>` — paints immediately
5. After paint: `useEffect` fires → dispatches `addTab` → store update → re-render
6. Re-render: openTabs now includes the tab; synthetic is no longer added (already in openTabs); same `tab.id` → React reuses the Activity instance → no remount

No race, no double-mount.

### `<rt.Component key={rt.refreshKey} />` — why `key` again?

Activity's `key={rt.id}` keeps the wrapper instance stable across the synthetic→real transition. The inner `<rt.Component key={rt.refreshKey}>` is the refresh mechanism — bumping `refreshKey` forces the lazy chunk to remount even though Activity didn't change. Two-level keying serves two purposes.

### What happens on logout

Auth slice dispatches `auth/logout/fulfilled` → tagsView extraReducer resets `openTabs = []` → renderTabs empty → Activity layer renders nothing → only welcome/route guard renders. State cleared cleanly.

---

## Smoke test

Re-run T1's tests (TV-1 … TV-11) — all should still pass. Plus new tests for keep-alive behavior:

| #        | Step                                                                                                                               | Expected                                                                                                                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A0-1** | Open `system-user` tab, type "admin" into username search filter (don't submit). Switch to `system-role` tab. Switch back to user. | Username field still has "admin". ✅ Keep-alive working.                                                                                                                                          |
| **A0-2** | (Phase 5B Task 2 onward.) Open user list page, navigate to page 3, switch tabs, come back.                                         | Still on page 3.                                                                                                                                                                                  |
| **A0-3** | Right-click user tab → Refresh.                                                                                                    | Brief Suspense spinner, component remounts. Filter inputs reset to defaults. (Different from switch — refresh is intentional reset.)                                                              |
| **A0-4** | Open user tab, fill some filters, click Close on the tab. Then reopen user tab from sidebar.                                       | Filters reset (closing = state intentionally lost).                                                                                                                                               |
| **A0-5** | Open 3 tabs, manually set one menu's `keep_alive=false` in DB, refresh app, switch away from that tab, switch back.                | That tab's state reset; the other 2 preserve. (Manual DB test — verifies OA-2 logic.)                                                                                                             |
| **A0-6** | Navigate to `?tab=foo-nonexistent`.                                                                                                | "Unknown tab" fallback shown. Open tabs in TabBar from prior session still listed (Activity layer alive in background). Click an existing tab → switches normally with state preserved.           |
| **A0-7** | F5 reload with 3 tabs open.                                                                                                        | TabBar restores all 3 (sessionStorage). Active tab from URL renders content. Other 2 tabs' state lost on reload (sessionStorage persists tab list, not internal React state — expected per Q1=B). |

---

## Apply checklist

- [ ] Replace `src/layouts/components/tab-renderer.tsx` with the impl above.
- [ ] `pnpm type-check` passes. (`Activity` from `react` — verify your TypeScript sees the type. If not, may need `pnpm i -D @types/react@^19.2 react@^19.2.6` resync, but already pinned in package.json.)
- [ ] `pnpm lint` passes.
- [ ] Run dev server. Walk T1 smoke + A0-1 / A0-3 / A0-6 / A0-7 from above.
- [ ] In React DevTools Components panel: confirm hidden tabs show in tree with their state intact when their tab is not active.

---

## What's NOT in this block

- No changes to slice, store, TabBar, or any other file.
- No changes to BE.
- No new dependencies — `Activity` is a core React export.

After Long confirms A0 working, mình tiếp A1 — Permission infra (no BE dep, can proceed in parallel with Long verifying dict/dept/post endpoints for A2-A4).

---

**End A0. Awaiting confirmation.**
