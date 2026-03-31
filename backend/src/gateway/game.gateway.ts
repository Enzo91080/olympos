import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { GameService } from '../game/game.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/game' })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  // socketId → { playerId, gameId }
  private sessions = new Map<string, { playerId: string; gameId?: string }>();

  constructor(
    private jwtService: JwtService,
    private gameService: GameService,
  ) {}

  // ─── Connexion / Déconnexion ───────────────────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) { client.disconnect(); return; }

      const payload = this.jwtService.verify<{ sub: string }>(token);
      this.sessions.set(client.id, { playerId: payload.sub });
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const session = this.sessions.get(client.id);
    if (!session) return;
    this.sessions.delete(client.id);

    // Si le joueur était en partie, l'adversaire connecté gagne par forfait (TTL)
    if (session.gameId) {
      const opponentSocketId = this.findOpponentSocket(session.playerId, session.gameId);
      if (opponentSocketId) {
        try {
          await this.gameService.forfeitExpired(session.gameId, opponentSocketId.playerId);
          this.server.to(`game:${session.gameId}`).emit('game_over', {
            winnerId: opponentSocketId.playerId,
            reason: 'opponent_disconnected',
          });
        } catch { /* partie déjà terminée */ }
      }
    }
  }

  // ─── join_game ─────────────────────────────────────────────────────────────

  @SubscribeMessage('join_game')
  async handleJoinGame(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.sessions.get(client.id);
    if (!session) return;

    try {
      const state = await this.gameService.joinGame(data.gameId, session.playerId);

      // Associer le socket à la room et enregistrer le gameId dans la session
      await client.join(`game:${data.gameId}`);
      this.sessions.set(client.id, { ...session, gameId: data.gameId });

      if (state.status === 'in_progress' && state.connectedPlayers.length === 2) {
        // Les deux joueurs sont là : on émet l'état de début de partie à toute la room
        this.server.to(`game:${data.gameId}`).emit('game_state', state);
      } else {
        // En attente du 2ème joueur
        client.emit('game_state', state);
      }
    } catch (e: any) {
      if (e.status === 410) {
        // TTL expiré → forfait
        try {
          await this.gameService.forfeitExpired(data.gameId, session.playerId);
          client.emit('game_over', { winnerId: session.playerId, reason: 'timeout' });
        } catch { client.emit('error', { message: 'Game expired' }); }
      } else {
        client.emit('error', { message: e.message || 'Cannot join game' });
      }
    }
  }

  // ─── play_card ─────────────────────────────────────────────────────────────

  @SubscribeMessage('play_card')
  async handlePlayCard(
    @MessageBody() data: { gameId: string; cardId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.sessions.get(client.id);
    if (!session) return;

    try {
      const state = await this.gameService.playCard(data.gameId, session.playerId, data.cardId);
      this.server.to(`game:${data.gameId}`).emit('game_state', state);

      if (state.status === 'finished') {
        this.server.to(`game:${data.gameId}`).emit('game_over', {
          winnerId: state.winnerId,
          reason: 'defeat',
        });
      }
    } catch (e: any) {
      client.emit('error', { message: e.message });
    }
  }

  // ─── attack ────────────────────────────────────────────────────────────────

  @SubscribeMessage('attack')
  async handleAttack(
    @MessageBody() data: {
      gameId: string;
      attackerInstanceId: string;
      targetType: 'creature' | 'player';
      targetInstanceId?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.sessions.get(client.id);
    if (!session) return;

    try {
      let state;
      if (data.targetType === 'creature' && data.targetInstanceId) {
        state = await this.gameService.attackCreature(
          data.gameId, session.playerId,
          data.attackerInstanceId, data.targetInstanceId,
        );
      } else {
        state = await this.gameService.attackPlayer(
          data.gameId, session.playerId, data.attackerInstanceId,
        );
      }

      this.server.to(`game:${data.gameId}`).emit('game_state', state);

      if (state.status === 'finished') {
        this.server.to(`game:${data.gameId}`).emit('game_over', {
          winnerId: state.winnerId,
          reason: 'defeat',
        });
      }
    } catch (e: any) {
      client.emit('error', { message: e.message });
    }
  }

  // ─── end_turn ──────────────────────────────────────────────────────────────

  @SubscribeMessage('end_turn')
  async handleEndTurn(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.sessions.get(client.id);
    if (!session) return;

    try {
      const state = await this.gameService.endTurn(data.gameId, session.playerId);
      this.server.to(`game:${data.gameId}`).emit('game_state', state);
    } catch (e: any) {
      client.emit('error', { message: e.message });
    }
  }

  // ─── surrender ─────────────────────────────────────────────────────────────

  @SubscribeMessage('surrender')
  async handleSurrender(
    @MessageBody() data: { gameId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.sessions.get(client.id);
    if (!session) return;

    try {
      const state = await this.gameService.surrender(data.gameId, session.playerId);
      this.server.to(`game:${data.gameId}`).emit('game_over', {
        winnerId: state.winnerId,
        reason: 'surrender',
      });
    } catch (e: any) {
      client.emit('error', { message: e.message });
    }
  }

  // ─── Helper ────────────────────────────────────────────────────────────────

  private findOpponentSocket(
    disconnectedPlayerId: string,
    gameId: string,
  ): { playerId: string } | undefined {
    for (const [, session] of this.sessions) {
      if (session.gameId === gameId && session.playerId !== disconnectedPlayerId) {
        return session;
      }
    }
  }
}
