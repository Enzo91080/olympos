import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { AuthModule } from '../auth/auth.module';
import { GameModule } from '../game/game.module';

@Module({
  imports: [AuthModule, GameModule],
  providers: [GameGateway],
})
export class GatewayModule {}
