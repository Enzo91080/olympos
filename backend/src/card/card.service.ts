import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CARD_TYPES = ['creature', 'spell', 'artifact'];
const RARITIES = ['common', 'rare', 'epic', 'legendary'];

export interface CardInput {
  name: string;
  cardType: string;
  manaCost: number;
  attack?: number | null;
  defense?: number | null;
  effectText?: string | null;
  rarity: string;
  imageUrl?: string | null;
  spellTarget?: string | null;
}

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

  // ─── Admin ──────────────────────────────────────────────────────────────

  private validate(data: Partial<CardInput>) {
    if (data.cardType !== undefined && !CARD_TYPES.includes(data.cardType)) {
      throw new BadRequestException(`cardType must be one of: ${CARD_TYPES.join(', ')}`);
    }
    if (data.rarity !== undefined && !RARITIES.includes(data.rarity)) {
      throw new BadRequestException(`rarity must be one of: ${RARITIES.join(', ')}`);
    }
    if (data.manaCost !== undefined && data.manaCost < 0) {
      throw new BadRequestException('manaCost must be >= 0');
    }
  }

  create(data: CardInput) {
    this.validate(data);
    return this.prisma.card.create({ data });
  }

  async update(id: string, data: Partial<CardInput>) {
    await this.findOne(id);
    this.validate(data);
    return this.prisma.card.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      return await this.prisma.card.delete({ where: { id } });
    } catch {
      throw new BadRequestException(
        'Cannot delete a card that is already used in a deck or a played game action',
      );
    }
  }
}
