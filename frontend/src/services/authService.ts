import api from './api'
import type { Player } from '../store/authStore'

export interface LoginPayload { email: string; password: string }
export interface RegisterPayload { username: string; email: string; password: string }
export interface AuthResponse { player: Player; token: string }

async function fetchMe(token: string): Promise<Player> {
  const { data } = await api.get<{
    id: string; username: string; email: string; eloScore: number; avatarUrl?: string
    role?: 'player' | 'admin'
  }>('/players/me', { headers: { Authorization: `Bearer ${token}` } })
  return {
    id: data.id,
    username: data.username,
    email: data.email,
    eloScore: data.eloScore,
    avatarUrl: data.avatarUrl,
    rank: eloToRank(data.eloScore),
    role: data.role ?? 'player',
  }
}

function eloToRank(elo: number): string {
  if (elo >= 2000) return 'Legend'
  if (elo >= 1800) return 'Diamond'
  if (elo >= 1500) return 'Platinum'
  if (elo >= 1200) return 'Gold'
  if (elo >= 900)  return 'Silver'
  return 'Bronze'
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<{ access_token: string }>('/auth/login', payload)
    const player = await fetchMe(data.access_token)
    return { player, token: data.access_token }
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await api.post<{ access_token: string }>('/auth/register', payload)
    const player = await fetchMe(data.access_token)
    return { player, token: data.access_token }
  },

  async getMe(): Promise<Player> {
    const raw = localStorage.getItem('olympos-auth')
    const token = raw ? JSON.parse(raw)?.state?.token : null
    return fetchMe(token)
  },

  async updateProfile(payload: { username?: string; avatarUrl?: string }): Promise<Partial<Player>> {
    const { data } = await api.patch<{ username: string; avatarUrl?: string }>('/players/me', payload)
    return { username: data.username, avatarUrl: data.avatarUrl }
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email })
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await api.post('/auth/reset-password', { token, newPassword })
  },
}
