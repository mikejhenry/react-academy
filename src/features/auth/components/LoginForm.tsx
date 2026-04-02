import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

interface LoginFormProps {
  onSuccess: () => void
  onSwitchToSignUp: () => void
}

export function LoginForm({ onSuccess, onSwitchToSignUp }: LoginFormProps) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) { setError(error); return }
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
      {error && <p className="text-error text-sm text-center">{error}</p>}
      <input
        type="email" value={email} onChange={e => setEmail(e.target.value)} required
        placeholder="Email address"
        className="px-4 py-3 rounded-theme border border-border bg-bg text-text-base placeholder:text-text-muted focus:outline-none focus:border-primary"
      />
      <input
        type="password" value={password} onChange={e => setPassword(e.target.value)} required
        placeholder="Password"
        className="px-4 py-3 rounded-theme border border-border bg-bg text-text-base placeholder:text-text-muted focus:outline-none focus:border-primary"
      />
      <button
        type="submit" disabled={loading}
        className="px-4 py-3 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
      <p className="text-center text-sm text-text-muted">
        Don't have an account?{' '}
        <button type="button" onClick={onSwitchToSignUp} className="text-primary hover:underline">Sign up</button>
      </p>
    </form>
  )
}
