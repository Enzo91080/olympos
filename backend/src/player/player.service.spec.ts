import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PlayerService } from './player.service';
import { PrismaService } from '../prisma/prisma.service';

let service: PlayerService;
let prismaMock: {
  player: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
};

beforeEach(async () => {
  prismaMock = {
    player: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      PlayerService,
      { provide: PrismaService, useValue: prismaMock },
    ],
  }).compile();

  service = module.get<PlayerService>(PlayerService);
});

// ─── getMe ────────────────────────────────────────────────────────────────────

describe('getMe', () => {
  it('retourne le joueur trouvé', async () => {
    prismaMock.player.findUnique.mockResolvedValue({
      id: 'p1',
      username: 'hero',
    });
    const result = await service.getMe('p1');
    expect(result).toEqual({ id: 'p1', username: 'hero' });
  });

  it('throw NotFoundException si le joueur est introuvable', async () => {
    prismaMock.player.findUnique.mockResolvedValue(null);
    await expect(service.getMe('nope')).rejects.toThrow(NotFoundException);
  });
});

// ─── getLeaderboard ───────────────────────────────────────────────────────────

describe('getLeaderboard', () => {
  it('trie par eloScore décroissant avec la limite par défaut de 50', async () => {
    prismaMock.player.findMany.mockResolvedValue([]);
    await service.getLeaderboard();
    expect(prismaMock.player.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { eloScore: 'desc' }, take: 50 }),
    );
  });

  it('respecte une limite personnalisée', async () => {
    prismaMock.player.findMany.mockResolvedValue([]);
    await service.getLeaderboard(10);
    expect(prismaMock.player.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    );
  });
});

// ─── updateMe ─────────────────────────────────────────────────────────────────

describe('updateMe', () => {
  it('met à jour le username et/ou avatarUrl', async () => {
    prismaMock.player.update.mockResolvedValue({
      id: 'p1',
      username: 'newname',
    });
    const result = await service.updateMe('p1', { username: 'newname' });
    expect(prismaMock.player.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: { username: 'newname' },
      }),
    );
    expect(result).toEqual({ id: 'p1', username: 'newname' });
  });
});

// ─── adminListAll ─────────────────────────────────────────────────────────────

describe('adminListAll', () => {
  it('liste tous les joueurs triés par date de création décroissante', () => {
    service.adminListAll();
    expect(prismaMock.player.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });
});

// ─── adminUpdate ──────────────────────────────────────────────────────────────

describe('adminUpdate', () => {
  it('throw BadRequestException si le rôle est invalide', async () => {
    await expect(
      service.adminUpdate('p1', { role: 'superadmin' }),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.player.findUnique).not.toHaveBeenCalled();
  });

  it('throw NotFoundException si le joueur est introuvable', async () => {
    prismaMock.player.findUnique.mockResolvedValue(null);
    await expect(
      service.adminUpdate('nope', { isBanned: true }),
    ).rejects.toThrow(NotFoundException);
  });

  it('met à jour le joueur si les données sont valides', async () => {
    prismaMock.player.findUnique.mockResolvedValue({ id: 'p1' });
    prismaMock.player.update.mockResolvedValue({ id: 'p1', role: 'admin' });

    const result = await service.adminUpdate('p1', { role: 'admin' });

    expect(prismaMock.player.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1' }, data: { role: 'admin' } }),
    );
    expect(result).toEqual({ id: 'p1', role: 'admin' });
  });
});
