import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { LoadingSpinner } from './LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'student' | 'moderator' | 'admin'
  redirectTo?: string
}

export function ProtectedRoute({ children, requiredRole, redirectTo = '/auth' }: ProtectedRouteProps) {
  const { user, loading, isGuest } = useAuth()

  if (loading) return <LoadingSpinner />
  if (!user && !isGuest) return <Navigate to={redirectTo} replace />
  if (isGuest && requiredRole) return <Navigate to={redirectTo} replace />

  if (requiredRole && user) {
    const roleHierarchy: Record<string, number> = { student: 0, moderator: 1, admin: 2 }
    const userLevel = roleHierarchy[user.role] ?? -1
    const requiredLevel = roleHierarchy[requiredRole] ?? 0
    if (userLevel < requiredLevel) {
      return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}
