if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  throw new Error('VITE_API_URL must be set in production builds')
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

let onAuthFailure: (() => void) | null = null

// Lets a listener (AuthProvider) find out when a refresh has definitively
// failed on an already-authenticated request, so it can clear its state and
// let ProtectedRoute redirect to /login. api.ts is a plain module with no
// React, so this is a callback slot rather than an event emitter/store.
export function setOnAuthFailure(callback: (() => void) | null) {
  onAuthFailure = callback
}

export class ApiError extends Error {
  status: number
  details?: unknown
  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

async function parseErrorBody(res: Response): Promise<{ error: string; details?: unknown }> {
  try {
    return await res.json()
  } catch {
    // express-rate-limit's default 429 response is plain text, not JSON — give
    // it a specific message rather than falling through to "Erro desconhecido".
    if (res.status === 429) return { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }
    return { error: 'Erro desconhecido' }
  }
}

// Server-side, a successful refresh revokes the presented refresh-token cookie's
// session and issues a brand-new one. If two 401s happen around the same time,
// firing two concurrent refresh requests means the second one arrives carrying
// an already-revoked cookie and fails, wrongly logging the user out. This guard
// makes concurrent callers share one in-flight request instead.
let refreshing: Promise<boolean> | null = null

function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

async function doRefresh(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
  if (!res.ok) return false
  const data = (await res.json()) as { accessToken: string }
  setAccessToken(data.accessToken)
  return true
}

async function request<T>(path: string, options: RequestInit = {}, allowRetry = true): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' })

  if (res.status === 401 && allowRetry && path !== '/api/auth/refresh') {
    const refreshed = await tryRefresh()
    if (refreshed) return request<T>(path, options, false)
    onAuthFailure?.()
  }

  if (!res.ok) {
    const body = await parseErrorBody(res)
    throw new ApiError(res.status, body.error, body.details)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
