import { Controller, Post, Delete, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MatchmakingService } from './matchmaking.service';

@Controller('matchmaking')
@UseGuards(JwtAuthGuard)
export class MatchmakingController {
  constructor(private matchmakingService: MatchmakingService) {}

  @Post('join')
  join(@Req() req: any) {
    return this.matchmakingService.join(req.user.id);
  }

  @Delete('leave')
  leave(@Req() req: any) {
    return this.matchmakingService.leave(req.user.id);
  }
}
