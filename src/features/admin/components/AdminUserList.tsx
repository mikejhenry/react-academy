// src/features/admin/components/AdminUserList.tsx
import { useState } from 'react'
import { useAdminUsers, useAdminUserDetail } from '../hooks/useAdminUsers'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { formatRelativeTime } from '@/features/comments/utils/formatRelativeTime'
import type { Role } from '@/lib/types'

const ROLE_STYLES: Record<Role, string> = {
  student: 'border-border text-text-muted',
  moderator: 'border-primary/60 text-primary',
  admin: 'border-success text-success',
}

const ROLES: Role[] = ['student', 'moderator', 'admin']

function UserDetail({ userId, onResetProgress }: { userId: string; onResetProgress: () => Promise<void> }) {
  const detail = useAdminUserDetail(userId)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)

  const handleReset = async () => {
    setResetting(true)
    try {
      await onResetProgress()
      setConfirmReset(false)
    } finally {
      setResetting(false)
    }
  }

  if (detail.loading) return <div className="py-2"><LoadingSpinner /></div>

  return (
    <div className="px-4 py-3 bg-bg border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div>
        <p className="text-xs text-text-muted">XP</p>
        <p className="text-sm font-semibold text-text-base">{detail.xp.toLocaleString()}</p>
      </div>
      <div>
        <p className="text-xs text-text-muted">Level</p>
        <p className="text-sm font-semibold text-text-base">{detail.level} — {detail.levelTitle}</p>
      </div>
      <div>
        <p className="text-xs text-text-muted">Streak</p>
        <p className="text-sm font-semibold text-text-base">{detail.streak} days</p>
      </div>
      <div>
        <p className="text-xs text-text-muted">Progress</p>
        <p className="text-sm font-semibold text-text-base">{detail.lessonCount} lessons · {detail.badgeCount} badges</p>
      </div>
      <div className="col-span-2 sm:col-span-4 flex gap-2 pt-1">
        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="px-3 py-1.5 text-xs rounded-theme border border-error text-error hover:bg-bg-secondary transition-colors"
          >
            Reset Progress
          </button>
        ) : (
          <>
            <span className="text-xs text-error self-center">Are you sure? This cannot be undone.</span>
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="px-3 py-1.5 text-xs rounded-theme bg-error text-white font-semibold disabled:opacity-50"
            >
              {resetting ? 'Resetting...' : 'Confirm Reset'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="px-3 py-1.5 text-xs rounded-theme border border-border text-text-muted hover:text-text-base transition-colors"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export function AdminUserList() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { users, loading, error, changeRole, resetProgress } = useAdminUsers(search)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
  }

  if (error) return <p className="text-error text-sm">{error}</p>

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search by name or email..."
          className="flex-1 px-3 py-2 text-sm rounded-theme border border-border bg-bg text-text-base focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="px-4 py-2 text-sm rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors"
        >
          Search
        </button>
      </form>

      {loading ? (
        <LoadingSpinner />
      ) : users.length === 0 ? (
        <p className="text-text-muted text-sm">No users found.</p>
      ) : (
        <div className="border border-border rounded-theme overflow-hidden">
          {users.map(user => (
            <div key={user.id} className="border-b border-border last:border-b-0">
              {/* Row */}
              <div className="flex items-center gap-3 px-4 py-3 bg-bg-secondary hover:bg-bg transition-colors">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center shrink-0">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-text-muted">
                      {user.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-base truncate">{user.displayName}</p>
                  <p className="text-xs text-text-muted truncate">{user.email}</p>
                </div>

                {/* Role select */}
                <select
                  value={user.role}
                  onChange={e => changeRole(user.id, e.target.value as Role)}
                  className={`text-xs px-2 py-1 rounded-theme border bg-bg focus:outline-none ${ROLE_STYLES[user.role]}`}
                  aria-label={`Change role for ${user.displayName}`}
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>

                {/* Joined */}
                <span className="text-xs text-text-muted hidden sm:block shrink-0">
                  {formatRelativeTime(user.createdAt)}
                </span>

                {/* Expand toggle */}
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === user.id ? null : user.id)}
                  className="text-xs text-text-muted hover:text-primary transition-colors shrink-0"
                  aria-label={expandedId === user.id ? 'Collapse user details' : 'Expand user details'}
                >
                  {expandedId === user.id ? '▲' : '▼'}
                </button>
              </div>

              {/* Expanded detail */}
              {expandedId === user.id && (
                <UserDetail
                  userId={user.id}
                  onResetProgress={() => resetProgress(user.id)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
