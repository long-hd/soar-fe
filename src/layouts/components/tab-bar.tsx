import { Dropdown, Tabs, theme, type MenuProps, type TabsProps } from 'antd'
import { Icon } from '@iconify/react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { selectOpenTabs, tagsViewActions, type TabItem } from '@/app/slices/tags-view-slice'

/**
 * Multi-tab bar — renders below the Header and above `<Content>` in AppShell.
 *
 * - Each tab corresponds to a `TabItem` in `tagsView.openTabs`.
 * - Active tab is derived from the current URL search string (single source of truth).
 * - Right-click any tab → context menu (Close / Close Others / Close All / Refresh).
 * - Closing the active tab navigates to the left neighbor (else right, else `/`).
 *
 * Decisions captured in T1_0_TAGS_VIEW_PATTERNS.md.
 */
export default function TabBar() {
  const tabs = useAppSelector(selectOpenTabs)
  const [searchParams] = useSearchParams()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { token } = theme.useToken()

  const activeId = searchParams.toString()

  // Don't render the bar at all when no tabs are open — keeps the welcome screen clean.
  if (tabs.length === 0) return null

  /** Navigate to a tab by id (= search string). */
  function goTo(id: string) {
    navigate(`/?${id}`)
  }

  /**
   * After removing a tab, if it was the active one, pick a neighbor to focus.
   * Caller passes the *pre-close* tabs array and the index that was removed.
   */
  function navigateAfterClose(removedIndex: number, preCloseTabs: TabItem[]) {
    const neighbor = preCloseTabs[removedIndex - 1] ?? preCloseTabs[removedIndex + 1]
    if (neighbor) {
      goTo(neighbor.id)
    } else {
      navigate('/')
    }
  }

  function handleClose(id: string) {
    const index = tabs.findIndex(t => t.id === id)
    const wasActive = id === activeId
    dispatch(tagsViewActions.closeTab(id))
    if (wasActive) navigateAfterClose(index, tabs)
  }

  function handleCloseOthers(id: string) {
    dispatch(tagsViewActions.closeOthers(id))
    // If "Close Others" was triggered from a non-active tab, focus that tab.
    if (id !== activeId) goTo(id)
  }

  function handleCloseAll() {
    dispatch(tagsViewActions.closeAll())
    navigate('/')
  }

  function handleRefresh(id: string) {
    dispatch(tagsViewActions.refreshTab(id))
  }

  /** antd Tabs onChange — fires when user clicks a different tab. */
  const onChange: TabsProps['onChange'] = (activeKey: string) => {
    goTo(activeKey)
  }

  /** antd Tabs onEdit — fires for both 'add' and 'remove'. We disable 'add'. */
  const onEdit: TabsProps['onEdit'] = (targetKey, action) => {
    if (action !== 'remove' || typeof targetKey !== 'string') return
    handleClose(targetKey)
  }

  /** Build the right-click menu for a given tab id. */
  function buildContextMenu(): MenuProps['items'] {
    return [
      { key: 'close', label: t('tagsView.close'), icon: <Icon icon="ep:close" /> },
      {
        key: 'closeOthers',
        label: t('tagsView.closeOthers'),
        icon: <Icon icon="ep:circle-close" />,
      },
      { key: 'closeAll', label: t('tagsView.closeAll'), icon: <Icon icon="ep:remove" /> },
      { type: 'divider' },
      { key: 'refresh', label: t('tagsView.refresh'), icon: <Icon icon="ep:refresh" /> },
    ]
  }

  function onContextMenuClick(id: string): MenuProps['onClick'] {
    return ({ key }) => {
      switch (key) {
        case 'close':
          handleClose(id)
          break
        case 'closeOthers':
          handleCloseOthers(id)
          break
        case 'closeAll':
          handleCloseAll()
          break
        case 'refresh':
          handleRefresh(id)
          break
      }
    }
  }

  const items: TabsProps['items'] = tabs.map(tab => ({
    key: tab.id,
    closable: tab.closable,
    label: (
      <Dropdown
        menu={{ items: buildContextMenu(), onClick: onContextMenuClick(tab.id) }}
        trigger={['contextMenu']}
      >
        <span className="inline-flex items-center gap-1">
          {tab.icon && <Icon icon={tab.icon} />}
          <span>{tab.title}</span>
        </span>
      </Dropdown>
    ),
  }))

  return (
    <div
      style={{
        backgroundColor: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        padding: '6px 12px 0',
      }}
    >
      <Tabs
        type="editable-card"
        hideAdd
        size="small"
        activeKey={activeId}
        items={items}
        onChange={onChange}
        onEdit={onEdit}
        tabBarStyle={{ margin: 0 }}
      />
    </div>
  )
}
