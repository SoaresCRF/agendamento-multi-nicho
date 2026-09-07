import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth-context'
import { cx } from '../../lib/cx'
import { Button } from '../../components/Button'

const NAV_ITEMS = [
  { to: '/painel/tipos-de-servico', label: 'Tipos de Serviço' },
  { to: '/painel/disponibilidade', label: 'Disponibilidade' },
  { to: '/painel/bloqueios', label: 'Bloqueios' },
  { to: '/painel/agenda', label: 'Agenda' },
  { to: '/painel/perfil', label: 'Perfil' },
]

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-xxs">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cx(
              'rounded-sm px-[12px] py-[10px] font-sans text-nav-link',
              isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-soft',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export function PanelLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <button
        type="button"
        aria-expanded={mobileNavOpen}
        aria-controls="painel-mobile-nav"
        aria-label={mobileNavOpen ? 'Fechar menu' : 'Abrir menu'}
        onClick={() => setMobileNavOpen((open) => !open)}
        className="fixed left-md top-md z-20 flex h-11 w-11 items-center justify-center rounded-sm border border-hairline bg-surface sm:hidden"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          {mobileNavOpen ? (
            <path d="M6 6l12 12M18 6l-12 12" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      {mobileNavOpen && (
        <div
          id="painel-mobile-nav"
          className="fixed inset-0 z-10 flex flex-col justify-between bg-surface p-md pt-[72px] sm:hidden"
        >
          <div>
            <p className="mb-lg font-sans text-title-sm text-ink">{user?.name}</p>
            <NavList onNavigate={() => setMobileNavOpen(false)} />
          </div>
          <Button variant="secondary" onClick={handleLogout}>
            Sair
          </Button>
        </div>
      )}

      <aside className="hidden w-60 flex-col justify-between border-r border-hairline bg-surface p-md sm:flex">
        <div>
          <p className="mb-lg font-sans text-title-sm text-ink">{user?.name}</p>
          <NavList />
        </div>
        <Button variant="secondary" onClick={handleLogout}>
          Sair
        </Button>
      </aside>
      <main className="flex-1 p-lg pt-[72px] sm:pt-lg">
        <Outlet />
      </main>
    </div>
  )
}
