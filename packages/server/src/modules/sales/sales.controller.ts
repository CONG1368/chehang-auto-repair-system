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
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  CreateLeadDto,
  UpdateLeadDto,
  CreateSalesOrderDto,
  UpdateSalesOrderDto,
  DeliveryDto,
  CreateLeadFollowRecordDto,
} from './dto/sales.dto';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // ==================== 车辆管理 ====================

  @Get('vehicles')
  async findAllVehicles(@Query() query: PaginationDto & { brand?: string; series?: string; model?: string; stockStatus?: string }) {
    return this.salesService.findAllVehicles(query);
  }

  @Get('vehicles/:id')
  async findVehicleOne(@Param('id') id: string) {
    return this.salesService.findVehicleOne(+id);
  }

  @Post('vehicles')
  async createVehicle(@Body() dto: CreateVehicleDto) {
    return this.salesService.createVehicle(dto);
  }

  @Put('vehicles/:id')
  async updateVehicle(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.salesService.updateVehicle(+id, dto);
  }

  @Delete('vehicles/:id')
  async removeVehicle(@Param('id') id: string) {
    return this.salesService.removeVehicle(+id);
  }

  // ==================== 销售线索 ====================

  @Get('leads')
  async findAllLeads(@Query() query: PaginationDto & { status?: string }) {
    return this.salesService.findAllLeads(query);
  }

  // 线索跟进记录（显式路由必须在 :id 之前）
  @Get('leads/:leadId/follows')
  async getLeadFollowRecords(@Param('leadId') leadId: string) {
    return this.salesService.getLeadFollowRecords(+leadId);
  }

  @Post('leads/:leadId/follows')
  async addLeadFollowRecord(
    @Param('leadId') leadId: string,
    @Body() dto: CreateLeadFollowRecordDto & { status?: string },
    @Request() req: any,
  ) {
    return this.salesService.addLeadFollowRecord(+leadId, req.user.id, dto);
  }

  @Get('leads/:id')
  async findLeadOne(@Param('id') id: string) {
    return this.salesService.findLeadOne(+id);
  }

  @Post('leads')
  async createLead(@Body() dto: CreateLeadDto, @Request() req: any) {
    // 始终从 token 获取 userId，防止越权创建
    dto.userId = req.user?.id;
    return this.salesService.createLead(dto);
  }

  @Put('leads/:id')
  async updateLead(@Param('id') id: string, @Body() dto: UpdateLeadDto, @Request() req: any) {
    return this.salesService.updateLead(+id, dto, req.user?.id);
  }

  @Delete('leads/:id')
  async removeLead(@Param('id') id: string) {
    return this.salesService.removeLead(+id);
  }

  // ==================== 销售订单 ====================

  @Get('orders')
  async findAllOrders(@Query() query: PaginationDto & { status?: string }) {
    return this.salesService.findAllOrders(query);
  }

  @Get('orders/:id')
  async findOrderOne(@Param('id') id: string) {
    return this.salesService.findOrderOne(+id);
  }

  @Post('orders')
  async createOrder(@Body() dto: CreateSalesOrderDto, @Request() req: any) {
    // 始终从 token 获取 salesId，防止越权创建
    dto.salesId = req.user?.id;
    return this.salesService.createOrder(dto);
  }

  @Put('orders/:id')
  async updateOrder(@Param('id') id: string, @Body() dto: UpdateSalesOrderDto) {
    return this.salesService.updateOrder(+id, dto);
  }

  @Delete('orders/:id')
  async removeOrder(@Param('id') id: string) {
    return this.salesService.removeOrder(+id);
  }

  @Put('orders/:id/delivery')
  async delivery(@Param('id') id: string, @Body() dto: DeliveryDto) {
    return this.salesService.delivery(+id, dto);
  }
}
