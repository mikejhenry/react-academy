import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

interface SignUpFormProps {
  onSuccess: () => void
  onSwitchToLogin: () => void
}

export function SignUpForm({ onSuccess, onSwitchToLogin }: SignUpFormProps) {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [verifyPrompt, setVerifyPrompt] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    const { error } = await signUp(email, password)
    setLoading(false)
    if (error) { setError(error); return }
    setVerifyPrompt(true)
    setTimeout(onSuccess, 3000)
  }

  if (verifyPrompt) {
    return (
      <div className="text-center p-4">
        <p className="text-text-base font-medium">Check your email!</p>
        <p className="text-text-muted text-sm mt-2">We sent a verification link to <strong>{email}</strong></p>
      </div>
    )
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
        placeholder="Password (min 8 characters)"
        className="px-4 py-3 rounded-theme border border-border bg-bg text-text-base placeholder:text-text-muted focus:outline-none focus:border-primary"
      />
      <input
        type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
        placeholder="Confirm password"
        className="px-4 py-3 rounded-theme border border-border bg-bg text-text-base placeholder:text-text-muted focus:outline-none focus:border-primary"
      />
      <button
        type="submit" disabled={loading}
        className="px-4 py-3 rounded-theme bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-50"
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </button>
      <p className="text-center text-sm text-text-muted">
        Already have an account?{' '}
        <button type="button" onClick={onSwitchToLogin} className="text-primary hover:underline">Sign in</button>
      </p>
    </form>
  )
}
