import { Test, TestingModule } from '@nestjs/testing';
import { AdminStatsService } from './admin-stats.service';
import { PrismaService } from '../prisma/prisma.service';

let service: AdminStatsService;
let prismaMock: {
  player: { count: jest.Mock; findMany: jest.Mock };
  game: { groupBy: jest.Mock };
  gameAction: { groupBy: jest.Mock };
  card: { findMany: jest.Mock };
};

beforeEach(async () => {
  prismaMock = {
    player: { count: jest.fn(), findMany: jest.fn() },
    game: { groupBy: jest.fn() },
    gameAction: { groupBy: jest.fn() },
    card: { findMany: jest.fn() },
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AdminStatsService,
      { provide: PrismaService, useValue: prismaMock },
    ],
  }).compile();

  service = module.get<AdminStatsService>(AdminStatsService);
});

describe('getStats', () => {
  it('agrège joueurs, parties par statut, top cartes et répartition elo', async () => {
    prismaMock.player.count.mockResolvedValue(42);
    prismaMock.game.groupBy.mockResolvedValue([
      { status: 'in_progress', _count: 3 },
      { status: 'finished', _count: 10 },
    ]);
    prismaMock.gameAction.groupBy.mockResolvedValue([
      { cardId: 'c1', _count: 7 },
    ]);
    prismaMock.player.findMany.mockResolvedValue([
      { eloScore: 2100 }, // Légende
      { eloScore: 1500 }, // Or
      { eloScore: 900 }, // Bronze
    ]);
    prismaMock.card.findMany.mockResolvedValue([
      { id: 'c1', name: 'Zeus', rarity: 'legendary' },
    ]);

    const result = await service.getStats();

    expect(result.players.total).toBe(42);
    expect(result.games.total).toBe(13);
    expect(result.games.byStatus).toEqual(
      expect.objectContaining({
        in_progress: 3,
        finished: 10,
        waiting: 0,
        abandoned: 0,
      }),
    );
    expect(result.topCards).toEqual([
      { cardId: 'c1', name: 'Zeus', rarity: 'legendary', count: 7 },
    ]);
    expect(result.eloDistribution).toEqual(
      expect.arrayContaining([
        { tier: 'Légende', count: 1 },
        { tier: 'Or', count: 1 },
        { tier: 'Bronze', count: 1 },
      ]),
    );
  });

  it("n'interroge pas card.findMany si aucune carte n'a été jouée", async () => {
    prismaMock.player.count.mockResolvedValue(0);
    prismaMock.game.groupBy.mockResolvedValue([]);
    prismaMock.gameAction.groupBy.mockResolvedValue([]);
    prismaMock.player.findMany.mockResolvedValue([]);

    const result = await service.getStats();

    expect(prismaMock.card.findMany).not.toHaveBeenCalled();
    expect(result.topCards).toEqual([]);
  });
});
