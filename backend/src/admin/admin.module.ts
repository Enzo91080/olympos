import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CardModule } from '../card/card.module';
import { PlayerModule } from '../player/player.module';
import { GameModule } from '../game/game.module';
import { AdminCardsController } from './admin-cards.controller';
import { AdminPlayersController } from './admin-players.controller';
import { AdminGamesController } from './admin-games.controller';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from './admin-stats.service';
import { AdminAuditController } from './admin-audit.controller';
import { AdminAuditService } from './admin-audit.service';

@Module({
  imports: [AuthModule, CardModule, PlayerModule, GameModule],
  controllers: [
    AdminCardsController,
    AdminPlayersController,
    AdminGamesController,
    AdminStatsController,
    AdminAuditController,
  ],
  providers: [AdminStatsService, AdminAuditService],
})
export class AdminModule {}
