import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('bcrypt');
jest.mock('nodemailer');

// ─── Mocks ────────────────────────────────────────────────────────────────────

let service: AuthService;
let prismaMock: {
  player: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};
let jwtMock: { sign: jest.Mock };

const ORIGINAL_ENV = process.env;

beforeEach(async () => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.SMTP_HOST;

  prismaMock = {
    player: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  jwtMock = { sign: jest.fn().mockReturnValue('signed.jwt.token') };

  jest.clearAllMocks();
  jwtMock.sign.mockReturnValue('signed.jwt.token');

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: PrismaService, useValue: prismaMock },
      { provide: JwtService, useValue: jwtMock },
    ],
  }).compile();

  service = module.get<AuthService>(AuthService);
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

// ─── register ─────────────────────────────────────────────────────────────────

describe('register', () => {
  it('crée le joueur et retourne un token si email/username libres', async () => {
    prismaMock.player.findFirst.mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');
    prismaMock.player.create.mockResolvedValue({
      id: 'p1',
      email: 'a@b.com',
      username: 'hero',
    });

    const result = await service.register({
      email: 'a@b.com',
      username: 'hero',
      password: 'secret',
    } as any);

    expect(bcrypt.hash).toHaveBeenCalledWith('secret', 10);
    expect(prismaMock.player.create).toHaveBeenCalledWith({
      data: { username: 'hero', email: 'a@b.com', passwordHash: 'hashed-pw' },
    });
    expect(result).toEqual({ access_token: 'signed.jwt.token' });
  });

  it('throw ConflictException si email ou username déjà pris', async () => {
    prismaMock.player.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(
      service.register({
        email: 'a@b.com',
        username: 'hero',
        password: 'secret',
      } as any),
    ).rejects.toThrow(ConflictException);
    expect(prismaMock.player.create).not.toHaveBeenCalled();
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('login', () => {
  it('retourne un token si les identifiants sont valides', async () => {
    prismaMock.player.findUnique.mockResolvedValue({
      id: 'p1',
      email: 'a@b.com',
      passwordHash: 'hashed-pw',
      isBanned: false,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.login({
      email: 'a@b.com',
      password: 'secret',
    } as any);

    expect(result).toEqual({ access_token: 'signed.jwt.token' });
  });

  it('throw UnauthorizedException si le joueur est introuvable', async () => {
    prismaMock.player.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'nobody@b.com', password: 'secret' } as any),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throw UnauthorizedException si le mot de passe est invalide', async () => {
    prismaMock.player.findUnique.mockResolvedValue({
      id: 'p1',
      passwordHash: 'hashed-pw',
      isBanned: false,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ email: 'a@b.com', password: 'wrong' } as any),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throw UnauthorizedException si le compte est banni', async () => {
    prismaMock.player.findUnique.mockResolvedValue({
      id: 'p1',
      passwordHash: 'hashed-pw',
      isBanned: true,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(
      service.login({ email: 'a@b.com', password: 'secret' } as any),
    ).rejects.toThrow(UnauthorizedException);
  });
});

// ─── forgotPassword ───────────────────────────────────────────────────────────

describe('forgotPassword', () => {
  it('ne fait rien silencieusement si le joueur est introuvable', async () => {
    prismaMock.player.findUnique.mockResolvedValue(null);

    await service.forgotPassword({ email: 'nobody@b.com' } as any);

    expect(prismaMock.player.update).not.toHaveBeenCalled();
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('génère un token de reset et log le lien en mode dev (pas de SMTP_HOST)', async () => {
    prismaMock.player.findUnique.mockResolvedValue({
      id: 'p1',
      email: 'a@b.com',
      username: 'hero',
    });
    const logSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);

    await service.forgotPassword({ email: 'a@b.com' } as any);

    /* eslint-disable @typescript-eslint/no-unsafe-assignment -- expect.any() est typé `any` côté @types/jest */
    expect(prismaMock.player.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: {
        passwordResetToken: expect.any(String),
        passwordResetExpiresAt: expect.any(Date),
      },
    });
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[DEV] Reset password link'),
    );

    logSpy.mockRestore();
  });

  it('envoie un email via nodemailer si SMTP_HOST est configuré', async () => {
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_USER = 'bot@olympos.internal';
    process.env.SMTP_PASS = 'app-password';
    prismaMock.player.findUnique.mockResolvedValue({
      id: 'p1',
      email: 'a@b.com',
      username: 'hero',
    });
    const sendMailMock = jest
      .fn()
      .mockResolvedValue({ messageId: 'id-1', response: 'ok' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: sendMailMock,
    });
    jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await service.forgotPassword({ email: 'a@b.com' } as any);

    expect(nodemailer.createTransport).toHaveBeenCalled();
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@b.com' }),
    );
  });
});

// ─── resetPassword ────────────────────────────────────────────────────────────

describe('resetPassword', () => {
  it('met à jour le mot de passe si le token est valide', async () => {
    prismaMock.player.findFirst.mockResolvedValue({
      id: 'p1',
      passwordResetExpiresAt: new Date(Date.now() + 60_000),
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-pw');

    await service.resetPassword({
      token: 'valid-token',
      newPassword: 'newsecret',
    } as any);

    expect(prismaMock.player.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: {
        passwordHash: 'new-hashed-pw',
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });
  });

  it('throw BadRequestException si le token est introuvable', async () => {
    prismaMock.player.findFirst.mockResolvedValue(null);

    await expect(
      service.resetPassword({ token: 'nope', newPassword: 'newsecret' } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('throw BadRequestException si le token est expiré', async () => {
    prismaMock.player.findFirst.mockResolvedValue({
      id: 'p1',
      passwordResetExpiresAt: new Date(Date.now() - 60_000),
    });

    await expect(
      service.resetPassword({
        token: 'expired',
        newPassword: 'newsecret',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });
});
