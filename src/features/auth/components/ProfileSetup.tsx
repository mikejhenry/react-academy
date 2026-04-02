import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

interface ProfileSetupProps {
  onComplete: () => void
}

export function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const { updateProfile } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters')
      return
    }
    setError(null)
    setLoading(true)
    const { error } = await updateProfile({ display_name: displayName.trim() })
    setLoading(false)
    if (error) {
      setError(error)
      return
    }
    onComplete()
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-base">Set up your profile</h2>
        <p className="text-text-muted mt-1">What should we call you?</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
        {error && <p className="text-error text-sm text-center">{error}</p>}
        <input
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="Display name"
          maxLength={30}
          required
          className="px-4 py-3 rounded-theme border border-border bg-bg text-text-base placeholder:text-text-muted focus:outline-none focus:border-primary text-center text-lg"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-3 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Continue →'}
        </button>
      </form>
    </div>
  )
}
