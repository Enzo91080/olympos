import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const gameSocket = {
  connect(token: string): Socket {
    if (socket?.connected) return socket

    socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3000', {
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

  joinGame(gameId: string): void {
    socket?.emit('join_game', { gameId })
  },

  playCard(gameId: string, cardId: string, targetId?: string): void {
    socket?.emit('play_card', { gameId, cardId, targetId })
  },

  endTurn(gameId: string): void {
    socket?.emit('end_turn', { gameId })
  },

  surrender(gameId: string): void {
    socket?.emit('surrender', { gameId })
  },

  onGameState(cb: (state: unknown) => void): void {
    socket?.on('game_state', cb)
  },

  onGameAction(cb: (action: unknown) => void): void {
    socket?.on('game_action', cb)
  },

  onGameOver(cb: (result: unknown) => void): void {
    socket?.on('game_over', cb)
  },

  off(event: string): void {
    socket?.off(event)
  },

  getSocket(): Socket | null {
    return socket
  },
}
