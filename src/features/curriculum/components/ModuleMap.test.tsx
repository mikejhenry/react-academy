import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ModuleMap } from './ModuleMap'

vi.mock('@/features/curriculum/hooks/useProgress', () => ({
  useProgress: () => ({
    completedLessons: [],
    completedModules: [],
    loading: false,
    isModuleUnlockedForUser: (id: string) => id === '1' || id === '2',
  }),
}))

describe('ModuleMap', () => {
  it('renders all 19 module cards', () => {
    render(<MemoryRouter><ModuleMap /></MemoryRouter>)
    expect(screen.getByText('HTML Fundamentals')).toBeInTheDocument()
    expect(screen.getByText('Capstone Project')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Locked').length).toBe(17)
  })

  it('unlocked cards render toggle buttons', () => {
    render(<MemoryRouter><ModuleMap /></MemoryRouter>)
    expect(screen.getAllByRole('button').length).toBe(2)
  })

  it('clicking a card header expands the module', () => {
    render(<MemoryRouter><ModuleMap /></MemoryRouter>)
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(screen.getByText('What is HTML?')).toBeInTheDocument()
  })

  it('clicking an expanded card header collapses it', () => {
    render(<MemoryRouter><ModuleMap /></MemoryRouter>)
    const button = screen.getAllByRole('button')[0]
    fireEvent.click(button)
    expect(screen.getByText('What is HTML?')).toBeInTheDocument()
    fireEvent.click(button)
    expect(screen.queryByText('What is HTML?')).not.toBeInTheDocument()
  })

  it('two cards can be expanded simultaneously', () => {
    render(<MemoryRouter><ModuleMap /></MemoryRouter>)
    const [btn1, btn2] = screen.getAllByRole('button')
    fireEvent.click(btn1)
    fireEvent.click(btn2)
    // Module 1 lesson
    expect(screen.getByText('What is HTML?')).toBeInTheDocument()
    // Module 2 first lesson
    expect(screen.getByText('What is CSS?')).toBeInTheDocument()
  })
})
