import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ADMIN_PLAYER_SELECT = {
  id: true,
  username: true,
  email: true,
  eloScore: true,
  role: true,
  isBanned: true,
  createdAt: true,
} as const;

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
        role: true,
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

  // ─── Admin ──────────────────────────────────────────────────────────────

  adminListAll() {
    return this.prisma.player.findMany({
      orderBy: { createdAt: 'desc' },
      select: ADMIN_PLAYER_SELECT,
    });
  }

  async adminUpdate(
    playerId: string,
    data: { eloScore?: number; role?: string; isBanned?: boolean },
  ) {
    if (data.role && !['player', 'admin'].includes(data.role)) {
      throw new BadRequestException('Invalid role — must be "player" or "admin"');
    }
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new NotFoundException('Player not found');

    return this.prisma.player.update({
      where: { id: playerId },
      data,
      select: ADMIN_PLAYER_SELECT,
    });
  }
}
