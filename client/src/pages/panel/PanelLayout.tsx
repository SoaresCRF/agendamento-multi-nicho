import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth-context'
import { cx } from '../../lib/cx'
import { Button } from '../../components/Button'

const NAV_ITEMS = [
  { to: '/painel/tipos-de-servico', label: 'Tipos de Serviço' },
  { to: '/painel/disponibilidade', label: 'Disponibilidade' },
  { to: '/painel/bloqueios', label: 'Bloqueios' },
  { to: '/painel/agenda', label: 'Agenda' },
]

export function PanelLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="flex w-60 flex-col justify-between border-r border-hairline bg-surface p-md">
        <div>
          <p className="mb-lg font-sans text-title-sm text-ink">{user?.name}</p>
          <nav className="flex flex-col gap-xxs">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cx(
                    'rounded-sm px-[12px] py-[10px] font-sans text-nav-link',
                    isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-soft'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <Button variant="secondary" onClick={handleLogout}>
          Sair
        </Button>
      </aside>
      <main className="flex-1 p-lg">
        <Outlet />
      </main>
    </div>
  )
}
