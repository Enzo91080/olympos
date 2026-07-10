import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { PrismaService } from '../prisma/prisma.service';

let service: MatchmakingService;
let prismaMock: {
  player: { findUnique: jest.Mock };
  matchmakingQueue: {
    upsert: jest.Mock;
    findFirst: jest.Mock;
    updateMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

beforeEach(async () => {
  prismaMock = {
    player: { findUnique: jest.fn() },
    matchmakingQueue: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      MatchmakingService,
      { provide: PrismaService, useValue: prismaMock },
    ],
  }).compile();

  service = module.get<MatchmakingService>(MatchmakingService);
});

// ─── join ─────────────────────────────────────────────────────────────────────

describe('join', () => {
  it('throw NotFoundException si le joueur est introuvable', async () => {
    prismaMock.player.findUnique.mockResolvedValue(null);
    await expect(service.join('nope')).rejects.toThrow(NotFoundException);
  });

  it("s'inscrit en file d'attente si aucun adversaire compatible n'est trouvé", async () => {
    prismaMock.player.findUnique.mockResolvedValue({
      id: 'p1',
      eloScore: 1200,
    });
    prismaMock.matchmakingQueue.upsert.mockResolvedValue({
      playerId: 'p1',
      status: 'waiting',
    });
    prismaMock.matchmakingQueue.findFirst.mockResolvedValue(null);

    const result = await service.join('p1');

    /* eslint-disable @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() imbriqué est typé `any` côté @types/jest */
    expect(prismaMock.matchmakingQueue.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { playerId: 'p1' },
        update: expect.objectContaining({ eloMin: 1000, eloMax: 1400 }),
        create: expect.objectContaining({ eloMin: 1000, eloMax: 1400 }),
      }),
    );
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    expect(result).toEqual({
      matched: false,
      queueEntry: { playerId: 'p1', status: 'waiting' },
    });
  });

  it('plafonne eloMin à 0 pour un joueur à faible elo', async () => {
    prismaMock.player.findUnique.mockResolvedValue({ id: 'p1', eloScore: 100 });
    prismaMock.matchmakingQueue.upsert.mockResolvedValue({});
    prismaMock.matchmakingQueue.findFirst.mockResolvedValue(null);

    await service.join('p1');

    expect(prismaMock.matchmakingQueue.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining() imbriqué est typé `any` côté @types/jest
        update: expect.objectContaining({ eloMin: 0 }),
      }),
    );
  });

  it('matche avec un adversaire compatible en file et marque les deux comme "matched"', async () => {
    prismaMock.player.findUnique.mockResolvedValue({
      id: 'p1',
      eloScore: 1200,
    });
    prismaMock.matchmakingQueue.upsert.mockResolvedValue({});
    prismaMock.matchmakingQueue.findFirst.mockResolvedValue({
      playerId: 'p2',
      player: { id: 'p2' },
    });

    const result = await service.join('p1');

    expect(prismaMock.matchmakingQueue.updateMany).toHaveBeenCalledWith({
      where: { playerId: { in: ['p1', 'p2'] } },
      data: { status: 'matched' },
    });
    expect(result).toEqual({ matched: true, opponentId: 'p2' });
  });
});

// ─── leave ────────────────────────────────────────────────────────────────────

describe('leave', () => {
  it("annule l'entrée si le joueur est en attente", async () => {
    prismaMock.matchmakingQueue.findUnique.mockResolvedValue({
      playerId: 'p1',
      status: 'waiting',
    });

    const result = await service.leave('p1');

    expect(prismaMock.matchmakingQueue.update).toHaveBeenCalledWith({
      where: { playerId: 'p1' },
      data: { status: 'cancelled' },
    });
    expect(result).toEqual({ left: true });
  });

  it("throw NotFoundException si le joueur n'est pas en file d'attente", async () => {
    prismaMock.matchmakingQueue.findUnique.mockResolvedValue(null);
    await expect(service.leave('p1')).rejects.toThrow(NotFoundException);
  });

  it('throw NotFoundException si le statut n\'est pas "waiting"', async () => {
    prismaMock.matchmakingQueue.findUnique.mockResolvedValue({
      playerId: 'p1',
      status: 'matched',
    });
    await expect(service.leave('p1')).rejects.toThrow(NotFoundException);
  });
});
