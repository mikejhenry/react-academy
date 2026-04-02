import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ContentRenderer } from './ContentRenderer'

describe('ContentRenderer', () => {
  it('renders text block', () => {
    render(<ContentRenderer blocks={[{ type: 'text', content: 'Hello world' }]} />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('renders heading block as h3', () => {
    render(<ContentRenderer blocks={[{ type: 'heading', content: 'Chapter 1' }]} />)
    expect(screen.getByRole('heading', { level: 3, name: 'Chapter 1' })).toBeInTheDocument()
  })

  it('renders code block content', () => {
    render(<ContentRenderer blocks={[{ type: 'code', language: 'js', content: 'const x = 1' }]} />)
    expect(screen.getByText('const x = 1')).toBeInTheDocument()
  })

  it('renders all list items', () => {
    render(<ContentRenderer blocks={[{ type: 'list', items: ['item a', 'item b', 'item c'] }]} />)
    expect(screen.getByText('item a')).toBeInTheDocument()
    expect(screen.getByText('item b')).toBeInTheDocument()
    expect(screen.getByText('item c')).toBeInTheDocument()
  })

  it('renders tip block content', () => {
    render(<ContentRenderer blocks={[{ type: 'tip', content: 'Remember to save' }]} />)
    expect(screen.getByText('Remember to save')).toBeInTheDocument()
  })

  it('renders warning block content', () => {
    render(<ContentRenderer blocks={[{ type: 'warning', content: 'This will break' }]} />)
    expect(screen.getByText('This will break')).toBeInTheDocument()
  })

  it('renders multiple blocks in order', () => {
    render(
      <ContentRenderer
        blocks={[
          { type: 'heading', content: 'Section A' },
          { type: 'text', content: 'Body text here.' },
        ]}
      />
    )
    expect(screen.getByRole('heading', { name: 'Section A' })).toBeInTheDocument()
    expect(screen.getByText('Body text here.')).toBeInTheDocument()
  })
})
