import { useState } from 'react'

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'gives_away_answer', label: 'Gives away quiz answer' },
  { value: 'other', label: 'Other' },
] as const

interface ReportModalProps {
  onReport: (reason: string) => void
  onClose: () => void
}

export function ReportModal({ onReport, onClose }: ReportModalProps) {
  const [selected, setSelected] = useState('')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-theme p-6 w-full max-w-sm mx-4">
        <h3 className="text-text-base font-semibold mb-4">Report Comment</h3>
        <div className="flex flex-col gap-2 mb-4">
          {REPORT_REASONS.map(r => (
            <label key={r.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="report-reason"
                value={r.value}
                checked={selected === r.value}
                onChange={() => setSelected(r.value)}
                className="accent-primary"
              />
              <span className="text-text-base text-sm">{r.label}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-theme border border-border text-text-muted text-sm hover:border-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { if (selected) onReport(selected) }}
            disabled={!selected}
            className="px-4 py-2 rounded-theme bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Report
          </button>
        </div>
      </div>
    </div>
  )
}
