import { create } from 'zustand'
import type { SessionUser } from '../api/client'

type AppState = {
  user: SessionUser | null
  xpTotal: number
  streakCount: number
  sessionChecked: boolean
  setUser: (user: SessionUser | null) => void
  setStats: (stats: { xpTotal: number; streakCount: number }) => void
  setSessionChecked: (checked: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  xpTotal: 0,
  streakCount: 0,
  sessionChecked: false,
  setUser: (user) => set({ user }),
  setStats: ({ xpTotal, streakCount }) => set({ xpTotal, streakCount }),
  setSessionChecked: (sessionChecked) => set({ sessionChecked }),
}))
