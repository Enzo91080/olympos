import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

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

    return this.signToken(player.id, player.email);
  }

  private signToken(sub: string, email: string) {
    const payload = { sub, email };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
