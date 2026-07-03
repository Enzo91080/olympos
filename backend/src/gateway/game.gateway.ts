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
import { MatchmakingService } from '../matchmaking/matchmaking.service';

interface Session {
  playerId: string;
  gameId?: string;
  deckId?: string;
}

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/game' })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private sessions = new Map<string, Session>();

  constructor(
    private jwtService: JwtService,
    private gameService: GameService,
    private matchmakingService: MatchmakingService,
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

    if (session.gameId) {
      const opponentEntry = this.findSocketByPlayerId(session.playerId, session.gameId);
      if (opponentEntry) {
        try {
          await this.gameService.forfeitExpired(session.gameId, opponentEntry.playerId);
          this.server.to(`game:${session.gameId}`).emit('game_over', {
            winnerId: opponentEntry.playerId,
            reason: 'opponent_disconnected',
          });
        } catch { /* partie déjà terminée */ }
      }
    }
  }

  // ─── Matchmaking ───────────────────────────────────────────────────────────

  @SubscribeMessage('join_matchmaking')
  async handleJoinMatchmaking(
    @MessageBody() data: { deckId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.sessions.get(client.id);
    if (!session) return;

    this.sessions.set(client.id, { ...session, deckId: data.deckId });

    try {
      const result = await this.matchmakingService.join(session.playerId);

      if (result.matched && result.opponentId) {
        const opponentSocketId = this.findSocketIdByPlayerId(result.opponentId);
        const opponentSession = opponentSocketId ? this.sessions.get(opponentSocketId) : undefined;

        if (!opponentSession?.deckId) {
          client.emit('matchmaking:waiting');
          return;
        }

        const pvpData = await this.gameService.createPvpGame(
          session.playerId, data.deckId,
          result.opponentId, opponentSession.deckId,
        );

        // Notify player 1 (me — first in queue)
        client.emit('matchmaking:matched', {
          gameId: pvpData.gameId,
          opponentId: pvpData.player2.id,
          opponentUsername: pvpData.player2.username,
          isFirstPlayer: true,
          player: { hand: pvpData.player1.hand, deckRemaining: pvpData.player1.deckRemaining },
        });

        // Notify player 2 (opponent — already waiting)
        if (opponentSocketId) {
          this.server.to(opponentSocketId).emit('matchmaking:matched', {
            gameId: pvpData.gameId,
            opponentId: pvpData.player1.id,
            opponentUsername: pvpData.player1.username,
            isFirstPlayer: false,
            player: { hand: pvpData.player2.hand, deckRemaining: pvpData.player2.deckRemaining },
          });
        }
      } else {
        client.emit('matchmaking:waiting');
      }
    } catch (e: any) {
      client.emit('matchmaking:error', { message: e.message || 'Erreur matchmaking' });
    }
  }

  @SubscribeMessage('leave_matchmaking')
  async handleLeaveMatchmaking(@ConnectedSocket() client: Socket) {
    const session = this.sessions.get(client.id);
    if (!session) return;

    try {
      await this.matchmakingService.leave(session.playerId);
    } catch { /* pas dans la file */ }

    client.emit('matchmaking:cancelled');
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

      await client.join(`game:${data.gameId}`);
      this.sessions.set(client.id, { ...session, gameId: data.gameId });

      if (state.status === 'in_progress' && state.connectedPlayers.length === 2) {
        this.server.to(`game:${data.gameId}`).emit('game_state', state);
      } else {
        client.emit('game_state', state);
      }
    } catch (e: any) {
      if (e.status === 410) {
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
  // Payload :
  //   { gameId, cardId }                                      → créature ou sort auto
  //   { gameId, cardId, targetId, targetType: 'creature'|'hero' } → sort ciblé

  @SubscribeMessage('play_card')
  async handlePlayCard(
    @MessageBody() data: {
      gameId: string;
      cardId: string;
      targetId?: string;
      targetType?: 'creature' | 'hero';
    },
    @ConnectedSocket() client: Socket,
  ) {
    const session = this.sessions.get(client.id);
    if (!session) return;

    try {
      let state;

      if (data.targetId && data.targetType) {
        // Sort ciblé
        state = await this.gameService.playSpellTargeted(
          data.gameId, session.playerId, data.cardId, data.targetId, data.targetType,
        );
      } else {
        // Créature ou sort auto — le moteur distingue les deux
        try {
          state = await this.gameService.playCreature(data.gameId, session.playerId, data.cardId);
        } catch (creatureErr: any) {
          // Si ce n'est pas une créature, essayer comme sort auto
          if (creatureErr?.message === 'Card is not a creature') {
            state = await this.gameService.playSpellAuto(data.gameId, session.playerId, data.cardId);
          } else {
            throw creatureErr;
          }
        }
      }

      this.server.to(`game:${data.gameId}`).emit('game_state', state);
      if (state.status === 'finished') {
        this.server.to(`game:${data.gameId}`).emit('game_over', { winnerId: state.winnerId, reason: 'defeat' });
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

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private findSocketIdByPlayerId(playerId: string): string | undefined {
    for (const [socketId, session] of this.sessions) {
      if (session.playerId === playerId) return socketId;
    }
  }

  private findSocketByPlayerId(
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
