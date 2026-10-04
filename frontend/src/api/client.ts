// Thin fetch wrapper for the Hono API — same-origin via Vite dev proxy / single Worker deploy.
export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message?: string) {
    super(message ?? code)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>

  if (!res.ok) {
    throw new ApiError(res.status, (data.error as string) ?? 'unknown_error', data.message as string | undefined)
  }

  return data as T
}

export type SessionUser = { id: string; email: string }

export const api = {
  signup: (email: string, password: string) =>
    request<{ user: SessionUser }>('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    request<{ user: SessionUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  session: () => request<{ user: SessionUser | null }>('/auth/session'),
}
