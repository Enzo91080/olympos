import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const gameSocket = {
  connect(token: string): Socket {
    if (socket?.connected) return socket

    socket = io(`${import.meta.env.VITE_WS_URL || 'http://localhost:3000'}/game`, {
      auth: { token },
      transports: ['websocket'],
    })

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id)
    })

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
    })

    socket.on('connect_error', (err) => {
      console.error('[Socket] Error:', err.message)
    })

    return socket
  },

  disconnect(): void {
    if (socket) {
      socket.disconnect()
      socket = null
    }
  },

  // ─── Matchmaking ────────────────────────────────────────────────────────────

  joinMatchmaking(deckId: string): void {
    socket?.emit('join_matchmaking', { deckId })
  },

  leaveMatchmaking(): void {
    socket?.emit('leave_matchmaking')
  },

  onMatchmakingMatched(cb: (data: any) => void): void {
    socket?.on('matchmaking:matched', cb)
  },

  onMatchmakingWaiting(cb: () => void): void {
    socket?.on('matchmaking:waiting', cb)
  },

  onMatchmakingCancelled(cb: () => void): void {
    socket?.on('matchmaking:cancelled', cb)
  },

  onMatchmakingError(cb: (data: { message: string }) => void): void {
    socket?.on('matchmaking:error', cb)
  },

  // ─── Partie ─────────────────────────────────────────────────────────────────

  joinGame(gameId: string): void {
    socket?.emit('join_game', { gameId })
  },

  playCard(gameId: string, cardId: string): void {
    socket?.emit('play_card', { gameId, cardId })
  },

  attack(gameId: string, data: {
    attackerInstanceId: string
    targetType: 'creature' | 'player'
    targetInstanceId?: string
  }): void {
    socket?.emit('attack', { gameId, ...data })
  },

  endTurn(gameId: string): void {
    socket?.emit('end_turn', { gameId })
  },

  surrender(gameId: string): void {
    socket?.emit('surrender', { gameId })
  },

  onGameState(cb: (state: any) => void): void {
    socket?.on('game_state', cb)
  },

  onGameOver(cb: (result: { winnerId: string; reason: string }) => void): void {
    socket?.on('game_over', cb)
  },

  onError(cb: (data: { message: string }) => void): void {
    socket?.on('error', cb)
  },

  off(event: string): void {
    socket?.off(event)
  },

  getSocket(): Socket | null {
    return socket
  },
}
