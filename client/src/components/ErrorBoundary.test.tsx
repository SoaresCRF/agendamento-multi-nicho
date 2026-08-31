import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

function Bomb(): never {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <div>conteúdo normal</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('conteúdo normal')).toBeInTheDocument()
  })

  it('shows a fallback message instead of crashing when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    )
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument()
  })
})
