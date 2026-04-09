// src/features/admin/components/AdminAnalytics.tsx
import { useAdminAnalytics } from '../hooks/useAdminAnalytics'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

interface BarItem {
  label: string
  value: number
  max: number
}

function CSSBarChart({ items, valueLabel = '' }: { items: BarItem[]; valueLabel?: string }) {
  if (items.length === 0) return <p className="text-text-muted text-xs">No data.</p>
  return (
    <div className="flex flex-col gap-2">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-xs text-text-muted w-32 shrink-0 truncate text-right">{item.label}</span>
          <div className="flex-1 bg-bg rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: item.max > 0 ? `${Math.round((item.value / item.max) * 100)}%` : '0%' }}
            />
          </div>
          <span className="text-xs text-text-muted w-10 shrink-0 text-right">
            {item.value}{valueLabel}
          </span>
        </div>
      ))}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border rounded-theme p-4 bg-bg-secondary">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-2xl font-bold text-text-base mt-1">{value.toLocaleString()}</p>
    </div>
  )
}

export function AdminAnalytics() {
  const analytics = useAdminAnalytics()

  if (analytics.loading) return <LoadingSpinner />
  if (analytics.error) return <p className="text-error text-sm">{analytics.error}</p>

  const maxXP = Math.max(...analytics.xpBuckets.map(b => b.count), 1)
  const maxLesson = Math.max(...analytics.topLessons.map(l => l.count), 1)
  const maxBug = Math.max(...analytics.bugStatusCounts.map(b => b.count), 1)

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Users" value={analytics.userCount} />
        <StatCard label="Lessons Completed" value={analytics.lessonCompletions} />
        <StatCard label="Quiz Attempts" value={analytics.quizAttempts} />
        <StatCard label="Projects Passed" value={analytics.projectsPassed} />
      </div>

      {/* XP distribution */}
      <div className="border border-border rounded-theme p-4 bg-bg-secondary">
        <p className="text-sm font-semibold text-text-base mb-4">XP Distribution</p>
        <CSSBarChart
          items={analytics.xpBuckets.map(b => ({ label: b.label, value: b.count, max: maxXP }))}
          valueLabel=" users"
        />
      </div>

      {/* Top lessons */}
      {analytics.topLessons.length > 0 && (
        <div className="border border-border rounded-theme p-4 bg-bg-secondary">
          <p className="text-sm font-semibold text-text-base mb-4">Most Completed Lessons (top 10)</p>
          <CSSBarChart
            items={analytics.topLessons.map(l => ({
              label: l.lessonTitle,
              value: l.count,
              max: maxLesson,
            }))}
          />
        </div>
      )}

      {/* Bug report status */}
      {analytics.bugStatusCounts.length > 0 && (
        <div className="border border-border rounded-theme p-4 bg-bg-secondary">
          <p className="text-sm font-semibold text-text-base mb-4">Bug Reports by Status</p>
          <CSSBarChart
            items={analytics.bugStatusCounts.map(b => ({
              label: b.status,
              value: b.count,
              max: maxBug,
            }))}
          />
        </div>
      )}
    </div>
  )
}
