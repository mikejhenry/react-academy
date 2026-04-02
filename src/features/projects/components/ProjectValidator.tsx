import { useState } from 'react'
import type { Project } from '@/lib/types'
import { runValidators } from '../utils/runValidators'
import type { ValidationSummary } from '../utils/runValidators'

interface ProjectValidatorProps {
  project: Project
  onComplete: (bonusXP: number) => void
}

export function ProjectValidator({ project, onComplete }: ProjectValidatorProps) {
  const [code, setCode] = useState('')
  const [summary, setSummary] = useState<ValidationSummary | null>(null)

  const handleCheck = () => {
    setSummary(runValidators(code, project.validators))
  }

  const handleSubmit = () => {
    if (summary) onComplete(summary.bonusXPEarned)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-text-base">{project.title}</h2>
        <p className="text-text-muted mt-1">{project.description}</p>
        <p className="text-text-muted text-sm mt-1">
          Reward: {project.xpReward} XP
          {project.validators.some(v => v.bonusXP > 0) && (
            <span> + up to {project.validators.reduce((s, v) => s + v.bonusXP, 0)} bonus XP</span>
          )}
        </p>
      </div>

      {/* Requirements checklist */}
      <div className="bg-bg-secondary border border-border rounded-theme p-4">
        <p className="text-sm font-semibold text-text-base mb-3">Requirements</p>
        <ul className="flex flex-col gap-2">
          {project.validators.map(v => {
            const result = summary?.results.find(r => r.id === v.id)
            return (
              <li key={v.id} className="flex items-start gap-2 text-sm">
                <span className={
                  result === undefined ? 'text-text-muted' :
                  result.passed ? 'text-success' : 'text-error'
                }>
                  {result === undefined ? '○' : result.passed ? '✓' : '✗'}
                </span>
                <span className="text-text-base">{v.description}</span>
                {!v.required && (
                  <span className="ml-auto text-xs text-text-muted shrink-0">+{v.bonusXP} XP bonus</span>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* Code paste area */}
      <div>
        <label className="block text-sm font-semibold text-text-base mb-2" htmlFor="project-code">
          Paste your code here
        </label>
        <textarea
          id="project-code"
          value={code}
          onChange={e => setCode(e.target.value)}
          rows={12}
          placeholder="Paste your HTML, CSS, or JavaScript here..."
          className="w-full px-4 py-3 rounded-theme border border-border bg-bg-secondary text-text-base font-mono text-sm focus:outline-none focus:border-primary resize-y"
        />
      </div>

      {/* Validation result summary */}
      {summary !== null && (
        <div className={`p-4 rounded-theme border text-sm font-semibold ${
          summary.allRequiredPassed
            ? 'border-success text-success bg-bg-secondary'
            : 'border-error text-error bg-bg-secondary'
        }`}>
          {summary.allRequiredPassed
            ? `✓ All required checks passed!${summary.bonusXPEarned > 0 ? ` +${summary.bonusXPEarned} bonus XP earned.` : ''}`
            : '✗ Some required checks failed. Fix your code and try again.'}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleCheck}
          disabled={code.trim() === ''}
          className="px-5 py-2.5 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-50 text-sm"
        >
          Check My Code
        </button>
        {summary?.allRequiredPassed && (
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-theme border-2 border-success text-success hover:bg-bg-secondary font-semibold transition-colors text-sm"
          >
            Submit Project →
          </button>
        )}
      </div>
    </div>
  )
}
