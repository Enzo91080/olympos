import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlayerService {
  constructor(private prisma: PrismaService) {}

  async getMe(playerId: string) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        username: true,
        email: true,
        eloScore: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!player) throw new NotFoundException('Player not found');
    return player;
  }

  async getLeaderboard(limit = 50) {
    return this.prisma.player.findMany({
      orderBy: { eloScore: 'desc' },
      take: limit,
      select: {
        id: true,
        username: true,
        eloScore: true,
        avatarUrl: true,
      },
    })
  }

  async updateMe(playerId: string, data: { username?: string; avatarUrl?: string }) {
    return this.prisma.player.update({
      where: { id: playerId },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        eloScore: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
