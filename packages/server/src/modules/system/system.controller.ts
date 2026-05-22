import { Controller, Get, Put, Body, UseGuards, Optional } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { SystemService } from './system.service';
import { WsGateway } from '../ws/ws.gateway';
import { UpdateSystemConfigDto } from './dto/system.dto';

@Controller('system')
export class SystemController {
  constructor(
    private readonly systemService: SystemService,
    @Optional() private readonly wsGateway?: WsGateway,
  ) {}

  @Get('config')
  async getConfig() {
    return this.systemService.getConfig();
  }

  @Put('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermissions('*')
  async updateConfig(@Body() dto: UpdateSystemConfigDto) {
    const result = await this.systemService.updateConfig(dto);
    // WebSocket 推送系统配置更新通知
    this.wsGateway?.notifySystem('系统配置已更新', 'info');
    return result;
  }
}
