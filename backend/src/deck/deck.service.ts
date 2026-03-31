import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DeckService {
  constructor(private prisma: PrismaService) {}

  findAll(playerId: string) {
    return this.prisma.deck.findMany({
      where: { playerId },
      include: { deckCards: { include: { card: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, playerId: string) {
    const deck = await this.prisma.deck.findUnique({
      where: { id },
      include: { deckCards: { include: { card: true } } },
    });
    if (!deck) throw new NotFoundException('Deck not found');
    if (deck.playerId !== playerId) throw new ForbiddenException();
    return deck;
  }

  async create(playerId: string, name: string) {
    return this.prisma.deck.create({
      data: { playerId, name },
    });
  }

  async update(id: string, playerId: string, data: { name?: string }) {
    const deck = await this.prisma.deck.findUnique({ where: { id } });
    if (!deck) throw new NotFoundException('Deck not found');
    if (deck.playerId !== playerId) throw new ForbiddenException();
    return this.prisma.deck.update({ where: { id }, data });
  }

  async remove(id: string, playerId: string) {
    const deck = await this.prisma.deck.findUnique({ where: { id } });
    if (!deck) throw new NotFoundException('Deck not found');
    if (deck.playerId !== playerId) throw new ForbiddenException();
    await this.prisma.deck.delete({ where: { id } });
    return { deleted: true };
  }

  async addCard(deckId: string, playerId: string, cardId: string, quantity = 1) {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: { deckCards: true },
    });
    if (!deck) throw new NotFoundException('Deck not found');
    if (deck.playerId !== playerId) throw new ForbiddenException();

    const totalCards = deck.deckCards.reduce((sum, dc) => sum + dc.quantity, 0);
    if (totalCards + quantity > 30)
      throw new BadRequestException('Deck cannot exceed 30 cards');

    const existing = deck.deckCards.find((dc) => dc.cardId === cardId);
    if (existing) {
      if (existing.quantity + quantity > 2)
        throw new BadRequestException('Max 2 copies per card');
      const updated = await this.prisma.deckCard.update({
        where: { deckId_cardId: { deckId, cardId } },
        data: { quantity: existing.quantity + quantity },
      });
      await this.revalidateDeck(deckId);
      return updated;
    }

    const created = await this.prisma.deckCard.create({
      data: { deckId, cardId, quantity },
    });
    await this.revalidateDeck(deckId);
    return created;
  }

  async removeCard(deckId: string, playerId: string, cardId: string) {
    const deck = await this.prisma.deck.findUnique({ where: { id: deckId } });
    if (!deck) throw new NotFoundException('Deck not found');
    if (deck.playerId !== playerId) throw new ForbiddenException();

    await this.prisma.deckCard.delete({
      where: { deckId_cardId: { deckId, cardId } },
    });
    await this.revalidateDeck(deckId);
    return { deleted: true };
  }

  private async revalidateDeck(deckId: string) {
    const cards = await this.prisma.deckCard.findMany({ where: { deckId } });
    const total = cards.reduce((sum, dc) => sum + dc.quantity, 0);
    await this.prisma.deck.update({
      where: { id: deckId },
      data: { isValid: total === 30 },
    });
  }
}
