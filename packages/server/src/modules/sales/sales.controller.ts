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

  @Get('leads/:id')
  async findLeadOne(@Param('id') id: string) {
    return this.salesService.findLeadOne(+id);
  }

  @Post('leads')
  async createLead(@Body() dto: CreateLeadDto, @Request() req: any) {
    // 如果未指定 userId，使用当前登录用户
    if (!dto.userId) {
      dto.userId = req.user?.id;
    }
    return this.salesService.createLead(dto);
  }

  @Put('leads/:id')
  async updateLead(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.salesService.updateLead(+id, dto);
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
  async createOrder(@Body() dto: CreateSalesOrderDto) {
    return this.salesService.createOrder(dto);
  }

  @Put('orders/:id')
  async updateOrder(@Param('id') id: string, @Body() dto: UpdateSalesOrderDto) {
    return this.salesService.updateOrder(+id, dto);
  }

  @Put('orders/:id/delivery')
  async delivery(@Param('id') id: string, @Body() dto: DeliveryDto) {
    return this.salesService.delivery(+id, dto);
  }
}
