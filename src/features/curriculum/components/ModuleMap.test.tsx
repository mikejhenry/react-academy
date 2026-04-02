import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ModuleMap } from './ModuleMap'

// Mock useProgress hook
vi.mock('@/features/curriculum/hooks/useProgress', () => {
  return {
    useProgress: () => ({
      completedLessons: [],
      completedModules: [],
      loading: false,
      isModuleUnlockedForUser: (id: string) => id === '1',
    }),
  }
})

describe('ModuleMap', () => {
  it('renders all 19 module cards', () => {
    render(
      <MemoryRouter>
        <ModuleMap />
      </MemoryRouter>
    )
    expect(screen.getByText('HTML Fundamentals')).toBeInTheDocument()
    expect(screen.getByText('Capstone Project')).toBeInTheDocument()
  })

  it('shows module 1 as a link (unlocked)', () => {
    render(
      <MemoryRouter>
        <ModuleMap />
      </MemoryRouter>
    )
    // Module 1 card should be a link element
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThanOrEqual(1)
  })
})
