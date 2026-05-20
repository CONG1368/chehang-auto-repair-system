import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateCustomerDto, UpdateCustomerDto, CreateVehicleDto, CustomerSearchDto, RemindQueryDto } from './dto/customer.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  async findAll(@Query() query: PaginationDto & CustomerSearchDto) {
    return this.customerService.findAll(query);
  }

  // 到期提醒（必须在 :id 之前）
  @Get('reminds')
  async getReminds(@Query() query: RemindQueryDto) {
    return this.customerService.getReminds(query.type);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.customerService.findOne(+id);
  }

  @Post()
  async create(@Body() dto: CreateCustomerDto) {
    return this.customerService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customerService.update(+id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.customerService.remove(+id);
  }

  // 车辆管理
  @Get(':customerId/vehicles')
  async getVehicles(@Param('customerId') customerId: string) {
    return this.customerService.getVehicles(+customerId);
  }

  @Post(':customerId/vehicles')
  async addVehicle(@Param('customerId') customerId: string, @Body() dto: CreateVehicleDto) {
    return this.customerService.addVehicle(+customerId, dto);
  }

  @Put(':customerId/vehicles/:id')
  async updateVehicle(@Param('id') id: string, @Body() dto: Partial<CreateVehicleDto>) {
    return this.customerService.updateVehicle(+id, dto);
  }

  @Delete(':customerId/vehicles/:id')
  async removeVehicle(@Param('id') id: string) {
    return this.customerService.removeVehicle(+id);
  }

  // 跟进记录
  @Get(':customerId/follows')
  async getFollowRecords(@Param('customerId') customerId: string) {
    return this.customerService.getFollowRecords(+customerId);
  }

  @Post(':customerId/follows')
  async addFollowRecord(@Param('customerId') customerId: string, @Body() body: any, @Request() req: any) {
    return this.customerService.addFollowRecord(+customerId, { ...body, userId: req.user.id });
  }
}
