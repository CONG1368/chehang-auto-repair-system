import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateInvoiceDto, UpdateInvoiceDto, InvoiceQueryDto } from './dto/invoice.dto';

@Controller('invoice')
@UseGuards(JwtAuthGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  /** 发票列表（分页+筛选） */
  @Get()
  findAll(@Query() query: InvoiceQueryDto) {
    return this.invoiceService.findAll(query);
  }

  /** 发票统计（显式路径必须在 :id 之前） */
  @Get('stats')
  getStats() {
    return this.invoiceService.getStats();
  }

  /** 发票详情 */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoiceService.findOne(+id);
  }

  /** 创建发票 */
  @Post()
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoiceService.create(dto);
  }

  /** 编辑发票 */
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoiceService.update(+id, dto);
  }

  /** 作废发票 */
  @Put(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.invoiceService.cancel(+id);
  }
}
