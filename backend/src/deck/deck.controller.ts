import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeckService } from './deck.service';

@Controller('decks')
@UseGuards(JwtAuthGuard)
export class DeckController {
  constructor(private deckService: DeckService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.deckService.findAll(req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() body: { name: string }) {
    return this.deckService.create(req.user.id, body.name);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.deckService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { name?: string },
  ) {
    return this.deckService.update(id, req.user.id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deckService.remove(id, req.user.id);
  }

  @Post(':id/cards')
  addCard(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { cardId: string; quantity?: number },
  ) {
    return this.deckService.addCard(id, req.user.id, body.cardId, body.quantity);
  }

  @Delete(':id/cards/:cardId')
  removeCard(
    @Param('id') id: string,
    @Param('cardId') cardId: string,
    @Req() req: any,
  ) {
    return this.deckService.removeCard(id, req.user.id, cardId);
  }
}
