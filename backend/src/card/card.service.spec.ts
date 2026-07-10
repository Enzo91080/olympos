import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CardService } from './card.service';
import { PrismaService } from '../prisma/prisma.service';

let service: CardService;
let prismaMock: {
  card: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

const VALID_CARD = {
  name: 'Soldat Spartiate',
  cardType: 'creature',
  manaCost: 1,
  attack: 1,
  defense: 2,
  rarity: 'common',
};

beforeEach(async () => {
  prismaMock = {
    card: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [CardService, { provide: PrismaService, useValue: prismaMock }],
  }).compile();

  service = module.get<CardService>(CardService);
});

// ─── findOne ──────────────────────────────────────────────────────────────────

describe('findOne', () => {
  it('retourne la carte trouvée', async () => {
    prismaMock.card.findUnique.mockResolvedValue({ id: 'c1', name: 'Zeus' });
    const result = await service.findOne('c1');
    expect(result).toEqual({ id: 'c1', name: 'Zeus' });
  });

  it('throw NotFoundException si la carte est introuvable', async () => {
    prismaMock.card.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
  });
});

// ─── create ───────────────────────────────────────────────────────────────────

describe('create', () => {
  it('crée la carte si les données sont valides', () => {
    prismaMock.card.create.mockReturnValue({ id: 'c1', ...VALID_CARD });
    service.create(VALID_CARD);
    expect(prismaMock.card.create).toHaveBeenCalledWith({ data: VALID_CARD });
  });

  it('throw BadRequestException si cardType est invalide', () => {
    expect(() =>
      service.create({ ...VALID_CARD, cardType: 'invalid' }),
    ).toThrow(BadRequestException);
  });

  it('throw BadRequestException si rarity est invalide', () => {
    expect(() => service.create({ ...VALID_CARD, rarity: 'invalid' })).toThrow(
      BadRequestException,
    );
  });

  it('throw BadRequestException si manaCost est négatif', () => {
    expect(() => service.create({ ...VALID_CARD, manaCost: -1 })).toThrow(
      BadRequestException,
    );
  });
});

// ─── update ───────────────────────────────────────────────────────────────────

describe('update', () => {
  it('throw NotFoundException si la carte est introuvable', async () => {
    prismaMock.card.findUnique.mockResolvedValue(null);
    await expect(service.update('nope', { manaCost: 2 })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throw BadRequestException si les nouvelles données sont invalides', async () => {
    prismaMock.card.findUnique.mockResolvedValue({ id: 'c1', ...VALID_CARD });
    await expect(service.update('c1', { rarity: 'invalid' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('met à jour la carte si les données sont valides', async () => {
    prismaMock.card.findUnique.mockResolvedValue({ id: 'c1', ...VALID_CARD });
    prismaMock.card.update.mockResolvedValue({
      id: 'c1',
      ...VALID_CARD,
      manaCost: 3,
    });

    const result = await service.update('c1', { manaCost: 3 });

    expect(prismaMock.card.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { manaCost: 3 },
    });
    expect(result.manaCost).toBe(3);
  });
});

// ─── remove ───────────────────────────────────────────────────────────────────

describe('remove', () => {
  it("supprime la carte si elle existe et n'est pas référencée", async () => {
    prismaMock.card.findUnique.mockResolvedValue({ id: 'c1', ...VALID_CARD });
    prismaMock.card.delete.mockResolvedValue({ id: 'c1', ...VALID_CARD });

    const result = await service.remove('c1');

    expect(result).toEqual({ id: 'c1', ...VALID_CARD });
  });

  it('throw NotFoundException si la carte est introuvable', async () => {
    prismaMock.card.findUnique.mockResolvedValue(null);
    await expect(service.remove('nope')).rejects.toThrow(NotFoundException);
  });

  it('throw BadRequestException si la carte est référencée ailleurs (contrainte FK)', async () => {
    prismaMock.card.findUnique.mockResolvedValue({ id: 'c1', ...VALID_CARD });
    prismaMock.card.delete.mockRejectedValue(
      new Error('foreign key constraint'),
    );

    await expect(service.remove('c1')).rejects.toThrow(BadRequestException);
  });
});
