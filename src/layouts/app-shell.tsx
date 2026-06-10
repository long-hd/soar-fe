import { Layout } from 'antd'
import { useAppSelector } from '@/app/store'
import { selectSiderCollapsed } from '@/app/slices/theme-slice'
import SiderMenu from './components/sider-menu'
import HeaderBar from './components/header-bar'
import TabRenderer from './components/tab-renderer'

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
        <Content style={{ padding: 16, overflow: 'auto' }}>
          <TabRenderer />
        </Content>
      </Layout>
    </Layout>
  )
}
