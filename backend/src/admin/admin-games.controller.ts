import { Controller, Get, Patch, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { GameService } from '../game/game.service';
import { AdminAuditService } from './admin-audit.service';

@Controller('admin/games')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminGamesController {
  constructor(
    private gameService: GameService,
    private auditService: AdminAuditService,
  ) {}

  @Get()
  findAll() {
    return this.gameService.adminListAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gameService.adminFindOne(id);
  }

  @Patch(':id/abandon')
  async forceAbandon(@Req() req: any, @Param('id') id: string) {
    const game = await this.gameService.adminForceAbandon(id);
    await this.auditService.log(req.user.id, req.user.username, 'game.force_abandon', 'game', id);
    return game;
  }
}
