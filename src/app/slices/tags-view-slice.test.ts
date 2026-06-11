import reducer, { tagsViewActions, type TabItem } from '@/app/slices/tags-view-slice'

const sampleTab: Omit<TabItem, 'refreshKey'> = {
  id: 'tab=system-user',
  tabKey: 'system-user',
  title: 'User Management',
  search: 'tab=system-user',
  closable: true,
}

test('addTab pushes new tab', () => {
  const state = reducer(undefined, tagsViewActions.addTab(sampleTab))
  expect(state.openTabs).toHaveLength(1)
  expect(state.openTabs[0].refreshKey).toBe(0)
})

test('addTab is no-op on duplicate id', () => {
  const s1 = reducer(undefined, tagsViewActions.addTab(sampleTab))
  const s2 = reducer(s1, tagsViewActions.addTab(sampleTab))
  expect(s2.openTabs).toHaveLength(1)
})

test('refreshTab bumps refreshKey', () => {
  const s1 = reducer(undefined, tagsViewActions.addTab(sampleTab))
  const s2 = reducer(s1, tagsViewActions.refreshTab(sampleTab.id))
  expect(s2.openTabs[0].refreshKey).toBe(1)
})

test('closeOthers keeps target only', () => {
  const tabB = { ...sampleTab, id: 'tab=system-role', tabKey: 'system-role' }
  const s1 = reducer(undefined, tagsViewActions.addTab(sampleTab))
  const s2 = reducer(s1, tagsViewActions.addTab(tabB))
  const s3 = reducer(s2, tagsViewActions.closeOthers(sampleTab.id))
  expect(s3.openTabs).toHaveLength(1)
  expect(s3.openTabs[0].id).toBe(sampleTab.id)
})

test('logout clears tabs', () => {
  const s1 = reducer(undefined, tagsViewActions.addTab(sampleTab))
  const s2 = reducer(s1, { type: 'auth/logout/fulfilled' })
  expect(s2.openTabs).toHaveLength(0)
})
