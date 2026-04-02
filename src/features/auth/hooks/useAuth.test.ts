import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { AuthProvider, useAuth } from './useAuth'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
    }),
  },
}))

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used inside AuthProvider')
  })

  it('starts with loading true, user null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it('exposes signOut function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
    expect(typeof result.current.signOut).toBe('function')
  })
})
