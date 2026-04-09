// src/features/moderator/components/ModerationQueue.tsx
import { useModerationQueue } from '../hooks/useModerationQueue'
import { ModerationQueueItem } from './ModerationQueueItem'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

export function ModerationQueue() {
  const { reports, loading, resolveReport } = useModerationQueue()

  if (loading) return <LoadingSpinner />
  if (reports.length === 0) {
    return <p className="text-text-muted text-sm">No pending reports.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-muted">{reports.length} unresolved report{reports.length !== 1 ? 's' : ''}</p>
      {reports.map(report => (
        <ModerationQueueItem key={report.id} report={report} onResolve={resolveReport} />
      ))}
    </div>
  )
}
