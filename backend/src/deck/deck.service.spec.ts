import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DeckService } from './deck.service';
import { PrismaService } from '../prisma/prisma.service';

let service: DeckService;
let prismaMock: {
  deck: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  deckCard: {
    findMany: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };
  game: { updateMany: jest.Mock };
};

beforeEach(async () => {
  prismaMock = {
    deck: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    deckCard: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    game: { updateMany: jest.fn() },
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [DeckService, { provide: PrismaService, useValue: prismaMock }],
  }).compile();

  service = module.get<DeckService>(DeckService);
});

// ─── findOne ──────────────────────────────────────────────────────────────────

describe('findOne', () => {
  it('retourne le deck si le joueur en est propriétaire', async () => {
    prismaMock.deck.findUnique.mockResolvedValue({ id: 'd1', playerId: 'p1' });
    const result = await service.findOne('d1', 'p1');
    expect(result).toEqual({ id: 'd1', playerId: 'p1' });
  });

  it('throw NotFoundException si le deck est introuvable', async () => {
    prismaMock.deck.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nope', 'p1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throw ForbiddenException si le deck appartient à un autre joueur', async () => {
    prismaMock.deck.findUnique.mockResolvedValue({
      id: 'd1',
      playerId: 'someone-else',
    });
    await expect(service.findOne('d1', 'p1')).rejects.toThrow(
      ForbiddenException,
    );
  });
});

// ─── update / remove : mêmes garde-fous ───────────────────────────────────────

describe('update', () => {
  it('throw NotFoundException si le deck est introuvable', async () => {
    prismaMock.deck.findUnique.mockResolvedValue(null);
    await expect(service.update('nope', 'p1', { name: 'x' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throw ForbiddenException si le deck appartient à un autre joueur', async () => {
    prismaMock.deck.findUnique.mockResolvedValue({
      id: 'd1',
      playerId: 'someone-else',
    });
    await expect(service.update('d1', 'p1', { name: 'x' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('renomme le deck si le joueur en est propriétaire', async () => {
    prismaMock.deck.findUnique.mockResolvedValue({ id: 'd1', playerId: 'p1' });
    prismaMock.deck.update.mockResolvedValue({ id: 'd1', name: 'Nouveau nom' });
    const result = await service.update('d1', 'p1', { name: 'Nouveau nom' });
    expect(result).toEqual({ id: 'd1', name: 'Nouveau nom' });
  });
});

describe('remove', () => {
  it('dissocie les parties puis supprime le deck et ses cartes', async () => {
    prismaMock.deck.findUnique.mockResolvedValue({ id: 'd1', playerId: 'p1' });

    const result = await service.remove('d1', 'p1');

    expect(prismaMock.game.updateMany).toHaveBeenCalledWith({
      where: { deck1Id: 'd1' },
      data: { deck1Id: null },
    });
    expect(prismaMock.game.updateMany).toHaveBeenCalledWith({
      where: { deck2Id: 'd1' },
      data: { deck2Id: null },
    });
    expect(prismaMock.deckCard.deleteMany).toHaveBeenCalledWith({
      where: { deckId: 'd1' },
    });
    expect(prismaMock.deck.delete).toHaveBeenCalledWith({
      where: { id: 'd1' },
    });
    expect(result).toEqual({ deleted: true });
  });

  it('throw ForbiddenException si le deck appartient à un autre joueur', async () => {
    prismaMock.deck.findUnique.mockResolvedValue({
      id: 'd1',
      playerId: 'someone-else',
    });
    await expect(service.remove('d1', 'p1')).rejects.toThrow(
      ForbiddenException,
    );
  });
});

// ─── addCard ──────────────────────────────────────────────────────────────────

describe('addCard', () => {
  it('ajoute une nouvelle carte au deck et revalide sa taille', async () => {
    prismaMock.deck.findUnique.mockResolvedValue({
      id: 'd1',
      playerId: 'p1',
      deckCards: [],
    });
    prismaMock.deckCard.create.mockResolvedValue({
      deckId: 'd1',
      cardId: 'c1',
      quantity: 1,
    });
    prismaMock.deckCard.findMany.mockResolvedValue([{ quantity: 1 }]);

    const result = await service.addCard('d1', 'p1', 'c1', 1);

    expect(prismaMock.deckCard.create).toHaveBeenCalledWith({
      data: { deckId: 'd1', cardId: 'c1', quantity: 1 },
    });
    expect(prismaMock.deck.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { isValid: false },
    });
    expect(result).toEqual({ deckId: 'd1', cardId: 'c1', quantity: 1 });
  });

  it('incrémente la quantité si la carte est déjà présente', async () => {
    prismaMock.deck.findUnique.mockResolvedValue({
      id: 'd1',
      playerId: 'p1',
      deckCards: [{ cardId: 'c1', quantity: 1 }],
    });
    prismaMock.deckCard.update.mockResolvedValue({
      deckId: 'd1',
      cardId: 'c1',
      quantity: 2,
    });

    await service.addCard('d1', 'p1', 'c1', 1);

    expect(prismaMock.deckCard.update).toHaveBeenCalledWith({
      where: { deckId_cardId: { deckId: 'd1', cardId: 'c1' } },
      data: { quantity: 2 },
    });
  });

  it('throw BadRequestException si le deck dépasse 30 cartes', async () => {
    const deckCards = Array.from({ length: 30 }, (_, i) => ({
      cardId: `c${i}`,
      quantity: 1,
    }));
    prismaMock.deck.findUnique.mockResolvedValue({
      id: 'd1',
      playerId: 'p1',
      deckCards,
    });

    await expect(service.addCard('d1', 'p1', 'c-new', 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throw BadRequestException au-delà de 2 exemplaires de la même carte', async () => {
    prismaMock.deck.findUnique.mockResolvedValue({
      id: 'd1',
      playerId: 'p1',
      deckCards: [{ cardId: 'c1', quantity: 2 }],
    });

    await expect(service.addCard('d1', 'p1', 'c1', 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throw ForbiddenException si le deck appartient à un autre joueur', async () => {
    prismaMock.deck.findUnique.mockResolvedValue({
      id: 'd1',
      playerId: 'someone-else',
      deckCards: [],
    });
    await expect(service.addCard('d1', 'p1', 'c1', 1)).rejects.toThrow(
      ForbiddenException,
    );
  });
});

// ─── removeCard ───────────────────────────────────────────────────────────────

describe('removeCard', () => {
  it('retire la carte du deck et revalide sa taille', async () => {
    prismaMock.deck.findUnique.mockResolvedValue({ id: 'd1', playerId: 'p1' });
    prismaMock.deckCard.findMany.mockResolvedValue([]);

    const result = await service.removeCard('d1', 'p1', 'c1');

    expect(prismaMock.deckCard.delete).toHaveBeenCalledWith({
      where: { deckId_cardId: { deckId: 'd1', cardId: 'c1' } },
    });
    expect(prismaMock.deck.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { isValid: false },
    });
    expect(result).toEqual({ deleted: true });
  });

  it('throw NotFoundException si le deck est introuvable', async () => {
    prismaMock.deck.findUnique.mockResolvedValue(null);
    await expect(service.removeCard('nope', 'p1', 'c1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
