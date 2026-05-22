import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RepairService } from './repair.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CreateRepairOrderDto,
  UpdateRepairOrderDto,
  RepairItemDto,
  DispatchDto,
  QualityCheckDto,
  RepairQueryDto,
} from './dto/repair.dto';

@Controller('repair')
@UseGuards(JwtAuthGuard)
export class RepairController {
  constructor(private readonly repairService: RepairService) {}

  @Get()
  async findAll(@Query() query: RepairQueryDto) {
    return this.repairService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.repairService.findOne(+id);
  }

  @Post()
  async create(@Body() dto: CreateRepairOrderDto) {
    return this.repairService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateRepairOrderDto) {
    return this.repairService.update(+id, dto);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string, @Body('actualHours') actualHours?: number) {
    return this.repairService.updateStatus(+id, status, actualHours);
  }

  @Post('dispatch')
  async dispatch(@Body() dto: DispatchDto) {
    return this.repairService.dispatch(dto);
  }

  @Put('dispatch/:id/complete')
  async completeDispatch(
    @Param('id') id: string,
    @Body('actualHours') actualHours: number,
  ) {
    return this.repairService.completeDispatch(+id, actualHours);
  }

  @Post('quality-check')
  async qualityCheck(@Body() body: QualityCheckDto, @Req() req: any) {
    // 前端字段名与后端字段名映射（支持两种命名方式）
    const repairOrderId = body.orderId ?? body.repairOrderId;
    const checkerId = req.user?.id ?? body.checkerId ?? 0;
    const isPassed = body.conclusion != null
      ? (body.conclusion === 'pass' ? 1 : 0)
      : (body.isPassed ?? 0);
    body.repairOrderId = repairOrderId;
    body.checkerId = checkerId;
    body.isPassed = isPassed;
    body.itemsChecked = body.checkItems ?? body.itemsChecked ?? [];
    body.roadTest = body.testDriveResult ?? body.roadTest;

    const result = await this.repairService.qualityCheck(body);

    // 若有上传的质检照片，写入 repair_order.check_images
    if (body.images && body.images.length > 0 && repairOrderId) {
      await this.repairService.attachCheckImages(repairOrderId, body.images);
    }

    return result;
  }

  // 重新计算工单费用合计（显式路径在 :id 参数路由之前）
  @Post(':id/calculate')
  async calculateTotal(@Param('id') id: string) {
    return this.repairService.calculateTotal(+id);
  }

  @Put(':id/deliver')
  async deliver(
    @Param('id') id: string,
    @Body('laborFee') laborFee?: number,
    @Body('partsFee') partsFee?: number,
    @Body('discount') discount?: number,
    @Body('finalAmount') finalAmount?: number,
  ) {
    return this.repairService.deliver(+id, { laborFee, partsFee, discount, finalAmount });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.repairService.remove(+id);
  }
}
