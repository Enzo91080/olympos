import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { AuthModule } from '../auth/auth.module';
import { GameModule } from '../game/game.module';
import { MatchmakingModule } from '../matchmaking/matchmaking.module';

@Module({
  imports: [AuthModule, GameModule, MatchmakingModule],
  providers: [GameGateway],
})
export class GatewayModule {}
