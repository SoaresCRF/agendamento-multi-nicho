import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { LoadingScreen } from './LoadingScreen'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { accessToken, isLoading } = useAuth()
  if (isLoading) return <LoadingScreen />
  if (!accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}
