import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CardService } from '../card/card.service';
import type { CardInput } from '../card/card.service';
import { AdminAuditService } from './admin-audit.service';

@Controller('admin/cards')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCardsController {
  constructor(
    private cardService: CardService,
    private auditService: AdminAuditService,
  ) {}

  @Get()
  findAll() {
    return this.cardService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cardService.findOne(id);
  }

  @Post()
  async create(@Req() req: any, @Body() body: CardInput) {
    const card = await this.cardService.create(body);
    await this.auditService.log(req.user.id, req.user.username, 'card.create', 'card', card.id, body);
    return card;
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: Partial<CardInput>) {
    const card = await this.cardService.update(id, body);
    await this.auditService.log(req.user.id, req.user.username, 'card.update', 'card', id, body);
    return card;
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const removed = await this.cardService.remove(id);
    await this.auditService.log(req.user.id, req.user.username, 'card.delete', 'card', id, { name: removed.name });
    return removed;
  }
}
