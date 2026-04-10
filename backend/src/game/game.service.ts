import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  GoneException,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { PrismaService } from '../prisma/prisma.service';
import { GameEngineService } from './game-engine.service';
import { EloService } from './elo.service';
import { GameState } from './game-state.interface';

const GAME_STATE_TTL = 600; // 10 minutes

@Injectable()
export class GameService {
  constructor(
    private prisma: PrismaService,
    private engine: GameEngineService,
    private elo: EloService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  // ─── REST endpoints ─────────────────────────────────────────────────────────

  async create(player1Id: string, deck1Id: string, player2Id: string, deck2Id: string) {
    const [deck1, deck2] = await Promise.all([
      this.prisma.deck.findUnique({ where: { id: deck1Id }, include: { deckCards: true } }),
      this.prisma.deck.findUnique({ where: { id: deck2Id }, include: { deckCards: true } }),
    ]);

    if (!deck1 || !deck1.isValid) throw new BadRequestException('Deck 1 is not valid (need 30 cards)');
    if (!deck2 || !deck2.isValid) throw new BadRequestException('Deck 2 is not valid (need 30 cards)');

    const game = await this.prisma.game.create({
      data: { player1Id, player2Id, deck1Id, deck2Id, status: 'waiting' },
    });

    // Expand deck card IDs (quantity 2 → two entries)
    const deck1CardIds = deck1.deckCards.flatMap((dc) =>
      Array(dc.quantity).fill(dc.cardId),
    );
    const deck2CardIds = deck2.deckCards.flatMap((dc) =>
      Array(dc.quantity).fill(dc.cardId),
    );

    const state = await this.engine.initGameState(
      game.id, player1Id, deck1CardIds, player2Id, deck2CardIds,
    );
    await this.saveState(game.id, state);

    return game;
  }

  async findOne(id: string, playerId: string) {
    const game = await this.prisma.game.findUnique({
      where: { id },
      include: {
        player1: { select: { id: true, username: true, eloScore: true } },
        player2: { select: { id: true, username: true, eloScore: true } },
        actions: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!game) throw new NotFoundException('Game not found');
    if (game.player1Id !== playerId && game.player2Id !== playerId)
      throw new ForbiddenException();
    return game;
  }

  async getHistory(playerId: string) {
    return this.prisma.game.findMany({
      where: {
        OR: [{ player1Id: playerId }, { player2Id: playerId }],
        status: 'finished',
      },
      include: {
        player1: { select: { id: true, username: true, eloScore: true } },
        player2: { select: { id: true, username: true, eloScore: true } },
        winner: { select: { id: true, username: true } },
      },
      orderBy: { endedAt: 'desc' },
    });
  }

  // ─── Gestion état Redis ─────────────────────────────────────────────────────

  async getState(gameId: string): Promise<GameState> {
    const raw = await this.redis.get(`game:state:${gameId}`);
    if (!raw) {
      throw new GoneException(
        'Game state expired (TTL 10 min) — the disconnected player forfeits',
      );
    }
    return JSON.parse(raw) as GameState;
  }

  async saveState(gameId: string, state: GameState): Promise<void> {
    await this.redis.setex(`game:state:${gameId}`, GAME_STATE_TTL, JSON.stringify(state));
  }

  async delState(gameId: string): Promise<void> {
    await this.redis.del(`game:state:${gameId}`);
  }

  // ─── Actions de jeu ─────────────────────────────────────────────────────────

  async joinGame(gameId: string, playerId: string): Promise<GameState> {
    const state = await this.getState(gameId);

    if (state.player1.playerId !== playerId && state.player2.playerId !== playerId) {
      throw new ForbiddenException('Not a participant');
    }

    if (!state.connectedPlayers.includes(playerId)) {
      state.connectedPlayers = [...state.connectedPlayers, playerId];
    }

    // Les deux joueurs connectés → la partie commence
    if (
      state.connectedPlayers.length === 2 &&
      state.status === 'waiting_players'
    ) {
      const started = this.engine.startTurn(
        { ...state, status: 'in_progress' },
        state.player1.playerId,
      );
      // startTurn incrémente le turnNumber, on le remet à 1 pour le vrai premier tour
      const initial = { ...started, turnNumber: 1 };
      await this.saveState(gameId, initial);
      await this.prisma.game.update({
        where: { id: gameId },
        data: { status: 'in_progress', startedAt: new Date() },
      });
      return initial;
    }

    await this.saveState(gameId, state);
    return state;
  }

  async playCard(gameId: string, playerId: string, cardId: string): Promise<GameState> {
    const state = await this.getState(gameId);
    let newState = await this.engine.playCard(state, playerId, cardId);

    const { isOver, winnerId } = this.engine.checkVictory(newState);
    if (isOver && winnerId) {
      newState = { ...newState, status: 'finished', winnerId };
      await this.finalizeGame(gameId, winnerId, 'defeat', newState);
    } else {
      await this.saveState(gameId, newState);
    }
    return newState;
  }

  async attackCreature(
    gameId: string,
    playerId: string,
    attackerInstanceId: string,
    targetInstanceId: string,
  ): Promise<GameState> {
    const state = await this.getState(gameId);
    let newState = this.engine.attackCreature(state, playerId, attackerInstanceId, targetInstanceId);

    const { isOver, winnerId } = this.engine.checkVictory(newState);
    if (isOver && winnerId) {
      newState = { ...newState, status: 'finished', winnerId };
      await this.finalizeGame(gameId, winnerId, 'defeat', newState);
    } else {
      await this.saveState(gameId, newState);
    }
    return newState;
  }

  async attackPlayer(
    gameId: string,
    playerId: string,
    attackerInstanceId: string,
  ): Promise<GameState> {
    const state = await this.getState(gameId);
    let newState = this.engine.attackPlayer(state, playerId, attackerInstanceId);

    const { isOver, winnerId } = this.engine.checkVictory(newState);
    if (isOver && winnerId) {
      newState = { ...newState, status: 'finished', winnerId };
      await this.finalizeGame(gameId, winnerId, 'defeat', newState);
    } else {
      await this.saveState(gameId, newState);
    }
    return newState;
  }

  async endTurn(gameId: string, playerId: string): Promise<GameState> {
    const state = await this.getState(gameId);

    if (state.currentTurnPlayerId !== playerId) {
      throw new ForbiddenException('Not your turn');
    }

    const opponent = this.engine.getOpponent(state, playerId);
    const newState = this.engine.startTurn(state, opponent.playerId);
    await this.saveState(gameId, newState);
    return newState;
  }

  async surrender(gameId: string, playerId: string): Promise<GameState> {
    const state = await this.getState(gameId);
    const opponent = this.engine.getOpponent(state, playerId);

    const finished: GameState = { ...state, status: 'finished', winnerId: opponent.playerId };
    await this.finalizeGame(gameId, opponent.playerId, 'surrender', finished);
    return finished;
  }

  // ─── Fin de partie + ELO ───────────────────────────────────────────────────

  async finalizeGame(
    gameId: string,
    winnerId: string,
    reason: string,
    finalState?: GameState,
  ): Promise<void> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        player1: { select: { id: true, eloScore: true } },
        player2: { select: { id: true, eloScore: true } },
      },
    });
    if (!game || game.status === 'finished') return;

    // Identifier winner & loser
    const winner = game.player1.id === winnerId ? game.player1 : game.player2;
    const loser = game.player1.id === winnerId ? game.player2 : game.player1;

    const eloResult = this.elo.compute(
      { id: winner.id, elo: winner.eloScore },
      { id: loser.id, elo: loser.eloScore },
    );

    // Transaction : update game + update ELO des deux joueurs
    await this.prisma.$transaction([
      this.prisma.game.update({
        where: { id: gameId },
        data: { status: 'finished', winnerId, endedAt: new Date() },
      }),
      this.prisma.player.update({
        where: { id: eloResult.winnerId },
        data: { eloScore: eloResult.newWinnerElo },
      }),
      this.prisma.player.update({
        where: { id: eloResult.loserId },
        data: { eloScore: eloResult.newLoserElo },
      }),
    ]);

    // Sauvegarder l'état final puis le supprimer de Redis
    if (finalState) await this.saveState(gameId, finalState);
    await this.delState(gameId);
  }

  // ─── Partie solo vs bot ──────────────────────────────────────────────────────

  async createSoloGame(playerId: string, deckId: string) {
    const bot = await this.prisma.player.findUnique({
      where: { email: 'bot@olympos.internal' },
    });
    if (!bot) throw new BadRequestException('Bot player not found — run: npx prisma db seed');

    const botDeck = await this.prisma.deck.findFirst({
      where: { playerId: bot.id, isValid: true },
      include: { deckCards: true },
    });
    if (!botDeck) throw new BadRequestException('Bot deck not found — run: npx prisma db seed');

    const playerDeck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: { deckCards: true },
    });
    if (!playerDeck) throw new NotFoundException('Deck not found');
    if (!playerDeck.isValid) throw new BadRequestException('Your deck needs exactly 30 cards to play');

    const game = await this.prisma.game.create({
      data: {
        player1Id: playerId,
        player2Id: bot.id,
        deck1Id: deckId,
        deck2Id: botDeck.id,
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    const deck1CardIds = playerDeck.deckCards.flatMap((dc) =>
      Array(dc.quantity).fill(dc.cardId),
    );
    const deck2CardIds = botDeck.deckCards.flatMap((dc) =>
      Array(dc.quantity).fill(dc.cardId),
    );

    const state = await this.engine.initGameState(
      game.id, playerId, deck1CardIds, bot.id, deck2CardIds,
    );
    await this.saveState(game.id, state);

    // Fetch full card data for all IDs in play
    const allIds = [...new Set([...deck1CardIds, ...deck2CardIds])];
    const cards = await this.prisma.card.findMany({ where: { id: { in: allIds } } });
    const cardMap = Object.fromEntries(cards.map((c) => [c.id, c]));

    return {
      gameId: game.id,
      botId: bot.id,
      botUsername: bot.username,
      player: {
        id: playerId,
        hand: state.player1.hand.map((id) => cardMap[id]),
        deckRemaining: state.player1.deckRemaining.map((id) => cardMap[id]),
      },
      bot: {
        hand: state.player2.hand.map((id) => cardMap[id]),
        deckRemaining: state.player2.deckRemaining.map((id) => cardMap[id]),
      },
    };
  }

  async finishSoloGame(gameId: string, requesterId: string, winnerId: string) {
    const game = await this.prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new NotFoundException('Game not found');
    if (game.player1Id !== requesterId && game.player2Id !== requesterId)
      throw new ForbiddenException();
    if (game.status === 'finished') return { success: true };

    await this.finalizeGame(gameId, winnerId, 'solo');
    return { success: true };
  }

  // ─── Forfait sur TTL expiré ─────────────────────────────────────────────────

  async forfeitExpired(gameId: string, connectedPlayerId: string): Promise<void> {
    await this.finalizeGame(gameId, connectedPlayerId, 'timeout');
  }
}
