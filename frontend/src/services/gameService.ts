import api from './api'

export interface GameHistory {
  id: string
  opponentUsername: string
  opponentId: string
  result: 'victory' | 'defeat'
  endedAt: string
}

interface BackendGame {
  id: string
  player1Id: string; player2Id: string; winnerId?: string
  player1: { id: string; username: string; eloScore: number }
  player2: { id: string; username: string; eloScore: number }
  winner?: { id: string; username: string }
  status: string
  startedAt?: string; endedAt?: string
}

export interface BackendCard {
  id: string
  name: string
  cardType: string
  manaCost: number
  attack?: number | null
  defense?: number | null
  effectText?: string | null
  rarity: string
  imageUrl?: string | null
}

export interface SoloGameResponse {
  gameId: string
  botId: string
  botUsername: string
  player: {
    id: string
    hand: BackendCard[]
    deckRemaining: BackendCard[]
  }
  bot: {
    hand: BackendCard[]
    deckRemaining: BackendCard[]
  }
}

export const gameService = {
  async getHistory(myPlayerId: string): Promise<GameHistory[]> {
    const { data } = await api.get<BackendGame[]>('/games/history')
    return data.map((g) => {
      const isP1 = g.player1Id === myPlayerId
      const opp = isP1 ? g.player2 : g.player1
      const won = g.winnerId === myPlayerId
      return {
        id: g.id,
        opponentUsername: opp.username,
        opponentId: opp.id,
        result: won ? 'victory' : 'defeat',
        endedAt: g.endedAt ?? new Date().toISOString(),
      }
    })
  },

  async startSoloGame(deckId: string): Promise<SoloGameResponse> {
    const { data } = await api.post<SoloGameResponse>('/games/solo', { deckId })
    return data
  },

  async finishSoloGame(gameId: string, winnerId: string): Promise<void> {
    await api.patch(`/games/${gameId}/finish`, { winnerId })
  },

  async createGame(player1Id: string, deck1Id: string, player2Id: string, deck2Id: string) {
    const { data } = await api.post<{ id: string }>('/games', { player1Id, deck1Id, player2Id, deck2Id })
    return data
  },

  async joinMatchmaking() {
    const { data } = await api.post<{ matched: boolean; opponentId?: string }>('/matchmaking/join')
    return data
  },

  async leaveMatchmaking() {
    await api.delete('/matchmaking/leave')
  },
}
