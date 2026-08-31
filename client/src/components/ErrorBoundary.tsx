import { Component, type ReactNode } from 'react'
import { EmptyState } from './EmptyState'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-canvas px-lg">
          <EmptyState title="Algo deu errado" description="Recarregue a página e tente novamente." />
        </div>
      )
    }
    return this.props.children
  }
}
