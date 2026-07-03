import { Controller, Get, Patch, Param, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { PlayerService } from '../player/player.service';
import { AdminAuditService } from './admin-audit.service';

@Controller('admin/players')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminPlayersController {
  constructor(
    private playerService: PlayerService,
    private auditService: AdminAuditService,
  ) {}

  @Get()
  findAll() {
    return this.playerService.adminListAll();
  }

  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { eloScore?: number; role?: string; isBanned?: boolean },
  ) {
    const player = await this.playerService.adminUpdate(id, body);

    // Une entrée par champ modifié plutôt qu'un "update" générique, pour un
    // journal exploitable (le body est loggué tel quel, pas de diff avant/après).
    if (body.role !== undefined) {
      await this.auditService.log(req.user.id, req.user.username, 'player.role.change', 'player', id, {
        role: body.role,
      });
    }
    if (body.isBanned !== undefined) {
      await this.auditService.log(
        req.user.id,
        req.user.username,
        body.isBanned ? 'player.ban' : 'player.unban',
        'player',
        id,
        { isBanned: body.isBanned },
      );
    }
    if (body.eloScore !== undefined) {
      await this.auditService.log(req.user.id, req.user.username, 'player.elo.update', 'player', id, {
        eloScore: body.eloScore,
      });
    }

    return player;
  }
}
