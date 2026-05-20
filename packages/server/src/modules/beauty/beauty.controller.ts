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
  CreatePackageDto,
  CreateAppointmentDto,
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
  updateService(@Param('id') id: string, @Body() dto: CreateServiceDto) {
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
  updatePackage(@Param('id') id: string, @Body() dto: CreatePackageDto) {
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
  createAppointment(@Body() dto: CreateAppointmentDto) {
    return this.beautyService.createAppointment(dto);
  }

  @Put('appointments/:id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.beautyService.updateAppointmentStatus(+id, status);
  }

  // ==================== 会员卡 ====================

  @Get('cards')
  findAllCards(@Query() query: any) {
    return this.beautyService.findAllCards(query);
  }
}
