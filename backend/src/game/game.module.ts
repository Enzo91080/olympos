import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { GameEngineService } from './game-engine.service';
import { EloService } from './elo.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [GameService, GameEngineService, EloService],
  controllers: [GameController],
  exports: [GameService],
})
export class GameModule {}
