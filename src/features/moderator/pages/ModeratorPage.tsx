import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ModerationQueue } from '../components/ModerationQueue'
import { RecentCommentsFeed } from '../components/RecentCommentsFeed'
import { TimeoutManager } from '../components/TimeoutManager'
import { ModeratorInbox } from '../components/ModeratorInbox'
import { useAuth } from '@/features/auth/hooks/useAuth'

type Tab = 'queue' | 'comments' | 'timeouts' | 'messages'

const TABS: { id: Tab; label: string }[] = [
  { id: 'queue', label: 'Report Queue' },
  { id: 'comments', label: 'Recent Comments' },
  { id: 'timeouts', label: 'Timeouts' },
  { id: 'messages', label: 'Messages' },
]

export function ModeratorPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('queue')

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-text-muted hover:text-primary transition-colors text-sm">
              ← Home
            </Link>
            <span className="text-text-muted text-sm">/</span>
            <h1 className="text-lg font-bold text-text-base">Moderator Dashboard</h1>
          </div>
          <span className="text-xs text-text-muted hidden sm:block">{user?.display_name}</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
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
        {activeTab === 'queue' && <ModerationQueue />}
        {activeTab === 'comments' && <RecentCommentsFeed />}
        {activeTab === 'timeouts' && <TimeoutManager />}
        {activeTab === 'messages' && <ModeratorInbox />}
      </div>
    </div>
  )
}
