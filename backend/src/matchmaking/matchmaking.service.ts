import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MatchmakingService {
  constructor(private prisma: PrismaService) {}

  async join(playerId: string) {
    const existing = await this.prisma.matchmakingQueue.findUnique({
      where: { playerId },
    });
    if (existing && existing.status === 'waiting')
      throw new ConflictException('Already in queue');

    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
    });
    if (!player) throw new NotFoundException('Player not found');

    const entry = await this.prisma.matchmakingQueue.upsert({
      where: { playerId },
      update: { status: 'waiting', joinedAt: new Date() },
      create: {
        playerId,
        status: 'waiting',
        eloMin: Math.max(0, player.eloScore - 200),
        eloMax: player.eloScore + 200,
      },
    });

    // Try to find a match
    const opponent = await this.prisma.matchmakingQueue.findFirst({
      where: {
        playerId: { not: playerId },
        status: 'waiting',
        eloMin: { lte: player.eloScore },
        eloMax: { gte: player.eloScore },
      },
      include: { player: true },
    });

    if (opponent) {
      await this.prisma.matchmakingQueue.updateMany({
        where: { playerId: { in: [playerId, opponent.playerId] } },
        data: { status: 'matched' },
      });
      return { matched: true, opponentId: opponent.playerId };
    }

    return { matched: false, queueEntry: entry };
  }

  async leave(playerId: string) {
    const entry = await this.prisma.matchmakingQueue.findUnique({
      where: { playerId },
    });
    if (!entry || entry.status !== 'waiting')
      throw new NotFoundException('Not in queue');

    await this.prisma.matchmakingQueue.update({
      where: { playerId },
      data: { status: 'cancelled' },
    });
    return { left: true };
  }
}
