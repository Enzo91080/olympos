import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AdminAuditService } from './admin-audit.service';

@Controller('admin/audit-log')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminAuditController {
  constructor(private auditService: AdminAuditService) {}

  @Get()
  findAll(@Query('limit') limit?: string) {
    return this.auditService.list(limit ? Number(limit) : 200);
  }
}
