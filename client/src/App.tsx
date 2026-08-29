import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import { AuthProvider } from './lib/auth-context'
import { ToastProvider } from './components/toast/ToastProvider'
import { ProtectedRoute } from './components/ProtectedRoute'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<div>Login (Task 6)</div>} />
              <Route path="/registro" element={<div>Registro (Task 6)</div>} />
              <Route
                path="/painel/*"
                element={
                  <ProtectedRoute>
                    <div>Painel (Task 7+)</div>
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/:slug" element={<div>Página pública (Task 14+)</div>} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
