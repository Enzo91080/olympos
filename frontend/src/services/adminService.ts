import api from './api'
import type { Card } from '../store/deckStore'

export interface CardInput {
  name: string
  cardType: 'creature' | 'spell' | 'artifact'
  manaCost: number
  attack?: number | null
  defense?: number | null
  effectText?: string | null
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  imageUrl?: string | null
  spellTarget?: string | null
}

export interface AdminPlayer {
  id: string
  username: string
  email: string
  eloScore: number
  role: 'player' | 'admin'
  isBanned: boolean
  createdAt: string
}

export interface AdminGame {
  id: string
  status: string
  startedAt: string | null
  endedAt: string | null
  player1: { id: string; username: string; eloScore: number }
  player2: { id: string; username: string; eloScore: number }
  winner: { id: string; username: string } | null
}

export interface AdminGameDetail extends AdminGame {
  actions: Array<{
    id: string
    playerId: string
    cardId: string | null
    actionType: string
    turnNumber: number
    createdAt: string
  }>
}

export interface AdminStats {
  players: { total: number }
  games: {
    total: number
    byStatus: { waiting: number; in_progress: number; finished: number; abandoned: number }
  }
  topCards: { cardId: string; name: string; rarity: string; count: number }[]
  eloDistribution: { tier: string; count: number }[]
}

export interface AdminAuditEntry {
  id: string
  actorId: string
  actorUsername: string
  action: string
  targetType: string
  targetId: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

export const adminService = {
  // Cartes
  async getCards(): Promise<Card[]> {
    const { data } = await api.get<Card[]>('/admin/cards')
    return data
  },
  async createCard(input: CardInput): Promise<Card> {
    const { data } = await api.post<Card>('/admin/cards', input)
    return data
  },
  async updateCard(id: string, input: Partial<CardInput>): Promise<Card> {
    const { data } = await api.patch<Card>(`/admin/cards/${id}`, input)
    return data
  },
  async deleteCard(id: string): Promise<void> {
    await api.delete(`/admin/cards/${id}`)
  },

  // Joueurs
  async getPlayers(): Promise<AdminPlayer[]> {
    const { data } = await api.get<AdminPlayer[]>('/admin/players')
    return data
  },
  async updatePlayer(
    id: string,
    input: { eloScore?: number; role?: 'player' | 'admin'; isBanned?: boolean },
  ): Promise<AdminPlayer> {
    const { data } = await api.patch<AdminPlayer>(`/admin/players/${id}`, input)
    return data
  },

  // Parties
  async getGames(): Promise<AdminGame[]> {
    const { data } = await api.get<AdminGame[]>('/admin/games')
    return data
  },
  async getGame(id: string): Promise<AdminGameDetail> {
    const { data } = await api.get<AdminGameDetail>(`/admin/games/${id}`)
    return data
  },
  async forceAbandonGame(id: string): Promise<AdminGame> {
    const { data } = await api.patch<AdminGame>(`/admin/games/${id}/abandon`)
    return data
  },

  // Statistiques
  async getStats(): Promise<AdminStats> {
    const { data } = await api.get<AdminStats>('/admin/stats')
    return data
  },

  // Journal d'audit
  async getAuditLog(limit = 200): Promise<AdminAuditEntry[]> {
    const { data } = await api.get<AdminAuditEntry[]>('/admin/audit-log', { params: { limit } })
    return data
  },
}
