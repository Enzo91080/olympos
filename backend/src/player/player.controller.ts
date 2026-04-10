import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlayerService } from './player.service';

@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayerController {
  constructor(private playerService: PlayerService) {}

  @Get('me')
  getMe(@Req() req: any) {
    return this.playerService.getMe(req.user.id);
  }

  @Get('leaderboard')
  getLeaderboard() {
    return this.playerService.getLeaderboard()
  }

  @Patch('me')
  updateMe(
    @Req() req: any,
    @Body() body: { username?: string; avatarUrl?: string },
  ) {
    return this.playerService.updateMe(req.user.id, body);
  }
}
