import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminAuditService {
  constructor(private prisma: PrismaService) {}

  // Fire-and-forget côté appelant (simplement awaité) : pas de try/catch dédié,
  // cohérent avec le reste du code — pas d'infra de résilience pour ce projet école.
  log(
    actorId: string,
    actorUsername: string,
    action: string,
    targetType: string,
    targetId: string,
    metadata?: object,
  ) {
    return this.prisma.adminAuditLog.create({
      data: { actorId, actorUsername, action, targetType, targetId, metadata },
    });
  }

  list(limit = 200) {
    return this.prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
