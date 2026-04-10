import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Player {
  id: string
  username: string
  email: string
  eloScore: number
  avatarUrl?: string
  rank: string
}

interface AuthState {
  player: Player | null
  token: string | null
  isAuthenticated: boolean
  login: (player: Player, token: string) => void
  logout: () => void
  updatePlayer: (data: Partial<Player>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      player: null,
      token: null,
      isAuthenticated: false,

      login: (player, token) =>
        set({ player, token, isAuthenticated: true }),

      logout: () =>
        set({ player: null, token: null, isAuthenticated: false }),

      updatePlayer: (data) =>
        set((state) => ({
          player: state.player ? { ...state.player, ...data } : null,
        })),
    }),
    {
      name: 'olympos-auth',
      partialize: (state) => ({ player: state.player, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
)
