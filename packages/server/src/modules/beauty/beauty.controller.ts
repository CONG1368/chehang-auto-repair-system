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
} from '@nestjs/common';
import { BeautyService } from './beauty.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CreateServiceDto,
  UpdateServiceDto,
  CreatePackageDto,
  UpdatePackageDto,
  CreateAppointmentDto,
  UpdateAppointmentDto,
  CreateCardDto,
  UpdateCardDto,
  CreateRechargeDto,
} from './dto/beauty.dto';

@Controller('beauty')
@UseGuards(JwtAuthGuard)
export class BeautyController {
  constructor(private readonly beautyService: BeautyService) {}

  // ==================== 服务项目 ====================

  @Get('services')
  findAllServices() {
    return this.beautyService.findAllServices();
  }

  @Post('services')
  createService(@Body() dto: CreateServiceDto) {
    return this.beautyService.createService(dto);
  }

  @Put('services/:id')
  updateService(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.beautyService.updateService(+id, dto);
  }

  @Delete('services/:id')
  removeService(@Param('id') id: string) {
    return this.beautyService.removeService(+id);
  }

  // ==================== 套餐 ====================

  @Get('packages')
  findAllPackages() {
    return this.beautyService.findAllPackages();
  }

  @Post('packages')
  createPackage(@Body() dto: CreatePackageDto) {
    return this.beautyService.createPackage(dto);
  }

  @Put('packages/:id')
  updatePackage(@Param('id') id: string, @Body() dto: UpdatePackageDto) {
    return this.beautyService.updatePackage(+id, dto);
  }

  @Delete('packages/:id')
  removePackage(@Param('id') id: string) {
    return this.beautyService.removePackage(+id);
  }

  // ==================== 预约施工 ====================

  @Get('appointments')
  findAllAppointments(@Query() query: any) {
    return this.beautyService.findAllAppointments(query);
  }

  @Post('appointments')
  createAppointment(@Body() body: any) {
    // 前端发送 technicianId/appointmentTime/selectedId，映射为 assignedTo/startTime/items
    const dto: CreateAppointmentDto = {
      customerId: body.customerId,
      serviceType: body.serviceType,
      assignedTo: body.technicianId ?? body.assignedTo,
      startTime: body.appointmentTime ?? body.startTime,
      items: body.selectedId != null
        ? body.serviceType === 'package'
          ? [{ packageId: body.selectedId }]
          : [{ serviceId: body.selectedId }]
        : body.items ?? [],
      vehicleId: body.vehicleId,
      totalAmount: body.totalAmount,
    };
    return this.beautyService.createAppointment(dto);
  }

  @Put('appointments/:id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.beautyService.updateAppointmentStatus(+id, status);
  }

  @Put('appointments/:id')
  updateAppointment(@Param('id') id: string, @Body() body: any) {
    // 前端发送 technicianId/appointmentTime/selectedId，映射为 assignedTo/startTime/items
    const dto: UpdateAppointmentDto = {};
    if (body.customerId != null) dto.customerId = body.customerId;
    if (body.serviceType != null) dto.serviceType = body.serviceType;
    if (body.technicianId != null) dto.assignedTo = body.technicianId;
    if (body.appointmentTime != null) dto.startTime = body.appointmentTime;
    if (body.selectedId != null) {
      dto.items = body.serviceType === 'package'
        ? [{ packageId: body.selectedId }]
        : [{ serviceId: body.selectedId }];
    } else if (body.items != null) {
      dto.items = body.items;
    }
    if (body.vehicleId != null) dto.vehicleId = body.vehicleId;
    if (body.totalAmount != null) dto.totalAmount = body.totalAmount;
    if (body.status != null) dto.status = body.status;
    return this.beautyService.updateAppointment(+id, dto);
  }

  @Delete('appointments/:id')
  removeAppointment(@Param('id') id: string) {
    return this.beautyService.removeAppointment(+id);
  }

  // ==================== 会员卡 ====================

  @Get('cards')
  findAllCards(@Query() query: any) {
    return this.beautyService.findAllCards(query);
  }

  @Get('cards/:id')
  findCardOne(@Param('id') id: string) {
    return this.beautyService.findCardOne(+id);
  }

  @Post('cards')
  createCard(@Body() dto: CreateCardDto) {
    return this.beautyService.createCard(dto);
  }

  @Put('cards/:id')
  updateCard(@Param('id') id: string, @Body() dto: UpdateCardDto) {
    return this.beautyService.updateCard(+id, dto);
  }

  @Delete('cards/:id')
  removeCard(@Param('id') id: string) {
    return this.beautyService.removeCard(+id);
  }

  // ==================== 充值记录 ====================

  @Get('recharges')
  findAllRecharges(@Query() query: any) {
    return this.beautyService.findAllRecharges(query);
  }

  @Post('recharges')
  createRecharge(@Body() dto: CreateRechargeDto) {
    return this.beautyService.createRecharge(dto);
  }
}
