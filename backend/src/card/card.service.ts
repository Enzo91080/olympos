import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CardService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.card.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const card = await this.prisma.card.findUnique({ where: { id } });
    if (!card) throw new NotFoundException('Card not found');
    return card;
  }
}
