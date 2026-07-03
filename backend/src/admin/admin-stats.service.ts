import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const GAME_STATUSES = ['waiting', 'in_progress', 'finished', 'abandoned'] as const;

// Seuils alignés sur frontend/src/pages/Leaderboard.tsx (rankFromElo), qui
// reflètent les tiers documentés dans le README — à ne pas confondre avec
// authService.ts côté frontend qui utilise une autre échelle (hors périmètre ici).
const RANK_TIERS: { tier: string; min: number }[] = [
  { tier: 'Légende', min: 2000 },
  { tier: 'Diamant', min: 1800 },
  { tier: 'Platine', min: 1600 },
  { tier: 'Or', min: 1400 },
  { tier: 'Argent', min: 1200 },
  { tier: 'Bronze', min: 0 },
];

@Injectable()
export class AdminStatsService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [playersTotal, gamesByStatus, topCardsRaw, players] = await Promise.all([
      this.prisma.player.count(),
      // Première utilisation de groupBy dans le code — agrège le nombre de parties par statut.
      this.prisma.game.groupBy({ by: ['status'], _count: true }),
      this.prisma.gameAction.groupBy({
        by: ['cardId'],
        where: { cardId: { not: null } },
        _count: true,
        orderBy: { _count: { cardId: 'desc' } },
        take: 10,
      }),
      this.prisma.player.findMany({ select: { eloScore: true } }),
    ]);

    const byStatus = Object.fromEntries(GAME_STATUSES.map((s) => [s, 0])) as Record<
      (typeof GAME_STATUSES)[number],
      number
    >;
    for (const row of gamesByStatus) {
      if (row.status in byStatus) byStatus[row.status as (typeof GAME_STATUSES)[number]] = row._count;
    }
    const gamesTotal = gamesByStatus.reduce((sum, row) => sum + row._count, 0);

    const cardIds = topCardsRaw.map((r) => r.cardId).filter((id): id is string => id !== null);
    const cards = cardIds.length
      ? await this.prisma.card.findMany({
          where: { id: { in: cardIds } },
          select: { id: true, name: true, rarity: true },
        })
      : [];
    const cardById = Object.fromEntries(cards.map((c) => [c.id, c]));
    const topCards = topCardsRaw
      .filter((r) => r.cardId && cardById[r.cardId])
      .map((r) => ({
        cardId: r.cardId as string,
        name: cardById[r.cardId as string].name,
        rarity: cardById[r.cardId as string].rarity,
        count: r._count,
      }));

    const eloDistribution = RANK_TIERS.map(({ tier, min }, i) => {
      const max = i === 0 ? Infinity : RANK_TIERS[i - 1].min;
      const count = players.filter((p) => p.eloScore >= min && p.eloScore < max).length;
      return { tier, count };
    });

    return {
      players: { total: playersTotal },
      games: { total: gamesTotal, byStatus },
      topCards,
      eloDistribution,
    };
  }
}
