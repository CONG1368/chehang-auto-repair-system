import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CreatePaymentDto,
  CreateReceivableDto,
  CreateExpenseDto,
  PaymentQueryDto,
  ReceivableQueryDto,
  ExpenseQueryDto,
  ProfitSummaryQueryDto,
} from './dto/finance.dto';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ==================== 收银管理 ====================

  @Get('payments')
  async findAllPayments(@Query() query: PaymentQueryDto) {
    return this.financeService.findAllPayments(query);
  }

  @Get('payments/:id')
  async findPaymentOne(@Param('id') id: string) {
    return this.financeService.findPaymentOne(+id);
  }

  @Post('payments')
  async createPayment(@Body() dto: CreatePaymentDto, @Request() req: any) {
    // operatorId 可从 JWT 中获取，也可从 DTO 中传入
    if (!dto.operatorId) {
      dto.operatorId = req.user?.id;
    }
    return this.financeService.createPayment(dto);
  }

  @Get('daily-summary')
  async getDailySummary(@Query('date') date?: string) {
    return this.financeService.getDailySummary(date);
  }

  // ==================== 应收应付 ====================

  @Get('receivables')
  async findAllReceivables(@Query() query: ReceivableQueryDto) {
    return this.financeService.findAllReceivables(query);
  }

  @Post('receivables')
  async createReceivable(@Body() dto: CreateReceivableDto) {
    return this.financeService.createReceivable(dto);
  }

  @Put('receivables/:id/pay')
  async payReceivable(@Param('id') id: string, @Body('amount') amount: number) {
    return this.financeService.payReceivable(+id, amount);
  }

  @Get('receivables/summary')
  async getReceivableSummary() {
    return this.financeService.getReceivableSummary();
  }

  // ==================== 费用管理 ====================

  @Get('expenses')
  async findAllExpenses(@Query() query: ExpenseQueryDto) {
    return this.financeService.findAllExpenses(query);
  }

  @Post('expenses')
  async createExpense(@Body() dto: CreateExpenseDto) {
    return this.financeService.createExpense(dto);
  }

  @Get('expenses/summary')
  async getExpenseSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financeService.getExpenseSummary(startDate, endDate);
  }

  // ==================== 利润分析 ====================

  @Get('profit-summary')
  async getProfitSummary(@Query() query: ProfitSummaryQueryDto) {
    return this.financeService.getProfitSummary(query);
  }

  @Get('revenue-trend')
  async getRevenueTrend(@Query('days') days?: number) {
    return this.financeService.getRevenueTrend(days ?? 30);
  }
}
