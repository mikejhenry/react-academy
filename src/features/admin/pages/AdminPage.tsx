// src/features/admin/pages/AdminPage.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminUserList } from '../components/AdminUserList'
import { AdminBugReports } from '../components/AdminBugReports'
import { AdminAnalytics } from '../components/AdminAnalytics'
import { AdminContentBrowser } from '../components/AdminContentBrowser'
import { useAuth } from '@/features/auth/hooks/useAuth'

type Tab = 'users' | 'bugs' | 'analytics' | 'content'

const TABS: { id: Tab; label: string }[] = [
  { id: 'users', label: 'Users' },
  { id: 'bugs', label: 'Bug Reports' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'content', label: 'Content' },
]

export function AdminPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('users')

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-text-muted hover:text-primary transition-colors text-sm">
              ← Home
            </Link>
            <span className="text-text-muted text-sm">/</span>
            <h1 className="text-lg font-bold text-text-base">Admin Dashboard</h1>
          </div>
          <span className="text-xs text-text-muted hidden sm:block">{user?.display_name}</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-base'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'users' && <AdminUserList />}
        {activeTab === 'bugs' && <AdminBugReports />}
        {activeTab === 'analytics' && <AdminAnalytics />}
        {activeTab === 'content' && <AdminContentBrowser />}
      </div>
    </div>
  )
}
