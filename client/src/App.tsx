import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import { AuthProvider } from './lib/auth-context'
import { ToastProvider } from './components/toast/ToastProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LoadingScreen } from './components/LoadingScreen'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import { PublicBookingPage } from './pages/public-booking/PublicBookingPage'
import { NotFoundPage } from './pages/NotFoundPage'

// Lazy: the authenticated panel (forms, agenda, calendar) is dead weight for the
// anonymous visitors who only ever hit /login, /registro or a public /:slug link —
// keep it out of their initial bundle.
const PanelLayout = lazy(() => import('./pages/panel/PanelLayout').then((m) => ({ default: m.PanelLayout })))
const ServiceTypesListPage = lazy(() =>
  import('./pages/panel/service-types/ServiceTypesListPage').then((m) => ({ default: m.ServiceTypesListPage })),
)
const ServiceTypeFormPage = lazy(() =>
  import('./pages/panel/service-types/ServiceTypeFormPage').then((m) => ({ default: m.ServiceTypeFormPage })),
)
const AvailabilityPage = lazy(() =>
  import('./pages/panel/availability/AvailabilityPage').then((m) => ({ default: m.AvailabilityPage })),
)
const BlockedSlotsPage = lazy(() =>
  import('./pages/panel/blocked-slots/BlockedSlotsPage').then((m) => ({ default: m.BlockedSlotsPage })),
)
const AgendaPage = lazy(() => import('./pages/panel/agenda/AgendaPage').then((m) => ({ default: m.AgendaPage })))
const ProfilePage = lazy(() => import('./pages/panel/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })))

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Suspense fallback={<LoadingScreen />}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/registro" element={<RegisterPage />} />
                  <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
                  <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
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
                    <Route path="perfil" element={<ProfilePage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="/:slug" element={<PublicBookingPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
