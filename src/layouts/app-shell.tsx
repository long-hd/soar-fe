import { Layout } from 'antd'
import { useAppSelector } from '@/app/store'
import { selectSiderCollapsed } from '@/app/slices/theme-slice'
import SiderMenu from '@/layouts/components/sider-menu'
import HeaderBar from '@/layouts/components/header-bar'
import TabRenderer from '@/layouts/components/tab-renderer'
import TabBar from '@/layouts/components/tab-bar'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { prefetchDictData } from '@/shared/hooks/use-dict-data'

const { Header, Sider, Content } = Layout

/**
 * Main 3-pane shell — header on top, sider on left, content fills the rest.
 *
 * Content is dispatched by `<TabRenderer />` based on URL `?tab=<key>`.
 * NO `<Outlet>` — Soar uses flat URL dispatch, not nested routes
 * (see AGENTS URL pattern).
 */
export default function AppShell() {
  const collapsed = useAppSelector(selectSiderCollapsed)
  const queryClient = useQueryClient()

  // Eager prefetch of cross-cutting lookup data.
  // Fire-and-forget — components handle loading state gracefully.
  // Runs once per AppShell mount (i.e., once per browser-tab session per logged-in user).
  useEffect(() => {
    prefetchDictData(queryClient)
  }, [queryClient])

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} trigger={null} width={240} collapsedWidth={64}>
        <div
          style={{
            padding: '16px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: 18,
            color: '#fff',
            height: 64,
          }}
        >
          {collapsed ? 'S' : 'Soar'}
        </div>
        <SiderMenu />
      </Sider>

      <Layout>
        <Header style={{ padding: 0 }}>
          <HeaderBar />
        </Header>
        <TabBar />
        <Content style={{ padding: 16, overflow: 'auto' }}>
          <TabRenderer />
        </Content>
      </Layout>
    </Layout>
  )
}
