import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, ApiError, setAccessToken, getAccessToken, setOnAuthFailure } from './api'
import type { AuthUser, MeResponse } from './types'

interface AuthContextValue {
  user: AuthUser | null
  accessToken: string | null
  isLoading: boolean
  login: (user: AuthUser, accessToken: string) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function silentRefresh(): Promise<MeResponse | null> {
  try {
    // A GET that requires auth doubles as the refresh trigger: api.ts's request()
    // retries any 401 via POST /auth/refresh automatically, and /api/me is the
    // lightest authenticated endpoint that exists for this purpose — its response
    // is also the profile data bootstrap needs, so nothing else re-fetches it.
    return await api.get<MeResponse>('/api/me')
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function bootstrap() {
      const me = await silentRefresh()
      if (me) {
        setUser({ id: me.id, name: me.name, email: me.email, slug: me.slug })
        setToken(getAccessToken())
      }
      setIsLoading(false)
    }
    bootstrap()
  }, [])

  useEffect(() => {
    // A refresh only ever fails this way for an already-authenticated request
    // (see api.ts's request()), so clearing state here is a no-op before login
    // and correctly logs the user out when their session dies mid-use.
    setOnAuthFailure(() => {
      setAccessToken(null)
      setUser(null)
      setToken(null)
    })
    return () => setOnAuthFailure(null)
  }, [])

  const login = (u: AuthUser, accessToken: string) => {
    setAccessToken(accessToken)
    setUser(u)
    setToken(accessToken)
  }

  const logout = async () => {
    try {
      await api.post('/api/auth/logout')
    } catch {
      // Best-effort: even if the network call fails, clear local state below.
    }
    setAccessToken(null)
    setUser(null)
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ user, accessToken: token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { ApiError }
