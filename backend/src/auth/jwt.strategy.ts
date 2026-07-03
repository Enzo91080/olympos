import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'olympos_super_secret_key_change_in_prod',
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const player = await this.prisma.player.findUnique({
      where: { id: payload.sub },
    });
    if (!player) throw new UnauthorizedException();
    if (player.isBanned) throw new UnauthorizedException('Account banned');
    return player;
  }
}
