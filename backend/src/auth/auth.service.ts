import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.player.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (exists) throw new ConflictException('Email or username already taken');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const player = await this.prisma.player.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
      },
    });

    return this.signToken(player.id, player.email);
  }

  async login(dto: LoginDto) {
    const player = await this.prisma.player.findUnique({
      where: { email: dto.email },
    });
    if (!player) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, player.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (player.isBanned) throw new UnauthorizedException('Account banned');

    return this.signToken(player.id, player.email);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const player = await this.prisma.player.findUnique({
      where: { email: dto.email },
    });

    // Retourner silencieusement si le compte n'existe pas (sécurité)
    if (!player) return;

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

    await this.prisma.player.update({
      where: { id: player.id },
      data: {
        passwordResetToken: token,
        passwordResetExpiresAt: expiresAt,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    if (!process.env.SMTP_HOST) {
      console.log(`\n[DEV] Reset password link for ${player.email}:\n${resetLink}\n`);
      return;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Olympos" <${process.env.SMTP_USER}>`,
      to: player.email,
      subject: 'Olympos — Reset your password',
      html: `
        <p>Hello ${player.username},</p>
        <p>Click the link below to reset your password. It expires in 1 hour.</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>If you did not request this, ignore this email.</p>
      `,
    });
    console.log(`[MAIL] Sent to ${player.email} — messageId: ${info.messageId} — response: ${info.response}`);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const player = await this.prisma.player.findFirst({
      where: { passwordResetToken: dto.token },
    });

    if (
      !player ||
      !player.passwordResetExpiresAt ||
      player.passwordResetExpiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired token');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.player.update({
      where: { id: player.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });
  }

  private signToken(sub: string, email: string) {
    const payload = { sub, email };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
