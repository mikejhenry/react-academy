import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ModuleCard } from './ModuleCard'
import type { Module } from '@/lib/types'

const module: Module = {
  id: '1',
  title: 'HTML Fundamentals',
  icon: '🌐',
  description: 'Learn the building blocks.',
  lessons: [
    { id: '1.1', title: 'What is HTML?', duration: 10, xpReward: 100, content: [], quiz: [] },
    { id: '1.2', title: 'Document Structure', duration: 12, xpReward: 100, content: [], quiz: [] },
    { id: '1.3', title: 'Semantic Elements', duration: 15, xpReward: 100, content: [], quiz: [] },
  ],
}

const baseProps = {
  module,
  isUnlocked: true,
  completedLessonCount: 1,
  isComplete: false,
  isExpanded: false,
  onToggle: vi.fn(),
  completedLessons: ['1.1'],
}

describe('ModuleCard', () => {
  it('collapsed state shows progress bar hint text', () => {
    render(<MemoryRouter><ModuleCard {...baseProps} /></MemoryRouter>)
    expect(screen.getByText('Click to see lessons ▾')).toBeInTheDocument()
  })

  it('collapsed state shows lesson count', () => {
    render(<MemoryRouter><ModuleCard {...baseProps} /></MemoryRouter>)
    expect(screen.getByText('1/3 lessons')).toBeInTheDocument()
  })

  it('expanded state shows lesson list', () => {
    render(<MemoryRouter><ModuleCard {...baseProps} isExpanded={true} /></MemoryRouter>)
    expect(screen.getByText('What is HTML?')).toBeInTheDocument()
    expect(screen.getByText('Document Structure')).toBeInTheDocument()
    expect(screen.getByText('Semantic Elements')).toBeInTheDocument()
  })

  it('expanded state hides progress bar hint', () => {
    render(<MemoryRouter><ModuleCard {...baseProps} isExpanded={true} /></MemoryRouter>)
    expect(screen.queryByText('Click to see lessons ▾')).not.toBeInTheDocument()
  })

  it('toggle button calls onToggle with the module id', () => {
    const onToggle = vi.fn()
    render(<MemoryRouter><ModuleCard {...baseProps} onToggle={onToggle} /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledWith('1')
  })

  it('locked card renders no button', () => {
    render(
      <MemoryRouter>
        <ModuleCard {...baseProps} isUnlocked={false} />
      </MemoryRouter>
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('locked card shows lock icon', () => {
    render(
      <MemoryRouter>
        <ModuleCard {...baseProps} isUnlocked={false} />
      </MemoryRouter>
    )
    expect(screen.getByLabelText('Locked')).toBeInTheDocument()
  })

  it('expanded card shows up-chevron', () => {
    render(<MemoryRouter><ModuleCard {...baseProps} isExpanded={true} /></MemoryRouter>)
    expect(screen.getByText('▴')).toBeInTheDocument()
  })

  it('collapsed card shows down-chevron', () => {
    render(<MemoryRouter><ModuleCard {...baseProps} isExpanded={false} /></MemoryRouter>)
    expect(screen.getByText('▾')).toBeInTheDocument()
  })
})
