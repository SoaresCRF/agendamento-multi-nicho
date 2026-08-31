import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import { AuthProvider } from './lib/auth-context'
import { ToastProvider } from './components/toast/ToastProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { PanelLayout } from './pages/panel/PanelLayout'
import { ServiceTypesListPage } from './pages/panel/service-types/ServiceTypesListPage'
import { ServiceTypeFormPage } from './pages/panel/service-types/ServiceTypeFormPage'
import { AvailabilityPage } from './pages/panel/availability/AvailabilityPage'
import { BlockedSlotsPage } from './pages/panel/blocked-slots/BlockedSlotsPage'
import { AgendaPage } from './pages/panel/agenda/AgendaPage'
import { PublicBookingPage } from './pages/public-booking/PublicBookingPage'

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/registro" element={<RegisterPage />} />
                <Route
                  path="/painel"
                  element={
                    <ProtectedRoute>
                      <PanelLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/painel/agenda" replace />} />
                  <Route path="agenda" element={<AgendaPage />} />
                  <Route path="tipos-de-servico" element={<ServiceTypesListPage />} />
                  <Route path="tipos-de-servico/novo" element={<ServiceTypeFormPage />} />
                  <Route path="tipos-de-servico/:id" element={<ServiceTypeFormPage />} />
                  <Route path="disponibilidade" element={<AvailabilityPage />} />
                  <Route path="bloqueios" element={<BlockedSlotsPage />} />
                </Route>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/:slug" element={<PublicBookingPage />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
