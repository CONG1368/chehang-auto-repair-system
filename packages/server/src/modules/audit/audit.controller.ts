import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // 查询操作日志（分页）
  @Get()
  async findAll(@Query() query: any) {
    return this.auditService.findAll(query);
  }

  // 获取操作统计
  @Get('stats')
  async getStats() {
    return this.auditService.getStats();
  }
}
