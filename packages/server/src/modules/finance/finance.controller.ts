import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
  UpdatePaymentDto,
  CreateReceivableDto,
  CreateExpenseDto,
  PaymentQueryDto,
  ReceivableQueryDto,
  ExpenseQueryDto,
  ProfitSummaryQueryDto,
  CreatePayableDto,
  PayableQueryDto,
  UpdateExpenseDto,
  UpdateReceivableDto,
  UpdatePayableDto,
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

  @Put('payments/:id')
  async updatePayment(@Param('id') id: string, @Body() dto: UpdatePaymentDto) {
    return this.financeService.updatePayment(+id, dto);
  }

  @Delete('payments/:id')
  async removePayment(@Param('id') id: string) {
    return this.financeService.removePayment(+id);
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

  @Get('receivables/summary')
  async getReceivableSummary() {
    return this.financeService.getReceivableSummary();
  }

  @Get('receivables/:id')
  async findReceivableOne(@Param('id') id: string) {
    return this.financeService.findReceivableOne(+id);
  }

  @Post('receivables')
  async createReceivable(@Body() dto: CreateReceivableDto) {
    return this.financeService.createReceivable(dto);
  }

  @Put('receivables/:id/pay')
  async payReceivable(
    @Param('id') id: string,
    @Body('amount') amount: number,
    @Body('payMethod') payMethod?: string,
    @Body('remark') remark?: string,
  ) {
    return this.financeService.payReceivable(+id, amount, payMethod, remark);
  }

  @Put('receivables/:id')
  async updateReceivable(@Param('id') id: string, @Body() dto: UpdateReceivableDto) {
    return this.financeService.updateReceivable(+id, dto);
  }

  @Delete('receivables/:id')
  async removeReceivable(@Param('id') id: string) {
    return this.financeService.deleteReceivable(+id);
  }

  // ==================== 应付账款 ====================

  @Get('payables')
  async findAllPayables(@Query() query: PayableQueryDto) {
    return this.financeService.findAllPayables(query);
  }

  @Get('payables/summary')
  async getPayableSummary() {
    return this.financeService.getPayableSummary();
  }

  @Get('payables/:id')
  async findPayableOne(@Param('id') id: string) {
    return this.financeService.findPayableOne(+id);
  }

  @Post('payables')
  async createPayable(@Body() dto: CreatePayableDto) {
    return this.financeService.createPayable(dto);
  }

  @Put('payables/:id/pay')
  async payPayable(@Param('id') id: string, @Body('amount') amount: number) {
    return this.financeService.payPayable(+id, amount);
  }

  @Put('payables/:id')
  async updatePayable(@Param('id') id: string, @Body() dto: UpdatePayableDto) {
    return this.financeService.updatePayable(+id, dto);
  }

  @Delete('payables/:id')
  async removePayable(@Param('id') id: string) {
    return this.financeService.deletePayable(+id);
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

  @Put('expenses/:id')
  async updateExpense(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.financeService.updateExpense(+id, dto);
  }

  @Delete('expenses/:id')
  async removeExpense(@Param('id') id: string) {
    return this.financeService.deleteExpense(+id);
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
