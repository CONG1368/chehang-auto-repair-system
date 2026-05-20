import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('dashboard')
  async getDashboardSummary() {
    return this.reportService.getDashboardSummary();
  }

  @Get('revenue-trend')
  async getRevenueTrend(@Query('days') days?: number) {
    return this.reportService.getRevenueTrend(days || 30);
  }

  @Get('business-ratio')
  async getBusinessRatio() {
    return this.reportService.getBusinessRatio();
  }

  @Get('sales-stats')
  async getSalesStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportService.getSalesStats(startDate, endDate);
  }

  @Get('repair-stats')
  async getRepairStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportService.getRepairStats(startDate, endDate);
  }

  @Get('customer-stats')
  async getCustomerStats() {
    return this.reportService.getCustomerStats();
  }

  @Get('inventory-stats')
  async getInventoryStats() {
    return this.reportService.getInventoryStats();
  }

  @Get('recent-payments')
  async getRecentPayments(@Query('limit') limit?: number) {
    return this.reportService.getRecentPayments(limit || 5);
  }
}
