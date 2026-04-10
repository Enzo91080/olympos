import { create } from 'zustand'
import { gameService } from '../services/gameService'
import type { GameHistory } from '../services/gameService'

interface StatsState {
  history: GameHistory[]
  victories: number
  defeats: number
  loading: boolean
  loadHistory: (playerId: string) => Promise<void>
}

export const useStatsStore = create<StatsState>((set) => ({
  history: [],
  victories: 0,
  defeats: 0,
  loading: false,

  loadHistory: async (playerId) => {
    set({ loading: true })
    try {
      const history = await gameService.getHistory(playerId)
      const victories = history.filter((g) => g.result === 'victory').length
      const defeats = history.filter((g) => g.result === 'defeat').length
      set({ history, victories, defeats, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
