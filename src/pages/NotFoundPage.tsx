import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold text-text-base">404</h1>
      <p className="text-text-muted">Page not found.</p>
      <Link to="/" className="text-primary hover:underline">Go home</Link>
    </div>
  )
}
