import { Test, TestingModule } from '@nestjs/testing';
import { AdminAuditService } from './admin-audit.service';
import { PrismaService } from '../prisma/prisma.service';

let service: AdminAuditService;
let prismaMock: {
  adminAuditLog: { create: jest.Mock; findMany: jest.Mock };
};

beforeEach(async () => {
  prismaMock = {
    adminAuditLog: { create: jest.fn(), findMany: jest.fn() },
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AdminAuditService,
      { provide: PrismaService, useValue: prismaMock },
    ],
  }).compile();

  service = module.get<AdminAuditService>(AdminAuditService);
});

describe('log', () => {
  it('enregistre une entrée avec acteur, action, cible et métadonnées', () => {
    service.log('admin-1', 'root', 'player.ban', 'player', 'p1', {
      reason: 'toxicity',
    });

    expect(prismaMock.adminAuditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'admin-1',
        actorUsername: 'root',
        action: 'player.ban',
        targetType: 'player',
        targetId: 'p1',
        metadata: { reason: 'toxicity' },
      },
    });
  });
});

describe('list', () => {
  it('utilise une limite par défaut de 200, triée par date décroissante', () => {
    service.list();
    expect(prismaMock.adminAuditLog.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  });

  it('respecte une limite personnalisée', () => {
    service.list(20);
    expect(prismaMock.adminAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 }),
    );
  });
});
