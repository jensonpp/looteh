import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAppStore((s) => s.user)
  const sessionChecked = useAppStore((s) => s.sessionChecked)

  if (!sessionChecked) return null // avoid flash-redirect while the initial session check is in flight
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
