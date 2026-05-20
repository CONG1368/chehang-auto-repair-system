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
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.repairService.updateStatus(+id, status);
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
  async qualityCheck(@Body() dto: QualityCheckDto) {
    return this.repairService.qualityCheck(dto);
  }

  @Put(':id/deliver')
  async deliver(@Param('id') id: string) {
    return this.repairService.deliver(+id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.repairService.remove(+id);
  }
}
