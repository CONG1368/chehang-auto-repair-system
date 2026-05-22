import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Response } from 'express';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('excel')
  async exportExcel(@Query() query: any, @Res() res: Response) {
    return this.exportService.exportExcel(res, query.module, query);
  }
}
