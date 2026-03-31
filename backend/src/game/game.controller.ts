import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GameService } from './game.service';

@Controller('games')
@UseGuards(JwtAuthGuard)
export class GameController {
  constructor(private gameService: GameService) {}

  @Post()
  create(
    @Req() req: any,
    @Body() body: { deck1Id: string; player2Id: string; deck2Id: string },
  ) {
    return this.gameService.create(req.user.id, body.deck1Id, body.player2Id, body.deck2Id);
  }

  @Get('history')
  getHistory(@Req() req: any) {
    return this.gameService.getHistory(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.gameService.findOne(id, req.user.id);
  }
}
