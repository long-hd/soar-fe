import { Layout } from 'antd'
import type { ReactNode } from 'react'

const { Content } = Layout

interface BlankLayoutProps {
  children: ReactNode
}

/**
 * Centered card layout used by login and later by forbidden/not-found
 * pages. antd `Layout` provides theme-aware background, so the
 * page respects light/dark mode without hardcoded colors.
 */
export default function BlankLayout({ children }: BlankLayoutProps) {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content className="flex items-center justify-center p-4">
        <div className="w-full max-w-md">{children}</div>
      </Content>
    </Layout>
  )
}
