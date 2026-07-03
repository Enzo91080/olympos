import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  GoneException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GameService } from './game.service';
import { GameEngineService } from './game-engine.service';
import { EloService } from './elo.service';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { GameState } from './game-state.interface';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    gameId: 'game-1',
    status: 'in_progress',
    currentTurnPlayerId: 'p1',
    turnNumber: 1,
    connectedPlayers: ['p1', 'p2'],
    player1: {
      playerId: 'p1',
      hp: 20,
      mana: 5,
      maxMana: 5,
      hand: ['card-1'],
      deckRemaining: [],
      board: [],
    },
    player2: {
      playerId: 'p2',
      hp: 20,
      mana: 0,
      maxMana: 0,
      hand: [],
      deckRemaining: [],
      board: [],
    },
    ...overrides,
  };
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

let service: GameService;
let redisMock: {
  get: jest.Mock;
  set: jest.Mock;
  setex: jest.Mock;
  del: jest.Mock;
  eval: jest.Mock;
};
let engineMock: jest.Mocked<Partial<GameEngineService>>;
let prismaMock: {
  game: { findUnique: jest.Mock; update: jest.Mock; create: jest.Mock };
  player: { update: jest.Mock; findUnique: jest.Mock };
  $transaction: jest.Mock;
};
let eloMock: { compute: jest.Mock };

beforeEach(async () => {
  redisMock = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'), // lock acquis par défaut
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    eval: jest.fn().mockResolvedValue(1),
  };

  engineMock = {
    playCreature: jest.fn(),
    playSpellAuto: jest.fn(),
    playSpellTargeted: jest.fn(),
    attackCreature: jest.fn(),
    attackPlayer: jest.fn(),
    startTurn: jest.fn(),
    checkVictory: jest.fn().mockReturnValue({ isOver: false }),
    getOpponent: jest.fn(),
  };

  prismaMock = {
    game: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    player: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  eloMock = { compute: jest.fn() };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      GameService,
      { provide: GameEngineService, useValue: engineMock },
      { provide: PrismaService, useValue: prismaMock },
      { provide: EloService, useValue: eloMock },
      { provide: REDIS_CLIENT, useValue: redisMock },
    ],
  }).compile();

  service = module.get<GameService>(GameService);
});

// ─── getState ─────────────────────────────────────────────────────────────────

describe('getState', () => {
  it('retourne l\'état parsé depuis Redis', async () => {
    const state = makeGameState();
    redisMock.get.mockResolvedValue(JSON.stringify(state));
    const result = await service.getState('game-1');
    expect(result.gameId).toBe('game-1');
    expect(result.status).toBe('in_progress');
  });

  it('throw GoneException si Redis retourne null (TTL expiré)', async () => {
    redisMock.get.mockResolvedValue(null);
    await expect(service.getState('game-1'))
      .rejects.toThrow(GoneException);
  });
});

// ─── saveState ────────────────────────────────────────────────────────────────

describe('saveState', () => {
  it('sérialise l\'état et le sauvegarde avec setex (TTL 600s)', async () => {
    const state = makeGameState();
    await service.saveState('game-1', state);
    expect(redisMock.setex).toHaveBeenCalledWith(
      'game:state:game-1',
      600,
      JSON.stringify(state),
    );
  });
});

// ─── withLock (via playCreature) ──────────────────────────────────────────────

describe('withLock (verrou Redis I13)', () => {
  it('acquiert le verrou avant d\'agir et le libère ensuite (Lua eval)', async () => {
    const state = makeGameState();
    const newState = makeGameState({ turnNumber: 2 });
    redisMock.get.mockResolvedValue(JSON.stringify(state));
    (engineMock.playCreature as jest.Mock).mockResolvedValue(newState);

    await service.playCreature('game-1', 'p1', 'card-1');

    // Verrou acquis
    expect(redisMock.set).toHaveBeenCalledWith(
      expect.stringContaining('game:lock:game-1'),
      expect.any(String),
      'PX',
      3000,
      'NX',
    );
    // Verrou libéré via Lua
    expect(redisMock.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call'),
      1,
      expect.stringContaining('game:lock:game-1'),
      expect.any(String),
    );
  });

  it('throw ServiceUnavailableException si le verrou ne peut pas être acquis', async () => {
    redisMock.set.mockResolvedValue(null); // lock déjà pris
    await expect(service.playCreature('game-1', 'p1', 'card-1'))
      .rejects.toThrow(ServiceUnavailableException);
  });

  it('libère le verrou même si l\'action échoue (finally)', async () => {
    const state = makeGameState();
    redisMock.get.mockResolvedValue(JSON.stringify(state));
    (engineMock.playCreature as jest.Mock).mockRejectedValue(new Error('engine error'));

    await expect(service.playCreature('game-1', 'p1', 'card-1'))
      .rejects.toThrow('engine error');

    // Le Lua eval doit quand même être appelé
    expect(redisMock.eval).toHaveBeenCalled();
  });
});

// ─── playCreature ─────────────────────────────────────────────────────────────

describe('playCreature', () => {
  it('cas nominal : appelle le moteur et sauvegarde le nouvel état', async () => {
    const state = makeGameState();
    const newState = makeGameState({ turnNumber: 2 });
    redisMock.get.mockResolvedValue(JSON.stringify(state));
    (engineMock.playCreature as jest.Mock).mockResolvedValue(newState);

    const result = await service.playCreature('game-1', 'p1', 'card-1');

    expect(engineMock.playCreature).toHaveBeenCalledWith(state, 'p1', 'card-1');
    expect(redisMock.setex).toHaveBeenCalled();
    expect(result.turnNumber).toBe(2);
  });

  it('victoire : appelle finalizeGame, ne sauvegarde pas l\'état intermédiaire', async () => {
    const state = makeGameState();
    const newState = makeGameState({ player2: { ...state.player2, hp: 0 } });
    redisMock.get.mockResolvedValue(JSON.stringify(state));
    (engineMock.playCreature as jest.Mock).mockResolvedValue(newState);
    (engineMock.checkVictory as jest.Mock).mockReturnValue({ isOver: true, winnerId: 'p1' });

    // finalizeGame interroge Prisma — on retourne null pour court-circuiter
    prismaMock.game.findUnique.mockResolvedValue(null);

    const result = await service.playCreature('game-1', 'p1', 'card-1');

    expect(result.status).toBe('finished');
    expect(result.winnerId).toBe('p1');
    // setex peut être appelé par finalizeGame (saveState final) mais pas via la branche else
  });
});

// ─── attackPlayer ─────────────────────────────────────────────────────────────

describe('attackPlayer', () => {
  it('appelle le moteur attackPlayer et sauvegarde le résultat', async () => {
    const state = makeGameState();
    const newState = makeGameState({ player2: { ...state.player2, hp: 15 } });
    redisMock.get.mockResolvedValue(JSON.stringify(state));
    (engineMock.attackPlayer as jest.Mock).mockReturnValue(newState);

    const result = await service.attackPlayer('game-1', 'p1', 'inst-1');

    expect(engineMock.attackPlayer).toHaveBeenCalledWith(state, 'p1', 'inst-1');
    expect(redisMock.setex).toHaveBeenCalled();
    expect(result.player2.hp).toBe(15);
  });
});

// ─── endTurn ──────────────────────────────────────────────────────────────────

describe('endTurn', () => {
  it('appelle startTurn pour l\'adversaire et sauvegarde', async () => {
    const state = makeGameState({ currentTurnPlayerId: 'p1' });
    const newState = makeGameState({ currentTurnPlayerId: 'p2', turnNumber: 2 });
    redisMock.get.mockResolvedValue(JSON.stringify(state));
    (engineMock.getOpponent as jest.Mock).mockReturnValue({ playerId: 'p2' });
    (engineMock.startTurn as jest.Mock).mockReturnValue(newState);

    const result = await service.endTurn('game-1', 'p1');

    expect(engineMock.getOpponent).toHaveBeenCalledWith(state, 'p1');
    expect(engineMock.startTurn).toHaveBeenCalledWith(state, 'p2');
    expect(result.currentTurnPlayerId).toBe('p2');
  });

  it('throw ForbiddenException si ce n\'est pas le tour du joueur', async () => {
    const state = makeGameState({ currentTurnPlayerId: 'p2' });
    redisMock.get.mockResolvedValue(JSON.stringify(state));

    await expect(service.endTurn('game-1', 'p1'))
      .rejects.toThrow(ForbiddenException);
  });
});

// ─── surrender ────────────────────────────────────────────────────────────────

describe('surrender', () => {
  it('définit status=finished et winnerId=opponent.playerId', async () => {
    const state = makeGameState();
    redisMock.get.mockResolvedValue(JSON.stringify(state));
    (engineMock.getOpponent as jest.Mock).mockReturnValue({ playerId: 'p2' });
    prismaMock.game.findUnique.mockResolvedValue(null); // court-circuit finalizeGame

    const result = await service.surrender('game-1', 'p1');

    expect(result.status).toBe('finished');
    expect(result.winnerId).toBe('p2');
  });
});

// ─── finalizeGame ─────────────────────────────────────────────────────────────

describe('finalizeGame', () => {
  it('met à jour le statut DB et les scores ELO via transaction', async () => {
    const mockGame = {
      id: 'game-1',
      status: 'in_progress',
      player1: { id: 'p1', eloScore: 1200 },
      player2: { id: 'p2', eloScore: 1200 },
    };
    prismaMock.game.findUnique.mockResolvedValue(mockGame);
    eloMock.compute.mockReturnValue({
      winnerId: 'p1', loserId: 'p2', newWinnerElo: 1216, newLoserElo: 1184,
    });
    prismaMock.$transaction.mockResolvedValue([]);

    await service.finalizeGame('game-1', 'p1', 'defeat');

    expect(eloMock.compute).toHaveBeenCalledWith(
      { id: 'p1', elo: 1200 },
      { id: 'p2', elo: 1200 },
    );
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(redisMock.del).toHaveBeenCalledWith('game:state:game-1');
  });

  it('ne fait rien si la partie est déjà finished en DB', async () => {
    prismaMock.game.findUnique.mockResolvedValue({ id: 'game-1', status: 'finished' });

    await service.finalizeGame('game-1', 'p1', 'defeat');

    expect(eloMock.compute).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('ne fait rien si la partie n\'existe pas en DB (null)', async () => {
    prismaMock.game.findUnique.mockResolvedValue(null);

    await service.finalizeGame('game-1', 'p1', 'defeat');

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
